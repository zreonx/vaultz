namespace Vaultz.Domain.Common;

/// <summary>
/// Base exception for domain invariant violations.
/// </summary>
public sealed class DomainException : Exception
{
    public string Code { get; }

    public DomainException(string message, string code = "domain_rule_violation")
        : base(message)
    {
        Code = code;
    }
}
