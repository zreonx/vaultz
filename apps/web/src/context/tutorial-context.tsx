"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useCurrentUser } from "@/hooks/use-auth";
import { useWorkspace } from "./workspace-context";

export interface TourStep {
  id: string;
  selector: string;
  badge: string;
  title: string;
  description: string;
  actionText?: string;
  actionType?: "create_account" | "record_transaction";
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "accounts",
    selector: '[data-tour="accounts-bar"]',
    badge: "Account Isolation",
    title: "1. Personal Account Containers",
    description:
      "In Vaultz, every financial account operates in strict personal isolation. Each container has its own currency, balance, and transaction history so your money never bleeds across accounts.",
  },
  {
    id: "manage-accounts",
    selector: '[data-tour="manage-accounts-btn"]',
    badge: "Container Management",
    title: "2. Add & Manage Accounts",
    description:
      "Need separate containers for daily checking, cash, high-yield savings, or foreign currencies? You can create new accounts and transfer funds between them with automatic currency conversions.",
    actionText: "+ Add Account",
    actionType: "create_account",
  },
  {
    id: "header-balance",
    selector: '[data-tour="header-balance-pill"]',
    badge: "Privacy & Scoping",
    title: "3. Live Balance & Privacy Eye",
    description:
      "This pill shows your currently active account and real-time balance. Click the eye icon anytime to mask your balance whenever you're in public spaces or screen-sharing.",
  },
  {
    id: "add-transaction",
    selector: '[data-tour="add-transaction-btn"]',
    badge: "Logging Activity",
    title: "4. Record Real Transactions",
    description:
      "Click '+ Add Transaction' to log an income, expense, or account transfer. Vaultz immediately recalculates your cash flow, net balance, and spending pace in real time.",
    actionText: "+ Add Transaction",
    actionType: "record_transaction",
  },
  {
    id: "sidebar-nav",
    selector: '[data-tour="sidebar-nav"]',
    badge: "Full Financial Toolkit",
    title: "5. Budgets, Goals, & IOUs",
    description:
      "Navigate your entire financial workflow from the sidebar: monthly category Budgets, Savings Goals, IOUs (Lending & Borrowing), and automated Financial Reports.",
  },
];

interface TutorialContextValue {
  isTourActive: boolean;
  currentStepIndex: number;
  currentTourStep: TourStep | null;
  totalTourSteps: number;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  startTour: () => void;
  skipTour: () => void;
  resetTour: () => void;
  openCreateAccount: () => void;
  openRecordTransaction: () => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return ctx;
}

const STORAGE_KEY = "vaultz_spotlight_tour_completed_v2";

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const { data: user } = useCurrentUser();
  const { isLoadingWorkspaces, openCreateWorkspaceDialog, openCreateTransactionDialog } =
    useWorkspace();

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [hasCompleted, setHasCompleted] = useState<boolean | null>(null);

  const userStorageKey = useMemo(() => {
    return user?.id ? `${STORAGE_KEY}_${user.id}` : STORAGE_KEY;
  }, [user?.id]);

  // Load completion status from localStorage
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(userStorageKey);
      setHasCompleted(stored === "true");
    } catch {
      setHasCompleted(false);
    }
  }, [userStorageKey]);

  // Automatically start tour for first-time visitors once page is loaded
  useEffect(() => {
    if (!user || isLoadingWorkspaces || hasCompleted === null) return;

    if (!hasCompleted && currentStepIndex === -1) {
      // Small timeout so DOM components mount and layout stabilizes
      const timer = setTimeout(() => {
        setCurrentStepIndex(0);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [user, isLoadingWorkspaces, hasCompleted, currentStepIndex]);

  const nextStep = useCallback(() => {
    setCurrentStepIndex((prev) => {
      if (prev + 1 >= TOUR_STEPS.length) {
        // Completed
        try {
          window.localStorage.setItem(userStorageKey, "true");
        } catch {
          // Ignore
        }
        setHasCompleted(true);
        return -1;
      }
      return prev + 1;
    });
  }, [userStorageKey]);

  const prevStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < TOUR_STEPS.length) {
      setCurrentStepIndex(index);
    }
  }, []);

  const startTour = useCallback(() => {
    setCurrentStepIndex(0);
  }, []);

  const skipTour = useCallback(() => {
    setCurrentStepIndex(-1);
    setHasCompleted(true);
    try {
      window.localStorage.setItem(userStorageKey, "true");
    } catch {
      // Ignore
    }
  }, [userStorageKey]);

  const resetTour = useCallback(() => {
    try {
      window.localStorage.removeItem(userStorageKey);
    } catch {
      // Ignore
    }
    setHasCompleted(false);
    setCurrentStepIndex(0);
  }, [userStorageKey]);

  const openCreateAccount = useCallback(() => {
    openCreateWorkspaceDialog();
  }, [openCreateWorkspaceDialog]);

  const openRecordTransaction = useCallback(() => {
    openCreateTransactionDialog();
  }, [openCreateTransactionDialog]);

  const currentTourStep = useMemo<TourStep | null>(() => {
    if (currentStepIndex >= 0 && currentStepIndex < TOUR_STEPS.length) {
      return TOUR_STEPS[currentStepIndex] ?? null;
    }
    return null;
  }, [currentStepIndex]);

  const value = useMemo(
    () => ({
      isTourActive: currentStepIndex >= 0,
      currentStepIndex,
      currentTourStep,
      totalTourSteps: TOUR_STEPS.length,
      nextStep,
      prevStep,
      goToStep,
      startTour,
      skipTour,
      resetTour,
      openCreateAccount,
      openRecordTransaction,
    }),
    [
      currentStepIndex,
      currentTourStep,
      nextStep,
      prevStep,
      goToStep,
      startTour,
      skipTour,
      resetTour,
      openCreateAccount,
      openRecordTransaction,
    ]
  );

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}
