"use client";

import React from "react";
import {
  DollarSign,
  Euro,
  JapaneseYen,
  PoundSterling,
} from "lucide-react";
import { CURRENCY_METADATA, type SupportedCurrencyCode } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

export interface CurrencyIconProps {
  currency?: string;
  className?: string;
}

/**
 * Renders an appropriate currency icon or formatted symbol corresponding to the currency code.
 * Changes dynamically whenever the currency changes via dropdown, select, or preset.
 */
export function CurrencyIcon({
  currency = "USD",
  className = "h-4 w-4",
}: CurrencyIconProps) {
  const code = (currency || "USD").trim().toUpperCase();

  switch (code) {
    case "USD":
      return <DollarSign className={className} aria-label="USD ($)" />;
    case "EUR":
      return <Euro className={className} aria-label="EUR (€)" />;
    case "GBP":
      return <PoundSterling className={className} aria-label="GBP (£)" />;
    case "JPY":
      return <JapaneseYen className={className} aria-label="JPY (¥)" />;
    default: {
      const meta = CURRENCY_METADATA[code as SupportedCurrencyCode];
      const symbol = meta?.symbol || code;
      return (
        <span
          className={cn(
            "inline-flex items-center justify-center font-bold text-xs select-none tabular-nums",
            className
          )}
          style={{ lineHeight: 1 }}
          aria-label={`${code} (${symbol})`}
        >
          {symbol}
        </span>
      );
    }
  }
}
