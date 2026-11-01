using Vaultz.Domain.Common;
using Vaultz.Domain.Enums;

namespace Vaultz.Domain.Entities;

/// <summary>
/// User-owned classification for income and expense transactions.
/// </summary>
public sealed class Category : UserOwnedEntity
{
    public Guid? AccountId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public CategoryType Type { get; private set; }
    public string ColorHex { get; private set; } = "#2A6B58";
    public bool IsArchived { get; private set; }

    private Category()
    {
    }

    public Category(
        string userId,
        string name,
        CategoryType type,
        string? colorHex = null,
        Guid? accountId = null)
        : base(userId)
    {
        SetName(name);
        Type = type;
        SetColor(colorHex);
        AccountId = accountId;
        IsArchived = false;
    }

    public void Update(string name, string? colorHex, bool isArchived)
    {
        SetName(name);
        SetColor(colorHex);
        IsArchived = isArchived;
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    private void SetName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new DomainException("Category name is required.", "invalid_category_name");
        }

        var trimmed = name.Trim();
        if (trimmed.Length > 80)
        {
            throw new DomainException("Category name cannot exceed 80 characters.", "invalid_category_name");
        }

        Name = trimmed;
    }

    private void SetColor(string? colorHex)
    {
        if (string.IsNullOrWhiteSpace(colorHex))
        {
            ColorHex = "#2A6B58";
            return;
        }

        var trimmed = colorHex.Trim();
        if (trimmed.Length != 7 || trimmed[0] != '#')
        {
            throw new DomainException("Color must be a 7-character hex string (e.g., #2A6B58).", "invalid_color");
        }

        ColorHex = trimmed.ToUpperInvariant();
    }
}
