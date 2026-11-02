"use client";

import React from "react";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Plus,
  Receipt,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { useTutorial } from "@/context/tutorial-context";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export function TutorialBanner() {
  const {
    isTutorialActive,
    currentStep,
    stepNumber,
    totalSteps,
    advanceToStep,
    completeTutorial,
    skipTutorial,
    openCreateAccount,
    openRecordTransaction,
  } = useTutorial();

  if (!isTutorialActive || !currentStep) {
    return null;
  }

  const getContent = () => {
    switch (currentStep) {
      case "create_account":
        return {
          stepBadge: `STEP 1 OF ${totalSteps}: FINANCIAL CONTAINER`,
          icon: Wallet,
          title: "Create Your First Financial Account",
          desc: "Vaultz keeps every account in strict personal isolation. Each account operates with its own currency, isolated ledger, and cash flow balance. Let's create an account (e.g. Checking, Cash, or Savings).",
          primaryLabel: "Create Account Now",
          primaryIcon: Plus,
          primaryAction: openCreateAccount,
          secondaryLabel: "Next: Account Isolation",
          secondaryAction: () => advanceToStep("workspace_intro"),
        };
      case "workspace_intro":
        return {
          stepBadge: `STEP 2 OF ${totalSteps}: WORKSPACE SCOPING`,
          icon: ShieldCheck,
          title: "Account Isolation & Switcher Active",
          desc: "Notice the account switcher cards below and the account badge in the header. In Vaultz, all balances, cash flow metrics, and monthly reports are strictly scoped to the selected account container—balances never bleed across accounts.",
          primaryLabel: "Next: Record Transaction",
          primaryIcon: ArrowRight,
          primaryAction: () => advanceToStep("record_transaction"),
          secondaryLabel: "Add Another Account",
          secondaryAction: openCreateAccount,
        };
      case "record_transaction":
        return {
          stepBadge: `STEP 3 OF ${totalSteps}: LOG REAL ACTIVITY`,
          icon: Receipt,
          title: "Record Your First Transaction",
          desc: "Click below to log an income, expense, or transfer. Vaultz will immediately calculate your scoped net balance, cash flow, and spending pace in real time.",
          primaryLabel: "Log Transaction Now",
          primaryIcon: Plus,
          primaryAction: openRecordTransaction,
          secondaryLabel: "Next: Complete Setup",
          secondaryAction: () => advanceToStep("completed"),
        };
      case "completed":
        return {
          stepBadge: "GUIDE COMPLETE",
          icon: CheckCircle2,
          title: "You're All Set to Track!",
          desc: "You've mastered the fundamentals: isolated accounts, workspace scoping, and real-time transaction tracking. You can hide balances with the privacy eye, transfer funds, or replay this guide anytime in Settings.",
          primaryLabel: "Get Started",
          primaryIcon: CheckCircle2,
          primaryAction: completeTutorial,
          secondaryLabel: null,
          secondaryAction: null,
        };
    }
  };

  const content = getContent();
  const Icon = content.icon;
  const PrimaryIcon = content.primaryIcon;
  const progressPercent =
    stepNumber >= 4 ? 100 : Math.round((stepNumber / totalSteps) * 100);

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-[var(--accent)] bg-[var(--surface)] p-5 shadow-lg shadow-[var(--accent)]/10 transition-all sm:p-6">
      {/* Decorative background glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--accent)]/10 blur-3xl" />

      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
            {content.stepBadge}
          </span>
        </div>

        <button
          type="button"
          onClick={skipTutorial}
          className="group flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
          title="Dismiss guide"
        >
          <span>Skip Guide</span>
          <X className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <Progress value={progressPercent} className="h-1 bg-[var(--border)]" />
      </div>

      {/* Content row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] ring-1 ring-[var(--accent)]/30">
          <Icon className="h-6 w-6" />
        </div>

        <div className="flex-1 space-y-1.5">
          <h3 className="text-base font-semibold text-[var(--foreground)]">
            {content.title}
          </h3>
          <p className="text-xs leading-relaxed text-[var(--muted-foreground)] sm:text-sm">
            {content.desc}
          </p>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-3">
            <Button
              type="button"
              size="sm"
              onClick={content.primaryAction}
              className="gap-2 bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent)]/90 shadow-sm"
            >
              <PrimaryIcon className="h-3.5 w-3.5" />
              <span>{content.primaryLabel}</span>
            </Button>

            {content.secondaryLabel && content.secondaryAction && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={content.secondaryAction}
                className="gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <span>{content.secondaryLabel}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
