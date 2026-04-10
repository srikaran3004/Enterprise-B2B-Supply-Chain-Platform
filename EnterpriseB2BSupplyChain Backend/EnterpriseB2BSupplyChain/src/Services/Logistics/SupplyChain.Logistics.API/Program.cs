using System.Text;
using Hangfire;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using Serilog;
using SupplyChain.SharedInfrastructure.Extensions;
using SupplyChain.SharedInfrastructure.Observability;
using SupplyChain.SharedInfrastructure.Security;
using SupplyChain.Logistics.Application;
using SupplyChain.Logistics.Infrastructure;
using SupplyChain.Logistics.Infrastructure.Jobs;
using SupplyChain.Logistics.Infrastructure.Persistence;
using SupplyChain.Logistics.Infrastructure.Persistence.Seed;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSharedSerilog("logistics-service");

builder.Services.AddSharedInfrastructure();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddControllers();

var jwtSecret = builder.Configuration["Jwt:Secret"]!;
var configuredAudiences = builder.Configuration.GetSection("Jwt:Audiences").Get<string[]>();
var validAudiences = (configuredAudiences ?? Array.Empty<string>())
    .Concat(new[]
    {
        builder.Configuration["Jwt:Audience"] ?? "UniSupplyAPI",
        "gateway", "identity", "order", "catalog", "payment", "logistics", "notification"
    })
    .Where(a => !string.IsNullOrWhiteSpace(a))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidAudiences           = validAudiences,
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew                = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(InternalAuthDefaults.InternalPolicy, policy =>
        policy.RequireAuthenticatedUser()
              .RequireClaim(InternalAuthDefaults.ClientTypeClaim, InternalAuthDefaults.InternalClientType));
});

builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((doc, _, _) =>
    {
        doc.Info.Title   = "Logistics & Tracking Service";
        doc.Info.Version = "v1";
        return Task.CompletedTask;
    });
});

builder.Services.AddHealthChecks();
builder.Services.AddCors(opt =>
    opt.AddPolicy("AllowAngular", p =>
        p.WithOrigins("http://localhost:4200").AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<LogisticsDbContext>();
    await db.Database.MigrateAsync();
    await LogisticsSeeder.SeedAsync(db);
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(opt =>
        opt.WithTitle("Logistics & Tracking Service").WithTheme(ScalarTheme.DeepSpace));
    app.UseHangfireDashboard("/hangfire");
}

app.UseSharedInfrastructure();
app.UseCors("AllowAngular");
app.UseSerilogRequestLogging();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

RecurringJob.AddOrUpdate<SlaMonitorJob>(
    "sla-monitor",
    job => job.ExecuteAsync(),
    "*/5 * * * *"); // Every 5 minutes

app.Run();


