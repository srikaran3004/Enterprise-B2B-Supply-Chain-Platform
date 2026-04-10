using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SupplyChain.Identity.Application.Commands.Login;
using SupplyChain.Identity.Application.Commands.Password;
using SupplyChain.Identity.Application.Commands.RegisterDealer;

namespace SupplyChain.Identity.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private const string RefreshTokenCookieName = "hul_refresh_token";
    private const int RefreshTokenExpiryDays = 7;

    private readonly IMediator _mediator;

    public AuthController(IMediator mediator)
        => _mediator = mediator;

    /// <summary>Dealer registration step-1: send OTP to email.</summary>
    [HttpPost("register")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Register(
        [FromBody] RegisterDealerCommand command,
        CancellationToken ct)
    {
        var message = await _mediator.Send(command, ct);
        return Ok(new { Message = message });
    }

    public record ResetPasswordRequest(string CurrentPassword, string NewPassword);
    public record RefreshTokenRequest(string? RefreshToken);
    public record LogoutRequest(string? RefreshToken);

    /// <summary>Dealer registration step-2: verify OTP and complete registration.</summary>
    [HttpPost("register/verify-otp")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> VerifyRegistrationOtp(
        [FromBody] VerifyDealerRegistrationOtpCommand command,
        CancellationToken ct)
    {
        var userId = await _mediator.Send(command, ct);
        return CreatedAtAction(nameof(VerifyRegistrationOtp), new { userId }, new
        {
            UserId = userId,
            Message = "Registration successful. Your account is pending Admin approval."
        });
    }

    /// <summary>Login with email and password. Returns JWT access token.</summary>
    [HttpPost("login")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login(
        [FromBody] LoginCommand command,
        CancellationToken ct)
    {
        var result = await _mediator.Send(command, ct);
        SetRefreshCookie(result.RefreshToken);
        return Ok(result with { RefreshToken = null });
    }

    [HttpPost("login/verify-otp")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> VerifyLoginOtp(
        [FromBody] VerifyDealerLoginOtpCommand command,
        CancellationToken ct)
    {
        var result = await _mediator.Send(command, ct);
        SetRefreshCookie(result.RefreshToken);
        return Ok(result with { RefreshToken = null });
    }

    [HttpPost("refresh")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh(
        [FromBody] RefreshTokenRequest? request,
        CancellationToken ct)
    {
        var refreshToken = request?.RefreshToken;
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            refreshToken = Request.Cookies[RefreshTokenCookieName];
        }

        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            throw new UnauthorizedAccessException("Refresh token is required.");
        }

        var result = await _mediator.Send(new RefreshAccessTokenCommand(refreshToken), ct);
        SetRefreshCookie(result.RefreshToken);
        return Ok(result with { RefreshToken = null });
    }

    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Logout(
        [FromBody] LogoutRequest? request,
        CancellationToken ct)
    {
        var refreshToken = request?.RefreshToken;
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            refreshToken = Request.Cookies[RefreshTokenCookieName];
        }

        await _mediator.Send(new LogoutCommand(refreshToken), ct);
        ClearRefreshCookie();
        return Ok(new { Message = "Logged out successfully." });
    }

    [Authorize]
    [HttpPost("logout-all")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> LogoutAll(CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        await _mediator.Send(new RevokeAllSessionsCommand(userId), ct);
        ClearRefreshCookie();
        return Ok(new { Message = "All sessions revoked successfully." });
    }

    [HttpPost("forgot-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ForgotPassword(
        [FromBody] RequestForgotPasswordOtpCommand command,
        CancellationToken ct)
    {
        var message = await _mediator.Send(command, ct);
        return Ok(new { Message = message });
    }

    [HttpPost("forgot-password/reset")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ResetPasswordWithOtp(
        [FromBody] ResetPasswordWithOtpCommand command,
        CancellationToken ct)
    {
        var message = await _mediator.Send(command, ct);
        return Ok(new { Message = message });
    }

    [Authorize(Roles = "Dealer")]
    [HttpPost("reset-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ResetPassword(
        [FromBody] ResetPasswordRequest request,
        CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        var message = await _mediator.Send(new ChangePasswordCommand(userId, request.CurrentPassword, request.NewPassword), ct);
        return Ok(new { Message = message });
    }

    private Guid GetCurrentUserId()
    {
        var sub = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst("sub")?.Value;

        return Guid.TryParse(sub, out var id) ? id : Guid.Empty;
    }

    private void SetRefreshCookie(string? refreshToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return;
        }

        Response.Cookies.Append(
            RefreshTokenCookieName,
            refreshToken,
            new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps,
                SameSite = SameSiteMode.Lax,
                Expires = DateTimeOffset.UtcNow.AddDays(RefreshTokenExpiryDays),
                Path = "/api/auth"
            });
    }

    private void ClearRefreshCookie()
    {
        Response.Cookies.Delete(
            RefreshTokenCookieName,
            new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps,
                SameSite = SameSiteMode.Lax,
                Path = "/api/auth"
            });
    }
}
