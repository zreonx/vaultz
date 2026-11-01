using System.Text.Json;
using Vaultz.Domain.ValueObjects;

namespace Vaultz.Api.Services;

public sealed class LiveExchangeRateService : BackgroundService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<LiveExchangeRateService> _logger;

    public LiveExchangeRateService(
        IHttpClientFactory httpClientFactory,
        ILogger<LiveExchangeRateService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await RefreshLiveRatesAsync(stoppingToken);

        using var timer = new PeriodicTimer(TimeSpan.FromHours(6));
        while (!stoppingToken.IsCancellationRequested &&
               await timer.WaitForNextTickAsync(stoppingToken))
        {
            await RefreshLiveRatesAsync(stoppingToken);
        }
    }

    public async Task<bool> RefreshLiveRatesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            using var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(5);

            // Primary free public FX feed (no API key required)
            using var response = await client.GetAsync(
                "https://open.er-api.com/v6/latest/USD",
                cancellationToken);

            if (response.IsSuccessStatusCode)
            {
                await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
                using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

                if (doc.RootElement.TryGetProperty("rates", out var ratesElement) &&
                    ratesElement.ValueKind == JsonValueKind.Object)
                {
                    var parsedRates = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
                    foreach (var prop in ratesElement.EnumerateObject())
                    {
                        if (prop.Value.TryGetDecimal(out var val) && val > 0m)
                        {
                            parsedRates[prop.Name] = val;
                        }
                    }

                    if (parsedRates.Count > 0)
                    {
                        ExchangeRateCatalog.UpdateLiveRates(
                            parsedRates,
                            "Live Market FX (ExchangeRate-API)",
                            DateTimeOffset.UtcNow);

                        _logger.LogInformation(
                            "Updated live exchange rates for {Count} currencies from ExchangeRate-API.",
                            parsedRates.Count);
                        return true;
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Could not reach live FX feed; continuing with fallback reference exchange rates.");
        }

        return false;
    }
}
