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
using Vaultz.Application.Features.QuickLogPresets;
using Vaultz.Application.Features.Transactions;
using Vaultz.Domain.Enums;
using Vaultz.Infrastructure.Persistence;
using Vaultz.IntegrationTests.Fakes;

namespace Vaultz.IntegrationTests.Api;

public sealed class QuickLogPresetsAndSliceNotificationTests
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
    public async Task QuickLogPresets_CrudReplaceMaxLimit_AndUserIsolation_WorkCorrectly()
    {
        using var factory = CreateTestFactory(Guid.NewGuid().ToString());
        using var clientA = factory.CreateClient();
        using var clientB = factory.CreateClient();

        // Register User A & User B
        var regA = await clientA.PostAsJsonAsync("/api/v1/auth/register",
            new RegisterUserCommand("preset-a@example.com", "P@ssword123!", "Preset User A", "USD"));
        Assert.Equal(HttpStatusCode.Created, regA.StatusCode);
        var authA = (await regA.Content.ReadFromJsonAsync<AuthResultResponse>())!;
        clientA.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authA.AccessToken);

        var regB = await clientB.PostAsJsonAsync("/api/v1/auth/register",
            new RegisterUserCommand("preset-b@example.com", "P@ssword123!", "Preset User B", "USD"));
        Assert.Equal(HttpStatusCode.Created, regB.StatusCode);
        var authB = (await regB.Content.ReadFromJsonAsync<AuthResultResponse>())!;
        clientB.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authB.AccessToken);

        // User A creates two accounts so the first can be deleted later
        var acc1Res = await clientA.PostAsJsonAsync("/api/v1/accounts",
            new CreateAccountCommand("Daily Wallet", AccountType.Checking, "USD", 500m, IsDefault: true));
        Assert.Equal(HttpStatusCode.Created, acc1Res.StatusCode);
        var acc1 = (await acc1Res.Content.ReadFromJsonAsync<AccountResponse>())!;

        var acc2Res = await clientA.PostAsJsonAsync("/api/v1/accounts",
            new CreateAccountCommand("Backup Savings", AccountType.Savings, "USD", 1000m));
        Assert.Equal(HttpStatusCode.Created, acc2Res.StatusCode);

        // Create preset
        var createRes = await clientA.PostAsJsonAsync("/api/v1/quick-log-presets",
            new CreateQuickLogPresetCommand(
                AccountId: acc1.Id,
                Label: "Morning Coffee",
                Amount: 5.50m,
                Type: TransactionType.Expense,
                Icon: "coffee",
                ColorHex: "#b87d28",
                SortOrder: 0));
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var created = (await createRes.Content.ReadFromJsonAsync<QuickLogPresetResponse>())!;
        Assert.Equal("Morning Coffee", created.Label);
        Assert.Equal(5.50m, created.Amount);
        Assert.Equal("USD", created.CurrencyCode);
        Assert.Equal("#B87D28", created.ColorHex);

        // Update preset
        var updateRes = await clientA.PutAsJsonAsync($"/api/v1/quick-log-presets/{created.Id}",
            new QuickLogPresetsController.UpdateQuickLogPresetRequest(
                Label: "Iced Latte",
                Amount: 6.25m,
                Type: TransactionType.Expense,
                Icon: "coffee",
                ColorHex: "#2a6b58",
                SortOrder: 1));
        Assert.Equal(HttpStatusCode.OK, updateRes.StatusCode);
        var updated = (await updateRes.Content.ReadFromJsonAsync<QuickLogPresetResponse>())!;
        Assert.Equal("Iced Latte", updated.Label);
        Assert.Equal(6.25m, updated.Amount);

        // Cross-tenant isolation: User B gets 404 on User A's account presets & individual preset
        var crossGetRes = await clientB.GetAsync($"/api/v1/quick-log-presets?accountId={acc1.Id}");
        Assert.Equal(HttpStatusCode.NotFound, crossGetRes.StatusCode);

        var crossDeleteRes = await clientB.DeleteAsync($"/api/v1/quick-log-presets/{created.Id}");
        Assert.Equal(HttpStatusCode.NotFound, crossDeleteRes.StatusCode);

        // Batch replace with 6 presets succeeds
        var sixPresets = Enumerable.Range(1, 6)
            .Select(i => new QuickLogPresetItemInput($"Preset {i}", i * 5m, TransactionType.Expense, null, null, "zap", "#2A6B58", i - 1))
            .ToList();

        var replaceRes = await clientA.PutAsJsonAsync($"/api/v1/quick-log-presets/account/{acc1.Id}",
            new QuickLogPresetsController.ReplaceAccountQuickLogPresetsRequest(sixPresets));
        Assert.Equal(HttpStatusCode.OK, replaceRes.StatusCode);
        var replaced = (await replaceRes.Content.ReadFromJsonAsync<List<QuickLogPresetResponse>>())!;
        Assert.Equal(6, replaced.Count);

        // Attempting to add a 7th preset returns 422 UnprocessableEntity
        var seventhRes = await clientA.PostAsJsonAsync("/api/v1/quick-log-presets",
            new CreateQuickLogPresetCommand(acc1.Id, "Over Limit", 10m));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, seventhRes.StatusCode);

        // Batch replace with 7 presets fails validation (400 BadRequest)
        var sevenPresets = Enumerable.Range(1, 7)
            .Select(i => new QuickLogPresetItemInput($"Too Many {i}", 10m))
            .ToList();
        var replace7Res = await clientA.PutAsJsonAsync($"/api/v1/quick-log-presets/account/{acc1.Id}",
            new QuickLogPresetsController.ReplaceAccountQuickLogPresetsRequest(sevenPresets));
        Assert.Equal(HttpStatusCode.BadRequest, replace7Res.StatusCode);

        // Delete one preset and verify count becomes 5
        var delPresetRes = await clientA.DeleteAsync($"/api/v1/quick-log-presets/{replaced[0].Id}");
        Assert.Equal(HttpStatusCode.NoContent, delPresetRes.StatusCode);

        var listRes = await clientA.GetFromJsonAsync<List<QuickLogPresetResponse>>($"/api/v1/quick-log-presets?accountId={acc1.Id}");
        Assert.NotNull(listRes);
        Assert.Equal(5, listRes.Count);

        // Deleting acc1 removes all its presets inside the same transaction
        var delAccRes = await clientA.DeleteAsync($"/api/v1/accounts/{acc1.Id}");
        Assert.Equal(HttpStatusCode.NoContent, delAccRes.StatusCode);

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<VaultzDbContext>();
            Assert.False(await db.QuickLogPresets.AnyAsync(p => p.AccountId == acc1.Id));
        }
    }

    [Fact]
    public async Task MonthlyFinanceSliceExpense_TriggersWarningAndDepletedNotifications()
    {
        using var factory = CreateTestFactory(Guid.NewGuid().ToString());
        using var client = factory.CreateClient();

        var reg = await client.PostAsJsonAsync("/api/v1/auth/register",
            new RegisterUserCommand("slice-notify@example.com", "P@ssword123!", "Slice Tester", "USD"));
        Assert.Equal(HttpStatusCode.Created, reg.StatusCode);
        var auth = (await reg.Content.ReadFromJsonAsync<AuthResultResponse>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.AccessToken);

        var accRes = await client.PostAsJsonAsync("/api/v1/accounts",
            new CreateAccountCommand("Checking", AccountType.Checking, "USD", 2000m, IsDefault: true));
        var account = (await accRes.Content.ReadFromJsonAsync<AccountResponse>())!;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var planRes = await client.PostAsJsonAsync($"/api/v1/accounts/{account.Id}/budget-plans",
            new AccountAllocationsController.CreateMonthlyPlanRequest(
                Year: today.Year,
                Month: today.Month,
                TotalBudgetAmount: 1000m,
                Slices: new[]
                {
                    new CreateMonthlyBudgetSliceInput("Food & Coffee", 100m, null, "#2A6B58")
                }));
        Assert.Equal(HttpStatusCode.Created, planRes.StatusCode);
        var plan = (await planRes.Content.ReadFromJsonAsync<MonthlyBudgetPlanDto>())!;
        var slice = plan.Slices.Single();

        // Spend 900 (90% >= 85%) -> triggers 85% warning notification
        var tx1 = await client.PostAsJsonAsync("/api/v1/transactions", new CreateTransactionCommand(
            AccountId: account.Id,
            DestinationAccountId: null,
            CategoryId: null,
            Type: TransactionType.Expense,
            Amount: 900m,
            OccurredOn: today,
            Description: "Groceries Stockup",
            BudgetSliceId: slice.Id));
        Assert.Equal(HttpStatusCode.Created, tx1.StatusCode);

        // Spend remaining 100 (100% depleted) -> triggers depleted notification
        var tx2 = await client.PostAsJsonAsync("/api/v1/transactions", new CreateTransactionCommand(
            AccountId: account.Id,
            DestinationAccountId: null,
            CategoryId: null,
            Type: TransactionType.Expense,
            Amount: 100m,
            OccurredOn: today,
            Description: "Coffee",
            BudgetSliceId: slice.Id));
        Assert.Equal(HttpStatusCode.Created, tx2.StatusCode);

        var notifications = (await client.GetFromJsonAsync<NotificationsListResponse>("/api/v1/notifications?limit=20"))!;
        Assert.Contains(notifications.Items, n => n.Title.Contains("Warning (85% Reached)", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(notifications.Items, n => n.Title.Contains("Depleted", StringComparison.OrdinalIgnoreCase));
    }
}
