using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Vaultz.Application.Common.Interfaces;
using Vaultz.Application.Features.Accounts;
using Vaultz.Application.Features.Auth;
using Vaultz.Application.Features.QuickNotes;
using Vaultz.Application.Features.RecurringTransactions;
using Vaultz.Application.Features.Wishlist;
using Vaultz.Domain.Enums;
using Vaultz.Infrastructure.Persistence;
using Vaultz.IntegrationTests.Fakes;

namespace Vaultz.IntegrationTests.Api;

public sealed class WishlistNotesAndRecurringEditTests
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
    public async Task RecurringEdit_WishlistPurchase_AndQuickNotes_WorkEndToEndWithIsolation()
    {
        using var factory = CreateTestFactory(Guid.NewGuid().ToString());
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

        // Register User A & User B
        var regA = await userAClient.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterUserCommand("alice.features@vaultz.local", "Password123", "Alice", "USD"));
        Assert.Equal(HttpStatusCode.Created, regA.StatusCode);

        var regB = await userBClient.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterUserCommand("bob.features@vaultz.local", "Password123", "Bob", "USD"));
        Assert.Equal(HttpStatusCode.Created, regB.StatusCode);

        // User A creates an account with 1000.00 USD
        var acctRes = await userAClient.PostAsJsonAsync(
            "/api/v1/accounts",
            new CreateAccountCommand("Checking", AccountType.Checking, "USD", 1000.00m));
        Assert.Equal(HttpStatusCode.Created, acctRes.StatusCode);
        var account = (await acctRes.Content.ReadFromJsonAsync<AccountResponse>())!;

        // 1. Recurring create + edit + cross-user isolation
        var createRecRes = await userAClient.PostAsJsonAsync(
            "/api/v1/recurring-transactions",
            new CreateRecurringTransactionCommand(
                account.Id,
                null,
                null,
                TransactionType.Expense,
                15.00m,
                "Music Streaming",
                RecurrenceFrequency.Monthly,
                new DateOnly(2026, 12, 1)));
        Assert.Equal(HttpStatusCode.Created, createRecRes.StatusCode);
        var recurring = (await createRecRes.Content.ReadFromJsonAsync<RecurringTransactionResponse>())!;

        var editRecRes = await userAClient.PutAsJsonAsync(
            $"/api/v1/recurring-transactions/{recurring.Id}",
            new UpdateRecurringTransactionCommand(
                account.Id,
                null,
                null,
                TransactionType.Expense,
                19.99m,
                "Music Streaming Family",
                RecurrenceFrequency.Yearly,
                new DateOnly(2026, 12, 15),
                IsActive: false));
        Assert.Equal(HttpStatusCode.OK, editRecRes.StatusCode);
        var editedRec = (await editRecRes.Content.ReadFromJsonAsync<RecurringTransactionResponse>())!;
        Assert.Equal(19.99m, editedRec.Amount);
        Assert.Equal("Music Streaming Family", editedRec.Description);
        Assert.Equal(RecurrenceFrequency.Yearly, editedRec.Frequency);
        Assert.False(editedRec.IsActive);

        // User B cannot edit User A's recurring item
        var crossEditRec = await userBClient.PutAsJsonAsync(
            $"/api/v1/recurring-transactions/{recurring.Id}",
            new UpdateRecurringTransactionCommand(
                account.Id,
                null,
                null,
                TransactionType.Expense,
                1.00m,
                "Hijack",
                RecurrenceFrequency.Monthly,
                new DateOnly(2026, 12, 15)));
        Assert.Equal(HttpStatusCode.NotFound, crossEditRec.StatusCode);

        // 2. Wishlist create, edit, atomic purchase with expense logging, and isolation
        var createWishRes = await userAClient.PostAsJsonAsync(
            "/api/v1/wishlist",
            new CreateWishlistItemCommand(
                "Ergonomic Keyboard",
                200.00m,
                "USD",
                WishlistPriority.High,
                account.Id,
                null,
                new DateOnly(2026, 12, 20),
                "https://example.com/keyboard",
                "Split layout"));
        Assert.Equal(HttpStatusCode.Created, createWishRes.StatusCode);
        var wishItem = (await createWishRes.Content.ReadFromJsonAsync<WishlistItemResponse>())!;
        Assert.Equal(WishlistStatus.Wanted, wishItem.Status);

        // User B cannot purchase or see User A's wishlist item
        var userBWishList = await userBClient.GetFromJsonAsync<List<WishlistItemResponse>>("/api/v1/wishlist");
        Assert.NotNull(userBWishList);
        Assert.Empty(userBWishList);

        var crossPurchase = await userBClient.PostAsJsonAsync(
            $"/api/v1/wishlist/{wishItem.Id}/purchase",
            new PurchaseWishlistItemCommand(LogExpense: false));
        Assert.Equal(HttpStatusCode.NotFound, crossPurchase.StatusCode);

        // User A marks purchased & logs actual expense of 180.00 USD
        var purchaseRes = await userAClient.PostAsJsonAsync(
            $"/api/v1/wishlist/{wishItem.Id}/purchase",
            new PurchaseWishlistItemCommand(
                LogExpense: true,
                AccountId: account.Id,
                CategoryId: null,
                OccurredOn: new DateOnly(2026, 11, 19),
                ActualAmount: 180.00m));
        Assert.Equal(HttpStatusCode.OK, purchaseRes.StatusCode);
        var purchasedWish = (await purchaseRes.Content.ReadFromJsonAsync<WishlistItemResponse>())!;
        Assert.Equal(WishlistStatus.Purchased, purchasedWish.Status);
        Assert.NotNull(purchasedWish.PurchasedTransactionId);

        // Verify account balance debited atomically (1000 - 180 = 820)
        var accountsAfter = await userAClient.GetFromJsonAsync<List<AccountResponse>>("/api/v1/accounts");
        Assert.NotNull(accountsAfter);
        var acctAfter = accountsAfter.First(a => a.Id == account.Id);
        Assert.Equal(820.00m, acctAfter.Balance);

        // 3. Quick Notes CRUD, TogglePin, Search, Archive, and Isolation
        var createNoteRes = await userAClient.PostAsJsonAsync(
            "/api/v1/quick-notes",
            new CreateQuickNoteCommand(
                "Q4 Savings Plan",
                "Move bonus into high-yield account.",
                "#3B82F6",
                IsPinned: false,
                AccountId: account.Id));
        Assert.Equal(HttpStatusCode.Created, createNoteRes.StatusCode);
        var note = (await createNoteRes.Content.ReadFromJsonAsync<QuickNoteResponse>())!;
        Assert.False(note.IsPinned);

        var pinRes = await userAClient.PostAsync($"/api/v1/quick-notes/{note.Id}/toggle-pin", null);
        Assert.Equal(HttpStatusCode.OK, pinRes.StatusCode);
        var pinnedNote = (await pinRes.Content.ReadFromJsonAsync<QuickNoteResponse>())!;
        Assert.True(pinnedNote.IsPinned);

        var searchNotes = await userAClient.GetFromJsonAsync<List<QuickNoteResponse>>("/api/v1/quick-notes?search=bonus");
        Assert.NotNull(searchNotes);
        Assert.Single(searchNotes);

        var crossPin = await userBClient.PostAsync($"/api/v1/quick-notes/{note.Id}/toggle-pin", null);
        Assert.Equal(HttpStatusCode.NotFound, crossPin.StatusCode);

        // 4. Create a backup account so Checking can be deleted, verifying dependent cleanup without concurrency errors
        var reserveRes = await userAClient.PostAsJsonAsync(
            "/api/v1/accounts",
            new CreateAccountCommand("Reserve", AccountType.Savings, "USD", 0m));
        Assert.Equal(HttpStatusCode.Created, reserveRes.StatusCode);

        var deleteAcctRes = await userAClient.DeleteAsync($"/api/v1/accounts/{account.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteAcctRes.StatusCode);
    }
}
