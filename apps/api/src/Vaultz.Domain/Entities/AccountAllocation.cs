using Vaultz.Domain.Common;
using Vaultz.Domain.Enums;

namespace Vaultz.Domain.Entities;

/// <summary>
/// Represents a permanent purpose allocation (e.g., Emergency Fund, Savings, Sinking Fund)
/// within a single financial account.
/// </summary>
public sealed class AccountAllocation : UserOwnedEntity
{
    public Guid AccountId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public AllocationCategory Category { get; private set; }
    public decimal Balance { get; private set; }
    public decimal? TargetAmount { get; private set; }
    public string? Color { get; private set; }
    public string? Icon { get; private set; }
    public bool IsArchived { get; private set; }

    private AccountAllocation()
    {
    }

    public AccountAllocation(
        string userId,
        Guid accountId,
        string name,
        AllocationCategory category,
        decimal initialBalance = 0m,
        decimal? targetAmount = null,
        string? color = null,
        string? icon = null)
        : base(userId)
    {
        if (accountId == Guid.Empty)
        {
            throw new DomainException("Allocation must belong to a valid account.", "invalid_account_id");
        }

        SetName(name);

        if (initialBalance < 0m)
        {
            throw new DomainException("Initial allocation balance cannot be negative.", "invalid_initial_balance");
        }

        if (targetAmount.HasValue && targetAmount.Value <= 0m)
        {
            throw new DomainException("Target amount must be greater than zero.", "invalid_target_amount");
        }

        AccountId = accountId;
        Category = category;
        Balance = initialBalance;
        TargetAmount = targetAmount;
        Color = string.IsNullOrWhiteSpace(color) ? null : color.Trim();
        Icon = string.IsNullOrWhiteSpace(icon) ? null : icon.Trim();
        IsArchived = false;
    }

    public void Deposit(decimal amount)
    {
        if (amount <= 0m)
        {
            throw new DomainException("Deposit amount must be greater than zero.", "invalid_deposit_amount");
        }

        Balance += amount;
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    public void Withdraw(decimal amount)
    {
        if (amount <= 0m)
        {
            throw new DomainException("Withdrawal amount must be greater than zero.", "invalid_withdrawal_amount");
        }

        if (amount > Balance)
        {
            throw new DomainException(
                $"Insufficient funds in allocation '{Name}'. Available: {Balance}, requested: {amount}.",
                "insufficient_allocation_balance");
        }

        Balance -= amount;
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    public void UpdateDetails(
        string name,
        AllocationCategory category,
        decimal? targetAmount,
        string? color,
        string? icon)
    {
        SetName(name);

        if (targetAmount.HasValue && targetAmount.Value <= 0m)
        {
            throw new DomainException("Target amount must be greater than zero.", "invalid_target_amount");
        }

        Category = category;
        TargetAmount = targetAmount;
        Color = string.IsNullOrWhiteSpace(color) ? null : color.Trim();
        Icon = string.IsNullOrWhiteSpace(icon) ? null : icon.Trim();
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    public void Archive()
    {
        IsArchived = true;
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    public void Unarchive()
    {
        IsArchived = false;
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    private void SetName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new DomainException("Allocation name is required.", "invalid_allocation_name");
        }

        var trimmed = name.Trim();
        if (trimmed.Length > 100)
        {
            throw new DomainException("Allocation name cannot exceed 100 characters.", "invalid_allocation_name");
        }

        Name = trimmed;
    }
}
