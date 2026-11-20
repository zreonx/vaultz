using System.Diagnostics;
using System.Security.Claims;

namespace Vaultz.Api.Middleware;

/// <summary>
/// Structured HTTP request logging middleware.
/// Provides rich, informative telemetry for developers with execution timings,
/// user context, and status codes while suppressing noisy health-check polling.
/// </summary>
public sealed class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate _next, ILogger<RequestLoggingMiddleware> logger)
    {
        this._next = _next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? string.Empty;
        var isHealthCheck = path.Equals("/health", StringComparison.OrdinalIgnoreCase) ||
                            path.Equals("/api/v1/health", StringComparison.OrdinalIgnoreCase);

        // Always attach X-Trace-Id header so clients can correlate responses with backend logs
        context.Response.OnStarting(() =>
        {
            context.Response.Headers["X-Trace-Id"] = context.TraceIdentifier;
            return Task.CompletedTask;
        });

        var startTimestamp = Stopwatch.GetTimestamp();

        try
        {
            await _next(context);
        }
        finally
        {
            var elapsedMs = Stopwatch.GetElapsedTime(startTimestamp).TotalMilliseconds;
            var statusCode = context.Response.StatusCode;
            var method = context.Request.Method;
            var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "Anonymous";
            var traceId = context.TraceIdentifier;

            if (isHealthCheck)
            {
                if (_logger.IsEnabled(LogLevel.Debug))
                {
                    _logger.LogDebug(
                        "Health check {Method} {Path} responded {StatusCode} in {Elapsed:0.0}ms",
                        method, path, statusCode, elapsedMs);
                }
            }
            else if (statusCode >= 500)
            {
                _logger.LogError(
                    "HTTP {Method} {Path} responded {StatusCode} in {Elapsed:0.0}ms [TraceId: {TraceId}, User: {UserId}]",
                    method, path, statusCode, elapsedMs, traceId, userId);
            }
            else if (statusCode >= 400)
            {
                _logger.LogWarning(
                    "HTTP {Method} {Path} responded {StatusCode} in {Elapsed:0.0}ms [TraceId: {TraceId}, User: {UserId}]",
                    method, path, statusCode, elapsedMs, traceId, userId);
            }
            else
            {
                _logger.LogInformation(
                    "HTTP {Method} {Path} responded {StatusCode} in {Elapsed:0.0}ms [TraceId: {TraceId}, User: {UserId}]",
                    method, path, statusCode, elapsedMs, traceId, userId);
            }
        }
    }
}
