using SupplyChain.Order.Application.Abstractions;
using SupplyChain.SharedInfrastructure.Results;

namespace SupplyChain.Order.Infrastructure.Services;

public class IdentityServiceClient : IIdentityServiceClient
{
    private readonly HttpClient _httpClient;

    public IdentityServiceClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<ShippingAddressDto?> GetShippingAddressAsync(Guid dealerId, Guid? addressId, CancellationToken ct)
    {
        try
        {
            // Use the internal endpoint secured with service-to-service JWT.
            var response = await _httpClient.GetAsync($"/api/shipping-addresses/internal/dealer/{dealerId}", ct);
            if (!response.IsSuccessStatusCode)
                return null;

            var addresses = await ApiResponseReader.ReadDataAsync<List<ShippingAddressDto>>(response.Content, ct);
            if (addresses == null || !addresses.Any())
                return null;

            if (addressId.HasValue)
            {
                return addresses.FirstOrDefault(a => a.AddressId == addressId.Value) 
                       ?? addresses.FirstOrDefault(a => a.IsDefault);
            }

            return addresses.FirstOrDefault(a => a.IsDefault) ?? addresses.FirstOrDefault();
        }
        catch
        {
            return null;
        }
    }

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
}
