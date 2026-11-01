using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vaultz.Application.Features.RecurringTransactions;

namespace Vaultz.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/recurring-transactions")]
[Produces("application/json")]
public sealed class RecurringTransactionsController : ControllerBase
{
    private readonly RecurringTransactionHandlers _handlers;

    public RecurringTransactionsController(RecurringTransactionHandlers handlers)
    {
        _handlers = handlers;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<RecurringTransactionResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<RecurringTransactionResponse>>> GetRecurringTransactions(
        [FromQuery] Guid? accountId = null,
        CancellationToken cancellationToken = default)
    {
        var items = await _handlers.GetRecurringTransactionsAsync(accountId, cancellationToken);
        return Ok(items);
    }

    [HttpPost]
    [ProducesResponseType(typeof(RecurringTransactionResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<RecurringTransactionResponse>> CreateRecurringTransaction(
        [FromBody] CreateRecurringTransactionCommand command,
        CancellationToken cancellationToken = default)
    {
        var created = await _handlers.CreateRecurringTransactionAsync(command, cancellationToken);
        return Created($"/api/v1/recurring-transactions/{created.Id}", created);
    }

    [HttpPost("{id:guid}/process")]
    [ProducesResponseType(typeof(RecurringTransactionResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<RecurringTransactionResponse>> ProcessOccurrence(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var updated = await _handlers.ProcessOccurrenceAsync(id, cancellationToken);
        return Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteRecurringTransaction(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        await _handlers.DeleteRecurringTransactionAsync(id, cancellationToken);
        return NoContent();
    }
}
