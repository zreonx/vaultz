using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Vaultz.Infrastructure.Configuration;

namespace Vaultz.UnitTests.Infrastructure;

public sealed class ProductionConfigValidatorTests
{
    private sealed class FakeHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Production;
        public string ApplicationName { get; set; } = "Vaultz.Api";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private static IConfiguration BuildConfig(Dictionary<string, string?> values) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(values)
            .Build();

    private static Dictionary<string, string?> ValidProductionDictionary() => new()
    {
        ["ConnectionStrings:DefaultConnection"] = "Host=prod-db.internal;Port=5432;Database=vaultz_prod;Username=vaultz_app;Password=Strong_Prod_Password_99!",
        ["Jwt:SigningKey"] = "prod-random-jwt-signing-secret-key-at-least-32-bytes-long",
        ["Resend:Enabled"] = "true",
        ["Resend:ApiKey"] = "re_live_1234567890abcdef",
        ["Resend:FromEmail"] = "noreply@vaultz.app",
        ["Cors:AllowedOrigins:0"] = "https://app.vaultz.app",
        ["App:FrontendBaseUrl"] = "https://app.vaultz.app"
    };

    [Theory]
    [InlineData("Development")]
    [InlineData("Testing")]
    public void ValidateOrThrow_InDevelopmentOrTesting_AllowsEmptyProductionConfig(string environmentName)
    {
        var config = BuildConfig(new Dictionary<string, string?>());
        var env = new FakeHostEnvironment { EnvironmentName = environmentName };

        ProductionConfigValidator.ValidateOrThrow(config, env);
    }

    [Fact]
    public void ValidateOrThrow_WithValidProductionConfig_Succeeds()
    {
        var config = BuildConfig(ValidProductionDictionary());
        var env = new FakeHostEnvironment { EnvironmentName = Environments.Production };

        ProductionConfigValidator.ValidateOrThrow(config, env);
    }

    [Fact]
    public void ValidateOrThrow_WhenJwtSigningKeyUsesDevDefault_Throws()
    {
        var dict = ValidProductionDictionary();
        dict["Jwt:SigningKey"] = ProductionConfigValidator.DevDefaultJwtSigningKey;

        var ex = Assert.Throws<InvalidOperationException>(() =>
            ProductionConfigValidator.ValidateOrThrow(BuildConfig(dict), new FakeHostEnvironment()));

        Assert.Contains("Jwt__SigningKey", ex.Message);
        Assert.DoesNotContain(ProductionConfigValidator.DevDefaultJwtSigningKey, ex.Message);
    }

    [Fact]
    public void ValidateOrThrow_WhenJwtSigningKeyTooShort_Throws()
    {
        var dict = ValidProductionDictionary();
        dict["Jwt:SigningKey"] = "too-short-key";

        var ex = Assert.Throws<InvalidOperationException>(() =>
            ProductionConfigValidator.ValidateOrThrow(BuildConfig(dict), new FakeHostEnvironment()));

        Assert.Contains("32 bytes", ex.Message);
        Assert.DoesNotContain("too-short-key", ex.Message);
    }

    [Fact]
    public void ValidateOrThrow_WhenConnectionStringMissingOrUsesDevPassword_Throws()
    {
        var dict = ValidProductionDictionary();
        dict["ConnectionStrings:DefaultConnection"] = $"Host=localhost;Database=vaultz;Password={ProductionConfigValidator.DevDefaultDbPassword}";

        var ex = Assert.Throws<InvalidOperationException>(() =>
            ProductionConfigValidator.ValidateOrThrow(BuildConfig(dict), new FakeHostEnvironment()));

        Assert.Contains("ConnectionStrings__DefaultConnection", ex.Message);
        Assert.DoesNotContain(ProductionConfigValidator.DevDefaultDbPassword, ex.Message);
    }

    [Fact]
    public void ValidateOrThrow_WhenResendEnabledWithoutLiveApiKey_Throws()
    {
        var dict = ValidProductionDictionary();
        dict["Resend:ApiKey"] = "test_fake_key";

        var ex = Assert.Throws<InvalidOperationException>(() =>
            ProductionConfigValidator.ValidateOrThrow(BuildConfig(dict), new FakeHostEnvironment()));

        Assert.Contains("Resend__ApiKey", ex.Message);
    }

    [Fact]
    public void ValidateOrThrow_WhenResendDisabled_DoesNotRequireApiKey()
    {
        var dict = ValidProductionDictionary();
        dict["Resend:Enabled"] = "false";
        dict["Resend:ApiKey"] = "";

        ProductionConfigValidator.ValidateOrThrow(BuildConfig(dict), new FakeHostEnvironment());
    }

    [Theory]
    [InlineData("http://app.vaultz.app")]
    [InlineData("https://localhost:3000")]
    [InlineData("not-a-url")]
    public void ValidateOrThrow_WhenFrontendBaseUrlInvalidForProduction_Throws(string invalidUrl)
    {
        var dict = ValidProductionDictionary();
        dict["App:FrontendBaseUrl"] = invalidUrl;

        var ex = Assert.Throws<InvalidOperationException>(() =>
            ProductionConfigValidator.ValidateOrThrow(BuildConfig(dict), new FakeHostEnvironment()));

        Assert.Contains("App__FrontendBaseUrl", ex.Message);
    }

    [Fact]
    public void ValidateOrThrow_WhenCorsContainsWildcardOrIsEmpty_Throws()
    {
        var dict = ValidProductionDictionary();
        dict["Cors:AllowedOrigins:0"] = "*";

        var ex = Assert.Throws<InvalidOperationException>(() =>
            ProductionConfigValidator.ValidateOrThrow(BuildConfig(dict), new FakeHostEnvironment()));

        Assert.Contains("Cors__AllowedOrigins__0", ex.Message);
    }
}
