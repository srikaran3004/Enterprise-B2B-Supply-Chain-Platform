using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using SupplyChain.BuildingBlocks.Correlation;
using SupplyChain.BuildingBlocks.Middleware;

namespace SupplyChain.BuildingBlocks.Extensions;

/// <summary>
/// Single-entry-point extension methods that every microservice uses to wire up
/// the shared BuildingBlocks layer. Keeps <c>Program.cs</c> changes to one line of
/// service registration and one line of middleware registration per service.
/// </summary>
public static class BuildingBlocksExtensions
{
    /// <summary>
    /// Registers all services required by the BuildingBlocks pipeline
    /// (HttpContextAccessor, correlation accessor, etc.).
    /// Call this in <c>Program.cs</c> BEFORE <c>AddApplication</c>/<c>AddInfrastructure</c>.
    /// </summary>
    public static IServiceCollection AddBuildingBlocks(this IServiceCollection services)
    {
        services.AddHttpContextAccessor();
        services.AddSingleton<ICorrelationIdAccessor, CorrelationIdAccessor>();
        return services;
    }

    /// <summary>
    /// Registers the BuildingBlocks request pipeline:
    /// <list type="number">
    ///   <item><description><see cref="CorrelationIdMiddleware"/> — reads/generates the correlation ID.</description></item>
    ///   <item><description><see cref="GlobalExceptionHandlingMiddleware"/> — central exception handler.</description></item>
    /// </list>
    /// Call this in <c>Program.cs</c> as the FIRST pipeline call — before UseCors,
    /// UseSerilogRequestLogging, UseAuthentication, UseAuthorization, MapControllers.
    ///
    /// This ordering guarantees that:
    /// - The correlation ID is available to every subsequent middleware.
    /// - Unhandled exceptions from anywhere downstream are caught and translated
    ///   into the uniform ApiResponse shape.
    /// - Serilog's request logging sees the final response status code.
    /// </summary>
    public static IApplicationBuilder UseBuildingBlocks(this IApplicationBuilder app)
    {
        app.UseMiddleware<CorrelationIdMiddleware>();
        app.UseMiddleware<GlobalExceptionHandlingMiddleware>();
        return app;
    }
}
