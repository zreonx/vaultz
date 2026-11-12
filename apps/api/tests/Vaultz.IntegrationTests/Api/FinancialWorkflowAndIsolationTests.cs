using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Vaultz.Api.Controllers;
using Vaultz.Application.Common.Interfaces;
using Vaultz.Application.Features.Accounts;
using Vaultz.Application.Features.Auth;
using Vaultz.Application.Features.Budgets;
using Vaultz.Application.Features.Categories;
using Vaultz.Application.Features.Dashboard;
using Vaultz.Application.Features.RecurringTransactions;
using Vaultz.Application.Features.Reports;
using Vaultz.Application.Features.SavingsGoals;
using Vaultz.Application.Features.Transactions;
using Vaultz.Domain.Enums;
using Vaultz.Infrastructure.Persistence;
using Vaultz.IntegrationTests.Fakes;

namespace Vaultz.IntegrationTests.Api;

public sealed class FinancialWorkflowAndIsolationTests
{
    private static WebApplicationFactory<Program> CreateTestFactory(string databaseName)
    {
        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Resend:Enabled"] = "false",
                    ["Resend:ApiKey"] = "",
                });
            });
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<DbContextOptions<VaultzDbContext>>();
                services.RemoveAll<IDbContextOptionsConfiguration<VaultzDbContext>>();

                services.AddDbContext<VaultzDbContext>(options =>
                {
                    options.UseInMemoryDatabase(databaseName);
                });

                services.RemoveAll<IEmailService>();
                services.AddSingleton<IEmailService, FakeEmailService>();
            });
        });
    }

    [Fact]
    public async Task ProtectedEndpoints_WhenUnauthenticated_Return401Unauthorized()
    {
        using var factory = CreateTestFactory(Guid.NewGuid().ToString());
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var accountsResponse = await client.GetAsync("/api/v1/accounts");
        var dashboardResponse = await client.GetAsync("/api/v1/dashboard");

        Assert.Equal(HttpStatusCode.Unauthorized, accountsResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, dashboardResponse.StatusCode);
    }

    [Fact]
    public async Task EndToEndFinancialWorkflow_AndStrictUserIsolation_WorksCorrectly()
    {
        using var factory = CreateTestFactory(Guid.NewGuid().ToString());

        // Create two independent cookie-preserving HTTP clients for User A and User B
        using var userAClient = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = true,
            AllowAutoRedirect = false
        });
        using var userBClient = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = true,
            AllowAutoRedirect = false
        });

        // 1. Register User A (Custom JWT Auth returns signed JWT AccessToken + sets HttpOnly vaultz.jwt cookie)
        var registerAResponse = await userAClient.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterUserCommand("alice@vaultz.local", "Password123", "Alice Vance", "USD"));
        Assert.Equal(HttpStatusCode.Created, registerAResponse.StatusCode);
        var aliceProfile = await registerAResponse.Content.ReadFromJsonAsync<AuthResultResponse>();
        Assert.NotNull(aliceProfile);
        Assert.Equal("USD", aliceProfile.DefaultCurrencyCode);
        Assert.False(string.IsNullOrWhiteSpace(aliceProfile.AccessToken));

        // Verify seeded categories for User A
        var categories = await userAClient.GetFromJsonAsync<List<CategoryResponse>>("/api/v1/categories");
        Assert.NotNull(categories);
        Assert.NotEmpty(categories);
        var incomeCategory = categories.First(c => c.Type == CategoryType.Income);
        var expenseCategory = categories.First(c => c.Type == CategoryType.Expense);

        // 2. Create Checking & Savings Accounts for User A
        var createCheckingResponse = await userAClient.PostAsJsonAsync(
            "/api/v1/accounts",
            new CreateAccountCommand("Primary Checking", AccountType.Checking, "USD", 1000.00m));
        Assert.Equal(HttpStatusCode.Created, createCheckingResponse.StatusCode);
        var checking = (await createCheckingResponse.Content.ReadFromJsonAsync<AccountResponse>())!;

        var createSavingsResponse = await userAClient.PostAsJsonAsync(
            "/api/v1/accounts",
            new CreateAccountCommand("High-Yield Savings", AccountType.Savings, "USD", 500.00m));
        Assert.Equal(HttpStatusCode.Created, createSavingsResponse.StatusCode);
        var savings = (await createSavingsResponse.Content.ReadFromJsonAsync<AccountResponse>())!;

        // Update account name
        var updateCheckingResponse = await userAClient.PutAsJsonAsync(
            $"/api/v1/accounts/{checking.Id}",
            new AccountsController.UpdateAccountRequest("Primary Checking Premium", null, null));
        Assert.Equal(HttpStatusCode.OK, updateCheckingResponse.StatusCode);
        var updatedChecking = (await updateCheckingResponse.Content.ReadFromJsonAsync<AccountResponse>())!;
        Assert.Equal("Primary Checking Premium", updatedChecking.Name);
        Assert.Equal(checking.Type, updatedChecking.Type);
        Assert.Equal(checking.CurrencyCode, updatedChecking.CurrencyCode);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // 3. Record Income (+$2,000), Expense (-$300), and Transfer ($400 Checking -> Savings)
        var incomeRes = await userAClient.PostAsJsonAsync(
            "/api/v1/transactions",
            new CreateTransactionCommand(
                checking.Id,
                null,
                incomeCategory.Id,
                TransactionType.Income,
                2000.00m,
                today,
                "Monthly Salary"));
        Assert.Equal(HttpStatusCode.Created, incomeRes.StatusCode);

        var expenseRes = await userAClient.PostAsJsonAsync(
            "/api/v1/transactions",
            new CreateTransactionCommand(
                checking.Id,
                null,
                expenseCategory.Id,
                TransactionType.Expense,
                300.00m,
                today,
                "Groceries"));
        Assert.Equal(HttpStatusCode.Created, expenseRes.StatusCode);
        var createdExpense = (await expenseRes.Content.ReadFromJsonAsync<TransactionResponse>())!;

        var transferRes = await userAClient.PostAsJsonAsync(
            "/api/v1/transactions",
            new CreateTransactionCommand(
                checking.Id,
                savings.Id,
                null,
                TransactionType.Transfer,
                400.00m,
                today,
                "Transfer to Savings"));
        Assert.Equal(HttpStatusCode.Created, transferRes.StatusCode);

        // Verify Account Balances:
        // Checking: 1000 + 2000 - 300 - 400 = 2300.00
        // Savings:  500 + 400 = 900.00
        var updatedAccounts = (await userAClient.GetFromJsonAsync<List<AccountResponse>>("/api/v1/accounts"))!;
        Assert.Equal(2300.00m, updatedAccounts.Single(a => a.Id == checking.Id).Balance);
        Assert.Equal(900.00m, updatedAccounts.Single(a => a.Id == savings.Id).Balance);

        // 4. Create Monthly Budget ($500) and verify Spent is $300 (Transfer of $400 is excluded!)
        var budgetRes = await userAClient.PostAsJsonAsync(
            "/api/v1/budgets",
            new UpsertBudgetCommand(expenseCategory.Id, today.Year, today.Month, 500.00m, "USD"));
        Assert.Equal(HttpStatusCode.OK, budgetRes.StatusCode);
        var budget = (await budgetRes.Content.ReadFromJsonAsync<BudgetProgressResponse>())!;
        Assert.Equal(300.00m, budget.SpentAmount);
        Assert.Equal(200.00m, budget.RemainingAmount);
        Assert.Equal(60.00m, budget.UtilizationPercent);

        // 5. Create & Contribute to Savings Goal
        var goalRes = await userAClient.PostAsJsonAsync(
            "/api/v1/savings-goals",
            new CreateSavingsGoalCommand("Emergency Reserve", 5000.00m, "USD", 1000.00m, today.AddMonths(6)));
        Assert.Equal(HttpStatusCode.Created, goalRes.StatusCode);
        var goal = (await goalRes.Content.ReadFromJsonAsync<SavingsGoalResponse>())!;

        var adjustGoalRes = await userAClient.PostAsJsonAsync(
            $"/api/v1/savings-goals/{goal.Id}/adjust",
            new { Amount = 250.00m, IsWithdrawal = false });
        Assert.Equal(HttpStatusCode.OK, adjustGoalRes.StatusCode);
        var adjustedGoal = (await adjustGoalRes.Content.ReadFromJsonAsync<SavingsGoalResponse>())!;
        Assert.Equal(1250.00m, adjustedGoal.CurrentAmount);
        Assert.Equal(25.00m, adjustedGoal.ProgressPercent);

        // 6. Create & Process Recurring Transaction ($50 Expense)
        var recurringRes = await userAClient.PostAsJsonAsync(
            "/api/v1/recurring-transactions",
            new CreateRecurringTransactionCommand(
                checking.Id,
                null,
                expenseCategory.Id,
                TransactionType.Expense,
                50.00m,
                "Cloud Subscription",
                RecurrenceFrequency.Monthly,
                today));
        Assert.Equal(HttpStatusCode.Created, recurringRes.StatusCode);
        var recurring = (await recurringRes.Content.ReadFromJsonAsync<RecurringTransactionResponse>())!;

        var processRes = await userAClient.PostAsync($"/api/v1/recurring-transactions/{recurring.Id}/process", null);
        Assert.Equal(HttpStatusCode.OK, processRes.StatusCode);

        // Checking balance after $50 recurring expense: 2300 - 50 = 2250.00
        // Monthly expense total: 300 + 50 = 350.00
        var dashboard = (await userAClient.GetFromJsonAsync<DashboardSummaryResponse>("/api/v1/dashboard"))!;
        var usdSummary = dashboard.CurrencySummaries.Single(s => s.CurrencyCode == "USD");
        Assert.Equal(3150.00m, usdSummary.TotalBalance); // 2250 + 900
        Assert.Equal(2000.00m, usdSummary.MonthlyIncome);
        Assert.Equal(350.00m, usdSummary.MonthlyExpense);
        Assert.Equal(1650.00m, usdSummary.MonthlyNetCashFlow);
        Assert.Equal(400.00m, usdSummary.MonthlyTransfersVolume);

        // 7. Verify Reports & CSV export
        var report = (await userAClient.GetFromJsonAsync<CashFlowReportResponse>(
            $"/api/v1/reports/cash-flow?fromDate={today:yyyy-MM-dd}&toDate={today:yyyy-MM-dd}&currencyCode=USD"))!;
        Assert.Equal(2000.00m, report.TotalIncome);
        Assert.Equal(350.00m, report.TotalExpense);
        Assert.Equal(400.00m, report.TotalTransfersExcluded);

        var csvResponse = await userAClient.GetAsync("/api/v1/reports/transactions.csv");
        Assert.Equal(HttpStatusCode.OK, csvResponse.StatusCode);
        var csvText = await csvResponse.Content.ReadAsStringAsync();
        Assert.Contains("Monthly Salary", csvText);

        // 7b. Verify Server-Side Pagination and Search on Transactions
        var pagedRes = (await userAClient.GetFromJsonAsync<PagedTransactionsResponse>(
            "/api/v1/transactions/paged?page=1&pageSize=2"))!;
        Assert.Equal(4, pagedRes.TotalCount);
        Assert.Equal(2, pagedRes.TotalPages);
        Assert.Equal(2, pagedRes.Items.Count);
        Assert.False(pagedRes.HasPreviousPage);
        Assert.True(pagedRes.HasNextPage);

        var pagedPage2 = (await userAClient.GetFromJsonAsync<PagedTransactionsResponse>(
            "/api/v1/transactions/paged?page=2&pageSize=2"))!;
        Assert.Equal(2, pagedPage2.Items.Count);
        Assert.True(pagedPage2.HasPreviousPage);
        Assert.False(pagedPage2.HasNextPage);

        var searchSalaryRes = (await userAClient.GetFromJsonAsync<PagedTransactionsResponse>(
            "/api/v1/transactions/paged?search=Salary"))!;
        Assert.Equal(1, searchSalaryRes.TotalCount);
        Assert.Equal("Monthly Salary", searchSalaryRes.Items.Single().Description);

        var searchNoneRes = (await userAClient.GetFromJsonAsync<PagedTransactionsResponse>(
            "/api/v1/transactions/paged?search=NonExistentTermXYZ"))!;
        Assert.Equal(0, searchNoneRes.TotalCount);
        Assert.Empty(searchNoneRes.Items);

        // 8. Verify Physical Transaction Delete Reverses Account Balance Atomically
        var deleteExpenseRes = await userAClient.DeleteAsync($"/api/v1/transactions/{createdExpense.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteExpenseRes.StatusCode);

        var accountsAfterDelete = (await userAClient.GetFromJsonAsync<List<AccountResponse>>("/api/v1/accounts"))!;
        // Checking had 2250.00; reversing the $300 expense restores it to 2550.00
        Assert.Equal(2550.00m, accountsAfterDelete.Single(a => a.Id == checking.Id).Balance);

        // 9. Multi-User Data Isolation: Register User B and attempt to access User A's data
        var registerBResponse = await userBClient.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterUserCommand("bob@vaultz.local", "Password123", "Bob Sterling", "USD"));
        Assert.Equal(HttpStatusCode.Created, registerBResponse.StatusCode);

        var userBAccounts = (await userBClient.GetFromJsonAsync<List<AccountResponse>>("/api/v1/accounts"))!;
        var userBTransactions = (await userBClient.GetFromJsonAsync<List<TransactionResponse>>("/api/v1/transactions"))!;
        var userBPagedTransactions = (await userBClient.GetFromJsonAsync<PagedTransactionsResponse>("/api/v1/transactions/paged"))!;
        Assert.Empty(userBAccounts);
        Assert.Empty(userBTransactions);
        Assert.Empty(userBPagedTransactions.Items);
        Assert.Equal(0, userBPagedTransactions.TotalCount);

        // User B attempting to mutate User A's account must receive 404 Not Found
        var crossTenantAttempt = await userBClient.PutAsJsonAsync(
            $"/api/v1/accounts/{checking.Id}",
            new { Name = "Hijacked", Type = AccountType.Checking, IsArchived = false });
        Assert.Equal(HttpStatusCode.NotFound, crossTenantAttempt.StatusCode);

        // 10. Default Account Management & Tenant Isolation
        Assert.True(checking.IsDefault);
        Assert.False(savings.IsDefault);

        var setDefaultResponse = await userAClient.PutAsync($"/api/v1/accounts/{savings.Id}/default", null);
        Assert.Equal(HttpStatusCode.OK, setDefaultResponse.StatusCode);
        var updatedSavings = (await setDefaultResponse.Content.ReadFromJsonAsync<AccountResponse>())!;
        Assert.True(updatedSavings.IsDefault);

        var accountsAfterDefaultChange = (await userAClient.GetFromJsonAsync<List<AccountResponse>>("/api/v1/accounts"))!;
        Assert.True(accountsAfterDefaultChange.Single(a => a.Id == savings.Id).IsDefault);
        Assert.False(accountsAfterDefaultChange.Single(a => a.Id == checking.Id).IsDefault);

        // User B cannot set User A's account as default (must return 404)
        var crossTenantDefaultAttempt = await userBClient.PutAsync($"/api/v1/accounts/{checking.Id}/default", null);
        Assert.Equal(HttpStatusCode.NotFound, crossTenantDefaultAttempt.StatusCode);

        // 11. Delete Account & Tenant Isolation
        // User B cannot delete User A's account (must return 404)
        var crossTenantDeleteAttempt = await userBClient.DeleteAsync($"/api/v1/accounts/{checking.Id}");
        Assert.Equal(HttpStatusCode.NotFound, crossTenantDeleteAttempt.StatusCode);

        // User A deletes checking account
        var deleteResponse = await userAClient.DeleteAsync($"/api/v1/accounts/{checking.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var accountsAfterDeleteAcc = (await userAClient.GetFromJsonAsync<List<AccountResponse>>("/api/v1/accounts"))!;
        Assert.Single(accountsAfterDeleteAcc);
        Assert.Equal(savings.Id, accountsAfterDeleteAcc[0].Id);
        Assert.True(accountsAfterDeleteAcc[0].IsDefault);

        // User A cannot delete their only remaining account (must return 422 Unprocessable Entity)
        var deleteOnlyAccountAttempt = await userAClient.DeleteAsync($"/api/v1/accounts/{savings.Id}");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, deleteOnlyAccountAttempt.StatusCode);
    }
}
