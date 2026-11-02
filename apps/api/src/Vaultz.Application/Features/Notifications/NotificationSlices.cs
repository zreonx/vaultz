using Vaultz.Application.Common.Interfaces;
using Vaultz.Domain.Enums;

namespace Vaultz.Application.Features.Notifications;

public sealed class NotificationHandlers
{
    private readonly INotificationService _notificationService;
    private readonly ICurrentUserService _currentUser;

    public NotificationHandlers(
        INotificationService notificationService,
        ICurrentUserService currentUser)
    {
        _notificationService = notificationService;
        _currentUser = currentUser;
    }

    public async Task<NotificationsListResponse> GetNotificationsAsync(int limit = 30, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();
        return await _notificationService.GetUserNotificationsAsync(userId, limit, cancellationToken);
    }

    public async Task MarkAsReadAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();
        await _notificationService.MarkAsReadAsync(userId, id, cancellationToken);
    }

    public async Task MarkAllAsReadAsync(CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();
        await _notificationService.MarkAllAsReadAsync(userId, cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();
        await _notificationService.DeleteNotificationAsync(userId, id, cancellationToken);
    }

    public async Task SendTestNotificationAsync(CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();
        await _notificationService.SendAsync(
            userId,
            "Live Notification Test",
            "Real-time SignalR WebSocket connection is active and working properly!",
            NotificationType.System,
            actionUrl: "/dashboard",
            cancellationToken: cancellationToken);
    }
}
