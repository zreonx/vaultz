using Vaultz.Domain.Common;
using Vaultz.Domain.ValueObjects;

namespace Vaultz.Domain.Entities;

/// <summary>
/// Represents an authenticated Vaultz user account with a PBKDF2-SHA256 password hash and default currency.
/// Pure domain entity with zero dependency on ASP.NET Core Identity.
/// </summary>
public sealed class UserAccount : AuditableEntity
{
    public string Email { get; private set; } = string.Empty;
    public string FullName { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public string DefaultCurrencyCode { get; private set; } = "USD";

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
    }

    public void UpdateDefaultCurrency(string currencyCode)
    {
        DefaultCurrencyCode = CurrencyCode.From(currencyCode).Value;
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    public void UpdateProfile(string fullName, string email, string defaultCurrencyCode)
    {
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
        {
            throw new DomainException("A valid email address is required.", "invalid_email");
        }

        if (string.IsNullOrWhiteSpace(fullName) || fullName.Trim().Length > 100)
        {
            throw new DomainException("Full name is required and cannot exceed 100 characters.", "invalid_full_name");
        }

        Email = email.Trim().ToLowerInvariant();
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
        MarkUpdated(DateTimeOffset.UtcNow);
    }
}
