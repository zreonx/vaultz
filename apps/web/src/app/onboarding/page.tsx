"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Landmark,
  Layers,
  LogOut,
  PiggyBank,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { CurrencyIcon } from "@/components/shared/currency-icon";
import { apiClient } from "@/lib/api/client";
import {
  CURRENCY_METADATA,
  SUPPORTED_CURRENCIES,
  type SupportedCurrencyCode,
} from "@/lib/utils/currency";
import { useCurrentUser, useLogoutMutation } from "@/hooks/use-auth";
import { AccountType, type AccountResponse } from "@/types/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { SearchableCurrencySelect } from "@/components/shared/searchable-currency-select";

interface StarterCategory {
  name: string;
  type: 1 | 2; // 1 = Income, 2 = Expense
  typeName: "Income" | "Expense";
  colorHex: string;
}

const STARTER_CATEGORIES: StarterCategory[] = [
  { name: "Salary & Wages", type: 1, typeName: "Income", colorHex: "#10B981" },
  { name: "Freelance & Consulting", type: 1, typeName: "Income", colorHex: "#059669" },
  { name: "Investment & Dividends", type: 1, typeName: "Income", colorHex: "#0D9488" },
  { name: "Housing & Rent", type: 2, typeName: "Expense", colorHex: "#6366F1" },
  { name: "Groceries & Food", type: 2, typeName: "Expense", colorHex: "#F59E0B" },
  { name: "Dining & Restaurants", type: 2, typeName: "Expense", colorHex: "#F97316" },
  { name: "Utilities & Internet", type: 2, typeName: "Expense", colorHex: "#0EA5E9" },
  { name: "Transportation & Fuel", type: 2, typeName: "Expense", colorHex: "#8B5CF6" },
  { name: "Shopping & Lifestyle", type: 2, typeName: "Expense", colorHex: "#EC4899" },
  { name: "Healthcare & Wellness", type: 2, typeName: "Expense", colorHex: "#EF4444" },
];

const ACCOUNT_NAME_SUGGESTIONS = [
  "Primary Checking",
  "High-Yield Savings",
  "Cash Wallet",
  "Daily Expenses",
];

const ACCOUNT_TYPE_OPTIONS: {
  type: AccountType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}[] = [
  {
    type: AccountType.Checking,
    label: "Checking",
    icon: Landmark,
    description: "Daily spending, debit cards, and bill payments.",
  },
  {
    type: AccountType.Savings,
    label: "Savings",
    icon: PiggyBank,
    description: "Emergency funds and interest-earning deposits.",
  },
  {
    type: AccountType.CreditCard,
    label: "Credit Card",
    icon: CreditCard,
    description: "Credit lines and revolving balances.",
  },
  {
    type: AccountType.Investment,
    label: "Investment",
    icon: TrendingUp,
    description: "Brokerage accounts, portfolios, and capital.",
  },
];

interface OnboardingDraft {
  step: 1 | 2 | 3;
  currencyCode: string;
  accountName: string;
  accountType: AccountType;
  accountCurrency: string;
  initialBalance: string;
  selectedCategories: string[];
  savedAt: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user, isLoading: isLoadingUser } = useCurrentUser();
  const logoutMutation = useLogoutMutation();

  const { data: existingAccounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => apiClient.get<AccountResponse[]>("/api/v1/accounts"),
    enabled: Boolean(user),
  });

  // Form states
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [currencyCode, setCurrencyCode] = useState<string>("USD");
  const [currencySearch, setCurrencySearch] = useState<string>("");
  const [accountName, setAccountName] = useState<string>("Primary Checking");
  const [accountType, setAccountType] = useState<AccountType>(AccountType.Checking);
  const [accountCurrency, setAccountCurrency] = useState<string>("USD");
  const [initialBalance, setInitialBalance] = useState<string>("1000");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    STARTER_CATEGORIES.map((c) => c.name)
  );

  // Draft persistence state
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Storage key scoped to user
  const storageKey = useMemo(() => {
    return user?.id ? `vaultz.onboarding_draft_${user.id}` : null;
  }, [user?.id]);

  // Redirect unauthenticated visitors to login
  useEffect(() => {
    if (!isLoadingUser && !user) {
      router.replace("/login?redirect=/onboarding");
    }
  }, [isLoadingUser, user, router]);

  // Load draft from localStorage on mount
  useEffect(() => {
    if (!storageKey) return;

    try {
      const savedRaw = window.localStorage.getItem(storageKey);
      if (savedRaw) {
        const draft = JSON.parse(savedRaw) as OnboardingDraft;
        if (draft.step) setStep(draft.step);
        if (draft.currencyCode) {
          setCurrencyCode(draft.currencyCode);
          setAccountCurrency(draft.accountCurrency || draft.currencyCode);
        }
        if (draft.accountName) setAccountName(draft.accountName);
        if (draft.accountType) setAccountType(draft.accountType);
        if (draft.accountCurrency) setAccountCurrency(draft.accountCurrency);
        if (draft.initialBalance !== undefined) setInitialBalance(draft.initialBalance);
        if (Array.isArray(draft.selectedCategories)) {
          setSelectedCategories(draft.selectedCategories);
        }
        if (draft.savedAt) {
          setDraftSavedAt(new Date(draft.savedAt).toLocaleTimeString());
        }
        setIsDraftRestored(true);
      } else if (user?.defaultCurrencyCode) {
        setCurrencyCode(user.defaultCurrencyCode);
        setAccountCurrency(user.defaultCurrencyCode);
      }
    } catch {
      // Ignore storage errors
    }
  }, [storageKey, user?.defaultCurrencyCode]);

  // Persist draft to localStorage whenever relevant state changes
  useEffect(() => {
    if (!storageKey || isSubmitting) return;

    const draft: OnboardingDraft = {
      step,
      currencyCode,
      accountName,
      accountType,
      accountCurrency,
      initialBalance,
      selectedCategories,
      savedAt: new Date().toISOString(),
    };

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {
      // Ignore storage errors
    }
  }, [
    storageKey,
    step,
    currencyCode,
    accountName,
    accountType,
    accountCurrency,
    initialBalance,
    selectedCategories,
    isSubmitting,
  ]);

  const handleResetDraft = () => {
    if (storageKey) {
      window.localStorage.removeItem(storageKey);
    }
    setStep(1);
    const defaultCurr = user?.defaultCurrencyCode || "USD";
    setCurrencyCode(defaultCurr);
    setAccountCurrency(defaultCurr);
    setAccountName("Primary Checking");
    setAccountType(AccountType.Checking);
    setInitialBalance("1000");
    setSelectedCategories(STARTER_CATEGORIES.map((c) => c.name));
    setIsDraftRestored(false);
    setDraftSavedAt(null);
  };

  const handleSelectCurrency = (code: string) => {
    setCurrencyCode(code);
    // If accountCurrency was in lockstep with the previous base currency, sync it
    setAccountCurrency(code);
  };

  const toggleCategory = (name: string) => {
    setSelectedCategories((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const handleSelectAllCategories = () => {
    setSelectedCategories(STARTER_CATEGORIES.map((c) => c.name));
  };

  const handleDeselectAllCategories = () => {
    setSelectedCategories([]);
  };

  const handleCompleteSetup = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Update user base reporting currency if changed
      await apiClient.put("/api/v1/auth/currency", {
        defaultCurrencyCode: currencyCode,
      });

      // 2. Create the first financial account
      const parsedBalance = parseFloat(initialBalance.trim()) || 0;
      await apiClient.post<AccountResponse>("/api/v1/accounts", {
        name: accountName.trim() || "Primary Checking",
        type: accountType,
        currencyCode: accountCurrency.trim() || currencyCode,
        initialBalance: parsedBalance,
      });

      // 3. Create selected starter categories
      const categoriesToCreate = STARTER_CATEGORIES.filter((c) =>
        selectedCategories.includes(c.name)
      );

      for (const cat of categoriesToCreate) {
        try {
          await apiClient.post("/api/v1/categories", {
            name: cat.name,
            type: cat.type,
            colorHex: cat.colorHex,
            accountId: null, // Global category
          });
        } catch {
          // Ignore duplicate category creation gracefully
        }
      }

      // 4. Mark onboarding completed and clean up draft
      if (storageKey) {
        window.localStorage.removeItem(storageKey);
      }
      if (user?.id) {
        window.localStorage.setItem(`vaultz.onboarding_completed_${user.id}`, "true");
      }

      // 5. Invalidate caches and redirect to dashboard
      await queryClient.invalidateQueries();
      router.push("/dashboard");
    } catch (err: unknown) {
      setIsSubmitting(false);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while completing setup. Please try again."
      );
    }
  };

  const filteredCurrencies = useMemo(() => {
    const q = currencySearch.trim().toLowerCase();
    if (!q) return SUPPORTED_CURRENCIES;
    return SUPPORTED_CURRENCIES.filter((code) => {
      const meta = CURRENCY_METADATA[code as SupportedCurrencyCode];
      return (
        code.toLowerCase().includes(q) ||
        (meta && meta.name.toLowerCase().includes(q))
      );
    });
  }, [currencySearch]);

  if (isLoadingUser || (!user && !isLoadingUser)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)]">
          <RefreshCw className="h-4 w-4 animate-spin text-[var(--accent)]" />
          <span>Loading your setup…</span>
        </div>
      </div>
    );
  }

  const progressPercent = step === 1 ? 33 : step === 2 ? 66 : 100;

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Navigation & Brand Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8 rounded-lg bg-[var(--accent)]">
              <AvatarFallback className="rounded-lg bg-[var(--accent)] text-xs font-semibold text-[var(--accent-foreground)]">
                V
              </AvatarFallback>
            </Avatar>
            <div>
              <span className="text-base font-semibold tracking-tight text-[var(--foreground)]">
                Vaultz Setup
              </span>
              <p className="text-xs text-[var(--muted-foreground)]">
                Welcome, {user?.fullName || user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {existingAccounts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard")}
                className="text-xs text-[var(--muted-foreground)]"
              >
                Go to Dashboard
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              className="text-xs text-[var(--muted-foreground)]"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--muted-foreground)]">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
              Step {step} of 3:{" "}
              {step === 1
                ? "Primary Currency"
                : step === 2
                ? "First Account"
                : "Starter Categories"}
            </span>
            <span>{progressPercent}% Complete</span>
          </div>
          <Progress value={progressPercent} className="h-1.5 bg-[var(--border)]" />
        </div>

        {/* Draft Restored Banner */}
        {isDraftRestored && (
          <Alert className="border-[var(--accent)]/30 bg-[var(--accent)]/5 py-2.5">
            <Clock className="h-4 w-4 text-[var(--accent)]" />
            <div className="flex w-full items-center justify-between">
              <div>
                <AlertTitle className="text-xs font-semibold">
                  Setup Draft Restored
                </AlertTitle>
                <AlertDescription className="text-xs text-[var(--muted-foreground)]">
                  Pick up right where you left off
                  {draftSavedAt ? ` (saved at ${draftSavedAt})` : ""}.
                </AlertDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetDraft}
                className="h-7 text-xs text-[var(--muted-foreground)] hover:text-[var(--danger)]"
              >
                Start Over
              </Button>
            </div>
          </Alert>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Setup Error</AlertTitle>
            <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Base Currency */}
        {step === 1 && (
          <Card className="border-[var(--border)] shadow-sm">
            <CardHeader className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                  <Coins className="h-4 w-4" />
                </div>
                <CardTitle className="text-lg">Choose Your Primary Currency</CardTitle>
              </div>
              <CardDescription className="text-xs leading-relaxed text-[var(--muted-foreground)]">
                This is your base reporting currency. Your dashboard overview, net worth,
                and cross-currency transfers will be converted into this currency using live market FX rates.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Input
                  placeholder="Filter currencies (e.g., USD, EUR, KRW, PHP)…"
                  value={currencySearch}
                  onChange={(e) => setCurrencySearch(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {filteredCurrencies.map((code) => {
                  const meta = CURRENCY_METADATA[code as SupportedCurrencyCode] || {
                    name: code,
                    symbol: code,
                  };
                  const isSelected = currencyCode === code;

                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => handleSelectCurrency(code)}
                      className={`flex flex-col items-start justify-between rounded-lg border p-3 text-left transition-all ${
                        isSelected
                          ? "border-[var(--accent)] bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]"
                          : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted-foreground)]/40 hover:bg-[var(--accent)]/5"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="text-sm font-semibold text-[var(--foreground)]">
                          {code}
                        </span>
                        {isSelected ? (
                          <Check className="h-4 w-4 text-[var(--accent)]" />
                        ) : (
                          <span className="text-xs text-[var(--muted-foreground)]">
                            {meta.symbol}
                          </span>
                        )}
                      </div>
                      <span className="mt-1 line-clamp-1 text-xs text-[var(--muted-foreground)]">
                        {meta.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>

            <CardFooter className="flex justify-end border-t border-[var(--border)] pt-4">
              <Button
                type="button"
                onClick={() => setStep(2)}
                className="gap-2"
              >
                <span>Continue to First Account</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 2: First Financial Account */}
        {step === 2 && (
          <Card className="border-[var(--border)] shadow-sm">
            <CardHeader className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                  <Wallet className="h-4 w-4" />
                </div>
                <CardTitle className="text-lg">Add Your First Account</CardTitle>
              </div>
              <CardDescription className="text-xs leading-relaxed text-[var(--muted-foreground)]">
                Accounts represent where you keep money — like your checking bank account,
                a high-yield savings account, or a cash wallet.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Account Name */}
              <div className="space-y-2">
                <Label htmlFor="accountName" className="text-xs font-medium">
                  Account Name
                </Label>
                <Input
                  id="accountName"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g., Primary Checking, Personal Wallet"
                  className="h-9 text-xs"
                />
                {/* Suggestions */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <span className="text-[11px] text-[var(--muted-foreground)]">
                    Quick suggestions:
                  </span>
                  {ACCOUNT_NAME_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setAccountName(suggestion)}
                      className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[11px] text-[var(--muted-foreground)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Type */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Account Type</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {ACCOUNT_TYPE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = accountType === opt.type;
                    return (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => setAccountType(opt.type)}
                        className={`flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-all ${
                          isSelected
                            ? "border-[var(--accent)] bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]"
                            : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted-foreground)]/40 hover:bg-[var(--accent)]/5"
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <Icon
                            className={`h-4 w-4 ${
                              isSelected
                                ? "text-[var(--accent)]"
                                : "text-[var(--muted-foreground)]"
                            }`}
                          />
                          {isSelected && (
                            <Check className="h-3.5 w-3.5 text-[var(--accent)]" />
                          )}
                        </div>
                        <span className="text-xs font-semibold text-[var(--foreground)]">
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Currency & Starting Balance */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="accountCurrency" className="text-xs font-medium">
                    Account Currency
                  </Label>
                  <SearchableCurrencySelect
                    id="accountCurrency"
                    value={accountCurrency}
                    onValueChange={(val) => setAccountCurrency(val)}
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Each account tracks its own currency.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="initialBalance" className="text-xs font-medium">
                    Starting Balance
                  </Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--muted-foreground)]">
                      <CurrencyIcon currency={accountCurrency} className="h-4 w-4" />
                    </span>
                    <Input
                      id="initialBalance"
                      type="number"
                      step="any"
                      value={initialBalance}
                      onChange={(e) => setInitialBalance(e.target.value)}
                      placeholder="0.00"
                      className="h-9 pl-8 text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </div>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Current balance as of today.
                  </p>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex items-center justify-between border-t border-[var(--border)] pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!accountName.trim()) {
                    setErrorMessage("Please enter an account name to continue.");
                    return;
                  }
                  setErrorMessage(null);
                  setStep(3);
                }}
                className="gap-2"
              >
                <span>Continue to Categories</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 3: Starter Categories */}
        {step === 3 && (
          <Card className="border-[var(--border)] shadow-sm">
            <CardHeader className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                    <Layers className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-lg">Select Starter Categories</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAllCategories}
                    className="h-7 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDeselectAllCategories}
                    className="h-7 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    Clear All
                  </Button>
                </div>
              </div>
              <CardDescription className="text-xs leading-relaxed text-[var(--muted-foreground)]">
                Categories help you organize transactions and set budgets. We&apos;ve selected common
                starter categories for you — feel free to customize or add more later.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Income Categories */}
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Income ({STARTER_CATEGORIES.filter((c) => c.type === 1).length})
                </span>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {STARTER_CATEGORIES.filter((c) => c.type === 1).map((cat) => {
                    const isChecked = selectedCategories.includes(cat.name);
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => toggleCategory(cat.name)}
                        className={`flex items-center justify-between rounded-lg border p-2.5 text-left transition-all ${
                          isChecked
                            ? "border-[var(--accent)] bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]"
                            : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted-foreground)]/40"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: cat.colorHex }}
                          />
                          <span className="text-xs font-medium text-[var(--foreground)]">
                            {cat.name}
                          </span>
                        </div>
                        <div
                          className={`flex h-4 w-4 items-center justify-center rounded border ${
                            isChecked
                              ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                              : "border-[var(--muted-foreground)]/40"
                          }`}
                        >
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expense Categories */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Expenses ({STARTER_CATEGORIES.filter((c) => c.type === 2).length})
                </span>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {STARTER_CATEGORIES.filter((c) => c.type === 2).map((cat) => {
                    const isChecked = selectedCategories.includes(cat.name);
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => toggleCategory(cat.name)}
                        className={`flex items-center justify-between rounded-lg border p-2.5 text-left transition-all ${
                          isChecked
                            ? "border-[var(--accent)] bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]"
                            : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted-foreground)]/40"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: cat.colorHex }}
                          />
                          <span className="text-xs font-medium text-[var(--foreground)]">
                            {cat.name}
                          </span>
                        </div>
                        <div
                          className={`flex h-4 w-4 items-center justify-center rounded border ${
                            isChecked
                              ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                              : "border-[var(--muted-foreground)]/40"
                          }`}
                        >
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex items-center justify-between border-t border-[var(--border)] pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setStep(2)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={handleCompleteSetup}
                className="gap-2 bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent)]/90"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Setting up your Vaultz…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Finish Setup & Launch</span>
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
