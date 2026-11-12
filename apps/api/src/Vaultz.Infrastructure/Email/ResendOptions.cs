namespace Vaultz.Infrastructure.Email;

public sealed class ResendOptions
{
    public const string SectionName = "Resend";

    public string ApiKey { get; set; } = string.Empty;
    public string FromEmail { get; set; } = "onboarding@resend.dev";
    public string FromName { get; set; } = "Vaultz Security";
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// In Resend's free sandbox (using onboarding@resend.dev), emails can ONLY be delivered to the
    /// verified account owner's email. When set, all development emails to other addresses are
    /// routed to this address with a prefix tag.
    /// </summary>
    public string? DevRedirectEmail { get; set; }
}
