using System.Text.RegularExpressions;
using Vaultz.Domain.Common;

namespace Vaultz.Domain.Entities;

/// <summary>
/// User-owned scratchpad quick note with optional account scope, pin priority, and color tag.
/// </summary>
public sealed partial class QuickNote : UserOwnedEntity
{
    public const string DefaultColorHex = "#2A6B58";

    public Guid? AccountId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string Content { get; private set; } = string.Empty;
    public string ColorHex { get; private set; } = DefaultColorHex;
    public bool IsPinned { get; private set; }
    public bool IsArchived { get; private set; }

    private QuickNote()
    {
    }

    public QuickNote(
        string userId,
        string title,
        string content,
        string? colorHex = null,
        bool isPinned = false,
        Guid? accountId = null)
        : base(userId)
    {
        ApplyValidatedFields(title, content, colorHex, isPinned, isArchived: false, accountId);
    }

    public void Update(
        string title,
        string content,
        string? colorHex,
        bool isPinned,
        bool isArchived,
        Guid? accountId)
    {
        ApplyValidatedFields(title, content, colorHex, isPinned, isArchived, accountId);
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    public void TogglePin()
    {
        IsPinned = !IsPinned;
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    private void ApplyValidatedFields(
        string title,
        string content,
        string? colorHex,
        bool isPinned,
        bool isArchived,
        Guid? accountId)
    {
        if (string.IsNullOrWhiteSpace(title) || title.Trim().Length > 120)
        {
            throw new DomainException("Note title is required and must be at most 120 characters.", "invalid_note_title");
        }

        if (string.IsNullOrWhiteSpace(content) || content.Trim().Length > 4000)
        {
            throw new DomainException("Note content is required and must be at most 4000 characters.", "invalid_note_content");
        }

        var normalizedColor = string.IsNullOrWhiteSpace(colorHex)
            ? DefaultColorHex
            : colorHex.Trim().ToUpperInvariant();

        if (!HexColorRegex().IsMatch(normalizedColor))
        {
            throw new DomainException("ColorHex must be a valid 6-digit hex color (e.g. #2A6B58).", "invalid_color_hex");
        }

        Title = title.Trim();
        Content = content.Trim();
        ColorHex = normalizedColor;
        IsPinned = isPinned;
        IsArchived = isArchived;
        AccountId = accountId;
    }

    [GeneratedRegex("^#[0-9A-F]{6}$", RegexOptions.Compiled)]
    private static partial Regex HexColorRegex();
}
