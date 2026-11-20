using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Vaultz.Infrastructure.Authentication;
using Vaultz.Infrastructure.Email;

namespace Vaultz.Infrastructure.Configuration;

/// <summary>
/// Fails fast on startup in non-Development/non-Testing environments when required production
/// secrets or configuration values are missing or still set to development defaults.
/// Never includes secret values in exception messages or logs.
/// </summary>
public static class ProductionConfigValidator
{
    public const string DevDefaultJwtSigningKey = "vaultz-local-dev-hmac-sha256-signing-key-min-32-bytes!";
    public const string DevDefaultDbPassword = "vaultz_local_dev_password_change_me";

    public static void ValidateOrThrow(
        IConfiguration configuration,
        IHostEnvironment environment,
        ILogger? logger = null)
    {
        if (environment.IsDevelopment() || environment.IsEnvironment("Testing"))
        {
            return;
        }

        var errors = new List<string>();

        // 1. PostgreSQL connection string
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            errors.Add("ConnectionStrings:DefaultConnection (env: ConnectionStrings__DefaultConnection) is required in non-development environments.");
        }
        else if (connectionString.Contains(DevDefaultDbPassword, StringComparison.Ordinal))
        {
            errors.Add("ConnectionStrings:DefaultConnection (env: ConnectionStrings__DefaultConnection) must not use the local development password.");
        }

        // 2. JWT signing key
        var jwtOptions = new JwtOptions();
        configuration.GetSection(JwtOptions.SectionName).Bind(jwtOptions);
        var configuredSigningKey = configuration[$"{JwtOptions.SectionName}:{nameof(JwtOptions.SigningKey)}"];
        if (string.IsNullOrWhiteSpace(configuredSigningKey))
        {
            errors.Add("Jwt:SigningKey (env: Jwt__SigningKey) is required in non-development environments.");
        }
        else if (string.Equals(configuredSigningKey, DevDefaultJwtSigningKey, StringComparison.Ordinal))
        {
            errors.Add("Jwt:SigningKey (env: Jwt__SigningKey) must not use the local development signing key.");
        }
        else if (Encoding.UTF8.GetByteCount(configuredSigningKey) < 32)
        {
            errors.Add("Jwt:SigningKey (env: Jwt__SigningKey) must be at least 32 bytes (256 bits) for HMAC-SHA256.");
        }

        // 3. Resend email configuration
        var resendOptions = new ResendOptions();
        configuration.GetSection(ResendOptions.SectionName).Bind(resendOptions);
        var envResendKey = Environment.GetEnvironmentVariable("RESEND_API_KEY");
        if (!string.IsNullOrWhiteSpace(envResendKey))
        {
            resendOptions.ApiKey = envResendKey;
        }

        if (resendOptions.Enabled)
        {
            if (string.IsNullOrWhiteSpace(resendOptions.ApiKey) ||
                resendOptions.ApiKey.StartsWith("test", StringComparison.OrdinalIgnoreCase) ||
                resendOptions.ApiKey.StartsWith("re_placeholder", StringComparison.OrdinalIgnoreCase))
            {
                errors.Add("Resend:ApiKey (env: Resend__ApiKey or RESEND_API_KEY) must be configured with a live Resend API key when Resend:Enabled is true.");
            }

            if (string.Equals(resendOptions.FromEmail, "onboarding@resend.dev", StringComparison.OrdinalIgnoreCase))
            {
                logger?.LogWarning(
                    "Resend:FromEmail is set to sandbox address 'onboarding@resend.dev' in {Environment}. Configure a verified sender domain for production email delivery.",
                    environment.EnvironmentName);
            }
        }

        // 4. CORS allowed origins
        var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
        var validOrigins = allowedOrigins
            .Where(o => !string.IsNullOrWhiteSpace(o))
            .ToArray();

        if (validOrigins.Length == 0)
        {
            errors.Add("Cors:AllowedOrigins (env: Cors__AllowedOrigins__0) must specify at least one allowed frontend origin.");
        }
        else if (validOrigins.Any(o => o.Trim() == "*"))
        {
            errors.Add("Cors:AllowedOrigins (env: Cors__AllowedOrigins__0) must not contain wildcard '*' when credentials are enabled.");
        }

        // 5. Frontend base URL (for verification & password reset links)
        var frontendBaseUrl = configuration[$"{AppOptions.SectionName}:{nameof(AppOptions.FrontendBaseUrl)}"];
        if (string.IsNullOrWhiteSpace(frontendBaseUrl) ||
            !Uri.TryCreate(frontendBaseUrl.Trim(), UriKind.Absolute, out var frontendUri) ||
            !string.Equals(frontendUri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase) ||
            frontendUri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
            frontendUri.Host.Equals("127.0.0.1", StringComparison.Ordinal))
        {
            errors.Add("App:FrontendBaseUrl (env: App__FrontendBaseUrl) must be a valid non-localhost https:// URL in production.");
        }

        if (errors.Count > 0)
        {
            throw new InvalidOperationException(
                $"Invalid Vaultz production configuration for environment '{environment.EnvironmentName}':\n - " +
                string.Join("\n - ", errors));
        }
    }
}
