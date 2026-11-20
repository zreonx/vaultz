namespace Vaultz.Infrastructure.Configuration;

public sealed class AppOptions
{
    public const string SectionName = "App";

    public string FrontendBaseUrl { get; set; } = "http://localhost:3000";
}
