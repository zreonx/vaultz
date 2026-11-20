using Vaultz.Domain.Common;
using Vaultz.Domain.Entities;
using Vaultz.Domain.Enums;

namespace Vaultz.UnitTests.Domain;

public sealed class WishlistAndQuickNoteTests
{
    [Fact]
    public void RecurringTransaction_Update_UpdatesFieldsAndEnforcesInvariants()
    {
        var accountId = Guid.NewGuid();
        var secondAccountId = Guid.NewGuid();
        var categoryId = Guid.NewGuid();

        var recurring = new RecurringTransaction(
            "user-1",
            accountId,
            null,
            categoryId,
            TransactionType.Expense,
            50.00m,
            "USD",
            "Streaming",
            RecurrenceFrequency.Monthly,
            new DateOnly(2026, 11, 20));

        recurring.Update(
            accountId,
            secondAccountId,
            categoryId,
            TransactionType.Transfer,
            125.50m,
            "USD",
            "Monthly Savings Auto-Transfer",
            RecurrenceFrequency.Weekly,
            new DateOnly(2026, 12, 1),
            isActive: false);

        Assert.Equal(TransactionType.Transfer, recurring.Type);
        Assert.Equal(secondAccountId, recurring.DestinationAccountId);
        Assert.Null(recurring.CategoryId);
        Assert.Equal(125.50m, recurring.Amount);
        Assert.Equal("Monthly Savings Auto-Transfer", recurring.Description);
        Assert.Equal(RecurrenceFrequency.Weekly, recurring.Frequency);
        Assert.Equal(new DateOnly(2026, 12, 1), recurring.NextOccurrenceDate);
        Assert.False(recurring.IsActive);

        Assert.Throws<DomainException>(() => recurring.Update(
            accountId,
            accountId,
            null,
            TransactionType.Transfer,
            10m,
            "USD",
            "Invalid Same Account",
            RecurrenceFrequency.Monthly,
            new DateOnly(2026, 12, 1),
            true));

        Assert.Throws<DomainException>(() => recurring.Update(
            accountId,
            null,
            null,
            TransactionType.Expense,
            0m,
            "USD",
            "Zero amount",
            RecurrenceFrequency.Monthly,
            new DateOnly(2026, 12, 1),
            true));
    }

    [Fact]
    public void WishlistItem_ValidatesFieldsAndPreventsDoublePurchase()
    {
        Assert.Throws<DomainException>(() => new WishlistItem(
            "user-1",
            "Monitor",
            0m,
            "USD"));

        Assert.Throws<DomainException>(() => new WishlistItem(
            "user-1",
            "Monitor",
            299.99m,
            "USD",
            url: "ftp://invalid.example.com/item"));

        var item = new WishlistItem(
            "user-1",
            "Noise-Canceling Headphones",
            349.99m,
            "usd",
            WishlistPriority.High,
            url: "https://example.com/headphones",
            notes: "Wait for Black Friday");

        Assert.Equal("USD", item.CurrencyCode);
        Assert.Equal(WishlistStatus.Wanted, item.Status);
        Assert.Equal(WishlistPriority.High, item.Priority);

        var txId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;
        item.MarkPurchased(now, txId);

        Assert.Equal(WishlistStatus.Purchased, item.Status);
        Assert.Equal(txId, item.PurchasedTransactionId);
        Assert.Equal(now, item.PurchasedAtUtc);

        Assert.Throws<DomainException>(() => item.MarkPurchased(DateTimeOffset.UtcNow));
    }

    [Fact]
    public void QuickNote_ValidatesColorHexAndTogglesPin()
    {
        Assert.Throws<DomainException>(() => new QuickNote(
            "user-1",
            "Budget Reminder",
            "Pay electric bill",
            colorHex: "not-a-hex"));

        var note = new QuickNote(
            "user-1",
            "Tax Checklist",
            "Collect 1099s before March.",
            colorHex: "#3b82f6",
            isPinned: false);

        Assert.Equal("#3B82F6", note.ColorHex);
        Assert.False(note.IsPinned);

        note.TogglePin();
        Assert.True(note.IsPinned);

        note.Update(
            "Tax Checklist (Updated)",
            "All forms uploaded.",
            "#10b981",
            isPinned: false,
            isArchived: true,
            accountId: null);

        Assert.Equal("#10B981", note.ColorHex);
        Assert.False(note.IsPinned);
        Assert.True(note.IsArchived);
    }
}
