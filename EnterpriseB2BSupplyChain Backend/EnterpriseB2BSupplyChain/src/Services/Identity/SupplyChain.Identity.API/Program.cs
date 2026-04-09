using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using Serilog;
using SupplyChain.BuildingBlocks.Extensions;
using SupplyChain.Identity.Application;
using SupplyChain.Identity.Infrastructure;
using SupplyChain.Identity.Infrastructure.Persistence;
using SupplyChain.Identity.Infrastructure.Persistence.Seed;

var builder = WebApplication.CreateBuilder(args);

// ── Serilog ────────────────────────────────────────────────────────
builder.Host.UseSerilog((ctx, cfg) =>
    cfg.ReadFrom.Configuration(ctx.Configuration)
       .WriteTo.Console());

// ── Shared BuildingBlocks (correlation, exception handling, etc.) ─
builder.Services.AddBuildingBlocks();

// ── Application + Infrastructure (Clean Architecture DI) ───────────
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// ── Controllers ────────────────────────────────────────────────────
builder.Services.AddControllers();

// ── JWT Authentication ──────────────────────────────────────────────
var jwtSecret = builder.Configuration["Jwt:Secret"]!;
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
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                                           Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.Zero   // No tolerance — token expires exactly on time
        };
    });

builder.Services.AddAuthorization();

// ── OpenAPI + Scalar (replaces Swagger in .NET 10) ─────────────────
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

// ── Health Checks ───────────────────────────────────────────────────
builder.Services.AddHealthChecks();

// ── CORS ────────────────────────────────────────────────────────────
builder.Services.AddCors(opt =>
    opt.AddPolicy("AllowAngular", p =>
        p.WithOrigins("http://localhost:4200")
         .AllowAnyHeader()
         .AllowAnyMethod()));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
    await db.Database.MigrateAsync();
    await IdentitySeeder.SeedAsync(db, builder.Configuration);
}

// ── Middleware Pipeline ─────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(opt =>
        opt.WithTitle("Identity & Auth Service")
           .WithTheme(ScalarTheme.DeepSpace)
           .WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient));
}

app.UseCors("AllowAngular");
app.UseStaticFiles(); // Added to serve profile pictures
app.UseBuildingBlocks(); // Correlation ID + global exception handling
app.UseSerilogRequestLogging();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

app.Run();