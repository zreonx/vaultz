using Vaultz.Application.Common.Interfaces;

namespace Vaultz.Application.Features.System.GetSystemStatus;

/// <summary>
/// Vertical slice query handler that returns the operational status of the Vaultz API foundation.
/// </summary>
public sealed class GetSystemStatusHandler
{
    private readonly IVaultzDbContext _dbContext;

    public GetSystemStatusHandler(IVaultzDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<SystemStatusResponse> HandleAsync(
        GetSystemStatusQuery query,
        string environmentName,
        CancellationToken cancellationToken = default)
    {
        var databaseStatus = "Configured";

        if (query.CheckDatabase)
        {
            var canConnect = await _dbContext.CanConnectAsync(cancellationToken);
            databaseStatus = canConnect ? "Connected" : "Unreachable";
        }

        return new SystemStatusResponse(
            Service: "Vaultz.Api",
            Status: "Healthy",
            Version: "0.1.0",
            Environment: environmentName,
            DatabaseStatus: databaseStatus,
            TimestampUtc: DateTimeOffset.UtcNow);
    }
}
