"use client";

import { useMemo, useState } from "react";
import {
  ArrowRightLeft,
  Check,
  Copy,
  Globe,
  RefreshCw,
} from "lucide-react";
import {
  CURRENCY_METADATA,
  convertReferenceAmount,
  formatMoney,
  getReferenceExchangeRate,
  type SupportedCurrencyCode,
} from "@/lib/utils/currency";
import {
  useExchangeRates,
  useRefreshExchangeRatesMutation,
} from "@/hooks/use-exchange-rates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableCurrencySelect } from "@/components/shared/searchable-currency-select";
import { CurrencyIcon } from "@/components/shared/currency-icon";
import { toast } from "@/components/ui/toast";

const POPULAR_CONVERSION_CURRENCIES: SupportedCurrencyCode[] = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "KRW",
  "PHP",
  "CAD",
  "AUD",
  "SGD",
];

const PRESET_AMOUNTS = [10, 50, 100, 500, 1000, 5000];

export function CurrencyConverter() {
  const { data: fxData, isLoading: isLoadingRates } = useExchangeRates();
  const refreshRatesMutation = useRefreshExchangeRatesMutation();

  const [amount, setAmount] = useState<string>("100");
  const [fromCurrency, setFromCurrency] = useState<string>("USD");
  const [toCurrency, setToCurrency] = useState<string>("EUR");
  const [isCopied, setIsCopied] = useState(false);

  const numericAmount = Math.max(0, parseFloat(amount) || 0);

  const convertedAmount = useMemo(() => {
    // fxData triggers re-computation when live rates are loaded/refreshed
    void fxData;
    return convertReferenceAmount(numericAmount, fromCurrency, toCurrency);
  }, [numericAmount, fromCurrency, toCurrency, fxData]);

  const exchangeRate = useMemo(() => {
    void fxData;
    return getReferenceExchangeRate(fromCurrency, toCurrency);
  }, [fromCurrency, toCurrency, fxData]);

  const invertedRate = useMemo(() => {
    void fxData;
    return getReferenceExchangeRate(toCurrency, fromCurrency);
  }, [fromCurrency, toCurrency, fxData]);

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const handleCopy = () => {
    try {
      const text = `${formatMoney(numericAmount, fromCurrency)} = ${formatMoney(convertedAmount, toCurrency)}`;
      navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success("Conversion copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Failed to copy result");
    }
  };

  const fromMeta =
    CURRENCY_METADATA[fromCurrency as SupportedCurrencyCode] ?? {
      name: fromCurrency,
      symbol: fromCurrency,
    };
  const toMeta =
    CURRENCY_METADATA[toCurrency as SupportedCurrencyCode] ?? {
      name: toCurrency,
      symbol: toCurrency,
    };

  return (
    <div className="space-y-6">
      {/* Main Converter Card */}
      <Card className="border border-[var(--border)] bg-[var(--surface)]">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">Currency Converter</CardTitle>
                <Badge
                  variant={fxData?.isLiveFeedActive ? "default" : "neutral"}
                  className="text-[10px] font-mono tracking-wider uppercase"
                >
                  {fxData?.isLiveFeedActive ? "Live Rates" : "Reference Rates"}
                </Badge>
              </div>
              <CardDescription className="mt-1">
                Convert amounts in real-time using live market exchange rates.
              </CardDescription>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refreshRatesMutation.mutate()}
              disabled={refreshRatesMutation.isPending || isLoadingRates}
              className="gap-1.5 text-xs self-start sm:self-auto"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  refreshRatesMutation.isPending ? "animate-spin text-[var(--accent)]" : ""
                }`}
              />
              <span>
                {refreshRatesMutation.isPending ? "Refreshing…" : "Update Rates"}
              </span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] items-end gap-3">
            {/* From Amount & Currency */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="conv-amount" className="text-xs font-semibold text-[var(--foreground)]">
                  You Send
                </Label>
                <span className="text-[11px] text-[var(--muted-foreground)]">
                  {fromMeta.name}
                </span>
              </div>
              <div className="grid grid-cols-[1fr,130px] sm:grid-cols-[1fr,160px] gap-2">
                <div className="relative">
                  <div className="absolute left-3.5 top-3 h-5 w-5 flex items-center justify-center text-[var(--muted-foreground)] pointer-events-none">
                    <CurrencyIcon currency={fromCurrency} className="h-4 w-4 text-[var(--muted-foreground)]" />
                  </div>
                  <Input
                    id="conv-amount"
                    type="number"
                    step="any"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-11 pl-10 text-base font-semibold tabular-nums"
                  />
                </div>
                <SearchableCurrencySelect
                  value={fromCurrency}
                  onValueChange={setFromCurrency}
                  className="h-11 text-xs"
                />
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center pb-0.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleSwap}
                aria-label="Swap currencies"
                className="h-11 w-11 rounded-xl shrink-0 hover:bg-[var(--surface-muted)] hover:border-[var(--accent)] transition-all"
                title="Swap currencies"
              >
                <ArrowRightLeft className="h-4 w-4 text-[var(--accent)] transition-transform hover:scale-110" />
              </Button>
            </div>

            {/* To Result & Currency */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-[var(--foreground)]">
                  You Receive (Estimated)
                </Label>
                <span className="text-[11px] text-[var(--muted-foreground)]">
                  {toMeta.name}
                </span>
              </div>
              <div className="grid grid-cols-[1fr,130px] sm:grid-cols-[1fr,160px] gap-2">
                <div className="flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/70 px-3.5 text-base font-bold tabular-nums text-[var(--foreground)] overflow-hidden text-ellipsis">
                  <CurrencyIcon currency={toCurrency} className="h-4 w-4 text-[var(--accent)] shrink-0" />
                  <span className="truncate">{formatMoney(convertedAmount, toCurrency)}</span>
                </div>
                <SearchableCurrencySelect
                  value={toCurrency}
                  onValueChange={setToCurrency}
                  className="h-11 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Quick Amount Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-[var(--muted-foreground)] mr-1">
              Quick presets:
            </span>
            {PRESET_AMOUNTS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(String(preset))}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                  numericAmount === preset
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-semibold"
                    : "border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--muted-foreground)] hover:border-[var(--border)] hover:text-[var(--foreground)]"
                }`}
              >
                {preset.toLocaleString()} {fromCurrency}
              </button>
            ))}
          </div>

          {/* Large Result Callout */}
          <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface-muted)]/60 to-[var(--surface)] p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs text-[var(--muted-foreground)] uppercase font-semibold tracking-wider">
                  Converted Result
                </div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--foreground)] tabular-nums">
                    {formatMoney(convertedAmount, toCurrency)}
                  </span>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    for {formatMoney(numericAmount, fromCurrency)}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1 text-xs text-[var(--muted-foreground)] flex-wrap">
                  <span className="font-mono text-[var(--foreground)]">
                    1 {fromCurrency} = {exchangeRate} {toCurrency}
                  </span>
                  <span>•</span>
                  <span className="font-mono text-[var(--muted-foreground)]">
                    1 {toCurrency} = {invertedRate} {fromCurrency}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="gap-1.5 text-xs h-9"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                      Copy Result
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Grid with Top Currencies */}
      <Card className="border border-[var(--border)] bg-[var(--surface)]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-[var(--accent)]" />
                Multi-Currency Conversion Table
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Conversion for {formatMoney(numericAmount, fromCurrency)} across global benchmark currencies.
              </CardDescription>
            </div>
            <span className="text-xs font-mono text-[var(--muted-foreground)]">
              Base: {fromCurrency}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {POPULAR_CONVERSION_CURRENCIES.filter((c) => c !== fromCurrency).map((curr) => {
              const meta = CURRENCY_METADATA[curr];
              const converted = convertReferenceAmount(numericAmount, fromCurrency, curr);
              const rate = getReferenceExchangeRate(fromCurrency, curr);
              return (
                <div
                  key={curr}
                  onClick={() => setToCurrency(curr)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    toCurrency === curr
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]/40 ring-1 ring-[var(--accent)]"
                      : "border-[var(--border-subtle)] bg-[var(--surface-muted)]/30 hover:border-[var(--border)] hover:bg-[var(--surface-muted)]"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-[var(--foreground)]">
                        {curr}
                      </span>
                      <span className="text-[11px] text-[var(--muted-foreground)] truncate">
                        {meta?.name}
                      </span>
                    </div>
                    <div className="text-[10px] text-[var(--muted-foreground)] font-mono mt-0.5">
                      1 {fromCurrency} = {rate} {curr}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-[var(--foreground)] tabular-nums">
                      {formatMoney(converted, curr)}
                    </div>
                    {toCurrency === curr && (
                      <span className="text-[10px] font-semibold text-[var(--accent)]">
                        Selected Target
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
