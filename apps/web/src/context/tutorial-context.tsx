"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-auth";
import { useWorkspace } from "./workspace-context";

export type WebTutorialStep =
  | "create_account"     // Step 1: Guided creation of first account container
  | "workspace_intro"    // Step 2: Explaining account scoping & switcher
  | "record_transaction" // Step 3: Guided first transaction
  | "completed";         // Step 4: Celebration & finish

interface TutorialContextValue {
  isTutorialActive: boolean;
  currentStep: WebTutorialStep | null;
  stepNumber: number;
  totalSteps: number;
  startTutorial: () => void;
  advanceToStep: (step: WebTutorialStep) => void;
  completeTutorial: () => void;
  skipTutorial: () => void;
  resetTutorial: () => void;
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

const BASE_STORAGE_KEY = "vaultz_web_tutorial_completed_v1";

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const { data: user } = useCurrentUser();
  const {
    workspaces,
    isLoadingWorkspaces,
    openCreateWorkspaceDialog,
    openCreateTransactionDialog,
  } = useWorkspace();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState<WebTutorialStep | null>(null);
  const [hasCompleted, setHasCompleted] = useState<boolean | null>(null);

  const storageKey = useMemo(() => {
    return user?.id ? `${BASE_STORAGE_KEY}_${user.id}` : BASE_STORAGE_KEY;
  }, [user?.id]);

  // Load completion status from localStorage
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      setHasCompleted(stored === "true");
    } catch {
      setHasCompleted(false);
    }
  }, [storageKey]);

  // Trigger tutorial for brand new user with 0 accounts or first time visit
  useEffect(() => {
    if (!user || isLoadingWorkspaces || hasCompleted === null) return;

    if (!hasCompleted) {
      if (workspaces.length === 0) {
        setCurrentStep("create_account");
      } else if (!currentStep) {
        setCurrentStep("workspace_intro");
      }
    }
  }, [user, isLoadingWorkspaces, hasCompleted, workspaces.length, currentStep]);

  // Listen to query cache changes to automatically advance tutorial steps
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated") {
        const queryKey = event.query.queryKey;
        const rootKey = queryKey[0];

        // When accounts are updated/created during step 1, advance to workspace_intro
        if (rootKey === "accounts") {
          setCurrentStep((prev) =>
            prev === "create_account" ? "workspace_intro" : prev
          );
        }

        // When transactions are recorded during step 3, advance to completed
        if (rootKey === "transactions" || rootKey === "dashboard") {
          setCurrentStep((prev) =>
            prev === "record_transaction" ? "completed" : prev
          );
        }
      }
    });

    return () => unsubscribe();
  }, [queryClient]);

  const advanceToStep = useCallback((step: WebTutorialStep) => {
    setCurrentStep(step);
  }, []);

  const completeTutorial = useCallback(() => {
    setCurrentStep(null);
    setHasCompleted(true);
    try {
      window.localStorage.setItem(storageKey, "true");
    } catch {
      // Ignore storage errors
    }
  }, [storageKey]);

  const skipTutorial = useCallback(() => {
    setCurrentStep(null);
    setHasCompleted(true);
    try {
      window.localStorage.setItem(storageKey, "true");
    } catch {
      // Ignore storage errors
    }
  }, [storageKey]);

  const resetTutorial = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
    setHasCompleted(false);
    setCurrentStep(workspaces.length === 0 ? "create_account" : "workspace_intro");
  }, [storageKey, workspaces.length]);

  const startTutorial = useCallback(() => {
    setCurrentStep("create_account");
  }, []);

  const openCreateAccount = useCallback(() => {
    openCreateWorkspaceDialog();
  }, [openCreateWorkspaceDialog]);

  const openRecordTransaction = useCallback(() => {
    openCreateTransactionDialog();
  }, [openCreateTransactionDialog]);

  const stepNumber = useMemo(() => {
    switch (currentStep) {
      case "create_account":
        return 1;
      case "workspace_intro":
        return 2;
      case "record_transaction":
        return 3;
      case "completed":
        return 4;
      default:
        return 0;
    }
  }, [currentStep]);

  const value = useMemo(
    () => ({
      isTutorialActive: currentStep !== null,
      currentStep,
      stepNumber,
      totalSteps: 3,
      startTutorial,
      advanceToStep,
      completeTutorial,
      skipTutorial,
      resetTutorial,
      openCreateAccount,
      openRecordTransaction,
    }),
    [
      currentStep,
      stepNumber,
      startTutorial,
      advanceToStep,
      completeTutorial,
      skipTutorial,
      resetTutorial,
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
