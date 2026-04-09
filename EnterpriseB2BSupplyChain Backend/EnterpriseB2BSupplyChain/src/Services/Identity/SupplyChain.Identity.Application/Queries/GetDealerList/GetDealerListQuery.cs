using MediatR;
using SupplyChain.Identity.Application.DTOs;
using SupplyChain.Identity.Domain.Enums;

namespace SupplyChain.Identity.Application.Queries.GetDealerList;

public record GetDealerListQuery(UserStatus? Status = null) : IRequest<List<DealerListDto>>;