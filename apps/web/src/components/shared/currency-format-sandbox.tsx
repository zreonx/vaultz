"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatMoney } from "@/lib/utils/currency";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SUPPORTED_ISO_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "PHP",
  "CAD",
  "AUD",
  "SGD",
] as const;

export const currencyPreviewSchema = z.object({
  currencyCode: z
    .string()
    .trim()
    .length(3, "Currency must be a 3-letter ISO 4217 code (e.g., USD, EUR, PHP)")
    .regex(/^[A-Za-z]{3}$/, "Only alphabetic ISO 4217 characters are allowed")
    .transform((val) => val.toUpperCase()),
  sampleAmount: z.coerce
    .number({ invalid_type_error: "Enter a valid number" })
    .min(0, "Sample amount must be non-negative")
    .max(999999999, "Amount exceeds preview range"),
});

export type CurrencyPreviewFormValues = z.infer<typeof currencyPreviewSchema>;

export function CurrencyFormatSandbox() {
  const [formattedPreview, setFormattedPreview] = useState<string>(() =>
    formatMoney(12450.75, "USD")
  );
  const [activeCurrency, setActiveCurrency] = useState<string>("USD");

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CurrencyPreviewFormValues>({
    resolver: zodResolver(currencyPreviewSchema),
    defaultValues: {
      currencyCode: "USD",
      sampleAmount: 12450.75,
    },
  });

  const onSubmit = (values: CurrencyPreviewFormValues) => {
    try {
      const formatted = formatMoney(values.sampleAmount, values.currencyCode);
      setFormattedPreview(formatted);
      setActiveCurrency(values.currencyCode);
    } catch {
      setFormattedPreview(
        `${values.sampleAmount.toFixed(2)} ${values.currencyCode}`
      );
      setActiveCurrency(values.currencyCode);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-[var(--background)]">
        <CardHeader className="flex flex-row items-center justify-between p-4">
          <div>
            <CardDescription>
              Formatted Output (Tabular Numerals)
            </CardDescription>
            <CardTitle className="mt-1 text-xl tabular-nums">
              {formattedPreview}
            </CardTitle>
          </div>
          <Badge variant="default" className="tabular-nums">
            ISO 4217 · {activeCurrency}
          </Badge>
        </CardHeader>
      </Card>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-3 sm:grid-cols-3"
        noValidate
      >
        <div className="space-y-1.5">
          <Label htmlFor="currencyCode">Currency (ISO 4217)</Label>
          <Controller
            control={control}
            name="currencyCode"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="currencyCode" aria-label="Currency (ISO 4217)">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_ISO_CURRENCIES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.currencyCode && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription>{errors.currencyCode.message}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sampleAmount">Sample Decimal Value</Label>
          <Input
            id="sampleAmount"
            type="number"
            step="0.01"
            className="tabular-nums"
            {...register("sampleAmount")}
          />
          {errors.sampleAmount && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription>{errors.sampleAmount.message}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex items-end">
          <Button type="submit" variant="secondary" className="w-full">
            Preview Format
          </Button>
        </div>
      </form>
    </div>
  );
}
