using Vaultz.Domain.Common;

namespace Vaultz.Domain.ValueObjects;

/// <summary>
/// Represents an explicit 3-letter uppercase ISO 4217 currency code (e.g., USD, EUR, PHP).
/// </summary>
public readonly record struct CurrencyCode
{
    public string Value { get; }

    public CurrencyCode(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new DomainException("Currency code is required.", "invalid_currency_code");
        }

        var normalized = value.Trim().ToUpperInvariant();
        if (normalized.Length != 3 || !normalized.All(char.IsAsciiLetter))
        {
            throw new DomainException(
                $"Currency code '{value}' must be a 3-letter ISO 4217 alphabetic code.",
                "invalid_currency_code");
        }

        Value = normalized;
    }

    public static CurrencyCode From(string code) => new(code);

    public override string ToString() => Value;
}
