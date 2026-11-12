using Microsoft.EntityFrameworkCore;
using Vaultz.Domain.Entities;
using Vaultz.Domain.Enums;
using Vaultz.Infrastructure.Authentication;
using Vaultz.Infrastructure.Persistence;

namespace Vaultz.Api.Services;

public static class DemoDataSeeder
{
    public static readonly Guid DemoUserGuid = Guid.Parse("11111111-1111-1111-1111-111111111111");

    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<VaultzDbContext>();

        var existingUser = await db.Users.FirstOrDefaultAsync(u => u.Email == "demo@vaultz.local");
        if (existingUser != null)
        {
            existingUser.UpdatePasswordHash(PasswordHasher.HashPassword("Password123"));
            existingUser.VerifyEmail();
            var existingAccounts = await db.Accounts
                .Where(a => a.UserId == existingUser.Id.ToString() && !a.IsArchived)
                .ToListAsync();

            if (existingAccounts.Count > 0 && !existingAccounts.Any(a => a.IsDefault))
            {
                var preferred = existingAccounts.FirstOrDefault(a => a.Name.Contains("Primary", StringComparison.OrdinalIgnoreCase))
                    ?? existingAccounts[0];
                preferred.SetAsDefault();
            }

            await db.SaveChangesAsync();
            return;
        }

        var user = new UserAccount(
            email: "demo@vaultz.local",
            fullName: "Alex Morgan",
            passwordHash: PasswordHasher.HashPassword("Password123"),
            defaultCurrencyCode: "USD",
            id: DemoUserGuid);
        user.VerifyEmail();

        var userId = user.Id.ToString();
        db.Users.Add(user);

        var accUsd = new FinancialAccount(userId, "Primary Checking", AccountType.Checking, "USD", 14500.00m, isDefault: true);
        var accSav = new FinancialAccount(userId, "High-Yield Savings", AccountType.Savings, "USD", 40000.00m);
        var accEur = new FinancialAccount(userId, "Euro Travel Account", AccountType.Checking, "EUR", 3200.00m);
        var accPhp = new FinancialAccount(userId, "Manila Peso Savings", AccountType.Savings, "PHP", 125000.00m);
        db.Accounts.AddRange(accUsd, accSav, accEur, accPhp);

        var catSal = new Category(userId, "Salary & Income", CategoryType.Income, "#2A6B58");
        var catRent = new Category(userId, "Housing & Utilities", CategoryType.Expense, "#5E716A");
        var catFood = new Category(userId, "Dining & Groceries", CategoryType.Expense, "#B87D28");
        var catSub = new Category(userId, "Subscriptions", CategoryType.Expense, "#2563EB");
        db.Categories.AddRange(catSal, catRent, catFood, catSub);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var txSalary = FinancialTransaction.CreateAndApply(
            userId, accUsd, null, catSal.Id, TransactionType.Income, 6800.00m, today, "Monthly Salary Deposit");
        var txRent = FinancialTransaction.CreateAndApply(
            userId, accUsd, null, catRent.Id, TransactionType.Expense, 2150.00m, today, "Apartment Rent & Utilities");
        var txDinner = FinancialTransaction.CreateAndApply(
            userId, accEur, null, catFood.Id, TransactionType.Expense, 85.50m, today, "Bistro Dinner in Paris");
        var txTransfer = FinancialTransaction.CreateAndApply(
            userId, accUsd, accEur, null, TransactionType.Transfer, 1000.00m, today, "USD to EUR Travel Transfer", null, 920.00m);
        db.Transactions.AddRange(txSalary, txRent, txDinner, txTransfer);

        var budgetRent = new Budget(userId, catRent.Id, today.Year, today.Month, 2400.00m, "USD");
        var budgetFood = new Budget(userId, catFood.Id, today.Year, today.Month, 600.00m, "USD");
        db.Budgets.AddRange(budgetRent, budgetFood);

        var vaultEmergency = new AccountAllocation(
            userId, accUsd.Id, "Emergency Fund Vault", AllocationCategory.Emergency, 10000.00m, 25000.00m, "#10b981", "shield");
        db.AccountAllocations.Add(vaultEmergency);

        var demoPlan = new MonthlyBudgetPlan(
            userId, accUsd.Id, today.Year, today.Month, 6000.00m);
        var sliceNeeds = new MonthlyBudgetSlice(userId, demoPlan.Id, "Essentials & Needs", 50.00m, 3000.00m, catRent.Id, "#6366f1");
        sliceNeeds.RecordExpense(2150.00m);
        var sliceWants = new MonthlyBudgetSlice(userId, demoPlan.Id, "Lifestyle & Wants", 30.00m, 1800.00m, catFood.Id, "#8b5cf6");
        var sliceBills = new MonthlyBudgetSlice(userId, demoPlan.Id, "Bills & Subscriptions", 20.00m, 1200.00m, null, "#0ea5e9");
        demoPlan.AddSlice(sliceNeeds);
        demoPlan.AddSlice(sliceWants);
        demoPlan.AddSlice(sliceBills);
        db.MonthlyBudgetPlans.Add(demoPlan);

        var goalEmergency = new SavingsGoal(
            userId, "6-Month Emergency Fund", 45000.00m, "USD", 40000.00m, new DateOnly(2027, 6, 30));
        var goalTrip = new SavingsGoal(
            userId, "Autumn Trip to Japan", 8500.00m, "USD", 5200.00m, new DateOnly(2027, 10, 15));
        db.SavingsGoals.AddRange(goalEmergency, goalTrip);

        var recInternet = new RecurringTransaction(
            userId, accUsd.Id, null, catRent.Id, TransactionType.Expense, 89.00m, "USD",
            "Home Fiber Internet", RecurrenceFrequency.Monthly, today);
        db.RecurringTransactions.Add(recInternet);

        await db.SaveChangesAsync();
    }
}
