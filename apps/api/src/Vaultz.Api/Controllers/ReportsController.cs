using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vaultz.Application.Features.Reports;

namespace Vaultz.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/reports")]
public sealed class ReportsController : ControllerBase
{
    private readonly ReportHandlers _handlers;

    public ReportsController(ReportHandlers handlers)
    {
        _handlers = handlers;
    }

    [HttpGet("cash-flow")]
    [Produces("application/json")]
    [ProducesResponseType(typeof(CashFlowReportResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<CashFlowReportResponse>> GetCashFlowReport(
        [FromQuery] DateOnly? fromDate = null,
        [FromQuery] DateOnly? toDate = null,
        [FromQuery] string currencyCode = "USD",
        [FromQuery] Guid? accountId = null,
        CancellationToken cancellationToken = default)
    {
        var report = await _handlers.GetCashFlowReportAsync(
            fromDate,
            toDate,
            currencyCode,
            accountId,
            cancellationToken);
        return Ok(report);
    }

    [HttpGet("transactions.csv")]
    [Produces("text/csv")]
    public async Task<IActionResult> ExportTransactionsCsv(
        [FromQuery] DateOnly? fromDate = null,
        [FromQuery] DateOnly? toDate = null,
        [FromQuery] Guid? accountId = null,
        CancellationToken cancellationToken = default)
    {
        var csv = await _handlers.ExportTransactionsCsvAsync(fromDate, toDate, accountId, cancellationToken);
        var bytes = Encoding.UTF8.GetBytes(csv);
        return File(bytes, "text/csv", "vaultz-transactions.csv");
    }
}
