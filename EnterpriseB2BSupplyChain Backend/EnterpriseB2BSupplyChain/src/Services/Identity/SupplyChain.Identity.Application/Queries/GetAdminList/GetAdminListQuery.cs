using MediatR;
using SupplyChain.Identity.Application.DTOs;

namespace SupplyChain.Identity.Application.Queries.GetAdminList;

public record GetAdminListQuery : IRequest<List<AdminListDto>>;