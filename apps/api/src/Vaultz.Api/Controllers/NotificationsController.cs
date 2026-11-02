using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vaultz.Application.Common.Interfaces;
using Vaultz.Application.Features.Notifications;

namespace Vaultz.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/notifications")]
[Produces("application/json")]
public sealed class NotificationsController : ControllerBase
{
    private readonly NotificationHandlers _handlers;

    public NotificationsController(NotificationHandlers handlers)
    {
        _handlers = handlers;
    }

    [HttpGet]
    [ProducesResponseType(typeof(NotificationsListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<NotificationsListResponse>> GetNotifications(
        [FromQuery] int limit = 30,
        CancellationToken cancellationToken = default)
    {
        var result = await _handlers.GetNotificationsAsync(limit, cancellationToken);
        return Ok(result);
    }

    [HttpPut("{id:guid}/read")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> MarkAsRead(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        await _handlers.MarkAsReadAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpPut("read-all")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> MarkAllAsRead(CancellationToken cancellationToken = default)
    {
        await _handlers.MarkAllAsReadAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        await _handlers.DeleteAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpDelete]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ClearAll(CancellationToken cancellationToken = default)
    {
        await _handlers.ClearAllAsync(cancellationToken);
        return NoContent();
    }

    [HttpPost("test")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> SendTestNotification(CancellationToken cancellationToken = default)
    {
        await _handlers.SendTestNotificationAsync(cancellationToken);
        return Ok(new { message = "Test notification dispatched." });
    }
}
