using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vaultz.Application.Features.QuickLogPresets;
using Vaultz.Domain.Enums;

namespace Vaultz.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/quick-log-presets")]
[Produces("application/json")]
public sealed class QuickLogPresetsController : ControllerBase
{
    private readonly QuickLogPresetHandlers _handlers;

    public QuickLogPresetsController(QuickLogPresetHandlers handlers)
    {
        _handlers = handlers;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<QuickLogPresetResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<QuickLogPresetResponse>>> GetPresets(
        [FromQuery] Guid accountId,
        CancellationToken cancellationToken = default)
    {
        var items = await _handlers.GetPresetsAsync(accountId, cancellationToken);
        return Ok(items);
    }

    [HttpPost]
    [ProducesResponseType(typeof(QuickLogPresetResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<QuickLogPresetResponse>> CreatePreset(
        [FromBody] CreateQuickLogPresetCommand command,
        CancellationToken cancellationToken = default)
    {
        var created = await _handlers.CreatePresetAsync(command, cancellationToken);
        return Created($"/api/v1/quick-log-presets/{created.Id}", created);
    }

    public sealed record UpdateQuickLogPresetRequest(
        string Label,
        decimal Amount,
        TransactionType Type = TransactionType.Expense,
        Guid? CategoryId = null,
        Guid? BudgetSliceId = null,
        string Icon = "zap",
        string ColorHex = "#2A6B58",
        int SortOrder = 0);

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(QuickLogPresetResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<QuickLogPresetResponse>> UpdatePreset(
        Guid id,
        [FromBody] UpdateQuickLogPresetRequest request,
        CancellationToken cancellationToken = default)
    {
        var updated = await _handlers.UpdatePresetAsync(
            new UpdateQuickLogPresetCommand(
                id,
                request.Label,
                request.Amount,
                request.Type,
                request.CategoryId,
                request.BudgetSliceId,
                request.Icon,
                request.ColorHex,
                request.SortOrder),
            cancellationToken);
        return Ok(updated);
    }

    public sealed record ReplaceAccountQuickLogPresetsRequest(
        IReadOnlyList<QuickLogPresetItemInput> Presets);

    [HttpPut("account/{accountId:guid}")]
    [ProducesResponseType(typeof(IReadOnlyList<QuickLogPresetResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<QuickLogPresetResponse>>> ReplaceAccountPresets(
        Guid accountId,
        [FromBody] ReplaceAccountQuickLogPresetsRequest request,
        CancellationToken cancellationToken = default)
    {
        var items = await _handlers.ReplaceAccountPresetsAsync(
            new ReplaceAccountQuickLogPresetsCommand(accountId, request.Presets),
            cancellationToken);
        return Ok(items);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeletePreset(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        await _handlers.DeletePresetAsync(id, cancellationToken);
        return NoContent();
    }
}
