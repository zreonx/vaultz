namespace Vaultz.Application.Common.Interfaces;

public interface IEmailService
{
    Task SendEmailVerificationAsync(
        string toEmail,
        string fullName,
        string otpCode,
        string verificationLink,
        CancellationToken cancellationToken = default);

    Task SendTwoFactorOtpAsync(
        string toEmail,
        string fullName,
        string otpCode,
        CancellationToken cancellationToken = default);

    Task SendPasswordResetAsync(
        string toEmail,
        string fullName,
        string otpCode,
        string resetLink,
        CancellationToken cancellationToken = default);

    Task SendNewDeviceLoginAlertAsync(
        string toEmail,
        string fullName,
        string ipAddress,
        string userAgent,
        DateTimeOffset loginTimeUtc,
        CancellationToken cancellationToken = default);

    Task SendSecurityAlertAsync(
        string toEmail,
        string fullName,
        string title,
        string description,
        CancellationToken cancellationToken = default);
}
