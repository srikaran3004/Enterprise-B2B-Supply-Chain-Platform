using System.Text.Json.Serialization;

namespace SupplyChain.SharedInfrastructure.Contracts;

public sealed record EventEnvelope<TPayload>(
    [property: JsonPropertyName("eventId")] Guid EventId,
    [property: JsonPropertyName("eventType")] string EventType,
    [property: JsonPropertyName("occurredAt")] DateTime OccurredAt,
    [property: JsonPropertyName("correlationId")] string? CorrelationId,
    [property: JsonPropertyName("source")] string Source,
    [property: JsonPropertyName("payload")] TPayload Payload);
