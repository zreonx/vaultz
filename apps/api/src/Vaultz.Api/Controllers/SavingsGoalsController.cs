using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vaultz.Application.Features.SavingsGoals;

namespace Vaultz.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/savings-goals")]
[Produces("application/json")]
public sealed class SavingsGoalsController : ControllerBase
{
    private readonly SavingsGoalHandlers _handlers;

    public SavingsGoalsController(SavingsGoalHandlers handlers)
    {
        _handlers = handlers;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<SavingsGoalResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SavingsGoalResponse>>> GetSavingsGoals(
        [FromQuery] Guid? accountId = null,
        CancellationToken cancellationToken = default)
    {
        var items = await _handlers.GetSavingsGoalsAsync(accountId, cancellationToken);
        return Ok(items);
    }

    [HttpPost]
    [ProducesResponseType(typeof(SavingsGoalResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<SavingsGoalResponse>> CreateSavingsGoal(
        [FromBody] CreateSavingsGoalCommand command,
        CancellationToken cancellationToken = default)
    {
        var created = await _handlers.CreateSavingsGoalAsync(command, cancellationToken);
        return Created($"/api/v1/savings-goals/{created.Id}", created);
    }

    public sealed record AdjustSavingsGoalRequest(decimal Amount, bool IsWithdrawal = false);

    [HttpPost("{id:guid}/adjust")]
    [ProducesResponseType(typeof(SavingsGoalResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<SavingsGoalResponse>> AdjustSavingsGoal(
        Guid id,
        [FromBody] AdjustSavingsGoalRequest request,
        CancellationToken cancellationToken = default)
    {
        var updated = await _handlers.AdjustSavingsGoalAsync(
            new AdjustSavingsGoalCommand(id, request.Amount, request.IsWithdrawal),
            cancellationToken);
        return Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteSavingsGoal(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        await _handlers.DeleteSavingsGoalAsync(id, cancellationToken);
        return NoContent();
    }
}
