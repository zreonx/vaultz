using Vaultz.Domain.Common;
using Vaultz.Domain.Entities;
using Vaultz.Domain.Enums;

namespace Vaultz.UnitTests.Domain;

public sealed class AccountAllocationTests
{
    [Fact]
    public void AccountAllocation_DepositAndWithdraw_EnforcesNonNegativeAndSufficientBalance()
    {
        var accountId = Guid.NewGuid();
        var allocation = new AccountAllocation(
            "user-1",
            accountId,
            "Emergency Fund",
            AllocationCategory.Emergency,
            initialBalance: 5000m,
            targetAmount: 20000m);

        Assert.Equal("Emergency Fund", allocation.Name);
        Assert.Equal(AllocationCategory.Emergency, allocation.Category);
        Assert.Equal(5000m, allocation.Balance);
        Assert.Equal(20000m, allocation.TargetAmount);

        // Deposit
        allocation.Deposit(1500m);
        Assert.Equal(6500m, allocation.Balance);

        // Withdraw
        allocation.Withdraw(2000m);
        Assert.Equal(4500m, allocation.Balance);

        // Withdraw more than balance throws
        Assert.Throws<DomainException>(() => allocation.Withdraw(5000m));

        // Negative deposit throws
        Assert.Throws<DomainException>(() => allocation.Deposit(-100m));
    }

    [Fact]
    public void MonthlyBudgetPlan_AddSlicesAndSweep_CalculatesAccurateTotals()
    {
        var accountId = Guid.NewGuid();
        var plan = new MonthlyBudgetPlan("user-1", accountId, 2026, 11, 30000m);

        Assert.Equal(30000m, plan.TotalBudgetAmount);
        Assert.True(plan.IsActive);
        Assert.False(plan.IsSwept);

        var slice1 = new MonthlyBudgetSlice("user-1", plan.Id, "Essentials", 50m, 15000m);
        var slice2 = new MonthlyBudgetSlice("user-1", plan.Id, "Bills", 30m, 9000m);
        var slice3 = new MonthlyBudgetSlice("user-1", plan.Id, "Wants", 20m, 6000m);

        plan.AddSlice(slice1);
        plan.AddSlice(slice2);
        plan.AddSlice(slice3);

        Assert.Equal(3, plan.Slices.Count);
        Assert.Equal(30000m, plan.TotalAllocated);

        // Record spending on Essentials
        slice1.RecordExpense(1200m);
        Assert.Equal(1200m, slice1.SpentAmount);
        Assert.Equal(13800m, slice1.RemainingAmount);
        Assert.Equal(1200m, plan.TotalSpent);
        Assert.Equal(28800m, plan.TotalRemaining);

        // Sweep unspent funds to Emergency Allocation
        var targetAllocationId = Guid.NewGuid();
        plan.Sweep(targetAllocationId);

        Assert.True(plan.IsSwept);
        Assert.False(plan.IsActive);
        Assert.Equal(targetAllocationId, plan.SweptToAllocationId);
        Assert.NotNull(plan.SweptAtUtc);

        // Sweeping already swept plan throws
        Assert.Throws<DomainException>(() => plan.Sweep(targetAllocationId));
    }

    [Fact]
    public void MonthlyBudgetPlan_SlicePercentageCannotExceed100()
    {
        var accountId = Guid.NewGuid();
        var plan = new MonthlyBudgetPlan("user-1", accountId, 2026, 11, 10000m);

        var slice1 = new MonthlyBudgetSlice("user-1", plan.Id, "Essentials", 60m, 6000m);
        var slice2 = new MonthlyBudgetSlice("user-1", plan.Id, "Bills", 50m, 5000m);

        plan.AddSlice(slice1);
        Assert.Throws<DomainException>(() => plan.AddSlice(slice2));
    }

    [Fact]
    public void MonthlyBudgetSlice_AdjustAllocation_AllowsBorrowingBetweenSlices()
    {
        var planId = Guid.NewGuid();
        var slice1 = new MonthlyBudgetSlice("user-1", planId, "Essentials", 50m, 5000m);
        var slice2 = new MonthlyBudgetSlice("user-1", planId, "Wants", 50m, 5000m);

        // Wants lends 1000 to Essentials
        slice2.AdjustAllocation(-1000m);
        slice1.AdjustAllocation(1000m);

        Assert.Equal(4000m, slice2.AllocatedAmount);
        Assert.Equal(6000m, slice1.AllocatedAmount);

        // Cannot reduce below 0
        Assert.Throws<DomainException>(() => slice2.AdjustAllocation(-5000m));
    }
}
