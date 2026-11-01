using Vaultz.Domain.Common;
using Vaultz.Domain.ValueObjects;

namespace Vaultz.Domain.Entities;

/// <summary>
/// Monthly spending limit for a specific user-owned expense category and currency.
/// </summary>
public sealed class Budget : UserOwnedEntity
{
    public Guid? AccountId { get; private set; }
    public Guid CategoryId { get; private set; }
    public int Year { get; private set; }
    public int Month { get; private set; }
    public decimal LimitAmount { get; private set; }
    public string CurrencyCode { get; private set; } = string.Empty;

    private Budget()
    {
    }

    public Budget(
        string userId,
        Guid categoryId,
        int year,
        int month,
        decimal limitAmount,
        string currencyCode,
        Guid? accountId = null)
        : base(userId)
    {
        if (categoryId == Guid.Empty)
        {
            throw new DomainException("Budget requires a valid category.", "invalid_category");
        }

        ValidatePeriod(year, month);
        ValidateLimit(limitAmount);

        CategoryId = categoryId;
        AccountId = accountId;
        Year = year;
        Month = month;
        CurrencyCode = ValueObjects.CurrencyCode.From(currencyCode).Value;
        LimitAmount = Money.Create(limitAmount, CurrencyCode).Amount;
    }

    public void UpdateLimit(decimal newLimitAmount)
    {
        ValidateLimit(newLimitAmount);
        LimitAmount = Money.Create(newLimitAmount, CurrencyCode).Amount;
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    private static void ValidatePeriod(int year, int month)
    {
        if (year is < 2000 or > 2100)
        {
            throw new DomainException("Budget year must be between 2000 and 2100.", "invalid_budget_period");
        }

        if (month is < 1 or > 12)
        {
            throw new DomainException("Budget month must be between 1 and 12.", "invalid_budget_period");
        }
    }

    private static void ValidateLimit(decimal limitAmount)
    {
        if (limitAmount <= 0m)
        {
            throw new DomainException("Budget limit amount must be greater than zero.", "invalid_budget_limit");
        }
    }
}
