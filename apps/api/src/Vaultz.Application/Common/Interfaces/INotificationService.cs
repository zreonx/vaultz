using Vaultz.Domain.Enums;

namespace Vaultz.Application.Common.Interfaces;

public sealed record NotificationResponse(
    Guid Id,
    string Title,
    string Message,
    string Type,
    bool IsRead,
    string? ActionUrl,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? ReadAtUtc);

public sealed record NotificationsListResponse(
    List<NotificationResponse> Notifications,
    int UnreadCount);

public interface INotificationService
{
    Task SendAsync(
        string userId,
        string title,
        string message,
        NotificationType type,
        string? actionUrl = null,
        CancellationToken cancellationToken = default);

    Task<NotificationsListResponse> GetUserNotificationsAsync(
        string userId,
        int limit = 30,
        CancellationToken cancellationToken = default);

    Task<int> GetUnreadCountAsync(
        string userId,
        CancellationToken cancellationToken = default);

    Task MarkAsReadAsync(
        string userId,
        Guid notificationId,
        CancellationToken cancellationToken = default);

    Task MarkAllAsReadAsync(
        string userId,
        CancellationToken cancellationToken = default);

    Task DeleteNotificationAsync(
        string userId,
        Guid notificationId,
        CancellationToken cancellationToken = default);
}
