"use client";

import { useState } from "react";
import {
  ArrowLeftRight,
  Calculator as CalculatorIcon,
  PiggyBank,
  Receipt,
  Wrench,
} from "lucide-react";
import { CurrencyConverter } from "./components/currency-converter";
import { StandardCalculator } from "./components/standard-calculator";
import { LoanCalculator } from "./components/loan-calculator";
import { SavingsProjector } from "./components/savings-projector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ToolsFeatureView() {
  const [activeTab, setActiveTab] = useState<string>("converter");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Wrench className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Calculators & Tools</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Financial utilities for currency conversion, arithmetic, loan repayments, and compound interest
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-auto p-1 bg-muted/60 max-w-2xl">
          <TabsTrigger
            value="converter"
            className="flex items-center gap-2 py-2 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Converter</span>
          </TabsTrigger>
          <TabsTrigger
            value="calculator"
            className="flex items-center gap-2 py-2 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <CalculatorIcon className="w-4 h-4" />
            <span>Calculator</span>
          </TabsTrigger>
          <TabsTrigger
            value="loan"
            className="flex items-center gap-2 py-2 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Receipt className="w-4 h-4" />
            <span>Loan & IOU</span>
          </TabsTrigger>
          <TabsTrigger
            value="savings"
            className="flex items-center gap-2 py-2 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <PiggyBank className="w-4 h-4" />
            <span>Savings Plan</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="converter" className="m-0 focus-visible:outline-none">
          <CurrencyConverter />
        </TabsContent>

        <TabsContent value="calculator" className="m-0 focus-visible:outline-none">
          <StandardCalculator />
        </TabsContent>

        <TabsContent value="loan" className="m-0 focus-visible:outline-none">
          <LoanCalculator />
        </TabsContent>

        <TabsContent value="savings" className="m-0 focus-visible:outline-none">
          <SavingsProjector />
        </TabsContent>
      </Tabs>
    </div>
  );
}
