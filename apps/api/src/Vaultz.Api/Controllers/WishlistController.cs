using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vaultz.Application.Features.Wishlist;
using Vaultz.Domain.Enums;

namespace Vaultz.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/wishlist")]
[Produces("application/json")]
public sealed class WishlistController : ControllerBase
{
    private readonly WishlistHandlers _handlers;

    public WishlistController(WishlistHandlers handlers)
    {
        _handlers = handlers;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<WishlistItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<WishlistItemResponse>>> GetWishlistItems(
        [FromQuery] Guid? accountId = null,
        [FromQuery] WishlistStatus? status = null,
        CancellationToken cancellationToken = default)
    {
        var items = await _handlers.GetWishlistItemsAsync(accountId, status, cancellationToken);
        return Ok(items);
    }

    [HttpPost]
    [ProducesResponseType(typeof(WishlistItemResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<WishlistItemResponse>> CreateWishlistItem(
        [FromBody] CreateWishlistItemCommand command,
        CancellationToken cancellationToken = default)
    {
        var created = await _handlers.CreateWishlistItemAsync(command, cancellationToken);
        return Created($"/api/v1/wishlist/{created.Id}", created);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(WishlistItemResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<WishlistItemResponse>> UpdateWishlistItem(
        Guid id,
        [FromBody] UpdateWishlistItemCommand command,
        CancellationToken cancellationToken = default)
    {
        var updated = await _handlers.UpdateWishlistItemAsync(id, command, cancellationToken);
        return Ok(updated);
    }

    [HttpPost("{id:guid}/purchase")]
    [ProducesResponseType(typeof(WishlistItemResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<WishlistItemResponse>> PurchaseWishlistItem(
        Guid id,
        [FromBody] PurchaseWishlistItemCommand? command = null,
        CancellationToken cancellationToken = default)
    {
        var updated = await _handlers.PurchaseWishlistItemAsync(
            id,
            command ?? new PurchaseWishlistItemCommand(),
            cancellationToken);
        return Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteWishlistItem(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        await _handlers.DeleteWishlistItemAsync(id, cancellationToken);
        return NoContent();
    }
}
