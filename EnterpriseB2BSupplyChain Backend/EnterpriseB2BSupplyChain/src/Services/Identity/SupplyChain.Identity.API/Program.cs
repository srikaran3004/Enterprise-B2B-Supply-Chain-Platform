using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using Serilog;
using SupplyChain.SharedInfrastructure.Extensions;
using SupplyChain.SharedInfrastructure.Observability;
using SupplyChain.SharedInfrastructure.Security;
using SupplyChain.Identity.Application;
using SupplyChain.Identity.Infrastructure;
using SupplyChain.Identity.Infrastructure.Persistence;
using SupplyChain.Identity.Infrastructure.Persistence.Seed;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSharedSerilog("identity-service");

// Shared infrastructure (correlation, exception handling, etc.)
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
            IssuerSigningKey = new SymmetricSecurityKey(
                                           Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.Zero   // No tolerance â€” token expires exactly on time
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
        doc.Info.Title = "Identity & Auth Service";
        doc.Info.Version = "v1";
        doc.Info.Description = "Handles dealer registration, admin approval, and JWT authentication.";
        return Task.CompletedTask;
    });
});

builder.Services.AddHealthChecks();


builder.Services.AddCors(opt =>
    opt.AddPolicy("AllowAngular", p =>
        p.WithOrigins("http://localhost:4200")
         .AllowAnyHeader()
         .AllowAnyMethod()
         .AllowCredentials()));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
    await db.Database.MigrateAsync();
    await IdentitySeeder.SeedAsync(db, builder.Configuration);
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(opt =>
        opt.WithTitle("Identity & Auth Service")
           .WithTheme(ScalarTheme.DeepSpace)
           .WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient));
}

app.UseSharedInfrastructure(); // Correlation ID + global exception handling
app.UseCors("AllowAngular");
app.UseStaticFiles(); // Added to serve profile pictures
app.UseSerilogRequestLogging();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

app.Run();


