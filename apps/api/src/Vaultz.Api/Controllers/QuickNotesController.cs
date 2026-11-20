using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vaultz.Application.Features.QuickNotes;

namespace Vaultz.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/quick-notes")]
[Produces("application/json")]
public sealed class QuickNotesController : ControllerBase
{
    private readonly QuickNoteHandlers _handlers;

    public QuickNotesController(QuickNoteHandlers handlers)
    {
        _handlers = handlers;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<QuickNoteResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<QuickNoteResponse>>> GetQuickNotes(
        [FromQuery] Guid? accountId = null,
        [FromQuery] bool includeArchived = false,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        var notes = await _handlers.GetQuickNotesAsync(accountId, includeArchived, search, cancellationToken);
        return Ok(notes);
    }

    [HttpPost]
    [ProducesResponseType(typeof(QuickNoteResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<QuickNoteResponse>> CreateQuickNote(
        [FromBody] CreateQuickNoteCommand command,
        CancellationToken cancellationToken = default)
    {
        var created = await _handlers.CreateQuickNoteAsync(command, cancellationToken);
        return Created($"/api/v1/quick-notes/{created.Id}", created);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(QuickNoteResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<QuickNoteResponse>> UpdateQuickNote(
        Guid id,
        [FromBody] UpdateQuickNoteCommand command,
        CancellationToken cancellationToken = default)
    {
        var updated = await _handlers.UpdateQuickNoteAsync(id, command, cancellationToken);
        return Ok(updated);
    }

    [HttpPost("{id:guid}/toggle-pin")]
    [ProducesResponseType(typeof(QuickNoteResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<QuickNoteResponse>> TogglePin(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var updated = await _handlers.TogglePinAsync(id, cancellationToken);
        return Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteQuickNote(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        await _handlers.DeleteQuickNoteAsync(id, cancellationToken);
        return NoContent();
    }
}
