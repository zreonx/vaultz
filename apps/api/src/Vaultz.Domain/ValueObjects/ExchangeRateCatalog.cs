using System.Collections.Concurrent;

namespace Vaultz.Domain.ValueObjects;

/// <summary>
/// Provides exact decimal exchange rates relative to USD for multi-currency
/// net-worth consolidation, cash-flow reporting, and cross-currency account transfers.
/// Supports live market rate updates with deterministic fallback rates when offline.
/// </summary>
public static class ExchangeRateCatalog
{
    private static readonly ConcurrentDictionary<string, decimal> UnitsPerUsd =
        new(new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase)
        {
            ["USD"] = 1.0000m,
            ["EUR"] = 0.9200m,
            ["GBP"] = 0.7900m,
            ["PHP"] = 56.2500m,
            ["JPY"] = 152.4000m,
            ["KRW"] = 1385.0000m,
            ["CAD"] = 1.3800m,
            ["AUD"] = 1.5200m,
            ["SGD"] = 1.3400m,
            ["CHF"] = 0.8800m,
            ["HKD"] = 7.7800m
        }, StringComparer.OrdinalIgnoreCase);

    public static bool IsLiveFeedActive { get; private set; }

    public static string RateSource { get; private set; } = "Fallback Reference Rates";

    public static DateTimeOffset LastUpdatedUtc { get; private set; } = DateTimeOffset.UtcNow;

    public static IReadOnlyList<string> SupportedCurrencies { get; } =
        ["AUD", "CAD", "CHF", "EUR", "GBP", "HKD", "JPY", "KRW", "PHP", "SGD", "USD"];

    /// <summary>
    /// Updates the in-memory exchange rate table from a live market FX feed.
    /// </summary>
    public static void UpdateLiveRates(
        IReadOnlyDictionary<string, decimal> liveUnitsPerUsd,
        string sourceName,
        DateTimeOffset fetchedAtUtc)
    {
        foreach (var kvp in liveUnitsPerUsd)
        {
            if (kvp.Value > 0m && SupportedCurrencies.Contains(kvp.Key, StringComparer.OrdinalIgnoreCase))
            {
                UnitsPerUsd[kvp.Key.ToUpperInvariant()] = decimal.Round(kvp.Value, 6, MidpointRounding.ToEven);
            }
        }

        UnitsPerUsd["USD"] = 1.0000m;
        IsLiveFeedActive = true;
        RateSource = sourceName;
        LastUpdatedUtc = fetchedAtUtc;
    }

    /// <summary>
    /// Returns the exchange rate to convert 1 unit of <paramref name="fromCurrency"/> into <paramref name="toCurrency"/>.
    /// </summary>
    public static decimal GetRate(string fromCurrency, string toCurrency)
    {
        var from = CurrencyCode.From(fromCurrency).Value;
        var to = CurrencyCode.From(toCurrency).Value;

        if (string.Equals(from, to, StringComparison.OrdinalIgnoreCase))
        {
            return 1.000000m;
        }

        var fromUnits = UnitsPerUsd.TryGetValue(from, out var f) ? f : 1.0000m;
        var toUnits = UnitsPerUsd.TryGetValue(to, out var t) ? t : 1.0000m;

        return decimal.Round(toUnits / fromUnits, 6, MidpointRounding.ToEven);
    }

    /// <summary>
    /// Converts a monetary amount from <paramref name="fromCurrency"/> into <paramref name="toCurrency"/>
    /// with 4-decimal-place banker's rounding.
    /// </summary>
    public static decimal Convert(decimal amount, string fromCurrency, string toCurrency)
    {
        var from = CurrencyCode.From(fromCurrency).Value;
        var to = CurrencyCode.From(toCurrency).Value;

        if (string.Equals(from, to, StringComparison.OrdinalIgnoreCase))
        {
            return decimal.Round(amount, 4, MidpointRounding.ToEven);
        }

        var rate = GetRate(from, to);
        return decimal.Round(amount * rate, 4, MidpointRounding.ToEven);
    }

    /// <summary>
    /// Returns a dictionary of conversion rates from every supported currency into <paramref name="baseCurrency"/>.
    /// </summary>
    public static IReadOnlyDictionary<string, decimal> GetRatesToBase(string baseCurrency)
    {
        var target = CurrencyCode.From(baseCurrency).Value;
        var result = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);

        foreach (var code in SupportedCurrencies)
        {
            result[code] = GetRate(code, target);
        }

        return result;
    }

    /// <summary>
    /// Returns a snapshot of current units per 1 USD across all supported currencies.
    /// </summary>
    public static IReadOnlyDictionary<string, decimal> GetUnitsPerUsdSnapshot()
    {
        return new Dictionary<string, decimal>(UnitsPerUsd, StringComparer.OrdinalIgnoreCase);
    }
}
