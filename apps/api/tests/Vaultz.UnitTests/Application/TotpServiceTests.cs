using Vaultz.Infrastructure.Authentication;
using Xunit;

namespace Vaultz.UnitTests.Application;

public sealed class TotpServiceTests
{
    [Fact]
    public void GenerateSecretKey_ReturnsValidBase32String()
    {
        var secret = TotpService.GenerateSecretKey();

        Assert.NotNull(secret);
        Assert.NotEmpty(secret);
        Assert.Matches("^[A-Z2-7]+$", secret);
    }

    [Fact]
    public void GenerateCurrentTotp_ReturnsSixDigitString()
    {
        var secret = TotpService.GenerateSecretKey();
        var code = TotpService.GenerateCurrentTotp(secret);

        Assert.NotNull(code);
        Assert.Equal(6, code.Length);
        Assert.True(int.TryParse(code, out _));
    }

    [Fact]
    public void VerifyTotp_ValidCurrentCode_ReturnsTrue()
    {
        var secret = TotpService.GenerateSecretKey();
        var code = TotpService.GenerateCurrentTotp(secret);

        var isValid = TotpService.VerifyTotp(secret, code);

        Assert.True(isValid);
    }

    [Fact]
    public void VerifyTotp_InvalidCode_ReturnsFalse()
    {
        var secret = TotpService.GenerateSecretKey();

        var isValid = TotpService.VerifyTotp(secret, "000000");
        var isValidOther = TotpService.VerifyTotp(secret, "999999");

        // Statistically extremely unlikely both are valid current drift codes
        Assert.False(isValid && isValidOther);
    }

    [Fact]
    public void GenerateRecoveryCodes_ReturnsDistinctCodes()
    {
        var codes = TotpService.GenerateRecoveryCodes(10);

        Assert.Equal(10, codes.Count);
        Assert.Equal(10, codes.Distinct().Count());
        foreach (var code in codes)
        {
            Assert.Contains("-", code);
        }
    }

    [Fact]
    public void GenerateQrCodeUri_FormatsStandardOtpAuthUri()
    {
        var uri = TotpService.GenerateQrCodeUri("john@vaultz.local", "JBSWY3DPEHPK3PXP", "Vaultz");

        Assert.StartsWith("otpauth://totp/Vaultz:john%40vaultz.local", uri);
        Assert.Contains("secret=JBSWY3DPEHPK3PXP", uri);
        Assert.Contains("issuer=Vaultz", uri);
    }
}
