using Microsoft.AspNetCore.Mvc;
using Vaultz.Application.Features.System.GetSystemStatus;

namespace Vaultz.Api.Controllers;

[ApiController]
[Route("api/v1/health")]
[Produces("application/json")]
public sealed class HealthController : ControllerBase
{
    private readonly GetSystemStatusHandler _handler;
    private readonly IHostEnvironment _environment;

    public HealthController(
        GetSystemStatusHandler handler,
        IHostEnvironment environment)
    {
        _handler = handler;
        _environment = environment;
    }

    /// <summary>
    /// Returns the operational status of the Vaultz v1 API and optional database connectivity check.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(SystemStatusResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<SystemStatusResponse>> GetStatus(
        [FromQuery] bool checkDb = false,
        CancellationToken cancellationToken = default)
    {
        var response = await _handler.HandleAsync(
            new GetSystemStatusQuery(checkDb),
            _environment.EnvironmentName,
            cancellationToken);

        return Ok(response);
    }
}
