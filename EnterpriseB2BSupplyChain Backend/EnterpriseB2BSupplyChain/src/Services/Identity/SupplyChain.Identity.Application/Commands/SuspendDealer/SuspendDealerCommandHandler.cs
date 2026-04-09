using MediatR;
using SupplyChain.Identity.Application.Abstractions;
using SupplyChain.Identity.Application.Email;

namespace SupplyChain.Identity.Application.Commands.SuspendDealer;

public class SuspendDealerCommandHandler : IRequestHandler<SuspendDealerCommand>
{
    private readonly IUserRepository _userRepository;
    private readonly IEmailService _emailService;

    public SuspendDealerCommandHandler(IUserRepository userRepository, IEmailService emailService)
    {
        _userRepository = userRepository;
        _emailService = emailService;
    }

    public async Task Handle(SuspendDealerCommand command, CancellationToken ct)
    {
        var user = await _userRepository.GetByIdAsync(command.DealerId, ct)
            ?? throw new KeyNotFoundException($"Dealer {command.DealerId} not found.");

        user.Suspend();
        await _userRepository.SaveChangesAsync(ct);

        var subject = "Account Suspended — HUL Supply Chain Platform";

        var bodyHtml =
            HulEmailLayout.Greeting(user.FullName) +
            HulEmailLayout.Paragraph(
                "Your dealer account on the HUL Supply Chain Platform has been temporarily suspended " +
                "by our administration team.") +
            HulEmailLayout.InfoBox(
                "Reason for Suspension",
                HulEmailLayout.Escape(command.Reason),
                "warning") +
            HulEmailLayout.Paragraph(
                "During the suspension period, you will not be able to place orders or access the dealer portal.") +
            HulEmailLayout.Paragraph(
                "If you believe this was done in error or have resolved the underlying issue, " +
                "please contact our support team to request a review of your account.") +
            HulEmailLayout.Signoff();

        var html = HulEmailLayout.Wrap(
            title:       "Account Suspended",
            bodyHtml:    bodyHtml,
            preheader:   "Your dealer account has been temporarily suspended.",
            accentColor: HulEmailLayout.Warning);

        await _emailService.SendEmailAsync(user.Email, subject, html, isHtml: true, ct);
    }
}
