namespace Vaultz.Application.Features.System.GetSystemStatus;

/// <summary>
/// Response contract for the system status query under /api/v1/health.
/// </summary>
public sealed record SystemStatusResponse(
    string Service,
    string Status,
    string Version,
    string Environment,
    string DatabaseStatus,
    DateTimeOffset TimestampUtc);
