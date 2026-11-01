namespace Vaultz.Application.Common.Interfaces;

/// <summary>
/// Resolves the currently authenticated user's identity from server-verified claims.
/// Never trusts user IDs supplied in client request bodies or query strings.
/// </summary>
public interface ICurrentUserService
{
    string? UserId { get; }
    string? Email { get; }
    bool IsAuthenticated { get; }
    string GetRequiredUserId();
}
