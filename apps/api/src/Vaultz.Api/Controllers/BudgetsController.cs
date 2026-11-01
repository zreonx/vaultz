using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vaultz.Application.Features.Budgets;

namespace Vaultz.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/budgets")]
[Produces("application/json")]
public sealed class BudgetsController : ControllerBase
{
    private readonly BudgetHandlers _handlers;

    public BudgetsController(BudgetHandlers handlers)
    {
        _handlers = handlers;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<BudgetProgressResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<BudgetProgressResponse>>> GetBudgets(
        [FromQuery] int? year = null,
        [FromQuery] int? month = null,
        [FromQuery] Guid? accountId = null,
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var items = await _handlers.GetMonthlyBudgetsAsync(
            year ?? now.Year,
            month ?? now.Month,
            accountId,
            cancellationToken);
        return Ok(items);
    }

    [HttpPost]
    [ProducesResponseType(typeof(BudgetProgressResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<BudgetProgressResponse>> UpsertBudget(
        [FromBody] UpsertBudgetCommand command,
        CancellationToken cancellationToken = default)
    {
        var result = await _handlers.UpsertBudgetAsync(command, cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteBudget(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        await _handlers.DeleteBudgetAsync(id, cancellationToken);
        return NoContent();
    }
}
