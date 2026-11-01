using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vaultz.Application.Features.Dashboard;

namespace Vaultz.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/dashboard")]
[Produces("application/json")]
public sealed class DashboardController : ControllerBase
{
    private readonly DashboardHandlers _handlers;

    public DashboardController(DashboardHandlers handlers)
    {
        _handlers = handlers;
    }

    [HttpGet]
    [ProducesResponseType(typeof(DashboardSummaryResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<DashboardSummaryResponse>> GetSummary(
        [FromQuery] int? year = null,
        [FromQuery] int? month = null,
        [FromQuery] string? baseCurrency = null,
        [FromQuery] Guid? accountId = null,
        CancellationToken cancellationToken = default)
    {
        var summary = await _handlers.GetDashboardSummaryAsync(year, month, baseCurrency, accountId, cancellationToken);
        return Ok(summary);
    }
}
