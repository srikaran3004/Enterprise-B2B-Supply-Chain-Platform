using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Ocelot.DependencyInjection;
using Ocelot.Middleware;
using Ocelot.Provider.Polly;
using Serilog;
using SupplyChain.SharedInfrastructure.Extensions;
using SupplyChain.SharedInfrastructure.Observability;

//Sets up default configurations (like appsettings.json)
var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSharedSerilog("gateway-service");
//(optional: false): The app will crash if this file is missing
builder.Configuration
    .AddJsonFile("ocelot.json", optional: false, reloadOnChange: true)
    .AddEnvironmentVariables();

builder.Services.AddSharedInfrastructure();

var jwtSecret = builder.Configuration["Jwt:Secret"];
if (string.IsNullOrWhiteSpace(jwtSecret))
{
    throw new InvalidOperationException("Gateway JWT secret is not configured. Set Jwt:Secret.");
}

var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "UniSupplyPlatform";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "UniSupplyAPI";
//Whenever a request comes, Check JWT token for authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer("Bearer", options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true, //Checks if token is expired.
            ValidateIssuerSigningKey = true, //Verifies token signature.
            ValidIssuer              = jwtIssuer,
            ValidAudience            = jwtAudience,
            IssuerSigningKey         = new SymmetricSecurityKey( //Secret key used to validate token signature
                                           Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization(); //Enables role/permission based access control.
//Allows frontend and backend on different domains/ports to communicate.
builder.Services.AddCors(opt =>
    opt.AddPolicy("AllowAngular", p =>
        p.WithOrigins("http://localhost:4200")  
         .AllowAnyHeader()
         .AllowAnyMethod()
         .AllowCredentials())); //Allow cookies, tokens/session credentials

builder.Services.AddOcelot(builder.Configuration)
    .AddPolly(); //if downstream services fails allow retry

var app = builder.Build();
app.UseSharedInfrastructure();
app.UseCors("AllowAngular");
app.UseSerilogRequestLogging();
app.UseAuthentication();
app.UseAuthorization();
//await ocelot becoz, for async intializations, loading routing configs, preping gateway middleware.
await app.UseOcelot();
app.Run();


