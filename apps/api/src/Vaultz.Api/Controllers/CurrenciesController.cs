using Microsoft.AspNetCore.Mvc;
using Vaultz.Api.Services;
using Vaultz.Domain.ValueObjects;

namespace Vaultz.Api.Controllers;

public sealed record ExchangeRatesResponse(
    string BaseCurrency,
    bool IsLiveFeedActive,
    string RateSource,
    DateTimeOffset LastUpdatedUtc,
    IReadOnlyDictionary<string, decimal> UnitsPerUsd);

[ApiController]
[Route("api/v1/currencies")]
[Produces("application/json")]
public sealed class CurrenciesController : ControllerBase
{
    private readonly LiveExchangeRateService _liveRateService;

    public CurrenciesController(LiveExchangeRateService liveRateService)
    {
        _liveRateService = liveRateService;
    }

    [HttpGet("rates")]
    [ProducesResponseType(typeof(ExchangeRatesResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ExchangeRatesResponse>> GetRates(
        [FromQuery] bool refresh = false,
        CancellationToken cancellationToken = default)
    {
        if (refresh || !ExchangeRateCatalog.IsLiveFeedActive)
        {
            await _liveRateService.RefreshLiveRatesAsync(cancellationToken);
        }

        return Ok(new ExchangeRatesResponse(
            BaseCurrency: "USD",
            IsLiveFeedActive: ExchangeRateCatalog.IsLiveFeedActive,
            RateSource: ExchangeRateCatalog.RateSource,
            LastUpdatedUtc: ExchangeRateCatalog.LastUpdatedUtc,
            UnitsPerUsd: ExchangeRateCatalog.GetUnitsPerUsdSnapshot()));
    }
}
