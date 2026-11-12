using System.Collections.Concurrent;
using Vaultz.Application.Common.Interfaces;

namespace Vaultz.IntegrationTests.Fakes;

public sealed class FakeEmailService : IEmailService
{
    public sealed record SentEmailRecord(
        string ToEmail,
        string Subject,
        string? OtpCode,
        string? Link);

    public ConcurrentBag<SentEmailRecord> SentEmails { get; } = new();

    public Task SendEmailVerificationAsync(
        string toEmail,
        string fullName,
        string otpCode,
        string verificationLink,
        CancellationToken cancellationToken = default)
    {
        SentEmails.Add(new SentEmailRecord(toEmail, "Email Verification", otpCode, verificationLink));
        return Task.CompletedTask;
    }

    public Task SendTwoFactorOtpAsync(
        string toEmail,
        string fullName,
        string otpCode,
        CancellationToken cancellationToken = default)
    {
        SentEmails.Add(new SentEmailRecord(toEmail, "Two-Factor Authentication", otpCode, null));
        return Task.CompletedTask;
    }

    public Task SendPasswordResetAsync(
        string toEmail,
        string fullName,
        string otpCode,
        string resetLink,
        CancellationToken cancellationToken = default)
    {
        SentEmails.Add(new SentEmailRecord(toEmail, "Password Reset", otpCode, resetLink));
        return Task.CompletedTask;
    }

    public Task SendNewDeviceLoginAlertAsync(
        string toEmail,
        string fullName,
        string ipAddress,
        string userAgent,
        DateTimeOffset loginTimeUtc,
        CancellationToken cancellationToken = default)
    {
        SentEmails.Add(new SentEmailRecord(toEmail, "New Device Login Alert", null, null));
        return Task.CompletedTask;
    }

    public Task SendSecurityAlertAsync(
        string toEmail,
        string fullName,
        string title,
        string description,
        CancellationToken cancellationToken = default)
    {
        SentEmails.Add(new SentEmailRecord(toEmail, $"Security Alert: {title}", null, null));
        return Task.CompletedTask;
    }
}
