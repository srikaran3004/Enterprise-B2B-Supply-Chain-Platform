using SupplyChain.Logistics.Application.Abstractions;
using SupplyChain.SharedInfrastructure.Results;

namespace SupplyChain.Logistics.Infrastructure.Services;

public class IdentityServiceClient : IIdentityServiceClient
{
    private readonly HttpClient _httpClient;

    public IdentityServiceClient(HttpClient httpClient)
        => _httpClient = httpClient;

    public async Task<DealerContactDto?> GetDealerContactAsync(Guid dealerId, CancellationToken ct)
    {
        try
        {
            var response = await _httpClient.GetAsync($"/api/internal/dealers/{dealerId}/contact", ct);
            if (!response.IsSuccessStatusCode)
                return null;

            return await ApiResponseReader.ReadDataAsync<DealerContactDto>(response.Content, ct);
        }
        catch
        {
            return null;
        }
    }

    public async Task<UserContactDto?> GetUserContactAsync(Guid userId, CancellationToken ct)
    {
        try
        {
            var response = await _httpClient.GetAsync($"/api/internal/users/{userId}/contact", ct);
            if (!response.IsSuccessStatusCode)
                return null;

            return await ApiResponseReader.ReadDataAsync<UserContactDto>(response.Content, ct);
        }
        catch
        {
            return null;
        }
    }
}
