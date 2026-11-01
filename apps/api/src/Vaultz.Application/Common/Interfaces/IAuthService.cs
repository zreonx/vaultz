using Vaultz.Application.Features.Auth;

namespace Vaultz.Application.Common.Interfaces;

public interface IAuthService
{
    Task<AuthResultResponse> RegisterAsync(RegisterUserCommand command, CancellationToken cancellationToken = default);
    Task<AuthResultResponse> LoginAsync(LoginUserCommand command, CancellationToken cancellationToken = default);
    Task<UserProfileResponse?> GetCurrentUserProfileAsync(string userId, CancellationToken cancellationToken = default);
    Task<AuthResultResponse> UpdateDefaultCurrencyAsync(string userId, string defaultCurrencyCode, CancellationToken cancellationToken = default);
    Task<AuthResultResponse> UpdateProfileAsync(string userId, UpdateProfileCommand command, CancellationToken cancellationToken = default);
    Task<AuthResultResponse> ChangePasswordAsync(string userId, ChangePasswordCommand command, CancellationToken cancellationToken = default);
}
