using MediatR;
using SupplyChain.Identity.Application.Abstractions;
using SupplyChain.Identity.Application.Email;

namespace SupplyChain.Identity.Application.Commands.DeleteDealer;

public class DeleteDealerCommandHandler : IRequestHandler<DeleteDealerCommand>
{
    private readonly IUserRepository _userRepository;
    private readonly IEmailService _emailService;

    public DeleteDealerCommandHandler(IUserRepository userRepository, IEmailService emailService)
    {
        _userRepository = userRepository;
        _emailService = emailService;
    }

    public async Task Handle(DeleteDealerCommand command, CancellationToken ct)
    {
        var user = await _userRepository.GetByIdAsync(command.DealerId, ct)
            ?? throw new KeyNotFoundException($"Dealer {command.DealerId} not found.");

        var dealerEmail = user.Email;
        var dealerName  = user.FullName;

        // Soft delete: mark as deleted and suspend the account.
        // The global EF query filter will exclude this user from all future queries.
        user.SoftDelete();
        await _userRepository.SaveChangesAsync(ct);

        var subject = "Account Deletion Notice — HUL Supply Chain Platform";

        var bodyHtml =
            HulEmailLayout.Greeting(dealerName) +
            HulEmailLayout.Paragraph(
                "We regret to inform you that your dealer account on the HUL Supply Chain Platform " +
                "has been permanently deleted by our administration team.") +
            HulEmailLayout.InfoBox(
                "Reason for Deletion",
                HulEmailLayout.Escape(command.Reason),
                "danger") +
            HulEmailLayout.Paragraph(
                "<strong>This action is permanent.</strong> Your account has been deactivated and " +
                "cannot be recovered.") +
            HulEmailLayout.Paragraph(
                "If you believe this was done in error or have any questions regarding this decision, " +
                "please contact our support team immediately.") +
            HulEmailLayout.Signoff();

        var html = HulEmailLayout.Wrap(
            title:       "Account Deletion Notice",
            bodyHtml:    bodyHtml,
            preheader:   "Your dealer account has been permanently deleted.",
            accentColor: HulEmailLayout.Danger);

        await _emailService.SendEmailAsync(dealerEmail, subject, html, isHtml: true, ct);
    }
}
