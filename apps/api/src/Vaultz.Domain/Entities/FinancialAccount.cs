using Vaultz.Domain.Common;
using Vaultz.Domain.Enums;
using Vaultz.Domain.ValueObjects;

namespace Vaultz.Domain.Entities;

/// <summary>
/// Represents a user-owned financial account with an explicit ISO 4217 currency code and exact decimal balance.
/// </summary>
public sealed class FinancialAccount : UserOwnedEntity
{
    public string Name { get; private set; } = string.Empty;
    public AccountType Type { get; private set; }
    public string CurrencyCode { get; private set; } = string.Empty;
    public decimal Balance { get; private set; }
    public bool IsArchived { get; private set; }
    public bool IsDefault { get; private set; }

    private FinancialAccount()
    {
    }

    public FinancialAccount(
        string userId,
        string name,
        AccountType type,
        string currencyCode,
        decimal initialBalance = 0m,
        bool isDefault = false)
        : base(userId)
    {
        SetName(name);
        Type = type;

        var validatedCurrency = ValueObjects.CurrencyCode.From(currencyCode);
        CurrencyCode = validatedCurrency.Value;
        Balance = Money.Create(initialBalance, CurrencyCode).Amount;
        IsArchived = false;
        IsDefault = isDefault;
    }

    public void SetAsDefault()
    {
        IsDefault = true;
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    public void RemoveDefault()
    {
        IsDefault = false;
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    public void UpdateDetails(string name, AccountType type, bool isArchived)
    {
        SetName(name);
        Type = type;
        IsArchived = isArchived;
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    public void Credit(decimal amount, string currencyCode)
    {
        EnsurePositiveAmount(amount);
        EnsureSameCurrency(currencyCode);

        Balance = Money.Create(Balance + amount, CurrencyCode).Amount;
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    public void Debit(decimal amount, string currencyCode)
    {
        EnsurePositiveAmount(amount);
        EnsureSameCurrency(currencyCode);

        Balance = Money.Create(Balance - amount, CurrencyCode).Amount;
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    public void EnsureSameCurrency(string currencyCode)
    {
        var normalized = ValueObjects.CurrencyCode.From(currencyCode).Value;
        if (!string.Equals(CurrencyCode, normalized, StringComparison.Ordinal))
        {
            throw new DomainException(
                $"Account '{Name}' uses currency '{CurrencyCode}' and cannot process '{normalized}' operations.",
                "currency_mismatch");
        }
    }

    private void SetName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new DomainException("Account name is required.", "invalid_account_name");
        }

        var trimmed = name.Trim();
        if (trimmed.Length > 100)
        {
            throw new DomainException("Account name cannot exceed 100 characters.", "invalid_account_name");
        }

        Name = trimmed;
    }

    private static void EnsurePositiveAmount(decimal amount)
    {
        if (amount <= 0m)
        {
            throw new DomainException("Transaction amount must be greater than zero.", "invalid_amount");
        }
    }
}
