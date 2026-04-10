namespace SupplyChain.SharedInfrastructure.Observability;

public sealed class ObservabilityOptions
{
    public const string SectionName = "Observability";

    /// <summary>Relative or absolute root path for service log files.</summary>
    public string LogsRoot { get; set; } = "logs";

    /// <summary>Retention in days for dated log folders (allowed range: 7-30).</summary>
    public int RetentionDays { get; set; } = 14;

    /// <summary>When false, only console logging is enabled.</summary>
    public bool EnableFileLogging { get; set; } = true;
}

