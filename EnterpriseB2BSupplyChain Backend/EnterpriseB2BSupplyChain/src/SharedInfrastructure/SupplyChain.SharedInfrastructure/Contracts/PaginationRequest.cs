namespace SupplyChain.SharedInfrastructure.Contracts;

public sealed record PaginationRequest(int PageNumber = 1, int PageSize = 20)
{
    public int NormalizedPageNumber => PageNumber < 1 ? 1 : PageNumber;
    public int NormalizedPageSize => PageSize < 1 ? 20 : PageSize > 200 ? 200 : PageSize;
}

