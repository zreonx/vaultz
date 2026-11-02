using Vaultz.Domain.Entities;
using Vaultz.Domain.Enums;
using Xunit;

namespace Vaultz.UnitTests.Domain;

public sealed class UserAccountSecurityTests
{
    [Fact]
    public void NewUserAccount_DefaultsToUnverifiedAndNoTwoFactor()
    {
        var user = new UserAccount("test@vaultz.local", "Test User", "hashedpassword", "USD");

        Assert.False(user.IsEmailVerified);
        Assert.False(user.TwoFactorEnabled);
        Assert.Equal(TwoFactorType.None, user.TwoFactorType);
        Assert.Equal(0, user.FailedLoginAttempts);
        Assert.Null(user.LockoutEndUtc);
        Assert.NotNull(user.SecurityStamp);
        Assert.NotEmpty(user.SecurityStamp);
    }

    [Fact]
    public void SetEmailVerificationToken_SetsTokenAndExpiration()
    {
        var user = new UserAccount("test@vaultz.local", "Test User", "hashedpassword", "USD");
        var expires = DateTimeOffset.UtcNow.AddMinutes(15);

        user.SetEmailVerificationToken("123456", expires);

        Assert.Equal("123456", user.EmailVerificationToken);
        Assert.Equal(expires, user.EmailVerificationTokenExpiresAtUtc);
    }

    [Fact]
    public void VerifyEmail_ClearsTokenAndMarksVerified()
    {
        var user = new UserAccount("test@vaultz.local", "Test User", "hashedpassword", "USD");
        user.SetEmailVerificationToken("123456", DateTimeOffset.UtcNow.AddMinutes(15));

        user.VerifyEmail();

        Assert.True(user.IsEmailVerified);
        Assert.Null(user.EmailVerificationToken);
        Assert.Null(user.EmailVerificationTokenExpiresAtUtc);
    }

    [Fact]
    public void FailedLoginAttempts_TriggerLockoutAfterThreshold()
    {
        var user = new UserAccount("test@vaultz.local", "Test User", "hashedpassword", "USD");
        var now = DateTimeOffset.UtcNow;

        for (int i = 1; i <= 4; i++)
        {
            user.RecordFailedLogin(now, maxAttempts: 5, lockoutMinutes: 15);
            Assert.Equal(i, user.FailedLoginAttempts);
            Assert.False(user.IsLockedOut(now));
        }

        user.RecordFailedLogin(now, maxAttempts: 5, lockoutMinutes: 15);
        Assert.Equal(5, user.FailedLoginAttempts);
        Assert.True(user.IsLockedOut(now));
        Assert.NotNull(user.LockoutEndUtc);
        Assert.True(user.LockoutEndUtc > now);

        // When lockout expires:
        var future = now.AddMinutes(16);
        Assert.False(user.IsLockedOut(future));
    }

    [Fact]
    public void RecordSuccessfulLogin_ClearsLockoutAndFailedAttempts()
    {
        var user = new UserAccount("test@vaultz.local", "Test User", "hashedpassword", "USD");
        var now = DateTimeOffset.UtcNow;
        user.RecordFailedLogin(now, maxAttempts: 5, lockoutMinutes: 15);
        user.RecordFailedLogin(now, maxAttempts: 5, lockoutMinutes: 15);

        user.RecordSuccessfulLogin(now, "127.0.0.1", "Mozilla/5.0");

        Assert.Equal(0, user.FailedLoginAttempts);
        Assert.Null(user.LockoutEndUtc);
        Assert.Equal(now, user.LastLoginAtUtc);
        Assert.Equal("127.0.0.1", user.LastLoginIp);
        Assert.Equal("Mozilla/5.0", user.LastLoginUserAgent);
    }

    [Fact]
    public void TwoFactor_EnableDisableAndRecoveryCodes_WorkCorrectly()
    {
        var user = new UserAccount("test@vaultz.local", "Test User", "hashedpassword", "USD");
        var recoveryCodes = "ABCDE123,FGHIJ456,KLMNO789";

        user.EnableTwoFactor(TwoFactorType.Totp, "JBSWY3DPEHPK3PXP", recoveryCodes);

        Assert.True(user.TwoFactorEnabled);
        Assert.Equal(TwoFactorType.Totp, user.TwoFactorType);
        Assert.Equal("JBSWY3DPEHPK3PXP", user.TwoFactorSecret);

        // Consume a recovery code
        var consumed = user.ConsumeRecoveryCode("FGHIJ456");
        Assert.True(consumed);
        Assert.NotNull(user.TwoFactorRecoveryCodes);
        var remainingCodes = user.TwoFactorRecoveryCodes.Split(',');
        Assert.Equal(2, remainingCodes.Length);

        // Attempt consuming same code again fails
        var consumedAgain = user.ConsumeRecoveryCode("FGHIJ456");
        Assert.False(consumedAgain);

        // Disable 2FA
        user.DisableTwoFactor();
        Assert.False(user.TwoFactorEnabled);
        Assert.Equal(TwoFactorType.None, user.TwoFactorType);
        Assert.Null(user.TwoFactorSecret);
        Assert.Null(user.TwoFactorRecoveryCodes);
    }

    [Fact]
    public void UpdateProfile_DoesNotChangeEmail_EnsuresEmailImmutability()
    {
        var user = new UserAccount("original@vaultz.local", "Original Name", "hash", "USD");

        // Profile update only accepts FullName and DefaultCurrencyCode
        user.UpdateProfile("Updated Name", "EUR");

        Assert.Equal("original@vaultz.local", user.Email);
        Assert.Equal("Updated Name", user.FullName);
        Assert.Equal("EUR", user.DefaultCurrencyCode);
    }
}
