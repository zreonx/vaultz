using Vaultz.Domain.Common;
using Vaultz.Domain.Enums;

namespace Vaultz.Domain.Entities;

public sealed class Notification : AuditableEntity
{
    public string UserId { get; private set; } = string.Empty;
    public string Title { get; private set; } = string.Empty;
    public string Message { get; private set; } = string.Empty;
    public NotificationType Type { get; private set; } = NotificationType.System;
    public bool IsRead { get; private set; }
    public DateTimeOffset? ReadAtUtc { get; private set; }
    public string? ActionUrl { get; private set; }

    private Notification()
    {
    }

    public Notification(
        string userId,
        string title,
        string message,
        NotificationType type,
        string? actionUrl = null)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new DomainException("UserId is required for notification.", "invalid_user_id");
        }

        if (string.IsNullOrWhiteSpace(title))
        {
            throw new DomainException("Notification title is required.", "invalid_title");
        }

        if (string.IsNullOrWhiteSpace(message))
        {
            throw new DomainException("Notification message is required.", "invalid_message");
        }

        UserId = userId;
        Title = title.Trim();
        Message = message.Trim();
        Type = type;
        ActionUrl = string.IsNullOrWhiteSpace(actionUrl) ? null : actionUrl.Trim();
        IsRead = false;
    }

    public void MarkAsRead(DateTimeOffset now)
    {
        if (IsRead) return;
        IsRead = true;
        ReadAtUtc = now;
        MarkUpdated(now);
    }
}
