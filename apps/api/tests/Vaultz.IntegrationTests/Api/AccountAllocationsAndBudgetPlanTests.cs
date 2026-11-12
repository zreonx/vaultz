using System.Net;
using System.Net.Http.Headers;
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
using Vaultz.Application.Features.AccountAllocations;
using Vaultz.Application.Features.Accounts;
using Vaultz.Application.Features.Auth;
using Vaultz.Application.Features.Transactions;
using Vaultz.Domain.Enums;
using Vaultz.Infrastructure.Persistence;
using Vaultz.IntegrationTests.Fakes;

namespace Vaultz.IntegrationTests.Api;

public sealed class AccountAllocationsAndBudgetPlanTests
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
    public async Task CompleteAllocationAndBudgetPlanLifecycle_WithStrictDeficitAndSweep_MaintainsExactInvariants()
    {
        using var factory = CreateTestFactory(Guid.NewGuid().ToString());
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = true,
            AllowAutoRedirect = false
        });

        // 1. Register User A
        var registerResponse = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterUserCommand(
            "alice@example.com",
            "P@ssword123!",
            "Alice Allocator",
            "PHP"));
        Assert.Equal(HttpStatusCode.Created, registerResponse.StatusCode);
        var authA = await registerResponse.Content.ReadFromJsonAsync<AuthResultResponse>();
        Assert.NotNull(authA);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authA.AccessToken);

        // 2. Create Bank Account with ₱50,000 balance
        var createAccountRes = await client.PostAsJsonAsync("/api/v1/accounts", new CreateAccountCommand(
            "Main Savings",
            AccountType.Checking,
            CurrencyCode: "PHP",
            InitialBalance: 50000m));
        Assert.Equal(HttpStatusCode.Created, createAccountRes.StatusCode);
        var account = await createAccountRes.Content.ReadFromJsonAsync<AccountResponse>();
        Assert.NotNull(account);
        var accountId = account.Id;

        // 3. Create Emergency Fund Allocation with ₱10,000
        var createAllocRes = await client.PostAsJsonAsync($"/api/v1/accounts/{accountId}/allocations",
            new AccountAllocationsController.CreateAllocationRequest(
                Name: "Emergency Fund",
                Category: AllocationCategory.Emergency,
                InitialBalance: 10000m,
                TargetAmount: 50000m,
                Color: "#10b981",
                Icon: "shield"));
        Assert.Equal(HttpStatusCode.Created, createAllocRes.StatusCode);
        var alloc = await createAllocRes.Content.ReadFromJsonAsync<AccountAllocationDto>();
        Assert.NotNull(alloc);
        Assert.Equal(10000m, alloc.Balance);

        // Check Overview
        var overviewRes = await client.GetAsync($"/api/v1/accounts/{accountId}/allocations");
        Assert.Equal(HttpStatusCode.OK, overviewRes.StatusCode);
        var overview = await overviewRes.Content.ReadFromJsonAsync<AccountAllocationsOverviewResponse>();
        Assert.NotNull(overview);
        Assert.Equal(50000m, overview.AccountBalance);
        Assert.Equal(10000m, overview.TotalAllocatedInVaults);
        Assert.Equal(40000m, overview.UnallocatedBalance);

        // 4. Depositing ₱5,000 to Emergency Fund
        var depositRes = await client.PostAsJsonAsync($"/api/v1/accounts/{accountId}/allocations/{alloc.Id}/deposit",
            new AccountAllocationsController.AmountRequest(5000m));
        Assert.Equal(HttpStatusCode.NoContent, depositRes.StatusCode);

        // Withdrawing ₱2,000 from Emergency Fund
        var withdrawRes = await client.PostAsJsonAsync($"/api/v1/accounts/{accountId}/allocations/{alloc.Id}/withdraw",
            new AccountAllocationsController.AmountRequest(2000m));
        Assert.Equal(HttpStatusCode.NoContent, withdrawRes.StatusCode);

        overviewRes = await client.GetAsync($"/api/v1/accounts/{accountId}/allocations");
        overview = await overviewRes.Content.ReadFromJsonAsync<AccountAllocationsOverviewResponse>();
        Assert.NotNull(overview);
        Assert.Equal(13000m, overview.TotalAllocatedInVaults); // 10000 + 5000 - 2000
        Assert.Equal(37000m, overview.UnallocatedBalance);

        // 5. Create Monthly Budget Plan (₱30,000)
        var createPlanRes = await client.PostAsJsonAsync($"/api/v1/accounts/{accountId}/budget-plans",
            new AccountAllocationsController.CreateMonthlyPlanRequest(
                Year: 2026,
                Month: 11,
                TotalBudgetAmount: 30000m,
                Slices: new[]
                {
                    new CreateMonthlyBudgetSliceInput("Essentials", 50m),
                    new CreateMonthlyBudgetSliceInput("Wants", 30m),
                    new CreateMonthlyBudgetSliceInput("Sinking", 20m)
                }));
        Assert.Equal(HttpStatusCode.Created, createPlanRes.StatusCode);
        var plan = await createPlanRes.Content.ReadFromJsonAsync<MonthlyBudgetPlanDto>();
        Assert.NotNull(plan);
        Assert.Equal(30000m, plan.TotalBudgetAmount);
        Assert.Equal(3, plan.Slices.Count);

        var essentialsSlice = plan.Slices.First(s => s.Name == "Essentials");
        var wantsSlice = plan.Slices.First(s => s.Name == "Wants");
        var sinkingSlice = plan.Slices.First(s => s.Name == "Sinking");

        Assert.Equal(15000m, essentialsSlice.AllocatedAmount);
        Assert.Equal(9000m, wantsSlice.AllocatedAmount);
        Assert.Equal(6000m, sinkingSlice.AllocatedAmount);

        // 6. Log Expense on Essentials (₱1,500)
        var expenseRes = await client.PostAsJsonAsync("/api/v1/transactions", new CreateTransactionCommand(
            AccountId: accountId,
            DestinationAccountId: null,
            CategoryId: null,
            Type: TransactionType.Expense,
            Amount: 1500m,
            OccurredOn: new DateOnly(2026, 11, 12),
            Description: "Groceries",
            BudgetSliceId: essentialsSlice.Id));
        Assert.Equal(HttpStatusCode.Created, expenseRes.StatusCode);

        // Verify overview reflects expense and remaining budget
        overviewRes = await client.GetAsync($"/api/v1/accounts/{accountId}/allocations");
        overview = await overviewRes.Content.ReadFromJsonAsync<AccountAllocationsOverviewResponse>();
        Assert.NotNull(overview);
        Assert.Equal(48500m, overview.AccountBalance);
        Assert.Equal(13000m, overview.TotalAllocatedInVaults); // untouched
        Assert.Equal(28500m, overview.ActivePlanRemaining); // 30000 - 1500

        // 7. Strict Overdraft: Spending ₱10,000 on Wants (which only has ₱9,000) must fail
        var overdraftRes = await client.PostAsJsonAsync("/api/v1/transactions", new CreateTransactionCommand(
            AccountId: accountId,
            DestinationAccountId: null,
            CategoryId: null,
            Type: TransactionType.Expense,
            Amount: 10000m,
            OccurredOn: new DateOnly(2026, 11, 12),
            Description: "Concert tickets",
            BudgetSliceId: wantsSlice.Id));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, overdraftRes.StatusCode);

        // 8. Cover Deficit: Transfer ₱2,000 from Essentials to Wants
        var coverRes = await client.PostAsJsonAsync(
            $"/api/v1/accounts/{accountId}/budget-plans/{plan.Id}/cover-deficit",
            new AccountAllocationsController.CoverDeficitRequest(
                FromSliceId: essentialsSlice.Id,
                ToSliceId: wantsSlice.Id,
                Amount: 2000m));
        Assert.Equal(HttpStatusCode.NoContent, coverRes.StatusCode);

        // Now spending ₱10,000 on Wants succeeds!
        var wantsExpenseRes = await client.PostAsJsonAsync("/api/v1/transactions", new CreateTransactionCommand(
            AccountId: accountId,
            DestinationAccountId: null,
            CategoryId: null,
            Type: TransactionType.Expense,
            Amount: 10000m,
            OccurredOn: new DateOnly(2026, 11, 12),
            Description: "Concert tickets",
            BudgetSliceId: wantsSlice.Id));
        Assert.Equal(HttpStatusCode.Created, wantsExpenseRes.StatusCode);

        // 9. Sweep remaining unspent budget into Emergency Fund
        // Slices unspent: Essentials (15000 - 2000 transferred - 1500 spent = 11500),
        // Wants (9000 + 2000 - 10000 = 1000), Sinking (6000 unspent) => Total unspent: 18,500.
        var sweepRes = await client.PostAsJsonAsync(
            $"/api/v1/accounts/{accountId}/budget-plans/{plan.Id}/sweep",
            new AccountAllocationsController.SweepPlanRequest(TargetAllocationId: alloc.Id));
        Assert.Equal(HttpStatusCode.NoContent, sweepRes.StatusCode);

        // Verify Emergency Fund received ₱18,500 (13000 + 18500 = 31500)
        overviewRes = await client.GetAsync($"/api/v1/accounts/{accountId}/allocations");
        overview = await overviewRes.Content.ReadFromJsonAsync<AccountAllocationsOverviewResponse>();
        Assert.NotNull(overview);
        Assert.Equal(38500m, overview.AccountBalance); // 50000 - 1500 - 10000
        Assert.Equal(31500m, overview.TotalAllocatedInVaults);
        Assert.Null(overview.ActiveBudgetPlan); // swept plan is no longer active
        Assert.Equal(7000m, overview.UnallocatedBalance); // 38500 - 31500 = 7000

        // 10. Data Isolation: Register User B and verify they cannot see or mutate User A's allocation
        using var clientB = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = true,
            AllowAutoRedirect = false
        });
        var regB = await clientB.PostAsJsonAsync("/api/v1/auth/register", new RegisterUserCommand(
            "bob@example.com",
            "P@ssword123!",
            "Bob Browser",
            "PHP"));
        Assert.Equal(HttpStatusCode.Created, regB.StatusCode);
        var authB = await regB.Content.ReadFromJsonAsync<AuthResultResponse>();
        Assert.NotNull(authB);
        clientB.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authB.AccessToken);

        var crossTenantRes = await clientB.GetAsync($"/api/v1/accounts/{accountId}/allocations");
        Assert.Equal(HttpStatusCode.NotFound, crossTenantRes.StatusCode);
    }
}
