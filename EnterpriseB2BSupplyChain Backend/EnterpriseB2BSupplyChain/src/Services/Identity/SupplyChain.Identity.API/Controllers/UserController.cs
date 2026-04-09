using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SupplyChain.Identity.Application.Commands.UpdateProfilePicture;
using SupplyChain.Identity.Application.Commands.Password;

namespace SupplyChain.Identity.API.Controllers;

[ApiController]
[Route("api/users")]
public class UserController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IWebHostEnvironment _env;

    public UserController(IMediator mediator, IWebHostEnvironment env)
    {
        _mediator = mediator;
        _env = env;
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value 
            ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
    }

    [HttpPost("profile-picture")]
    [Authorize]
    public async Task<IActionResult> UploadProfilePicture(IFormFile file, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        // Create wwwroot/profile-pictures directory if it doesn't exist
        var uploadsDir = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "profile-pictures");
        Directory.CreateDirectory(uploadsDir);

        // Generate a unique file name
        var fileExtension = Path.GetExtension(file.FileName);
        var fileName = $"{userId}_{Guid.NewGuid():N}{fileExtension}";
        var filePath = Path.Combine(uploadsDir, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream, ct);
        }

        // Generate the URL (assuming Identity API is hosted, we could return a relative path or full URL)
        var url = $"/profile-pictures/{fileName}";

        // Update the user's profile picture URL in the database
        await _mediator.Send(new UpdateProfilePictureCommand(userId, url), ct);

        return Ok(new { url });
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangePasswordRequest request,
        CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        try
        {
            var message = await _mediator.Send(
                new ChangePasswordCommand(userId, request.CurrentPassword, request.NewPassword),
                ct
            );
            return Ok(new { message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
