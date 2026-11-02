using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Vaultz.Application.Common.Exceptions;
using Vaultz.Domain.Common;

namespace Vaultz.Api.Middleware;

/// <summary>
/// Standardized RFC 9457 ProblemDetails exception handler.
/// Prevents internal exception details from leaking in non-development environments.
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
        _logger.LogError(
            exception,
            "Unhandled exception occurred while processing {Method} {Path}. TraceId: {TraceId}",
            httpContext.Request.Method,
            httpContext.Request.Path,
            httpContext.TraceIdentifier);

        ProblemDetails problemDetails = exception switch
        {
            AppValidationException validationException => new HttpValidationProblemDetails(validationException.Errors)
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Validation failed",
                Detail = validationException.Errors.Values.SelectMany(x => x).FirstOrDefault() ?? "One or more validation errors occurred.",
                Type = "https://tools.ietf.org/html/rfc9110#section-15.5.1",
                Extensions = { ["errors"] = validationException.Errors }
            },
            UnauthorizedAppException unauthorizedException => new ProblemDetails
            {
                Status = StatusCodes.Status401Unauthorized,
                Title = "Unauthorized",
                Detail = unauthorizedException.Message,
                Type = "https://tools.ietf.org/html/rfc9110#section-15.5.2"
            },
            NotFoundException notFoundException => new ProblemDetails
            {
                Status = StatusCodes.Status404NotFound,
                Title = "Resource not found",
                Detail = notFoundException.Message,
                Type = "https://tools.ietf.org/html/rfc9110#section-15.5.5"
            },
            DomainException domainException => new ProblemDetails
            {
                Status = StatusCodes.Status422UnprocessableEntity,
                Title = "Domain rule violation",
                Detail = domainException.Message,
                Type = "https://tools.ietf.org/html/rfc9110#section-15.5.21",
                Extensions = { ["code"] = domainException.Code }
            },
            _ => new ProblemDetails
            {
                Status = StatusCodes.Status500InternalServerError,
                Title = "An unexpected error occurred",
                Detail = _environment.IsDevelopment()
                    ? exception.Message
                    : "An internal server error occurred. Please try again later.",
                Type = "https://tools.ietf.org/html/rfc9110#section-15.6.1"
            }
        };

        problemDetails.Instance = httpContext.Request.Path;
        problemDetails.Extensions["traceId"] = httpContext.TraceIdentifier;

        httpContext.Response.StatusCode = problemDetails.Status ?? StatusCodes.Status500InternalServerError;
        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);

        return true;
    }
}
