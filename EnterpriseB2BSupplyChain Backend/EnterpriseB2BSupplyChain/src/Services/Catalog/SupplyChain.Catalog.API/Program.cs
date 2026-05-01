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
using SupplyChain.Catalog.Application;
using SupplyChain.Catalog.Infrastructure;
using SupplyChain.Catalog.Infrastructure.Jobs;
using SupplyChain.Catalog.Infrastructure.Persistence;
using SupplyChain.Catalog.Infrastructure.Persistence.Seed;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSharedSerilog("catalog-service");

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
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudiences = validAudiences,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.Zero
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
        doc.Info.Title = "Catalog & Inventory Service";
        doc.Info.Version = "v1";
        doc.Info.Description = "Manages product catalog, stock levels, and Notify Me subscriptions.";
        return Task.CompletedTask;
    });
});

builder.Services.AddHealthChecks();

builder.Services.AddCors(opt =>
    opt.AddPolicy("AllowAngular", p =>
        p.WithOrigins("http://localhost:4200")
         .AllowAnyHeader()
         .AllowAnyMethod()));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
    await db.Database.MigrateAsync();
    await CatalogDataSeeder.SeedAsync(db);
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(opt =>
        opt.WithTitle("Catalog & Inventory Service")
           .WithTheme(ScalarTheme.DeepSpace)
           .WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient));
}

app.UseSharedInfrastructure();
app.UseCors("AllowAngular");
app.UseSerilogRequestLogging();
app.UseAuthentication();
app.UseAuthorization();

// Hangfire Dashboard (dev only)
if (app.Environment.IsDevelopment())
    app.UseHangfireDashboard("/hangfire");

app.MapControllers();
app.MapHealthChecks("/health");

// Register Catalog Outbox Poller — runs every 5 seconds
RecurringJob.AddOrUpdate<OutboxPollerJob>(
    "catalog-outbox-poller",
    job => job.ExecuteAsync(),
    "* * * * *"); // Every 1 minute

RecurringJob.AddOrUpdate<OutboxCleanupJob>(
    "catalog-outbox-cleanup",
    job => job.ExecuteAsync(CancellationToken.None),
    "0 2 * * *"); // Daily at 02:00

app.Run();


