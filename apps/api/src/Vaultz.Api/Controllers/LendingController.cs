using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vaultz.Application.Features.Lending;
using Vaultz.Domain.Enums;

namespace Vaultz.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/lending")]
[Produces("application/json")]
public sealed class LendingController : ControllerBase
{
    private readonly LendingHandlers _handlers;

    public LendingController(LendingHandlers handlers)
    {
        _handlers = handlers;
    }

    [HttpGet]
    [ProducesResponseType(typeof(LendingSummaryResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<LendingSummaryResponse>> GetSummary(
        [FromQuery] Guid? accountId = null,
        [FromQuery] LendingStatus? status = null,
        CancellationToken cancellationToken = default)
    {
        var result = await _handlers.GetLendingSummaryAsync(accountId, status, cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(LendingRecordResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<LendingRecordResponse>> Create(
        [FromBody] CreateLendingRecordCommand command,
        CancellationToken cancellationToken = default)
    {
        var created = await _handlers.CreateRecordAsync(command, cancellationToken);
        return Created($"/api/v1/lending/{created.Id}", created);
    }

    public sealed record AddPaymentRequest(
        decimal Amount,
        DateOnly OccurredOn,
        string? Notes = null,
        bool SyncAccountBalance = true);

    [HttpPost("{id:guid}/payments")]
    [ProducesResponseType(typeof(LendingPaymentResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<LendingPaymentResponse>> RecordPayment(
        Guid id,
        [FromBody] AddPaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await _handlers.RecordPaymentAsync(
            new RecordLendingPaymentCommand(
                id,
                request.Amount,
                request.OccurredOn,
                request.Notes,
                request.SyncAccountBalance
            ),
            cancellationToken
        );
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        await _handlers.DeleteRecordAsync(id, cancellationToken);
        return NoContent();
    }
}
