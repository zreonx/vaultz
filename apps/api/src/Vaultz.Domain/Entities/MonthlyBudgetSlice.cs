using Vaultz.Domain.Common;

namespace Vaultz.Domain.Entities;

/// <summary>
/// Represents a fragmented percentage slice of an active monthly budget plan (e.g. 50% Essentials, 30% Bills, 20% Wants).
/// </summary>
public sealed class MonthlyBudgetSlice : UserOwnedEntity
{
    public Guid MonthlyBudgetPlanId { get; private set; }
    public Guid? CategoryId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public decimal AllocationPercentage { get; private set; }
    public decimal AllocatedAmount { get; private set; }
    public decimal SpentAmount { get; private set; }
    public string? Color { get; private set; }

    public decimal RemainingAmount => Math.Max(0m, AllocatedAmount - SpentAmount);

    private MonthlyBudgetSlice()
    {
    }

    public MonthlyBudgetSlice(
        string userId,
        Guid monthlyBudgetPlanId,
        string name,
        decimal allocationPercentage,
        decimal allocatedAmount,
        Guid? categoryId = null,
        string? color = null)
        : base(userId)
    {
        if (monthlyBudgetPlanId == Guid.Empty)
        {
            throw new DomainException("Budget slice must belong to a valid plan.", "invalid_plan_id");
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            throw new DomainException("Slice name is required.", "invalid_slice_name");
        }

        if (allocationPercentage <= 0m || allocationPercentage > 100m)
        {
            throw new DomainException("Allocation percentage must be between 0.01% and 100%.", "invalid_percentage");
        }

        if (allocatedAmount < 0m)
        {
            throw new DomainException("Allocated amount cannot be negative.", "invalid_allocated_amount");
        }

        MonthlyBudgetPlanId = monthlyBudgetPlanId;
        Name = name.Trim();
        AllocationPercentage = allocationPercentage;
        AllocatedAmount = allocatedAmount;
        SpentAmount = 0m;
        CategoryId = categoryId;
        Color = string.IsNullOrWhiteSpace(color) ? null : color.Trim();
    }

    public void RecordExpense(decimal amount)
    {
        if (amount <= 0m)
        {
            throw new DomainException("Expense amount must be greater than zero.", "invalid_expense_amount");
        }

        SpentAmount += amount;
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    public void ReverseExpense(decimal amount)
    {
        if (amount <= 0m)
        {
            throw new DomainException("Reversal amount must be greater than zero.", "invalid_reversal_amount");
        }

        SpentAmount = Math.Max(0m, SpentAmount - amount);
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    public void Reallocate(decimal newPercentage, decimal newAllocatedAmount)
    {
        if (newPercentage <= 0m || newPercentage > 100m)
        {
            throw new DomainException("Allocation percentage must be between 0.01% and 100%.", "invalid_percentage");
        }

        if (newAllocatedAmount < 0m)
        {
            throw new DomainException("Allocated amount cannot be negative.", "invalid_allocated_amount");
        }

        AllocationPercentage = newPercentage;
        AllocatedAmount = newAllocatedAmount;
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    public void AdjustAllocation(decimal deltaAmount)
    {
        if (AllocatedAmount + deltaAmount < 0m)
        {
            throw new DomainException("Allocated amount cannot be negative.", "invalid_allocated_amount");
        }

        AllocatedAmount += deltaAmount;
        MarkUpdated(DateTimeOffset.UtcNow);
    }
}
