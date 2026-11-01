namespace Vaultz.Infrastructure.Authentication;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "Vaultz.Api";
    public string Audience { get; set; } = "Vaultz.Web";
    public string SigningKey { get; set; } = "vaultz-local-dev-hmac-sha256-signing-key-min-32-bytes!";
    public int ExpirationMinutes { get; set; } = 10080; // 7 days default for local dev
    public string CookieName { get; set; } = "vaultz.jwt";
}
