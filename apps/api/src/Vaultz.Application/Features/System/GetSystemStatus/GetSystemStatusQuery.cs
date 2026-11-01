namespace Vaultz.Application.Features.System.GetSystemStatus;

/// <summary>
/// Read-only query to inspect API and persistence foundation readiness.
/// </summary>
public sealed record GetSystemStatusQuery(bool CheckDatabase = false);
