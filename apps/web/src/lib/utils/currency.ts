export const SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "PHP",
  "JPY",
  "KRW",
  "CAD",
  "AUD",
  "SGD",
  "CHF",
  "HKD",
] as const;

export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_METADATA: Record<
  SupportedCurrencyCode,
  { name: string; symbol: string }
> = {
  USD: { name: "US Dollar", symbol: "$" },
  EUR: { name: "Euro", symbol: "€" },
  GBP: { name: "British Pound", symbol: "£" },
  PHP: { name: "Philippine Peso", symbol: "₱" },
  JPY: { name: "Japanese Yen", symbol: "¥" },
  KRW: { name: "South Korean Won", symbol: "₩" },
  CAD: { name: "Canadian Dollar", symbol: "CA$" },
  AUD: { name: "Australian Dollar", symbol: "A$" },
  SGD: { name: "Singapore Dollar", symbol: "S$" },
  CHF: { name: "Swiss Franc", symbol: "CHF" },
  HKD: { name: "Hong Kong Dollar", symbol: "HK$" },
};

const UNITS_PER_USD: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  PHP: 56.25,
  JPY: 152.4,
  KRW: 1385.0,
  CAD: 1.38,
  AUD: 1.52,
  SGD: 1.34,
  CHF: 0.88,
  HKD: 7.78,
};

/**
 * Updates the client-side exchange rate table with live market FX rates from the API.
 */
export function setLiveUnitsPerUsd(liveRates?: Record<string, number> | null): void {
  if (!liveRates) return;
  for (const [code, rate] of Object.entries(liveRates)) {
    if (typeof rate === "number" && rate > 0) {
      UNITS_PER_USD[code.toUpperCase()] = rate;
    }
  }
  UNITS_PER_USD.USD = 1.0;
}

/**
 * Formats an exact numeric monetary value with an explicit ISO 4217 currency code.
 * Never performs floating-point balance calculations; purely formats backend-provided numbers.
 */
export function formatMoney(
  amount: number,
  currencyCode: string,
  locale = "en-US"
): string {
  const normalizedCurrency = currencyCode.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
    throw new Error(`Invalid ISO 4217 currency code: ${currencyCode}`);
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: normalizedCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Returns the exchange rate to convert 1 unit of `fromCurrency` into `toCurrency`
 * using live FX rates (with fallback reference rates if offline).
 */
export function getReferenceExchangeRate(
  fromCurrency: string,
  toCurrency: string
): number {
  const from = (fromCurrency || "USD").trim().toUpperCase();
  const to = (toCurrency || "USD").trim().toUpperCase();
  if (from === to) return 1;

  const fromRate = UNITS_PER_USD[from] ?? 1;
  const toRate = UNITS_PER_USD[to] ?? 1;
  return Number((toRate / fromRate).toFixed(6));
}

/**
 * Computes a converted amount for cross-currency transfer forms.
 */
export function convertReferenceAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  const rate = getReferenceExchangeRate(fromCurrency, toCurrency);
  return Number((amount * rate).toFixed(2));
}
