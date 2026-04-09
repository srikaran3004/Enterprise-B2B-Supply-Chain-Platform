namespace SupplyChain.Identity.Domain.Entities;

public class ShippingAddress
{
    public Guid    AddressId    { get; private set; }
    public Guid    DealerId     { get; private set; }
    public string  Label        { get; private set; } = string.Empty;
    public string  AddressLine1 { get; private set; } = string.Empty;
    public string? District     { get; private set; }
    public string  City         { get; private set; } = string.Empty;
    public string  State        { get; private set; } = string.Empty;
    public string  PinCode      { get; private set; } = string.Empty;
    public string? PhoneNumber  { get; private set; }
    public bool    IsDefault    { get; private set; }
    public DateTime CreatedAt   { get; private set; }

    private ShippingAddress() { }

    public static ShippingAddress Create(
        Guid dealerId, string label, string addressLine1,
        string city, string state, string pinCode,
        string? phoneNumber = null, bool isDefault = false,
        string? district = null)
        => new()
        {
            AddressId    = Guid.NewGuid(),
            DealerId     = dealerId,
            Label        = label.Trim(),
            AddressLine1 = addressLine1.Trim(),
            District     = district?.Trim(),
            City         = city.Trim(),
            State        = state.Trim(),
            PinCode      = pinCode.Trim(),
            PhoneNumber  = phoneNumber?.Trim(),
            IsDefault    = isDefault,
            CreatedAt    = DateTime.UtcNow
        };

    public void Update(string label, string addressLine1,
        string city, string state, string pinCode, string? phoneNumber,
        string? district = null)
    {
        Label        = label.Trim();
        AddressLine1 = addressLine1.Trim();
        District     = district?.Trim();
        City         = city.Trim();
        State        = state.Trim();
        PinCode      = pinCode.Trim();
        PhoneNumber  = phoneNumber?.Trim();
    }

    public void SetAsDefault() => IsDefault = true;
    public void UnsetDefault()  => IsDefault = false;
}
