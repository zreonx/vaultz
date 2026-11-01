using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vaultz.Application.Features.Transactions;
using Vaultz.Domain.Enums;

namespace Vaultz.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/transactions")]
[Produces("application/json")]
public sealed class TransactionsController : ControllerBase
{
    private readonly TransactionHandlers _handlers;

    public TransactionsController(TransactionHandlers handlers)
    {
        _handlers = handlers;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<TransactionResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<TransactionResponse>>> GetTransactions(
        [FromQuery] Guid? accountId = null,
        [FromQuery] Guid? categoryId = null,
        [FromQuery] TransactionType? type = null,
        [FromQuery] DateOnly? fromDate = null,
        [FromQuery] DateOnly? toDate = null,
        [FromQuery] string? search = null,
        [FromQuery] int limit = 100,
        CancellationToken cancellationToken = default)
    {
        var filter = new GetTransactionsFilter(accountId, categoryId, type, fromDate, toDate, search, limit);
        var items = await _handlers.GetTransactionsAsync(filter, cancellationToken);
        return Ok(items);
    }

    [HttpGet("paged")]
    [ProducesResponseType(typeof(PagedTransactionsResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedTransactionsResponse>> GetPagedTransactions(
        [FromQuery] Guid? accountId = null,
        [FromQuery] Guid? categoryId = null,
        [FromQuery] TransactionType? type = null,
        [FromQuery] DateOnly? fromDate = null,
        [FromQuery] DateOnly? toDate = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 15,
        CancellationToken cancellationToken = default)
    {
        var filter = new GetPagedTransactionsFilter(accountId, categoryId, type, fromDate, toDate, search, page, pageSize);
        var paged = await _handlers.GetPagedTransactionsAsync(filter, cancellationToken);
        return Ok(paged);
    }

    [HttpPost]
    [ProducesResponseType(typeof(TransactionResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<TransactionResponse>> CreateTransaction(
        [FromBody] CreateTransactionCommand command,
        CancellationToken cancellationToken = default)
    {
        var created = await _handlers.CreateTransactionAsync(command, cancellationToken);
        return Created($"/api/v1/transactions/{created.Id}", created);
    }

    public sealed record UpdateTransactionRequest(
        Guid AccountId,
        Guid? DestinationAccountId,
        Guid? CategoryId,
        TransactionType Type,
        decimal Amount,
        DateOnly OccurredOn,
        string Description,
        string? Notes);

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(TransactionResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<TransactionResponse>> UpdateTransaction(
        Guid id,
        [FromBody] UpdateTransactionRequest request,
        CancellationToken cancellationToken = default)
    {
        var updated = await _handlers.UpdateTransactionAsync(
            new UpdateTransactionCommand(
                id,
                request.AccountId,
                request.DestinationAccountId,
                request.CategoryId,
                request.Type,
                request.Amount,
                request.OccurredOn,
                request.Description,
                request.Notes),
            cancellationToken);
        return Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteTransaction(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        await _handlers.DeleteTransactionAsync(id, cancellationToken);
        return NoContent();
    }
}
