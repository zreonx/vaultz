using Vaultz.Domain.Common;
using Vaultz.Domain.Enums;
using Vaultz.Domain.ValueObjects;

namespace Vaultz.Domain.Entities;

/// <summary>
/// User-owned planned purchase item with priority, optional account/category link, and atomic purchase conversion.
/// </summary>
public sealed class WishlistItem : UserOwnedEntity
{
    public Guid? AccountId { get; private set; }
    public Guid? CategoryId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public decimal EstimatedPrice { get; private set; }
    public string CurrencyCode { get; private set; } = string.Empty;
    public WishlistPriority Priority { get; private set; }
    public WishlistStatus Status { get; private set; }
    public DateOnly? TargetDate { get; private set; }
    public string? Url { get; private set; }
    public string? Notes { get; private set; }
    public DateTimeOffset? PurchasedAtUtc { get; private set; }
    public Guid? PurchasedTransactionId { get; private set; }

    private WishlistItem()
    {
    }

    public WishlistItem(
        string userId,
        string name,
        decimal estimatedPrice,
        string currencyCode,
        WishlistPriority priority = WishlistPriority.Medium,
        Guid? accountId = null,
        Guid? categoryId = null,
        DateOnly? targetDate = null,
        string? url = null,
        string? notes = null)
        : base(userId)
    {
        ApplyValidatedFields(
            name,
            estimatedPrice,
            currencyCode,
            priority,
            WishlistStatus.Wanted,
            accountId,
            categoryId,
            targetDate,
            url,
            notes);
    }

    public void Update(
        string name,
        decimal estimatedPrice,
        string currencyCode,
        WishlistPriority priority,
        WishlistStatus status,
        Guid? accountId,
        Guid? categoryId,
        DateOnly? targetDate,
        string? url,
        string? notes)
    {
        ApplyValidatedFields(
            name,
            estimatedPrice,
            currencyCode,
            priority,
            status,
            accountId,
            categoryId,
            targetDate,
            url,
            notes);

        if (status == WishlistStatus.Purchased && !PurchasedAtUtc.HasValue)
        {
            PurchasedAtUtc = DateTimeOffset.UtcNow;
        }
        else if (status == WishlistStatus.Wanted)
        {
            PurchasedAtUtc = null;
            PurchasedTransactionId = null;
        }

        MarkUpdated(DateTimeOffset.UtcNow);
    }

    public void MarkPurchased(DateTimeOffset purchasedAtUtc, Guid? transactionId = null)
    {
        if (Status == WishlistStatus.Purchased)
        {
            throw new DomainException("Wishlist item is already marked as purchased.", "wishlist_already_purchased");
        }

        Status = WishlistStatus.Purchased;
        PurchasedAtUtc = purchasedAtUtc;
        PurchasedTransactionId = transactionId;
        MarkUpdated(purchasedAtUtc);
    }

    private void ApplyValidatedFields(
        string name,
        decimal estimatedPrice,
        string currencyCode,
        WishlistPriority priority,
        WishlistStatus status,
        Guid? accountId,
        Guid? categoryId,
        DateOnly? targetDate,
        string? url,
        string? notes)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length > 120)
        {
            throw new DomainException("Wishlist item name is required and must be at most 120 characters.", "invalid_wishlist_name");
        }

        if (estimatedPrice <= 0m)
        {
            throw new DomainException("Estimated price must be greater than zero.", "invalid_estimated_price");
        }

        string? normalizedUrl = string.IsNullOrWhiteSpace(url) ? null : url.Trim();
        if (normalizedUrl is not null)
        {
            if (normalizedUrl.Length > 500)
            {
                throw new DomainException("URL must be at most 500 characters.", "invalid_url");
            }

            if (!Uri.TryCreate(normalizedUrl, UriKind.Absolute, out var parsed)
                || (parsed.Scheme != Uri.UriSchemeHttp && parsed.Scheme != Uri.UriSchemeHttps))
            {
                throw new DomainException("URL must start with http:// or https://.", "invalid_url");
            }
        }

        string? normalizedNotes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
        if (normalizedNotes is not null && normalizedNotes.Length > 500)
        {
            throw new DomainException("Notes must be at most 500 characters.", "invalid_notes");
        }

        Name = name.Trim();
        CurrencyCode = ValueObjects.CurrencyCode.From(currencyCode).Value;
        EstimatedPrice = Money.Create(estimatedPrice, CurrencyCode).Amount;
        Priority = priority;
        Status = status;
        AccountId = accountId;
        CategoryId = categoryId;
        TargetDate = targetDate;
        Url = normalizedUrl;
        Notes = normalizedNotes;
    }
}
