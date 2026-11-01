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
        var result = await _handlers.RegisterAsync(command, cancellationToken);
        AppendJwtCookie(result.AccessToken, result.ExpiresAtUtc);
        return CreatedAtAction(nameof(GetMe), result);
    }

    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResultResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthResultResponse>> Login(
        [FromBody] LoginUserCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _handlers.LoginAsync(command, cancellationToken);
        AppendJwtCookie(result.AccessToken, result.ExpiresAtUtc);
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
