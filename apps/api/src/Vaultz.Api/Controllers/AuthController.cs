using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Vaultz.Application.Common.Exceptions;
using Vaultz.Application.Features.Auth;
using Vaultz.Infrastructure.Authentication;

namespace Vaultz.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
[Produces("application/json")]
public sealed class AuthController : ControllerBase
{
    private readonly AuthHandlers _handlers;
    private readonly JwtOptions _jwtOptions;

    public AuthController(
        AuthHandlers handlers,
        IOptions<JwtOptions> jwtOptions)
    {
        _handlers = handlers;
        _jwtOptions = jwtOptions.Value;
    }

    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResultResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<AuthResultResponse>> Register(
        [FromBody] RegisterUserCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _handlers.RegisterAsync(command, GetClientIp(), GetUserAgent(), cancellationToken);
        if (!string.IsNullOrEmpty(result.AccessToken))
        {
            AppendJwtCookie(result.AccessToken, result.ExpiresAtUtc);
        }
        return CreatedAtAction(nameof(GetMe), result);
    }

    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResultResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthResultResponse>> Login(
        [FromBody] LoginUserCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _handlers.LoginAsync(command, GetClientIp(), GetUserAgent(), cancellationToken);
        if (!string.IsNullOrEmpty(result.AccessToken))
        {
            AppendJwtCookie(result.AccessToken, result.ExpiresAtUtc);
        }
        return Ok(result);
    }

    [HttpPost("verify-email")]
    [ProducesResponseType(typeof(AuthResultResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthResultResponse>> VerifyEmail(
        [FromBody] VerifyEmailCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _handlers.VerifyEmailAsync(command, GetClientIp(), GetUserAgent(), cancellationToken);
        if (!string.IsNullOrEmpty(result.AccessToken))
        {
            AppendJwtCookie(result.AccessToken, result.ExpiresAtUtc);
        }
        return Ok(result);
    }

    [HttpPost("resend-verification")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ResendVerification(
        [FromBody] ResendVerificationCommand command,
        CancellationToken cancellationToken)
    {
        await _handlers.ResendVerificationEmailAsync(command, cancellationToken);
        return Ok(new { message = "If the account exists and is unverified, a new verification email has been sent." });
    }

    [HttpPost("verify-2fa")]
    [ProducesResponseType(typeof(AuthResultResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthResultResponse>> VerifyTwoFactor(
        [FromBody] VerifyTwoFactorCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _handlers.VerifyTwoFactorAsync(command, GetClientIp(), GetUserAgent(), cancellationToken);
        if (!string.IsNullOrEmpty(result.AccessToken))
        {
            AppendJwtCookie(result.AccessToken, result.ExpiresAtUtc);
        }
        return Ok(result);
    }

    [Authorize]
    [HttpPost("2fa/setup")]
    [ProducesResponseType(typeof(TwoFactorSetupResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<TwoFactorSetupResponse>> SetupTwoFactor(CancellationToken cancellationToken)
    {
        var result = await _handlers.SetupTwoFactorAsync(cancellationToken);
        return Ok(result);
    }

    [Authorize]
    [HttpPost("2fa/confirm")]
    [ProducesResponseType(typeof(AuthResultResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthResultResponse>> ConfirmTwoFactor(
        [FromBody] ConfirmTwoFactorCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _handlers.ConfirmTwoFactorAsync(command, cancellationToken);
        if (!string.IsNullOrEmpty(result.AccessToken))
        {
            AppendJwtCookie(result.AccessToken, result.ExpiresAtUtc);
        }
        return Ok(result);
    }

    [Authorize]
    [HttpPost("2fa/disable")]
    [ProducesResponseType(typeof(AuthResultResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthResultResponse>> DisableTwoFactor(
        [FromBody] DisableTwoFactorCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _handlers.DisableTwoFactorAsync(command, cancellationToken);
        if (!string.IsNullOrEmpty(result.AccessToken))
        {
            AppendJwtCookie(result.AccessToken, result.ExpiresAtUtc);
        }
        return Ok(result);
    }

    [HttpPost("forgot-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ForgotPassword(
        [FromBody] ForgotPasswordCommand command,
        CancellationToken cancellationToken)
    {
        await _handlers.ForgotPasswordAsync(command, cancellationToken);
        return Ok(new { message = "If the account exists, a password reset code has been sent." });
    }

    [HttpPost("reset-password")]
    [ProducesResponseType(typeof(AuthResultResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthResultResponse>> ResetPassword(
        [FromBody] ResetPasswordCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _handlers.ResetPasswordAsync(command, GetClientIp(), GetUserAgent(), cancellationToken);
        if (!string.IsNullOrEmpty(result.AccessToken))
        {
            AppendJwtCookie(result.AccessToken, result.ExpiresAtUtc);
        }
        return Ok(result);
    }

    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public IActionResult Logout()
    {
        DeleteJwtCookie();
        return NoContent();
    }

    [AllowAnonymous]
    [HttpGet("me")]
    [ProducesResponseType(typeof(UserProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<ActionResult<UserProfileResponse>> GetMe(CancellationToken cancellationToken)
    {
        if (User.Identity?.IsAuthenticated != true)
        {
            return NoContent();
        }

        try
        {
            var profile = await _handlers.GetMeAsync(cancellationToken);
            return Ok(profile);
        }
        catch (UnauthorizedAppException)
        {
            DeleteJwtCookie();
            return NoContent();
        }
    }

    [Authorize]
    [HttpPut("currency")]
    [ProducesResponseType(typeof(AuthResultResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthResultResponse>> UpdateDefaultCurrency(
        [FromBody] UpdateDefaultCurrencyCommand command,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _handlers.UpdateDefaultCurrencyAsync(command, cancellationToken);
            AppendJwtCookie(result.AccessToken, result.ExpiresAtUtc);
            return Ok(result);
        }
        catch (UnauthorizedAppException)
        {
            DeleteJwtCookie();
            throw;
        }
    }

    [Authorize]
    [HttpPut("profile")]
    [ProducesResponseType(typeof(AuthResultResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthResultResponse>> UpdateProfile(
        [FromBody] UpdateProfileCommand command,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _handlers.UpdateProfileAsync(command, cancellationToken);
            AppendJwtCookie(result.AccessToken, result.ExpiresAtUtc);
            return Ok(result);
        }
        catch (UnauthorizedAppException)
        {
            DeleteJwtCookie();
            throw;
        }
    }

    [Authorize]
    [HttpPut("password")]
    [ProducesResponseType(typeof(AuthResultResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthResultResponse>> ChangePassword(
        [FromBody] ChangePasswordCommand command,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _handlers.ChangePasswordAsync(command, cancellationToken);
            AppendJwtCookie(result.AccessToken, result.ExpiresAtUtc);
            return Ok(result);
        }
        catch (UnauthorizedAppException)
        {
            DeleteJwtCookie();
            throw;
        }
    }

    private string? GetClientIp()
    {
        if (Request.Headers.TryGetValue("X-Forwarded-For", out var forwardedFor) && !string.IsNullOrWhiteSpace(forwardedFor))
        {
            return forwardedFor.ToString().Split(',')[0].Trim();
        }

        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }

    private string? GetUserAgent()
    {
        return Request.Headers.UserAgent.ToString();
    }

    private void AppendJwtCookie(string token, DateTimeOffset expiresAtUtc)
    {
        Response.Cookies.Append(_jwtOptions.CookieName, token, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = Request.IsHttps,
            Expires = expiresAtUtc,
            Path = "/"
        });
    }

    private void DeleteJwtCookie()
    {
        Response.Cookies.Delete(_jwtOptions.CookieName, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Secure = Request.IsHttps,
            Path = "/"
        });
    }
}
