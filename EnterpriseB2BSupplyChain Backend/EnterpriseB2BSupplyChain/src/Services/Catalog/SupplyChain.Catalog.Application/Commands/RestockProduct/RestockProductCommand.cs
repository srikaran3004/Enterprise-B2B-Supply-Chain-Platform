using MediatR;

namespace SupplyChain.Catalog.Application.Commands.RestockProduct;

public record RestockProductCommand(Guid ProductId, int Quantity, string? Notes) : IRequest;
