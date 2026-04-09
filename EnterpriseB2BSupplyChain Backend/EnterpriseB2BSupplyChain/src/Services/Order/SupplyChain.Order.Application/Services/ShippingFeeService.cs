namespace SupplyChain.Order.Application.Services;

/// <summary>
/// Calculates delivery charges based on the destination state.
/// HQ is in Mumbai, Maharashtra. Charges increase with distance.
/// </summary>
public static class ShippingFeeService
{
    // State-wise flat shipping fee in INR (from Mumbai HQ)
    private static readonly Dictionary<string, decimal> StateFees = new(StringComparer.OrdinalIgnoreCase)
    {
        // Mumbai HQ state — lowest fee
        { "Maharashtra",        250m  },

        // Neighbouring states
        { "Goa",                400m  },
        { "Gujarat",            450m  },
        { "Madhya Pradesh",     500m  },
        { "Karnataka",          550m  },
        { "Telangana",          600m  },
        { "Andhra Pradesh",     620m  },

        // Mid-distance states
        { "Chhattisgarh",       650m  },
        { "Tamil Nadu",         700m  },
        { "Kerala",             720m  },
        { "Rajasthan",          750m  },
        { "Delhi",              800m  },
        { "Haryana",            820m  },
        { "Uttar Pradesh",      850m  },

        // Farther states
        { "West Bengal",        950m  },
        { "Odisha",             900m  },
        { "Jharkhand",          880m  },
        { "Bihar",              970m  },
        { "Punjab",             900m  },
        { "Uttarakhand",        920m  },
        { "Himachal Pradesh",   950m  },
        { "Jammu and Kashmir",  1200m },
        { "Ladakh",             1500m },

        // North-East — highest
        { "Assam",              1100m },
        { "Meghalaya",          1150m },
        { "Tripura",            1200m },
        { "Manipur",            1250m },
        { "Mizoram",            1250m },
        { "Nagaland",           1300m },
        { "Arunachal Pradesh",  1350m },
        { "Sikkim",             1150m },
    };

    private const decimal DefaultFee = 800m;

    public static decimal Calculate(string? destinationState)
    {
        if (string.IsNullOrWhiteSpace(destinationState))
            return DefaultFee;

        return StateFees.TryGetValue(destinationState.Trim(), out var fee)
            ? fee
            : DefaultFee;
    }
}
