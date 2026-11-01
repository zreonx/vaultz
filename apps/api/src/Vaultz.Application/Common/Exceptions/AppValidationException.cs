using FluentValidation.Results;

namespace Vaultz.Application.Common.Exceptions;

/// <summary>
/// Represents one or more FluentValidation failures at the application boundary.
/// </summary>
public sealed class AppValidationException : Exception
{
    public IReadOnlyDictionary<string, string[]> Errors { get; }

    public AppValidationException(IEnumerable<ValidationFailure> failures)
        : base("One or more validation failures have occurred.")
    {
        Errors = failures
            .GroupBy(e => e.PropertyName, e => e.ErrorMessage)
            .ToDictionary(group => group.Key, group => group.Distinct().ToArray());
    }
}
