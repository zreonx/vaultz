"use client";

import React, { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import {
  CURRENCY_METADATA,
  SUPPORTED_CURRENCIES,
  type SupportedCurrencyCode,
} from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

export interface SearchableCurrencySelectProps {
  id?: string;
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SearchableCurrencySelect({
  id,
  value,
  onValueChange,
  placeholder = "Select currency",
  className,
  disabled = false,
}: SearchableCurrencySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedCurrency = value?.toUpperCase() as SupportedCurrencyCode | undefined;
  const selectedMeta = selectedCurrency
    ? CURRENCY_METADATA[selectedCurrency]
    : undefined;

  const filteredCurrencies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return SUPPORTED_CURRENCIES;
    return SUPPORTED_CURRENCIES.filter((code) => {
      const meta = CURRENCY_METADATA[code];
      return (
        code.toLowerCase().includes(q) ||
        (meta && meta.name.toLowerCase().includes(q)) ||
        (meta && meta.symbol.toLowerCase().includes(q))
      );
    });
  }, [search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          aria-expanded={open}
        >
          <span className="truncate">
            {selectedCurrency && selectedMeta ? (
              <span className="inline-flex items-center gap-2">
                <span className="font-semibold text-[var(--foreground)]">
                  {selectedCurrency}
                </span>
                <span className="text-[var(--muted-foreground)]">
                  ({selectedMeta.symbol})
                </span>
                <span className="text-xs text-[var(--muted-foreground)]">
                  — {selectedMeta.name}
                </span>
              </span>
            ) : (
              <span className="text-[var(--muted-foreground)]">
                {placeholder}
              </span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={4}
        collisionPadding={12}
        className="w-[var(--radix-popover-trigger-width)] min-w-[280px] max-w-[360px] p-2"
      >
        {/* Sticky Search Header */}
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            placeholder="Search currency (e.g. KRW, Won, ₩)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs [appearance:textfield]"
            autoFocus
          />
        </div>

        {/* Scrollable Currency List */}
        <ScrollArea className="h-56 pr-2">
          {filteredCurrencies.length === 0 ? (
            <div className="py-4 text-center text-xs text-[var(--muted-foreground)]">
              No currency matching &ldquo;{search}&rdquo;
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredCurrencies.map((code) => {
                const meta = CURRENCY_METADATA[code];
                const isSelected = selectedCurrency === code;

                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      onValueChange(code);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                      isSelected
                        ? "bg-[var(--accent)]/10 text-[var(--foreground)] font-semibold"
                        : "hover:bg-[var(--accent)]/5 hover:text-[var(--foreground)] text-[var(--muted-foreground)]"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-semibold text-[var(--foreground)]">
                        {code}
                      </span>
                      <span className="rounded bg-[var(--surface-subtle)] px-1 py-0.5 text-[10px] text-[var(--foreground)] border border-[var(--border)]">
                        {meta?.symbol ?? code}
                      </span>
                      <span className="truncate text-[11px] text-[var(--muted-foreground)]">
                        {meta?.name}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
