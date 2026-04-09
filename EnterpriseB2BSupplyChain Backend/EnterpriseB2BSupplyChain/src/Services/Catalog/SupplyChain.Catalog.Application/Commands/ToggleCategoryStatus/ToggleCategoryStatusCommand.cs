using MediatR;

namespace SupplyChain.Catalog.Application.Commands.ToggleCategoryStatus;

/// <summary>Activates or deactivates a category.</summary>
public record ToggleCategoryStatusCommand(Guid CategoryId, bool Activate) : IRequest;
