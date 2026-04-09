using System.Net.Http.Json;
using SupplyChain.Logistics.Application.Abstractions;

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

            return await response.Content.ReadFromJsonAsync<DealerContactDto>(cancellationToken: ct);
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

            return await response.Content.ReadFromJsonAsync<UserContactDto>(cancellationToken: ct);
        }
        catch
        {
            return null;
        }
    }
}
