using Vaultz.Domain.Common;
using Vaultz.Domain.Entities;
using Vaultz.Domain.Enums;

namespace Vaultz.UnitTests.Domain;

public sealed class FinancialEntitiesTests
{
    [Fact]
    public void FinancialTransaction_IncomeAndExpense_UpdateAccountBalanceOnce()
    {
        var account = new FinancialAccount("user-1", "Main Checking", AccountType.Checking, "USD", 1000.00m);

        var income = FinancialTransaction.CreateAndApply(
            "user-1",
            account,
            null,
            null,
            TransactionType.Income,
            500.25m,
            new DateOnly(2026, 10, 15),
            "Salary");

        Assert.Equal(1500.25m, account.Balance);

        var expense = FinancialTransaction.CreateAndApply(
            "user-1",
            account,
            null,
            null,
            TransactionType.Expense,
            200.10m,
            new DateOnly(2026, 10, 16),
            "Groceries");

        Assert.Equal(1300.15m, account.Balance);

        // Reversing the expense restores the previous balance
        expense.ReverseBalanceImpact(account, null);
        Assert.Equal(1500.25m, account.Balance);

        // Reversing the income restores the initial balance
        income.ReverseBalanceImpact(account, null);
        Assert.Equal(1000.00m, account.Balance);
    }

    [Fact]
    public void FinancialTransaction_SameCurrencyTransfer_DebitsSourceAndCreditsDestination()
    {
        var checking = new FinancialAccount("user-1", "Checking", AccountType.Checking, "USD", 2000.00m);
        var savings = new FinancialAccount("user-1", "Savings", AccountType.Savings, "USD", 500.00m);

        var transfer = FinancialTransaction.CreateAndApply(
            "user-1",
            checking,
            savings,
            null,
            TransactionType.Transfer,
            350.50m,
            new DateOnly(2026, 10, 20),
            "Move to savings");

        Assert.Equal(1649.50m, checking.Balance);
        Assert.Equal(850.50m, savings.Balance);

        transfer.ReverseBalanceImpact(checking, savings);
        Assert.Equal(2000.00m, checking.Balance);
        Assert.Equal(500.00m, savings.Balance);
    }

    [Fact]
    public void FinancialTransaction_CrossCurrencyTransfer_ConvertsAndReversesCorrectly()
    {
        var usdAccount = new FinancialAccount("user-1", "USD Checking", AccountType.Checking, "USD", 1000m);
        var eurAccount = new FinancialAccount("user-1", "EUR Savings", AccountType.Savings, "EUR", 500m);

        var transfer = FinancialTransaction.CreateAndApply(
            "user-1",
            usdAccount,
            eurAccount,
            null,
            TransactionType.Transfer,
            100m,
            new DateOnly(2026, 10, 20),
            "Cross-currency transfer",
            destinationAmount: 92.50m);

        Assert.Equal(900.00m, usdAccount.Balance);
        Assert.Equal(592.50m, eurAccount.Balance);
        Assert.Equal(92.50m, transfer.DestinationAmount);
        Assert.Equal("EUR", transfer.DestinationCurrencyCode);
        Assert.Equal(0.925000m, transfer.ExchangeRate);

        transfer.ReverseBalanceImpact(usdAccount, eurAccount);
        Assert.Equal(1000.00m, usdAccount.Balance);
        Assert.Equal(500.00m, eurAccount.Balance);
    }

    [Fact]
    public void FinancialTransaction_TransferWithCategory_ThrowsDomainException()
    {
        var checking = new FinancialAccount("user-1", "Checking", AccountType.Checking, "USD", 1000m);
        var savings = new FinancialAccount("user-1", "Savings", AccountType.Savings, "USD", 500m);

        var ex = Assert.Throws<DomainException>(() =>
            FinancialTransaction.CreateAndApply(
                "user-1",
                checking,
                savings,
                Guid.NewGuid(),
                TransactionType.Transfer,
                100m,
                new DateOnly(2026, 10, 20),
                "Transfer with category"));

        Assert.Equal("transfer_category_not_allowed", ex.Code);
    }

    [Fact]
    public void SavingsGoal_ContributeAndWithdraw_EnforceNonNegativeBalance()
    {
        var goal = new SavingsGoal("user-1", "Emergency Fund", 10000m, "USD", 1000m);

        goal.Contribute(500m);
        Assert.Equal(1500m, goal.CurrentAmount);

        goal.Withdraw(300m);
        Assert.Equal(1200m, goal.CurrentAmount);

        var ex = Assert.Throws<DomainException>(() => goal.Withdraw(2000m));
        Assert.Equal("insufficient_goal_balance", ex.Code);
    }

    [Fact]
    public void RecurringTransaction_AdvanceOccurrence_ComputesNextDateCorrectly()
    {
        var recurring = new RecurringTransaction(
            "user-1",
            Guid.NewGuid(),
            null,
            null,
            TransactionType.Expense,
            49.99m,
            "USD",
            "Fiber Internet",
            RecurrenceFrequency.Monthly,
            new DateOnly(2026, 10, 15));

        recurring.AdvanceOccurrence(new DateOnly(2026, 10, 15));

        Assert.Equal(new DateOnly(2026, 10, 15), recurring.LastProcessedDate);
        Assert.Equal(new DateOnly(2026, 11, 15), recurring.NextOccurrenceDate);
    }

    [Fact]
    public void AccountScopedEntities_AcceptOptionalAccountId()
    {
        var accountId = Guid.NewGuid();

        var category = new Category("user-1", "Local Rent", CategoryType.Expense, "#2A6B58", accountId);
        Assert.Equal(accountId, category.AccountId);

        var budget = new Budget("user-1", category.Id, 2026, 11, 1500m, "USD", accountId);
        Assert.Equal(accountId, budget.AccountId);

        var goal = new SavingsGoal("user-1", "Car Savings", 20000m, "USD", 5000m, null, accountId);
        Assert.Equal(accountId, goal.AccountId);
    }

    [Fact]
    public void FinancialAccount_DefaultStatus_CanBeSetAndRemoved()
    {
        var account = new FinancialAccount("user-1", "Checking", AccountType.Checking, "USD", 100m, isDefault: false);
        Assert.False(account.IsDefault);

        account.SetAsDefault();
        Assert.True(account.IsDefault);

        account.RemoveDefault();
        Assert.False(account.IsDefault);
    }

    [Fact]
    public void FinancialAccount_UpdateDetails_UpdatesNameAndPreservesInvariants()
    {
        var account = new FinancialAccount("user-1", "Original Name", AccountType.Checking, "USD", 500m);
        Assert.Equal("Original Name", account.Name);

        account.UpdateDetails("Renamed Checking", AccountType.Checking, false);
        Assert.Equal("Renamed Checking", account.Name);

        // Rejects null or whitespace names
        Assert.Throws<DomainException>(() => account.UpdateDetails("", AccountType.Checking, false));
        Assert.Throws<DomainException>(() => account.UpdateDetails("   ", AccountType.Checking, false));
    }
}
