namespace SupplyChain.Payment.Application.DTOs;

public record CreditCheckDto(
    bool    Approved,
    decimal AvailableCredit,
    decimal CreditLimit,
    decimal CurrentOutstanding
);
