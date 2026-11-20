using System.Text.RegularExpressions;
using Vaultz.Domain.Common;
using Vaultz.Domain.Enums;
using Vaultz.Domain.ValueObjects;

namespace Vaultz.Domain.Entities;

/// <summary>
/// Customizable 1-tap preset for logging routine income or expense transactions within a specific account.
/// </summary>
public sealed partial class QuickLogPreset : UserOwnedEntity
{
    public Guid AccountId { get; private set; }
    public string Label { get; private set; } = string.Empty;
    public decimal Amount { get; private set; }
    public string CurrencyCode { get; private set; } = "USD";
    public TransactionType Type { get; private set; } = TransactionType.Expense;
    public Guid? CategoryId { get; private set; }
    public Guid? BudgetSliceId { get; private set; }
    public string Icon { get; private set; } = "zap";
    public string ColorHex { get; private set; } = "#2A6B58";
    public int SortOrder { get; private set; }

    private QuickLogPreset()
    {
    }

    public QuickLogPreset(
        string userId,
        Guid accountId,
        string label,
        decimal amount,
        string currencyCode,
        TransactionType type = TransactionType.Expense,
        Guid? categoryId = null,
        Guid? budgetSliceId = null,
        string icon = "zap",
        string colorHex = "#2A6B58",
        int sortOrder = 0)
        : base(userId)
    {
        if (accountId == Guid.Empty)
        {
            throw new DomainException("Quick log preset must belong to a valid account.", "invalid_account_id");
        }

        AccountId = accountId;
        CurrencyCode = ValueObjects.CurrencyCode.From(currencyCode).Value;
        ApplyValues(label, amount, type, categoryId, budgetSliceId, icon, colorHex, sortOrder);
    }

    public void Update(
        string label,
        decimal amount,
        TransactionType type,
        Guid? categoryId,
        Guid? budgetSliceId,
        string icon,
        string colorHex,
        int sortOrder)
    {
        ApplyValues(label, amount, type, categoryId, budgetSliceId, icon, colorHex, sortOrder);
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    private void ApplyValues(
        string label,
        decimal amount,
        TransactionType type,
        Guid? categoryId,
        Guid? budgetSliceId,
        string icon,
        string colorHex,
        int sortOrder)
    {
        if (string.IsNullOrWhiteSpace(label))
        {
            throw new DomainException("Quick log label is required.", "invalid_preset_label");
        }

        var trimmedLabel = label.Trim();
        if (trimmedLabel.Length > 50)
        {
            throw new DomainException("Quick log label cannot exceed 50 characters.", "invalid_preset_label");
        }

        if (amount <= 0m)
        {
            throw new DomainException("Quick log amount must be greater than zero.", "invalid_preset_amount");
        }

        if (type is not (TransactionType.Expense or TransactionType.Income))
        {
            throw new DomainException("Quick log presets support Expense or Income transactions only.", "invalid_preset_type");
        }

        var normalizedIcon = string.IsNullOrWhiteSpace(icon) ? "zap" : icon.Trim().ToLowerInvariant();
        if (normalizedIcon.Length > 32)
        {
            throw new DomainException("Quick log icon name cannot exceed 32 characters.", "invalid_preset_icon");
        }

        var normalizedColor = string.IsNullOrWhiteSpace(colorHex) ? "#2A6B58" : colorHex.Trim();
        if (!HexColorRegex().IsMatch(normalizedColor))
        {
            throw new DomainException("Color must be a 7-character hex string (e.g., #2A6B58).", "invalid_color");
        }

        Label = trimmedLabel;
        Amount = Money.Create(amount, CurrencyCode).Amount;
        Type = type;
        CategoryId = categoryId;
        BudgetSliceId = type == TransactionType.Expense ? budgetSliceId : null;
        Icon = normalizedIcon;
        ColorHex = normalizedColor.ToUpperInvariant();
        SortOrder = sortOrder;
    }

    [GeneratedRegex("^#[0-9A-Fa-f]{6}$")]
    private static partial Regex HexColorRegex();
}
