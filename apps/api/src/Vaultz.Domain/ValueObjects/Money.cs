using Vaultz.Domain.Common;

namespace Vaultz.Domain.ValueObjects;

/// <summary>
/// Value object representing an exact decimal monetary amount paired with an explicit ISO 4217 currency code.
/// Enforces PostgreSQL numeric(19,4) scale rules and prevents cross-currency arithmetic mistakes.
/// </summary>
public readonly record struct Money
{
    public const int MaxDecimalScale = 4;

    public decimal Amount { get; }
    public CurrencyCode Currency { get; }

    public Money(decimal amount, CurrencyCode currency)
    {
        if (string.IsNullOrEmpty(currency.Value))
        {
            throw new DomainException("Money requires an explicit currency code.", "missing_currency_code");
        }

        Amount = decimal.Round(amount, MaxDecimalScale, MidpointRounding.ToEven);
        Currency = currency;
    }

    public static Money Create(decimal amount, string currencyCode) =>
        new(amount, CurrencyCode.From(currencyCode));

    public static Money Zero(string currencyCode) =>
        new(0m, CurrencyCode.From(currencyCode));

    public Money Add(Money other)
    {
        EnsureSameCurrency(other);
        return new Money(Amount + other.Amount, Currency);
    }

    public Money Subtract(Money other)
    {
        EnsureSameCurrency(other);
        return new Money(Amount - other.Amount, Currency);
    }

    public Money RoundToMinorUnits(int minorUnits = 2)
    {
        if (minorUnits is < 0 or > MaxDecimalScale)
        {
            throw new DomainException($"Minor unit scale must be between 0 and {MaxDecimalScale}.", "invalid_rounding_scale");
        }

        return new Money(decimal.Round(Amount, minorUnits, MidpointRounding.ToEven), Currency);
    }

    private void EnsureSameCurrency(Money other)
    {
        if (Currency != other.Currency)
        {
            throw new DomainException(
                $"Cannot combine monetary amounts with different currencies ('{Currency}' vs '{other.Currency}').",
                "currency_mismatch");
        }
    }

    public override string ToString() => $"{Amount:0.00##} {Currency.Value}";
}
