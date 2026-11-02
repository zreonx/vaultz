using Vaultz.Application.Features.Auth;

namespace Vaultz.Application.Common.Interfaces;

public interface IAuthService
{
    Task<AuthResultResponse> RegisterAsync(
        RegisterUserCommand command,
        string? clientIp = null,
        string? userAgent = null,
        CancellationToken cancellationToken = default);

    Task<AuthResultResponse> LoginAsync(
        LoginUserCommand command,
        string? clientIp = null,
        string? userAgent = null,
        CancellationToken cancellationToken = default);

    Task<AuthResultResponse> VerifyEmailAsync(
        VerifyEmailCommand command,
        string? clientIp = null,
        string? userAgent = null,
        CancellationToken cancellationToken = default);

    Task ResendVerificationEmailAsync(
        ResendVerificationCommand command,
        CancellationToken cancellationToken = default);

    Task<AuthResultResponse> VerifyTwoFactorAsync(
        VerifyTwoFactorCommand command,
        string? clientIp = null,
        string? userAgent = null,
        CancellationToken cancellationToken = default);

    Task<TwoFactorSetupResponse> SetupTwoFactorAsync(
        string userId,
        CancellationToken cancellationToken = default);

    Task<AuthResultResponse> ConfirmTwoFactorAsync(
        string userId,
        ConfirmTwoFactorCommand command,
        CancellationToken cancellationToken = default);

    Task<AuthResultResponse> DisableTwoFactorAsync(
        string userId,
        DisableTwoFactorCommand command,
        CancellationToken cancellationToken = default);

    Task ForgotPasswordAsync(
        ForgotPasswordCommand command,
        CancellationToken cancellationToken = default);

    Task<AuthResultResponse> ResetPasswordAsync(
        ResetPasswordCommand command,
        string? clientIp = null,
        string? userAgent = null,
        CancellationToken cancellationToken = default);

    Task<UserProfileResponse?> GetCurrentUserProfileAsync(
        string userId,
        CancellationToken cancellationToken = default);

    Task<AuthResultResponse> UpdateDefaultCurrencyAsync(
        string userId,
        string defaultCurrencyCode,
        CancellationToken cancellationToken = default);

    Task<AuthResultResponse> UpdateProfileAsync(
        string userId,
        UpdateProfileCommand command,
        CancellationToken cancellationToken = default);

    Task<AuthResultResponse> ChangePasswordAsync(
        string userId,
        ChangePasswordCommand command,
        CancellationToken cancellationToken = default);
}
