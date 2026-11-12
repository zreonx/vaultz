using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vaultz.Application.Features.AccountAllocations;
using Vaultz.Domain.Enums;

namespace Vaultz.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/accounts/{accountId:guid}")]
[Produces("application/json")]
public sealed class AccountAllocationsController : ControllerBase
{
    private readonly AccountAllocationHandlers _handlers;

    public AccountAllocationsController(AccountAllocationHandlers handlers)
    {
        _handlers = handlers;
    }

    [HttpGet("allocations")]
    [ProducesResponseType(typeof(AccountAllocationsOverviewResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AccountAllocationsOverviewResponse>> GetOverview(
        Guid accountId,
        CancellationToken cancellationToken = default)
    {
        var overview = await _handlers.GetOverviewAsync(accountId, cancellationToken);
        return Ok(overview);
    }

    public sealed record CreateAllocationRequest(
        string Name,
        AllocationCategory Category,
        decimal InitialBalance = 0m,
        decimal? TargetAmount = null,
        string? Color = null,
        string? Icon = null);

    [HttpPost("allocations")]
    [ProducesResponseType(typeof(AccountAllocationDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<AccountAllocationDto>> CreateAllocation(
        Guid accountId,
        [FromBody] CreateAllocationRequest request,
        CancellationToken cancellationToken = default)
    {
        var created = await _handlers.CreateAllocationAsync(
            new CreateAccountAllocationCommand(
                accountId,
                request.Name,
                request.Category,
                request.InitialBalance,
                request.TargetAmount,
                request.Color,
                request.Icon),
            cancellationToken);

        return Created($"/api/v1/accounts/{accountId}/allocations/{created.Id}", created);
    }

    public sealed record UpdateAllocationRequest(
        string Name,
        AllocationCategory Category,
        decimal? TargetAmount = null,
        string? Color = null,
        string? Icon = null);

    [HttpPut("allocations/{id:guid}")]
    [ProducesResponseType(typeof(AccountAllocationDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<AccountAllocationDto>> UpdateAllocation(
        Guid accountId,
        Guid id,
        [FromBody] UpdateAllocationRequest request,
        CancellationToken cancellationToken = default)
    {
        var updated = await _handlers.UpdateAllocationAsync(
            new UpdateAccountAllocationCommand(
                id,
                accountId,
                request.Name,
                request.Category,
                request.TargetAmount,
                request.Color,
                request.Icon),
            cancellationToken);

        return Ok(updated);
    }

    [HttpDelete("allocations/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteAllocation(
        Guid accountId,
        Guid id,
        CancellationToken cancellationToken = default)
    {
        await _handlers.DeleteAllocationAsync(accountId, id, cancellationToken);
        return NoContent();
    }

    public sealed record AmountRequest(decimal Amount);

    [HttpPost("allocations/{id:guid}/deposit")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Deposit(
        Guid accountId,
        Guid id,
        [FromBody] AmountRequest request,
        CancellationToken cancellationToken = default)
    {
        await _handlers.DepositAsync(
            new AllocationAmountTransferCommand(id, accountId, request.Amount),
            cancellationToken);

        return NoContent();
    }

    [HttpPost("allocations/{id:guid}/withdraw")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Withdraw(
        Guid accountId,
        Guid id,
        [FromBody] AmountRequest request,
        CancellationToken cancellationToken = default)
    {
        await _handlers.WithdrawAsync(
            new AllocationAmountTransferCommand(id, accountId, request.Amount),
            cancellationToken);

        return NoContent();
    }

    public sealed record CreateMonthlyPlanRequest(
        int Year,
        int Month,
        decimal TotalBudgetAmount,
        IReadOnlyList<CreateMonthlyBudgetSliceInput> Slices);

    [HttpPost("budget-plans")]
    [ProducesResponseType(typeof(MonthlyBudgetPlanDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<MonthlyBudgetPlanDto>> CreateMonthlyPlan(
        Guid accountId,
        [FromBody] CreateMonthlyPlanRequest request,
        CancellationToken cancellationToken = default)
    {
        var plan = await _handlers.CreateMonthlyPlanAsync(
            new CreateMonthlyBudgetPlanCommand(
                accountId,
                request.Year,
                request.Month,
                request.TotalBudgetAmount,
                request.Slices),
            cancellationToken);

        return Created($"/api/v1/accounts/{accountId}/budget-plans/{plan.Id}", plan);
    }

    public sealed record CoverDeficitRequest(
        Guid FromSliceId,
        Guid ToSliceId,
        decimal Amount);

    [HttpPost("budget-plans/{planId:guid}/cover-deficit")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> CoverDeficit(
        Guid accountId,
        Guid planId,
        [FromBody] CoverDeficitRequest request,
        CancellationToken cancellationToken = default)
    {
        await _handlers.CoverDeficitAsync(
            new CoverSliceDeficitCommand(
                accountId,
                planId,
                request.FromSliceId,
                request.ToSliceId,
                request.Amount),
            cancellationToken);

        return NoContent();
    }

    public sealed record SweepPlanRequest(Guid? TargetAllocationId = null);

    [HttpPost("budget-plans/{planId:guid}/sweep")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> SweepPlan(
        Guid accountId,
        Guid planId,
        [FromBody] SweepPlanRequest request,
        CancellationToken cancellationToken = default)
    {
        await _handlers.SweepPlanAsync(
            new SweepMonthlyBudgetPlanCommand(accountId, planId, request.TargetAllocationId),
            cancellationToken);

        return NoContent();
    }

    [HttpPost("budget-plans/{planId:guid}/close")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ClosePlan(
        Guid accountId,
        Guid planId,
        CancellationToken cancellationToken = default)
    {
        await _handlers.ClosePlanAsync(accountId, planId, cancellationToken);
        return NoContent();
    }
}
