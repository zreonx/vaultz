using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Vaultz.Application.Common.Interfaces;

namespace Vaultz.Infrastructure.Email;

public sealed class ResendEmailService : IEmailService
{
    private readonly HttpClient _httpClient;
    private readonly ResendOptions _options;
    private readonly ILogger<ResendEmailService> _logger;

    public ResendEmailService(
        HttpClient httpClient,
        IOptions<ResendOptions> options,
        ILogger<ResendEmailService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendEmailVerificationAsync(
        string toEmail,
        string fullName,
        string otpCode,
        string verificationLink,
        CancellationToken cancellationToken = default)
    {
        var subject = $"{otpCode} is your Vaultz verification code";
        var content = $"""
            <h2 style="font-size: 20px; font-weight: 700; color: #1C1B18; margin: 0 0 12px 0;">Verify your email address</h2>
            <p style="font-size: 14px; line-height: 22px; color: #6E6A63; margin: 0 0 20px 0;">
                Hello {System.Net.WebUtility.HtmlEncode(fullName)},<br/>
                Welcome to Vaultz! To complete your registration and activate your isolated financial workspace, please verify your email address.
            </p>
            <div style="background-color: #EAF2EF; border: 1px solid rgba(42, 107, 88, 0.25); border-radius: 12px; padding: 22px; text-align: center; margin: 24px 0;">
                <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #2A6B58; margin-bottom: 6px; text-transform: uppercase;">6-Digit Verification Code</div>
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1C1B18;">{otpCode}</div>
                <div style="font-size: 12px; color: #6E6A63; margin-top: 6px;">Valid for 15 minutes</div>
            </div>
            <p style="font-size: 14px; line-height: 22px; color: #6E6A63; margin: 0 0 24px 0;">
                Alternatively, click the secure verification button below:
            </p>
            <div style="text-align: center; margin: 28px 0;">
                <a href="{verificationLink}" style="display: inline-block; background-color: #2A6B58; color: #FDFCFB; font-weight: 600; font-size: 14px; text-decoration: none; padding: 13px 28px; border-radius: 10px;">
                    Verify Email Address
                </a>
            </div>
            <p style="font-size: 12px; line-height: 18px; color: #8E8A82; margin: 24px 0 0 0;">
                If you did not create a Vaultz account, you can safely ignore this email.
            </p>
        """;

        await SendEmailAsync(toEmail, subject, WrapInTemplate("Email Verification", content), cancellationToken);
    }

    public async Task SendTwoFactorOtpAsync(
        string toEmail,
        string fullName,
        string otpCode,
        CancellationToken cancellationToken = default)
    {
        var subject = $"{otpCode} is your Vaultz two-factor code";
        var content = $"""
            <h2 style="font-size: 20px; font-weight: 700; color: #1C1B18; margin: 0 0 12px 0;">Two-Factor Authentication</h2>
            <p style="font-size: 14px; line-height: 22px; color: #6E6A63; margin: 0 0 20px 0;">
                Hello {System.Net.WebUtility.HtmlEncode(fullName)},<br/>
                A sign-in request was made for your Vaultz account. Use the one-time authentication code below to complete your sign-in:
            </p>
            <div style="background-color: #EAF2EF; border: 1px solid rgba(42, 107, 88, 0.25); border-radius: 12px; padding: 22px; text-align: center; margin: 24px 0;">
                <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #2A6B58; margin-bottom: 6px; text-transform: uppercase;">2FA Security Code</div>
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1C1B18;">{otpCode}</div>
                <div style="font-size: 12px; color: #6E6A63; margin-top: 6px;">Valid for 10 minutes</div>
            </div>
            <p style="font-size: 12px; line-height: 18px; color: #8E8A82; margin: 20px 0 0 0;">
                Never share this code with anyone. If you did not attempt to sign in, change your password immediately.
            </p>
        """;

        await SendEmailAsync(toEmail, subject, WrapInTemplate("Two-Factor Sign-In", content), cancellationToken);
    }

    public async Task SendPasswordResetAsync(
        string toEmail,
        string fullName,
        string otpCode,
        string resetLink,
        CancellationToken cancellationToken = default)
    {
        var subject = "Reset your Vaultz password";
        var content = $"""
            <h2 style="font-size: 20px; font-weight: 700; color: #1C1B18; margin: 0 0 12px 0;">Reset Your Password</h2>
            <p style="font-size: 14px; line-height: 22px; color: #6E6A63; margin: 0 0 20px 0;">
                Hello {System.Net.WebUtility.HtmlEncode(fullName)},<br/>
                We received a request to reset the password for your Vaultz account. Click the button below to choose a new password:
            </p>
            <div style="text-align: center; margin: 28px 0;">
                <a href="{resetLink}" style="display: inline-block; background-color: #2A6B58; color: #FDFCFB; font-weight: 600; font-size: 14px; text-decoration: none; padding: 13px 28px; border-radius: 10px;">
                    Reset Password
                </a>
            </div>
            <div style="background-color: #F5F3ED; border: 1px solid #E6E4DD; border-radius: 10px; padding: 14px; text-align: center; margin: 20px 0;">
                <div style="font-size: 11px; font-weight: 600; color: #6E6A63; margin-bottom: 4px;">OR ENTER THIS RESET CODE</div>
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 22px; font-weight: 700; letter-spacing: 4px; color: #1C1B18;">{otpCode}</div>
            </div>
            <p style="font-size: 12px; line-height: 18px; color: #8E8A82; margin: 20px 0 0 0;">
                This link and code will expire in 15 minutes. If you did not request a password reset, you can safely disregard this email.
            </p>
        """;

        await SendEmailAsync(toEmail, subject, WrapInTemplate("Password Recovery", content), cancellationToken);
    }

    public async Task SendNewDeviceLoginAlertAsync(
        string toEmail,
        string fullName,
        string ipAddress,
        string userAgent,
        DateTimeOffset loginTimeUtc,
        CancellationToken cancellationToken = default)
    {
        var subject = "Security Alert: New sign-in to your Vaultz account";
        var content = $"""
            <h2 style="font-size: 20px; font-weight: 700; color: #1C1B18; margin: 0 0 12px 0;">New Sign-In Detected</h2>
            <p style="font-size: 14px; line-height: 22px; color: #6E6A63; margin: 0 0 20px 0;">
                Hello {System.Net.WebUtility.HtmlEncode(fullName)},<br/>
                Your Vaultz account was recently signed into from a new browser or device:
            </p>
            <div style="background-color: #F5F3ED; border: 1px solid #E6E4DD; border-radius: 12px; padding: 18px; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <tr>
                        <td style="padding: 6px 0; color: #6E6A63; font-weight: 600;">Time:</td>
                        <td style="padding: 6px 0; color: #1C1B18; text-align: right;">{loginTimeUtc:yyyy-MM-dd HH:mm:ss} UTC</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; color: #6E6A63; font-weight: 600;">IP Address:</td>
                        <td style="padding: 6px 0; color: #1C1B18; text-align: right;">{System.Net.WebUtility.HtmlEncode(ipAddress)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; color: #6E6A63; font-weight: 600;">Client:</td>
                        <td style="padding: 6px 0; color: #1C1B18; text-align: right; max-width: 220px; word-break: break-all;">{System.Net.WebUtility.HtmlEncode(userAgent)}</td>
                    </tr>
                </table>
            </div>
            <p style="font-size: 13px; line-height: 20px; color: #6E6A63; margin: 20px 0 0 0;">
                If this was you, you don't need to do anything. If this was not you, someone else may have gained access to your credentials. Please change your password immediately.
            </p>
        """;

        await SendEmailAsync(toEmail, subject, WrapInTemplate("Security Alert", content), cancellationToken);
    }

    public async Task SendSecurityAlertAsync(
        string toEmail,
        string fullName,
        string title,
        string description,
        CancellationToken cancellationToken = default)
    {
        var subject = $"Security Alert: {title}";
        var content = $"""
            <h2 style="font-size: 20px; font-weight: 700; color: #B43C3C; margin: 0 0 12px 0;">{System.Net.WebUtility.HtmlEncode(title)}</h2>
            <p style="font-size: 14px; line-height: 22px; color: #6E6A63; margin: 0 0 20px 0;">
                Hello {System.Net.WebUtility.HtmlEncode(fullName)},<br/>
                {System.Net.WebUtility.HtmlEncode(description)}
            </p>
            <div style="background-color: #FBECEC; border: 1px solid rgba(180, 60, 60, 0.25); border-radius: 12px; padding: 16px; margin: 20px 0;">
                <p style="font-size: 13px; color: #B43C3C; margin: 0; font-weight: 600;">
                    Action Required: If you suspect unauthorized activity, sign in and review your security settings.
                </p>
            </div>
        """;

        await SendEmailAsync(toEmail, subject, WrapInTemplate("Security Notification", content), cancellationToken);
    }

    private async Task SendEmailAsync(string toEmail, string subject, string htmlContent, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            _logger.LogWarning("Resend API key is not configured. Email to {ToEmail} with subject '{Subject}' was not sent.", toEmail, subject);
            return;
        }

        try
        {
            var recipient = toEmail;
            var displaySubject = subject;

            if (!string.IsNullOrWhiteSpace(_options.DevRedirectEmail) &&
                !string.Equals(toEmail, _options.DevRedirectEmail, StringComparison.OrdinalIgnoreCase))
            {
                recipient = _options.DevRedirectEmail;
                displaySubject = $"[Dev for {toEmail}] {subject}";
            }

            var fromAddress = string.IsNullOrWhiteSpace(_options.FromName)
                ? _options.FromEmail
                : $"{_options.FromName} <{_options.FromEmail}>";

            var payload = new
            {
                from = fromAddress,
                to = new[] { recipient },
                subject = displaySubject,
                html = htmlContent
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);
            request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Failed to send email via Resend to {ToEmail} (routed to {Recipient}). StatusCode: {StatusCode}, Error: {ErrorBody}",
                    toEmail, recipient, response.StatusCode, errorBody);
            }
            else
            {
                _logger.LogInformation("Successfully dispatched security email via Resend to {ToEmail} (routed to {Recipient}, Subject: {Subject})",
                    toEmail, recipient, displaySubject);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error dispatching email to {ToEmail} via Resend", toEmail);
        }
    }

    private static string WrapInTemplate(string badgeText, string bodyHtml)
    {
        return $"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Vaultz Security</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #F6F5F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F6F5F2; padding: 36px 16px;">
                <tr>
                    <td align="center">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #FFFFFF; border: 1px solid #E6E4DD; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.03);">
                            <!-- Header -->
                            <tr>
                                <td style="padding: 32px 36px 20px 36px; border-bottom: 1px solid #EDECE6;">
                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td style="vertical-align: middle;">
                                                <div style="display: inline-block; background-color: #2A6B58; border-radius: 10px; width: 34px; height: 34px; text-align: center; line-height: 34px; color: #FDFCFB; font-weight: 800; font-size: 17px;">V</div>
                                                <span style="font-weight: 800; font-size: 15px; letter-spacing: 2px; color: #1C1B18; margin-left: 10px; vertical-align: middle;">VAULTZ</span>
                                            </td>
                                            <td align="right" style="vertical-align: middle;">
                                                <span style="display: inline-block; background-color: #F0EEE9; color: #6E6A63; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase;">{badgeText}</span>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <!-- Body -->
                            <tr>
                                <td style="padding: 36px;">
                                    {bodyHtml}
                                </td>
                            </tr>
                            <!-- Footer -->
                            <tr>
                                <td style="padding: 24px 36px; background-color: #FBFBF9; border-top: 1px solid #EDECE6; text-align: center;">
                                    <p style="font-size: 11px; line-height: 16px; color: #8E8A82; margin: 0 0 6px 0;">
                                        Vaultz • Personal Finance Management & Account Isolation
                                    </p>
                                    <p style="font-size: 11px; line-height: 16px; color: #A8A59E; margin: 0;">
                                        This is a secure automated notification. Do not reply to this email.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """;
    }
}
