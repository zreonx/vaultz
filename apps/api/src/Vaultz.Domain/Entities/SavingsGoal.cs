using Vaultz.Domain.Common;
using Vaultz.Domain.ValueObjects;

namespace Vaultz.Domain.Entities;

/// <summary>
/// User-owned savings milestone with target amount, current progress, and explicit ISO 4217 currency.
/// </summary>
public sealed class SavingsGoal : UserOwnedEntity
{
    public Guid? AccountId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public decimal TargetAmount { get; private set; }
    public decimal CurrentAmount { get; private set; }
    public string CurrencyCode { get; private set; } = string.Empty;
    public DateOnly? TargetDate { get; private set; }

    private SavingsGoal()
    {
    }

    public SavingsGoal(
        string userId,
        string name,
        decimal targetAmount,
        string currencyCode,
        decimal initialAmount = 0m,
        DateOnly? targetDate = null,
        Guid? accountId = null)
        : base(userId)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length > 100)
        {
            throw new DomainException("Savings goal name is required and must be at most 100 characters.", "invalid_goal_name");
        }

        if (targetAmount <= 0m)
        {
            throw new DomainException("Savings goal target amount must be greater than zero.", "invalid_target_amount");
        }

        if (initialAmount < 0m)
        {
            throw new DomainException("Initial savings amount cannot be negative.", "invalid_initial_amount");
        }

        Name = name.Trim();
        AccountId = accountId;
        CurrencyCode = ValueObjects.CurrencyCode.From(currencyCode).Value;
        TargetAmount = Money.Create(targetAmount, CurrencyCode).Amount;
        CurrentAmount = Money.Create(initialAmount, CurrencyCode).Amount;
        TargetDate = targetDate;
    }

    public void Contribute(decimal amount)
    {
        if (amount <= 0m)
        {
            throw new DomainException("Contribution amount must be greater than zero.", "invalid_contribution_amount");
        }

        CurrentAmount = Money.Create(CurrentAmount + amount, CurrencyCode).Amount;
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    public void Withdraw(decimal amount)
    {
        if (amount <= 0m)
        {
            throw new DomainException("Withdrawal amount must be greater than zero.", "invalid_withdrawal_amount");
        }

        if (CurrentAmount - amount < 0m)
        {
            throw new DomainException("Savings goal balance cannot become negative.", "insufficient_goal_balance");
        }

        CurrentAmount = Money.Create(CurrentAmount - amount, CurrencyCode).Amount;
        MarkUpdated(DateTimeOffset.UtcNow);
    }
}
