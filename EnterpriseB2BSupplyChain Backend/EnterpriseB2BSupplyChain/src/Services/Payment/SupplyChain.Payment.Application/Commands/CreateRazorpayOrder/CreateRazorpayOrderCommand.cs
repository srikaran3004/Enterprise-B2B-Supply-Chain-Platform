using MediatR;
using Razorpay.Api;
using Microsoft.Extensions.Configuration;

namespace SupplyChain.Payment.Application.Commands.CreateRazorpayOrder;

public record CreateRazorpayOrderCommand(decimal AmountInInr, string ReceiptId) : IRequest<string>;

public class CreateRazorpayOrderCommandHandler : IRequestHandler<CreateRazorpayOrderCommand, string>
{
    private readonly IConfiguration _config;

    public CreateRazorpayOrderCommandHandler(IConfiguration config)
    {
        _config = config;
    }

    public Task<string> Handle(CreateRazorpayOrderCommand request, CancellationToken ct)
    {
        var keyId = _config["Razorpay:KeyId"];
        var keySecret = _config["Razorpay:KeySecret"];

        if (string.IsNullOrEmpty(keyId) || string.IsNullOrEmpty(keySecret))
            throw new InvalidOperationException("Razorpay secrets are not configured. Please check appsettings.json.");

        var client = new RazorpayClient(keyId, keySecret);

        var amountInPaise = (int)(request.AmountInInr * 100);

        var options = new Dictionary<string, object>
        {
            { "amount", amountInPaise },
            { "currency", "INR" },
            { "receipt", request.ReceiptId }
        };

        var order = client.Order.Create(options);
        var orderId = order["id"].ToString();

        return Task.FromResult(orderId);
    }
}
