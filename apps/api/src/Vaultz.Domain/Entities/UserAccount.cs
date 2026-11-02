using Vaultz.Domain.Common;
using Vaultz.Domain.Enums;
using Vaultz.Domain.ValueObjects;

namespace Vaultz.Domain.Entities;

/// <summary>
/// Represents an authenticated Vaultz user account with PBKDF2-SHA256 password hash, 
/// email verification, multi-factor authentication, and security isolation.
/// Email address is permanently immutable once registered.
/// </summary>
public sealed class UserAccount : AuditableEntity
{
    public string Email { get; private set; } = string.Empty;
    public string FullName { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public string DefaultCurrencyCode { get; private set; } = "USD";

    // Email verification state
    public bool IsEmailVerified { get; private set; }
    public string? EmailVerificationToken { get; private set; }
    public DateTimeOffset? EmailVerificationTokenExpiresAtUtc { get; private set; }

    // Password reset state
    public string? PasswordResetToken { get; private set; }
    public DateTimeOffset? PasswordResetTokenExpiresAtUtc { get; private set; }

    // Two-factor authentication (2FA)
    public bool TwoFactorEnabled { get; private set; }
    public TwoFactorType TwoFactorType { get; private set; } = TwoFactorType.None;
    public string? TwoFactorSecret { get; private set; }
    public string? TwoFactorOtpCode { get; private set; }
    public DateTimeOffset? TwoFactorOtpExpiresAtUtc { get; private set; }
    public string? TwoFactorRecoveryCodes { get; private set; }

    // Brute-force lockout protection
    public int FailedLoginAttempts { get; private set; }
    public DateTimeOffset? LockoutEndUtc { get; private set; }

    // Session security & audit tracking
    public DateTimeOffset? LastLoginAtUtc { get; private set; }
    public string? LastLoginIp { get; private set; }
    public string? LastLoginUserAgent { get; private set; }
    public string SecurityStamp { get; private set; } = Guid.NewGuid().ToString("N");

    private UserAccount()
    {
    }

    public UserAccount(
        string email,
        string fullName,
        string passwordHash,
        string defaultCurrencyCode = "USD",
        Guid? id = null)
    {
        if (id.HasValue && id.Value != Guid.Empty)
        {
            Id = id.Value;
        }

        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
        {
            throw new DomainException("A valid email address is required.", "invalid_email");
        }

        if (string.IsNullOrWhiteSpace(fullName) || fullName.Trim().Length > 100)
        {
            throw new DomainException("Full name is required and cannot exceed 100 characters.", "invalid_full_name");
        }

        if (string.IsNullOrWhiteSpace(passwordHash))
        {
            throw new DomainException("Password hash is required.", "invalid_password_hash");
        }

        Email = email.Trim().ToLowerInvariant();
        FullName = fullName.Trim();
        PasswordHash = passwordHash;
        DefaultCurrencyCode = CurrencyCode.From(defaultCurrencyCode).Value;
        IsEmailVerified = false;
        SecurityStamp = Guid.NewGuid().ToString("N");
    }

    public void UpdateDefaultCurrency(string currencyCode)
    {
        DefaultCurrencyCode = CurrencyCode.From(currencyCode).Value;
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    /// <summary>
    /// Updates full name and default currency. Email is strictly immutable by security design.
    /// </summary>
    public void UpdateProfile(string fullName, string defaultCurrencyCode)
    {
        if (string.IsNullOrWhiteSpace(fullName) || fullName.Trim().Length > 100)
        {
            throw new DomainException("Full name is required and cannot exceed 100 characters.", "invalid_full_name");
        }

        FullName = fullName.Trim();
        DefaultCurrencyCode = CurrencyCode.From(defaultCurrencyCode).Value;
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    public void UpdatePasswordHash(string newPasswordHash)
    {
        if (string.IsNullOrWhiteSpace(newPasswordHash))
        {
            throw new DomainException("Password hash is required.", "invalid_password_hash");
        }

        PasswordHash = newPasswordHash;
        SecurityStamp = Guid.NewGuid().ToString("N");
        ClearPasswordResetToken();
        ResetLockout();
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    // Email verification
    public void SetEmailVerificationToken(string token, DateTimeOffset expiresAtUtc)
    {
        EmailVerificationToken = token;
        EmailVerificationTokenExpiresAtUtc = expiresAtUtc;
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    public void VerifyEmail()
    {
        IsEmailVerified = true;
        EmailVerificationToken = null;
        EmailVerificationTokenExpiresAtUtc = null;
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    // Password reset
    public void SetPasswordResetToken(string token, DateTimeOffset expiresAtUtc)
    {
        PasswordResetToken = token;
        PasswordResetTokenExpiresAtUtc = expiresAtUtc;
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    public void ClearPasswordResetToken()
    {
        PasswordResetToken = null;
        PasswordResetTokenExpiresAtUtc = null;
    }

    // 2FA Management
    public void EnableTwoFactor(TwoFactorType type, string? secret, string? recoveryCodes)
    {
        TwoFactorEnabled = true;
        TwoFactorType = type;
        TwoFactorSecret = secret;
        TwoFactorRecoveryCodes = recoveryCodes;
        TwoFactorOtpCode = null;
        TwoFactorOtpExpiresAtUtc = null;
        SecurityStamp = Guid.NewGuid().ToString("N");
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    public void DisableTwoFactor()
    {
        TwoFactorEnabled = false;
        TwoFactorType = TwoFactorType.None;
        TwoFactorSecret = null;
        TwoFactorRecoveryCodes = null;
        TwoFactorOtpCode = null;
        TwoFactorOtpExpiresAtUtc = null;
        SecurityStamp = Guid.NewGuid().ToString("N");
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    public void SetTwoFactorOtp(string code, DateTimeOffset expiresAtUtc)
    {
        TwoFactorOtpCode = code;
        TwoFactorOtpExpiresAtUtc = expiresAtUtc;
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    public void ClearTwoFactorOtp()
    {
        TwoFactorOtpCode = null;
        TwoFactorOtpExpiresAtUtc = null;
    }

    public bool ConsumeRecoveryCode(string code)
    {
        if (string.IsNullOrWhiteSpace(TwoFactorRecoveryCodes)) return false;

        var codes = TwoFactorRecoveryCodes.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
        var match = codes.FirstOrDefault(c => string.Equals(c, code.Trim(), StringComparison.OrdinalIgnoreCase));
        if (match is null) return false;

        codes.Remove(match);
        TwoFactorRecoveryCodes = string.Join(',', codes);
        MarkUpdated(DateTimeOffset.UtcNow);
        return true;
    }

    // Brute-force & Lockout
    public void RecordFailedLogin(DateTimeOffset now, int maxAttempts = 5, int lockoutMinutes = 15)
    {
        FailedLoginAttempts++;
        if (FailedLoginAttempts >= maxAttempts)
        {
            LockoutEndUtc = now.AddMinutes(lockoutMinutes);
        }
        MarkUpdated(now);
    }

    public void RecordSuccessfulLogin(DateTimeOffset now, string? ipAddress, string? userAgent)
    {
        FailedLoginAttempts = 0;
        LockoutEndUtc = null;
        LastLoginAtUtc = now;
        LastLoginIp = ipAddress;
        LastLoginUserAgent = userAgent;
        MarkUpdated(now);
    }

    public void ResetLockout()
    {
        FailedLoginAttempts = 0;
        LockoutEndUtc = null;
    }

    public bool IsLockedOut(DateTimeOffset now)
    {
        return LockoutEndUtc.HasValue && LockoutEndUtc.Value > now;
    }
}
