using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Vaultz.Application.Common.Interfaces;
using Vaultz.Domain.Entities;
using Vaultz.Domain.Enums;
using Vaultz.Infrastructure.Persistence;

namespace Vaultz.Infrastructure.Notifications;

public sealed class NotificationService : INotificationService
{
    private readonly VaultzDbContext _dbContext;
    private readonly IHubContext<NotificationHub> _hubContext;

    public NotificationService(
        VaultzDbContext dbContext,
        IHubContext<NotificationHub> hubContext)
    {
        _dbContext = dbContext;
        _hubContext = hubContext;
    }

    public async Task SendAsync(
        string userId,
        string title,
        string message,
        NotificationType type,
        string? actionUrl = null,
        CancellationToken cancellationToken = default)
    {
        var notification = new Notification(userId, title, message, type, actionUrl);
        _dbContext.Notifications.Add(notification);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var dto = new NotificationResponse(
            notification.Id,
            notification.Title,
            notification.Message,
            notification.Type.ToString(),
            notification.IsRead,
            notification.ActionUrl,
            notification.CreatedAtUtc,
            notification.ReadAtUtc);

        // Real-time broadcast to all active SignalR connection(s) belonging to this authenticated user
        await _hubContext.Clients.User(userId).SendAsync("ReceiveNotification", dto, cancellationToken);
    }

    public async Task<NotificationsListResponse> GetUserNotificationsAsync(
        string userId,
        int limit = 30,
        CancellationToken cancellationToken = default)
    {
        var items = await _dbContext.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAtUtc)
            .Take(limit)
            .Select(n => new NotificationResponse(
                n.Id,
                n.Title,
                n.Message,
                n.Type.ToString(),
                n.IsRead,
                n.ActionUrl,
                n.CreatedAtUtc,
                n.ReadAtUtc))
            .ToListAsync(cancellationToken);

        var unreadCount = await _dbContext.Notifications
            .AsNoTracking()
            .CountAsync(n => n.UserId == userId && !n.IsRead, cancellationToken);

        return new NotificationsListResponse(items, unreadCount);
    }

    public async Task<int> GetUnreadCountAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.Notifications
            .AsNoTracking()
            .CountAsync(n => n.UserId == userId && !n.IsRead, cancellationToken);
    }

    public async Task MarkAsReadAsync(
        string userId,
        Guid notificationId,
        CancellationToken cancellationToken = default)
    {
        var notification = await _dbContext.Notifications
            .FirstOrDefaultAsync(n => n.UserId == userId && n.Id == notificationId, cancellationToken);

        if (notification is not null && !notification.IsRead)
        {
            notification.MarkAsRead(DateTimeOffset.UtcNow);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task MarkAllAsReadAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var unread = await _dbContext.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync(cancellationToken);

        if (unread.Count != 0)
        {
            var now = DateTimeOffset.UtcNow;
            foreach (var item in unread)
            {
                item.MarkAsRead(now);
            }
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task DeleteNotificationAsync(
        string userId,
        Guid notificationId,
        CancellationToken cancellationToken = default)
    {
        var notification = await _dbContext.Notifications
            .FirstOrDefaultAsync(n => n.UserId == userId && n.Id == notificationId, cancellationToken);

        if (notification is not null)
        {
            _dbContext.Notifications.Remove(notification);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task ClearAllNotificationsAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var notifications = await _dbContext.Notifications
            .Where(n => n.UserId == userId)
            .ToListAsync(cancellationToken);

        if (notifications.Count != 0)
        {
            _dbContext.Notifications.RemoveRange(notifications);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
