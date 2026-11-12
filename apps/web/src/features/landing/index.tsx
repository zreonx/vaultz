"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Globe,
  LayoutDashboard,
  PiggyBank,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-auth";
import { formatMoney } from "@/lib/utils/currency";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const FEATURE_CARDS = [
  {
    icon: Scale,
    badge: "To the Last Cent",
    title: "Penny-Perfect Balances",
    description:
      "Every balance, budget, and transaction is calculated down to the exact cent—so your accounts always match your real bank statements.",
  },
  {
    icon: ArrowLeftRight,
    badge: "Smart Transfers",
    title: "True Account Transfers",
    description:
      "Moving money between Checking and Savings updates both accounts at once without counting the transfer as an expense in your monthly reports.",
  },
  {
    icon: Globe,
    badge: "10+ Currencies",
    title: "Multi-Currency Accounts",
    description:
      "Hold accounts in USD, EUR, GBP, PHP, JPY, and more. Transfer across currencies and view your total net worth in your preferred currency.",
  },
  {
    icon: Target,
    badge: "Monthly Pacing",
    title: "Funds Partition & Monthly Finance",
    description:
      "Wall off emergency reserves in protected purpose vaults and partition spending into disciplined monthly allowance fragments.",
  },
  {
    icon: PiggyBank,
    badge: "Future Planning",
    title: "Savings Goals",
    description:
      "Save toward emergency funds, travel, and major purchases with clear progress tracking, target dates, and easy contributions.",
  },
  {
    icon: BarChart3,
    badge: "Clear Insights",
    title: "Spending Reports & Exports",
    description:
      "Understand your monthly savings rate, see where your money goes by category, and download your transaction history anytime.",
  },
];

const DEMO_TRANSACTIONS = [
  {
    id: "tx-1",
    date: "2026-10-31",
    description: "Monthly Salary Deposit",
    account: "Primary Checking",
    category: "Salary & Income",
    type: "Income" as const,
    amount: 6800.0,
    currency: "USD",
  },
  {
    id: "tx-2",
    date: "2026-10-31",
    description: "Monthly Savings Transfer",
    account: "Primary Checking → High-Yield Savings",
    category: "Account Transfer",
    type: "Transfer" as const,
    amount: 1500.0,
    currency: "USD",
  },
  {
    id: "tx-3",
    date: "2026-10-31",
    description: "Apartment Rent & Utilities",
    account: "Primary Checking",
    category: "Housing & Utilities",
    type: "Expense" as const,
    amount: 2150.0,
    currency: "USD",
  },
  {
    id: "tx-4",
    date: "2026-10-31",
    description: "Coffee & Weekend Dinner",
    account: "Rewards Credit Card",
    category: "Dining & Coffee",
    type: "Expense" as const,
    amount: 142.5,
    currency: "USD",
  },
];

export function LandingPageFeature() {
  const { data: user } = useCurrentUser();
  const [accountingMode, setAccountingMode] = useState<"vaultz" | "naive">(
    "vaultz"
  );

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-[var(--accent-soft)] selection:text-[var(--accent)]">
      {/* Sticky Minimalist Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8 rounded-xl">
              <AvatarFallback className="rounded-xl bg-[var(--accent)] text-xs font-semibold text-[var(--accent-foreground)]">
                V
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold tracking-tight">
                Vaultz
              </span>
              <Badge variant="neutral" className="hidden sm:inline-flex">
                Personal Finance
              </Badge>
            </div>
          </Link>

          <nav
            aria-label="Landing Sections"
            className="hidden items-center gap-1 md:flex"
          >
            <Button asChild variant="ghost" size="sm">
              <a href="#interactive-preview">Interactive Preview</a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href="#features">Features</a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href="#invariants">Smart Transfers</a>
            </Button>
            {user && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            )}
          </nav>

          <div className="flex items-center gap-2.5">
            {user ? (
              <Button asChild size="sm">
                <Link href="/dashboard">
                  Go to Dashboard
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/register">
                    Get Started Free
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-14 px-6 py-10 sm:py-12">
        {/* Hero Section */}
        <section className="text-center">
          <div className="inline-flex">
            <Badge
              variant="default"
              className="gap-1.5 px-3.5 py-1.5 text-xs shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Calm Design · Multi-Currency · Effortless Budgeting
            </Badge>
          </div>

          <h1 className="mx-auto mt-5 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl sm:leading-[1.12]">
            Quiet clarity for every account, budget, and transfer.
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-base">
            Bring all your checking, savings, and multi-currency accounts into
            one peaceful space. Track your daily spending, plan monthly budgets,
            and grow your savings without the clutter.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href={user ? "/dashboard" : "/login"}>
                {user ? "Open Your Dashboard" : "Sign In to Your Account"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={user ? "/accounts" : "/register"}>
                {user ? "Manage Accounts" : "Create Free Account"}
              </Link>
            </Button>
          </div>

          {/* Subtle Key Highlights Strip */}
          <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-2.5">
            <Badge variant="neutral" className="gap-1.5 px-3 py-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-[var(--accent)]" />
              Multi-Currency Support
            </Badge>
            <Badge variant="neutral" className="gap-1.5 px-3 py-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-[var(--accent)]" />
              Penny-Perfect Balances
            </Badge>
            <Badge variant="neutral" className="gap-1.5 px-3 py-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-[var(--accent)]" />
              Private &amp; Secure
            </Badge>
          </div>
        </section>

        {/* Interactive Preview */}
        <section id="interactive-preview">
          <Tabs defaultValue="overview" className="space-y-4">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <Badge variant="default">Interactive Preview</Badge>
                <h2 className="mt-1.5 text-lg font-semibold tracking-tight">
                  Take a look inside your financial overview
                </h2>
              </div>

              <TabsList>
                <TabsTrigger value="overview" className="gap-1.5">
                  <LayoutDashboard className="h-3.5 w-3.5 text-[var(--accent)]" />
                  Cash Flow &amp; Budgets
                </TabsTrigger>
                <TabsTrigger value="ledger" className="gap-1.5">
                  <ArrowLeftRight className="h-3.5 w-3.5 text-[var(--accent)]" />
                  Recent Activity
                </TabsTrigger>
                <TabsTrigger value="goals" className="gap-1.5">
                  <PiggyBank className="h-3.5 w-3.5 text-[var(--accent)]" />
                  Savings Goals
                </TabsTrigger>
              </TabsList>
            </div>

            <Card className="overflow-hidden border-[var(--border)] bg-[var(--surface)] shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--background)] px-5 py-3">
                <div className="flex items-center gap-2">
                  <Badge variant="neutral" className="text-[11px]">
                    Sample Household Overview · USD
                  </Badge>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href={user ? "/dashboard" : "/login"}>
                    {user ? "Open Full App" : "Sign In to Try Live"}{" "}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardHeader>

              <CardContent className="p-6">
                <TabsContent value="overview" className="mt-0 space-y-6">
                  <div className="grid gap-4 sm:grid-cols-4">
                    <Card className="bg-[var(--background)]">
                      <CardHeader className="p-4">
                        <CardDescription>Total Balance</CardDescription>
                        <CardTitle className="text-xl tabular-nums">
                          {formatMoney(56549.5, "USD")}
                        </CardTitle>
                      </CardHeader>
                    </Card>

                    <Card className="bg-[var(--background)]">
                      <CardHeader className="p-4">
                        <CardDescription>Monthly Income</CardDescription>
                        <CardTitle className="text-xl text-[var(--accent)] tabular-nums">
                          +{formatMoney(6800.0, "USD")}
                        </CardTitle>
                      </CardHeader>
                    </Card>

                    <Card className="bg-[var(--background)]">
                      <CardHeader className="p-4">
                        <CardDescription>Monthly Spending</CardDescription>
                        <CardTitle className="text-xl text-[var(--danger)] tabular-nums">
                          -{formatMoney(2360.5, "USD")}
                        </CardTitle>
                      </CardHeader>
                    </Card>

                    <Card className="bg-[var(--background)]">
                      <CardHeader className="p-4">
                        <CardDescription>Moved to Savings</CardDescription>
                        <CardTitle className="text-xl text-[var(--muted-foreground)] tabular-nums">
                          {formatMoney(1500.0, "USD")}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      {
                        name: "Housing & Utilities",
                        spent: 2150,
                        limit: 2400,
                        pct: 89.6,
                      },
                      {
                        name: "Dining & Coffee",
                        spent: 142.5,
                        limit: 450,
                        pct: 31.7,
                      },
                      {
                        name: "Subscriptions",
                        spent: 68.0,
                        limit: 150,
                        pct: 45.3,
                      },
                    ].map((b) => (
                      <Card key={b.name} className="bg-[var(--background)]">
                        <CardContent className="space-y-2.5 p-4">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium">{b.name}</span>
                            <Badge variant="default" className="tabular-nums">
                              {b.pct}%
                            </Badge>
                          </div>
                          <Progress value={b.pct} />
                          <p className="text-[11px] text-[var(--muted-foreground)] tabular-nums">
                            {formatMoney(b.spent, "USD")} of{" "}
                            {formatMoney(b.limit, "USD")} monthly budget
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="ledger" className="mt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description &amp; Account</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {DEMO_TRANSACTIONS.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="tabular-nums text-xs text-[var(--muted-foreground)]">
                            {tx.date}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{tx.description}</div>
                            <div className="text-xs text-[var(--muted-foreground)]">
                              {tx.account}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-[var(--muted-foreground)]">
                            {tx.category}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                tx.type === "Income"
                                  ? "default"
                                  : tx.type === "Transfer"
                                  ? "neutral"
                                  : "warning"
                              }
                            >
                              {tx.type}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className={`text-right font-semibold tabular-nums ${
                              tx.type === "Income"
                                ? "text-[var(--accent)]"
                                : tx.type === "Expense"
                                ? "text-[var(--danger)]"
                                : "text-[var(--muted-foreground)]"
                            }`}
                          >
                            {tx.type === "Income"
                              ? "+"
                              : tx.type === "Expense"
                              ? "-"
                              : ""}
                            {formatMoney(tx.amount, tx.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="goals" className="mt-0">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="bg-[var(--background)]">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">
                            6-Month Emergency Fund
                          </CardTitle>
                          <Badge variant="default" className="tabular-nums">
                            88.9%
                          </Badge>
                        </div>
                        <CardDescription>
                          Target date: June 30, 2027
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2.5">
                        <Progress value={88.9} />
                        <div className="flex justify-between text-xs tabular-nums text-[var(--muted-foreground)]">
                          <span>Saved: {formatMoney(40000, "USD")}</span>
                          <span>Goal: {formatMoney(45000, "USD")}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-[var(--background)]">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">
                            Autumn Trip to Japan
                          </CardTitle>
                          <Badge variant="default" className="tabular-nums">
                            61.2%
                          </Badge>
                        </div>
                        <CardDescription>
                          Target date: October 15, 2027
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2.5">
                        <Progress value={61.2} />
                        <div className="flex justify-between text-xs tabular-nums text-[var(--muted-foreground)]">
                          <span>Saved: {formatMoney(5200, "USD")}</span>
                          <span>Goal: {formatMoney(8500, "USD")}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        </section>

        {/* Feature Bento Grid */}
        <section id="features" className="space-y-6">
          <div className="max-w-2xl space-y-2">
            <Badge variant="default">Everything You Need</Badge>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Every personal finance tool, thoughtfully unified.
            </h2>
            <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
              Designed to make managing everyday money, international accounts,
              and long-term savings feel calm and effortless.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURE_CARDS.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div key={feature.title} whileHover={{ y: -2 }}>
                  <Card className="h-full transition-colors hover:border-[var(--accent)]/40">
                    <CardHeader className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Avatar className="h-9 w-9 rounded-xl">
                          <AvatarFallback className="rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                            <Icon className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <Badge variant="neutral" className="tabular-nums">
                          {feature.badge}
                        </Badge>
                      </div>
                      <CardTitle className="text-base">
                        {feature.title}
                      </CardTitle>
                      <CardDescription className="text-xs leading-relaxed">
                        {feature.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Interactive Smart Transfers Comparison */}
        <section id="invariants">
          <Card className="overflow-hidden">
            <CardContent className="grid gap-8 p-6 sm:p-8 lg:grid-cols-12 lg:items-center">
              <div className="space-y-4 lg:col-span-6">
                <Badge variant="default">Honest Cash Flow</Badge>
                <h2 className="text-2xl font-semibold tracking-tight">
                  Moving money to savings is not an expense.
                </h2>
                <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                  Many budgeting apps accidentally count a{" "}
                  <span className="font-medium text-[var(--foreground)]">
                    $1,500.00
                  </span>{" "}
                  transfer from Checking to Savings as money spent. Switch views
                  below to see how Vaultz keeps your monthly spending reports
                  accurate.
                </p>

                <Tabs
                  value={accountingMode}
                  onValueChange={(v) =>
                    setAccountingMode(v as "vaultz" | "naive")
                  }
                >
                  <TabsList>
                    <TabsTrigger value="vaultz">
                      How Vaultz Tracks It
                    </TabsTrigger>
                    <TabsTrigger value="naive">
                      Typical Expense Apps
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="lg:col-span-6">
                <Card className="bg-[var(--background)]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardDescription>
                        {accountingMode === "vaultz"
                          ? "Vaultz Cash Flow (Transfers Kept Separate)"
                          : "Other Apps (Transfers Counted as Spending)"}
                      </CardDescription>
                      <Badge
                        variant={
                          accountingMode === "vaultz" ? "default" : "danger"
                        }
                      >
                        {accountingMode === "vaultz"
                          ? "True Picture"
                          : "Misleading"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Reported Monthly Spending
                        </p>
                        <p className="mt-1 text-xl font-semibold tabular-nums">
                          {accountingMode === "vaultz"
                            ? formatMoney(2360.5, "USD")
                            : formatMoney(3860.5, "USD")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Monthly Savings Rate
                        </p>
                        <p
                          className={`mt-1 text-xl font-semibold tabular-nums ${
                            accountingMode === "vaultz"
                              ? "text-[var(--accent)]"
                              : "text-[var(--warning)]"
                          }`}
                        >
                          {accountingMode === "vaultz" ? "65.29%" : "43.23%"}
                        </p>
                      </div>
                    </div>

                    <Alert
                      variant={
                        accountingMode === "vaultz" ? "default" : "destructive"
                      }
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <AlertTitle>
                        {accountingMode === "vaultz"
                          ? "Transfers Stay Separate from Spending"
                          : "Spending Looks Higher Than It Really Is"}
                      </AlertTitle>
                      <AlertDescription>
                        {accountingMode === "vaultz"
                          ? "Your $1,500.00 savings transfer updates both account balances without making it look like you spent extra money."
                          : "Treating savings transfers like expenses makes it look like you spent $1,500.00 more than you actually did."}
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Bottom Call-To-Action Card */}
        <section>
          <Card className="p-8 text-center sm:p-10">
            <CardContent className="mx-auto max-w-xl space-y-4 p-0">
              <Avatar className="mx-auto h-11 w-11 rounded-2xl">
                <AvatarFallback className="rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <ShieldCheck className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-2xl">
                Ready to take calm control of your finances?
              </CardTitle>
              <CardDescription className="text-sm">
                Explore right away with our sample account (
                <Badge variant="neutral" className="font-mono">
                  demo@vaultz.local
                </Badge>{" "}
                /{" "}
                <Badge variant="neutral" className="font-mono">
                  Password123
                </Badge>
                ) or create your own personal profile in seconds.
              </CardDescription>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button asChild size="lg">
                  <Link href={user ? "/dashboard" : "/login"}>
                    {user ? "Open Dashboard" : "Sign In with Sample Account"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href={user ? "/accounts" : "/register"}>
                    {user ? "Manage Accounts" : "Create Free Account"}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Minimalist Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface)] py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-xs text-[var(--muted-foreground)] sm:flex-row">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6 rounded-lg">
              <AvatarFallback className="rounded-lg bg-[var(--accent)] text-[11px] font-semibold text-[var(--accent-foreground)]">
                V
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-[var(--foreground)]">Vaultz</span>
            <span>· Mindful Personal Finance</span>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {user ? (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/accounts">Accounts</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/transactions">Transactions</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/budgets">Monthly Finance</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/reports">Reports</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <a href="#interactive-preview">Preview</a>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <a href="#features">Features</a>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/register">Create Account</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
