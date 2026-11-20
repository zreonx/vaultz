using System.Security.Claims;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vaultz.Application.Common.Exceptions;
using Vaultz.Domain.Common;

namespace Vaultz.Api.Middleware;

/// <summary>
/// Standardized RFC 9457 ProblemDetails exception handler.
/// Emits rich structured logs for developers while delivering professional,
/// secure, and calm user-facing error messages to API consumers.
/// </summary>
public sealed class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;
    private readonly IHostEnvironment _environment;

    public GlobalExceptionHandler(
        ILogger<GlobalExceptionHandler> logger,
        IHostEnvironment environment)
    {
        _logger = logger;
        _environment = environment;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var method = httpContext.Request.Method;
        var path = httpContext.Request.Path.Value ?? string.Empty;
        var query = httpContext.Request.QueryString.HasValue ? httpContext.Request.QueryString.Value : string.Empty;
        var traceId = httpContext.TraceIdentifier;
        var userId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "Anonymous";
        var userEmail = httpContext.User.FindFirstValue(ClaimTypes.Email) ?? "Anonymous";
        var clientIp = httpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

        // Map exception to standardized ProblemDetails and emit contextual log
        ProblemDetails problemDetails;

        switch (exception)
        {
            case AppValidationException validationException:
            {
                var firstError = validationException.Errors.Values.SelectMany(x => x).FirstOrDefault()
                                 ?? "One or more validation checks failed.";

                _logger.LogWarning(
                    "Validation failed on {Method} {Path}{Query} for User: {UserId} ({UserEmail}). Errors: {@ValidationErrors}. TraceId: {TraceId}",
                    method, path, query, userId, userEmail, validationException.Errors, traceId);

                problemDetails = new HttpValidationProblemDetails(validationException.Errors)
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Validation failed",
                    Detail = firstError,
                    Type = "https://tools.ietf.org/html/rfc9110#section-15.5.1",
                    Extensions = { ["errors"] = validationException.Errors }
                };
                break;
            }

            case UnauthorizedAppException unauthorizedException:
            {
                _logger.LogWarning(
                    "Unauthorized request on {Method} {Path}{Query} from {ClientIp}. Message: {Message}. TraceId: {TraceId}",
                    method, path, query, clientIp, unauthorizedException.Message, traceId);

                problemDetails = new ProblemDetails
                {
                    Status = StatusCodes.Status401Unauthorized,
                    Title = "Authentication required",
                    Detail = string.IsNullOrWhiteSpace(unauthorizedException.Message)
                        ? "You must be signed in to perform this action."
                        : unauthorizedException.Message,
                    Type = "https://tools.ietf.org/html/rfc9110#section-15.5.2"
                };
                break;
            }

            case NotFoundException notFoundException:
            {
                _logger.LogInformation(
                    "Resource not found on {Method} {Path}{Query} for User: {UserId}: {Message}. TraceId: {TraceId}",
                    method, path, query, userId, notFoundException.Message, traceId);

                problemDetails = new ProblemDetails
                {
                    Status = StatusCodes.Status404NotFound,
                    Title = "Resource not found",
                    Detail = string.IsNullOrWhiteSpace(notFoundException.Message)
                        ? "The requested item was not found or may have been deleted."
                        : notFoundException.Message,
                    Type = "https://tools.ietf.org/html/rfc9110#section-15.5.5"
                };
                break;
            }

            case DomainException domainException:
            {
                _logger.LogWarning(
                    "Domain business rule violation on {Method} {Path}{Query} for User: {UserId}. Code: {Code}, Message: {Message}. TraceId: {TraceId}",
                    method, path, query, userId, domainException.Code, domainException.Message, traceId);

                problemDetails = new ProblemDetails
                {
                    Status = StatusCodes.Status422UnprocessableEntity,
                    Title = "Action cannot be completed",
                    Detail = domainException.Message,
                    Type = "https://tools.ietf.org/html/rfc9110#section-15.5.21",
                    Extensions = { ["code"] = domainException.Code }
                };
                break;
            }

            case DbUpdateConcurrencyException:
            {
                _logger.LogWarning(
                    "Database concurrency conflict on {Method} {Path}{Query} for User: {UserId}. TraceId: {TraceId}",
                    method, path, query, userId, traceId);

                problemDetails = new ProblemDetails
                {
                    Status = StatusCodes.Status409Conflict,
                    Title = "Record modified",
                    Detail = "This record was updated or deleted by another session. Please refresh and try again.",
                    Type = "https://tools.ietf.org/html/rfc9110#section-15.5.10"
                };
                break;
            }

            case DbUpdateException dbUpdateException:
            {
                var innerMessage = dbUpdateException.InnerException?.Message ?? dbUpdateException.Message;
                var isUniqueConstraint = innerMessage.Contains("23505", StringComparison.OrdinalIgnoreCase) ||
                                         innerMessage.Contains("unique", StringComparison.OrdinalIgnoreCase);
                var isForeignKeyViolation = innerMessage.Contains("23503", StringComparison.OrdinalIgnoreCase) ||
                                            innerMessage.Contains("foreign key", StringComparison.OrdinalIgnoreCase);

                _logger.LogError(
                    dbUpdateException,
                    "Database update error on {Method} {Path}{Query} for User: {UserId}. IsUniqueConstraint: {IsUnique}, IsForeignKey: {IsFk}. TraceId: {TraceId}",
                    method, path, query, userId, isUniqueConstraint, isForeignKeyViolation, traceId);

                if (isUniqueConstraint)
                {
                    problemDetails = new ProblemDetails
                    {
                        Status = StatusCodes.Status409Conflict,
                        Title = "Duplicate entry",
                        Detail = "A record with this information already exists. Please choose a different name or value.",
                        Type = "https://tools.ietf.org/html/rfc9110#section-15.5.10"
                    };
                }
                else if (isForeignKeyViolation)
                {
                    problemDetails = new ProblemDetails
                    {
                        Status = StatusCodes.Status400BadRequest,
                        Title = "Referenced item missing",
                        Detail = "A related record could not be found or has been removed.",
                        Type = "https://tools.ietf.org/html/rfc9110#section-15.5.1"
                    };
                }
                else
                {
                    problemDetails = new ProblemDetails
                    {
                        Status = StatusCodes.Status500InternalServerError,
                        Title = "Database error",
                        Detail = _environment.IsDevelopment()
                            ? innerMessage
                            : "We encountered an issue saving your data. Please try again in a few moments.",
                        Type = "https://tools.ietf.org/html/rfc9110#section-15.6.1"
                    };
                }
                break;
            }

            case OperationCanceledException when httpContext.RequestAborted.IsCancellationRequested:
            {
                _logger.LogInformation(
                    "Request aborted by client on {Method} {Path}{Query} [User: {UserId}]. TraceId: {TraceId}",
                    method, path, query, userId, traceId);

                problemDetails = new ProblemDetails
                {
                    Status = 499, // Client Closed Request
                    Title = "Request cancelled",
                    Detail = "The request was cancelled by the client.",
                    Type = "https://tools.ietf.org/html/rfc9110#section-15.5.1"
                };
                break;
            }

            case TimeoutException or TaskCanceledException:
            {
                _logger.LogError(
                    exception,
                    "Operation timed out on {Method} {Path}{Query} [User: {UserId}]. TraceId: {TraceId}",
                    method, path, query, userId, traceId);

                problemDetails = new ProblemDetails
                {
                    Status = StatusCodes.Status504GatewayTimeout,
                    Title = "Request timed out",
                    Detail = "The server took too long to complete your request. Please try again.",
                    Type = "https://tools.ietf.org/html/rfc9110#section-15.6.5"
                };
                break;
            }

            default:
            {
                _logger.LogError(
                    exception,
                    "Unhandled exception occurred while processing {Method} {Path}{Query} [User: {UserId} ({UserEmail}), IP: {ClientIp}]. TraceId: {TraceId}",
                    method, path, query, userId, userEmail, clientIp, traceId);

                problemDetails = new ProblemDetails
                {
                    Status = StatusCodes.Status500InternalServerError,
                    Title = "An unexpected error occurred",
                    Detail = _environment.IsDevelopment()
                        ? exception.Message
                        : "Something went wrong on our end. Please try again in a few moments.",
                    Type = "https://tools.ietf.org/html/rfc9110#section-15.6.1"
                };
                break;
            }
        }

        problemDetails.Instance = path;
        problemDetails.Extensions["traceId"] = traceId;
        problemDetails.Extensions["timestamp"] = DateTime.UtcNow.ToString("O");

        httpContext.Response.Headers["X-Trace-Id"] = traceId;
        httpContext.Response.StatusCode = problemDetails.Status ?? StatusCodes.Status500InternalServerError;

        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);
        return true;
    }
}
