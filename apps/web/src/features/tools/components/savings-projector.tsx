"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Copy,
  Percent,
  PiggyBank,
  TrendingUp,
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
import { SearchableCurrencySelect } from "@/components/shared/searchable-currency-select";
import { CurrencyIcon } from "@/components/shared/currency-icon";
import { toast } from "@/components/ui/toast";

export function SavingsProjector() {
  const [currency, setCurrency] = useState<string>("USD");
  const [initialStr, setInitialStr] = useState<string>("5000");
  const [monthlyStr, setMonthlyStr] = useState<string>("300");
  const [yearsStr, setYearsStr] = useState<string>("10");
  const [returnRateStr, setReturnRateStr] = useState<string>("7");
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const initialDeposit = Math.max(0, parseFloat(initialStr) || 0);
  const monthlyDeposit = Math.max(0, parseFloat(monthlyStr) || 0);
  const years = Math.max(1, Math.min(60, parseInt(yearsStr, 10) || 1));
  const annualReturn = Math.max(0, parseFloat(returnRateStr) || 0);

  const projection = useMemo(() => {
    const monthlyRate = annualReturn / 100 / 12;
    const totalMonths = years * 12;

    let balance = initialDeposit;
    let totalContributed = initialDeposit;
    const milestones: Array<{
      year: number;
      balance: number;
      contributions: number;
      interest: number;
    }> = [];

    for (let month = 1; month <= totalMonths; month++) {
      // Add monthly interest
      balance += balance * monthlyRate;
      // Add monthly deposit
      balance += monthlyDeposit;
      totalContributed += monthlyDeposit;

      // Capture milestone snapshots at selected years
      if (month % 12 === 0) {
        const curYear = month / 12;
        if (
          curYear <= 5 ||
          curYear === 10 ||
          curYear === 15 ||
          curYear === 20 ||
          curYear === 25 ||
          curYear === 30 ||
          curYear === years
        ) {
          milestones.push({
            year: curYear,
            balance: Math.round(balance * 100) / 100,
            contributions: Math.round(totalContributed * 100) / 100,
            interest: Math.max(0, Math.round((balance - totalContributed) * 100) / 100),
          });
        }
      }
    }

    const totalInterest = Math.max(0, balance - totalContributed);
    const contributionsPercent =
      balance > 0 ? (totalContributed / balance) * 100 : 100;
    const interestPercent =
      balance > 0 ? (totalInterest / balance) * 100 : 0;

    return {
      futureValue: balance,
      totalContributed,
      totalInterest,
      contributionsPercent,
      interestPercent,
      milestones,
    };
  }, [initialDeposit, monthlyDeposit, years, annualReturn]);

  const handleCopy = () => {
    try {
      const text = [
        `Savings Growth Projection (${years} Years):`,
        `Initial Deposit: ${formatMoney(initialDeposit, currency)}`,
        `Monthly Deposit: ${formatMoney(monthlyDeposit, currency)}`,
        `Annual Return: ${annualReturn}%`,
        `Projected Future Value: ${formatMoney(projection.futureValue, currency)}`,
        `Total Contributed: ${formatMoney(projection.totalContributed, currency)}`,
        `Compound Interest Earned: ${formatMoney(projection.totalInterest, currency)}`,
      ].join("\n");

      navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success("Projection copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Failed to copy projection");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Parameters */}
      <div className="lg:col-span-6 space-y-6">
        <Card className="border-border/60">
          <CardHeader className="pb-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <PiggyBank className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Growth & Savings Plan</CardTitle>
                <CardDescription className="text-xs">
                  Forecast compound interest for emergency funds or wealth building
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {/* Currency */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Currency
              </Label>
              <SearchableCurrencySelect
                value={currency}
                onValueChange={setCurrency}
              />
            </div>

            {/* Starting Balance */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Initial Starting Balance</span>
                <span className="text-muted-foreground/70">
                  {formatMoney(initialDeposit, currency)}
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
                  placeholder="5000"
                  value={initialStr}
                  onChange={(e) => setInitialStr(e.target.value)}
                />
              </div>
            </div>

            {/* Monthly Contribution */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Monthly Recurring Contribution</span>
                <span className="text-muted-foreground/70">
                  {formatMoney(monthlyDeposit, currency)} / mo
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
                  placeholder="300"
                  value={monthlyStr}
                  onChange={(e) => setMonthlyStr(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[50, 100, 250, 500, 1000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setMonthlyStr(preset.toString())}
                    className="text-xs px-2 py-0.5 rounded bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border/40"
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Horizon & Expected Return */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Time Horizon
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    className="font-medium"
                    placeholder="10"
                    value={yearsStr}
                    onChange={(e) => setYearsStr(e.target.value)}
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground pointer-events-none">
                    years
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Estimated Return Rate
                </Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    className="pl-9 font-medium"
                    placeholder="7"
                    value={returnRateStr}
                    onChange={(e) => setReturnRateStr(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Quick Return Benchmarks */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { label: "High-Yield (4%)", rate: 4 },
                { label: "Bonds (5%)", rate: 5 },
                { label: "S&P 500 Avg (7%)", rate: 7 },
                { label: "Aggressive (10%)", rate: 10 },
              ].map((bench) => (
                <button
                  key={bench.rate}
                  type="button"
                  onClick={() => setReturnRateStr(bench.rate.toString())}
                  className="text-xs px-2 py-0.5 rounded bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border/40"
                >
                  {bench.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projection Summary & Milestones */}
      <div className="lg:col-span-6 space-y-6">
        <Card className="border-border/60 bg-gradient-to-b from-card to-muted/20">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <CardTitle className="text-base">Projected Value in {years} Years</CardTitle>
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
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-5 space-y-6">
            {/* Future Balance Hero */}
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Future Portfolio Value
              </span>
              <div className="text-3xl sm:text-4xl font-bold font-mono text-emerald-500 mt-1">
                {formatMoney(projection.futureValue, currency)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                Includes {formatMoney(projection.totalInterest, currency)} in compound growth
              </p>
            </div>

            {/* Split Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border/40 bg-card">
                <span className="text-xs text-muted-foreground">Total Contributed</span>
                <p className="text-lg font-semibold font-mono text-foreground mt-0.5">
                  {formatMoney(projection.totalContributed, currency)}
                </p>
                <Badge variant="neutral" className="mt-1 text-[10px] font-mono">
                  {projection.contributionsPercent.toFixed(1)}% of total
                </Badge>
              </div>

              <div className="p-3 rounded-lg border border-border/40 bg-card">
                <span className="text-xs text-muted-foreground">Total Interest Earned</span>
                <p className="text-lg font-semibold font-mono text-emerald-500 mt-0.5">
                  {formatMoney(projection.totalInterest, currency)}
                </p>
                <Badge variant="default" className="mt-1 text-[10px] font-mono">
                  {projection.interestPercent.toFixed(1)}% profit
                </Badge>
              </div>
            </div>

            {/* Visual Balance Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
                  Your Deposits: {projection.contributionsPercent.toFixed(1)}%
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  Growth: {projection.interestPercent.toFixed(1)}%
                </span>
              </div>
              <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${projection.contributionsPercent}%` }}
                />
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${projection.interestPercent}%` }}
                />
              </div>
            </div>

            {/* Milestone Breakdown Table */}
            {projection.milestones.length > 0 && (
              <div className="border border-border/40 rounded-lg overflow-hidden">
                <div className="bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border/40 flex justify-between">
                  <span>Year Milestone</span>
                  <span>Portfolio Balance</span>
                </div>
                <div className="divide-y divide-border/30 max-h-[160px] overflow-y-auto">
                  {projection.milestones.map((m) => (
                    <div
                      key={m.year}
                      className="px-3 py-2 text-xs flex justify-between items-center hover:bg-muted/20"
                    >
                      <span className="font-medium text-foreground">
                        Year {m.year}
                      </span>
                      <div className="text-right">
                        <span className="font-mono font-semibold text-foreground">
                          {formatMoney(m.balance, currency)}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          +{formatMoney(m.interest, currency)} interest
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
