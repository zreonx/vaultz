"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  HelpCircle,
  Percent,
  Receipt,
  Scale,
} from "lucide-react";
import { formatMoney } from "@/lib/utils/currency";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableCurrencySelect } from "@/components/shared/searchable-currency-select";
import { CurrencyIcon } from "@/components/shared/currency-icon";
import { toast } from "@/components/ui/toast";

export function LoanCalculator() {
  const [currency, setCurrency] = useState<string>("USD");
  const [principalStr, setPrincipalStr] = useState<string>("10000");
  const [rateStr, setRateStr] = useState<string>("5.5");
  const [termMonthsStr, setTermMonthsStr] = useState<string>("24");
  const [frequency, setFrequency] = useState<"monthly" | "biweekly" | "weekly">(
    "monthly"
  );
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const principal = Math.max(0, parseFloat(principalStr) || 0);
  const annualRate = Math.max(0, parseFloat(rateStr) || 0);
  const termMonths = Math.max(1, parseInt(termMonthsStr, 10) || 1);

  const calculation = useMemo(() => {
    // Number of periods based on frequency
    let periodsPerYear = 12;
    if (frequency === "biweekly") periodsPerYear = 26;
    if (frequency === "weekly") periodsPerYear = 52;

    const totalPeriods = Math.round((termMonths / 12) * periodsPerYear);
    const periodicRate = annualRate / 100 / periodsPerYear;

    if (principal <= 0 || totalPeriods <= 0) {
      return {
        payment: 0,
        totalInterest: 0,
        totalRepayment: 0,
        totalPeriods: 0,
        principalPercent: 100,
        interestPercent: 0,
      };
    }

    if (periodicRate === 0) {
      // 0% interest loan (IOU or interest-free advance)
      const payment = principal / totalPeriods;
      return {
        payment,
        totalInterest: 0,
        totalRepayment: principal,
        totalPeriods,
        principalPercent: 100,
        interestPercent: 0,
      };
    }

    // Standard annuity amortization formula: P * (r * (1 + r)^n) / ((1 + r)^n - 1)
    const factor = Math.pow(1 + periodicRate, totalPeriods);
    const payment = (principal * (periodicRate * factor)) / (factor - 1);
    const totalRepayment = payment * totalPeriods;
    const totalInterest = Math.max(0, totalRepayment - principal);

    const principalPercent = (principal / totalRepayment) * 100;
    const interestPercent = (totalInterest / totalRepayment) * 100;

    return {
      payment,
      totalInterest,
      totalRepayment,
      totalPeriods,
      principalPercent,
      interestPercent,
    };
  }, [principal, annualRate, termMonths, frequency]);

  const handleCopy = () => {
    try {
      const freqLabel =
        frequency === "monthly"
          ? "Monthly"
          : frequency === "biweekly"
          ? "Bi-weekly"
          : "Weekly";

      const text = [
        `Loan Summary:`,
        `Principal: ${formatMoney(principal, currency)}`,
        `Interest Rate: ${annualRate}% APR`,
        `Term: ${termMonths} months`,
        `${freqLabel} Payment: ${formatMoney(calculation.payment, currency)}`,
        `Total Interest: ${formatMoney(calculation.totalInterest, currency)}`,
        `Total Repayment: ${formatMoney(calculation.totalRepayment, currency)}`,
      ].join("\n");

      navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success("Loan summary copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Failed to copy summary");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Parameters Form */}
      <div className="lg:col-span-6 space-y-6">
        <Card className="border-border/60">
          <CardHeader className="pb-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Loan & Repayment Parameters</CardTitle>
                <CardDescription className="text-xs">
                  Estimate personal IOUs, vehicle, student, or bank loans
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {/* Currency Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Currency
              </Label>
              <SearchableCurrencySelect
                value={currency}
                onValueChange={setCurrency}
              />
            </div>

            {/* Principal */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Principal Loan Amount</span>
                <span className="text-muted-foreground/70">
                  {formatMoney(principal, currency)}
                </span>
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-2.5 h-4 w-4 flex items-center justify-center text-muted-foreground pointer-events-none">
                  <CurrencyIcon currency={currency} className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  className="pl-9 font-medium"
                  placeholder="10000"
                  value={principalStr}
                  onChange={(e) => setPrincipalStr(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[1000, 5000, 10000, 25000, 50000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPrincipalStr(preset.toString())}
                    className="text-xs px-2 py-0.5 rounded bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border/40"
                  >
                    +{preset >= 1000 ? `${preset / 1000}k` : preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Interest Rate */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Annual Interest Rate (% APR)</span>
                <span className="text-xs text-muted-foreground/80">
                  Set 0% for interest-free loans / IOUs
                </span>
              </Label>
              <div className="relative">
                <Percent className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className="pl-9 font-medium"
                  placeholder="5.5"
                  value={rateStr}
                  onChange={(e) => setRateStr(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[0, 3.5, 5.0, 7.5, 10.0].map((presetRate) => (
                  <button
                    key={presetRate}
                    type="button"
                    onClick={() => setRateStr(presetRate.toString())}
                    className="text-xs px-2 py-0.5 rounded bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border/40"
                  >
                    {presetRate}%
                  </button>
                ))}
              </div>
            </div>

            {/* Term Months */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Term Duration
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    max="480"
                    className="font-medium"
                    placeholder="24"
                    value={termMonthsStr}
                    onChange={(e) => setTermMonthsStr(e.target.value)}
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground pointer-events-none">
                    months
                  </span>
                </div>
              </div>

              {/* Payment Frequency */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Payment Frequency
                </Label>
                <Select
                  value={frequency}
                  onValueChange={(val: "monthly" | "biweekly" | "weekly") =>
                    setFrequency(val)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick Term Shortcuts */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { label: "6 mo", months: 6 },
                { label: "1 yr", months: 12 },
                { label: "2 yrs", months: 24 },
                { label: "3 yrs", months: 36 },
                { label: "5 yrs", months: 60 },
              ].map((term) => (
                <button
                  key={term.months}
                  type="button"
                  onClick={() => setTermMonthsStr(term.months.toString())}
                  className="text-xs px-2 py-0.5 rounded bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border/40"
                >
                  {term.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Output & Breakdown */}
      <div className="lg:col-span-6 space-y-6">
        <Card className="border-border/60 bg-gradient-to-b from-card to-muted/20">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">Amortization Summary</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={handleCopy}
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Summary</span>
                  </>
                )}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-5 space-y-6">
            {/* Primary Result Banner */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Estimated {frequency.charAt(0).toUpperCase() + frequency.slice(1)} Payment
              </span>
              <div className="text-3xl sm:text-4xl font-bold font-mono text-primary mt-1">
                {formatMoney(calculation.payment, currency)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                over {calculation.totalPeriods} total payments ({termMonths} months)
              </p>
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border/40 bg-card">
                <span className="text-xs text-muted-foreground">Total Interest</span>
                <p className="text-lg font-semibold font-mono text-foreground mt-0.5">
                  {formatMoney(calculation.totalInterest, currency)}
                </p>
                <Badge variant="neutral" className="mt-1 text-[10px] font-mono">
                  {calculation.interestPercent.toFixed(1)}% of total
                </Badge>
              </div>

              <div className="p-3 rounded-lg border border-border/40 bg-card">
                <span className="text-xs text-muted-foreground">Total Repayment</span>
                <p className="text-lg font-semibold font-mono text-foreground mt-0.5">
                  {formatMoney(calculation.totalRepayment, currency)}
                </p>
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  Principal + Interest
                </span>
              </div>
            </div>

            {/* Visual Balance Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
                  Principal: {calculation.principalPercent.toFixed(1)}%
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  Interest: {calculation.interestPercent.toFixed(1)}%
                </span>
              </div>
              <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${calculation.principalPercent}%` }}
                />
                <div
                  className="bg-amber-500 h-full transition-all duration-300"
                  style={{ width: `${calculation.interestPercent}%` }}
                />
              </div>
            </div>

            {/* Financial Tips */}
            <div className="p-3.5 rounded-lg bg-muted/40 border border-border/40 text-xs text-muted-foreground flex gap-2.5 items-start">
              <HelpCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p>
                Making extra lump-sum payments directly toward the principal can
                drastically shorten the payoff duration and reduce overall interest expense.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
