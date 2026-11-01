using System.Security.Claims;
using Vaultz.Application.Common.Exceptions;
using Vaultz.Application.Common.Interfaces;

namespace Vaultz.Api.Services;

/// <summary>
/// Resolves the authenticated user strictly from server-side HttpContext claims.
/// </summary>
public sealed class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string? UserId =>
        _httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);

    public string? Email =>
        _httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.Email);

    public bool IsAuthenticated =>
        _httpContextAccessor.HttpContext?.User.Identity?.IsAuthenticated ?? false;

    public string GetRequiredUserId()
    {
        var userId = UserId;
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new UnauthorizedAppException("User is not authenticated.");
        }

        return userId;
    }
}
