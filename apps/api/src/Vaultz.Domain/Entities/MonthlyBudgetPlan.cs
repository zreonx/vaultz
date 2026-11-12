using Vaultz.Domain.Common;

namespace Vaultz.Domain.Entities;

/// <summary>
/// Represents an active monthly logical finance budget plan for a specific account and period.
/// </summary>
public sealed class MonthlyBudgetPlan : UserOwnedEntity
{
    public Guid AccountId { get; private set; }
    public int Year { get; private set; }
    public int Month { get; private set; }
    public decimal TotalBudgetAmount { get; private set; }
    public bool IsActive { get; private set; }
    public bool IsSwept { get; private set; }
    public DateTimeOffset? SweptAtUtc { get; private set; }
    public Guid? SweptToAllocationId { get; private set; }

    private readonly List<MonthlyBudgetSlice> _slices = [];
    public IReadOnlyCollection<MonthlyBudgetSlice> Slices => _slices.AsReadOnly();

    public decimal TotalAllocated => _slices.Sum(s => s.AllocatedAmount);
    public decimal TotalSpent => _slices.Sum(s => s.SpentAmount);
    public decimal TotalRemaining => Math.Max(0m, TotalBudgetAmount - TotalSpent);

    private MonthlyBudgetPlan()
    {
    }

    public MonthlyBudgetPlan(
        string userId,
        Guid accountId,
        int year,
        int month,
        decimal totalBudgetAmount)
        : base(userId)
    {
        if (accountId == Guid.Empty)
        {
            throw new DomainException("Budget plan must belong to a valid account.", "invalid_account_id");
        }

        if (year is < 2000 or > 2100)
        {
            throw new DomainException("Budget year must be between 2000 and 2100.", "invalid_budget_period");
        }

        if (month is < 1 or > 12)
        {
            throw new DomainException("Budget month must be between 1 and 12.", "invalid_budget_period");
        }

        if (totalBudgetAmount <= 0m)
        {
            throw new DomainException("Total budget amount must be greater than zero.", "invalid_budget_amount");
        }

        AccountId = accountId;
        Year = year;
        Month = month;
        TotalBudgetAmount = totalBudgetAmount;
        IsActive = true;
        IsSwept = false;
    }

    public void AddSlice(MonthlyBudgetSlice slice)
    {
        ArgumentNullException.ThrowIfNull(slice);

        var existingPercentageSum = _slices.Sum(s => s.AllocationPercentage);
        if (existingPercentageSum + slice.AllocationPercentage > 100.01m)
        {
            throw new DomainException("Sum of slice allocation percentages cannot exceed 100%.", "exceeds_max_percentage");
        }

        _slices.Add(slice);
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    public void Sweep(Guid? targetAllocationId)
    {
        if (IsSwept)
        {
            throw new DomainException("This budget plan has already been swept.", "already_swept");
        }

        IsSwept = true;
        SweptAtUtc = DateTimeOffset.UtcNow;
        SweptToAllocationId = targetAllocationId;
        IsActive = false;
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    public void ClosePlan()
    {
        IsActive = false;
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    public void ReopenPlan()
    {
        IsActive = true;
        IsSwept = false;
        SweptAtUtc = null;
        SweptToAllocationId = null;
        MarkUpdated(DateTimeOffset.UtcNow);
    }
}
