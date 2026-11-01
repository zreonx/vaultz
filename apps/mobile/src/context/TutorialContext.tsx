import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { secureStore } from '@/security/secureStore';
import { useAuth } from './AuthContext';
import { useWorkspace } from './WorkspaceContext';
import { haptics } from '@/utils/haptics';

export type TutorialStep =
  | 'create_account'       // Step 1: Guided creation of first account
  | 'workspace_intro'      // Step 2: Explaining account scoping & switcher
  | 'record_transaction'   // Step 3: Guided first transaction
  | 'completed';           // Step 4: Celebration & finish

interface TutorialContextValue {
  isTutorialActive: boolean;
  currentStep: TutorialStep | null;
  stepNumber: number;
  totalSteps: number;
  startTutorial: () => void;
  advanceToStep: (step: TutorialStep) => void;
  completeTutorial: () => void;
  skipTutorial: () => void;
  resetTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error('useTutorial must be used within a TutorialProvider');
  return ctx;
}

const STORAGE_KEY = 'vaultz_tutorial_completed_v1';

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const { accounts, isLoading: accountsLoading } = useWorkspace();
  const [currentStep, setCurrentStep] = useState<TutorialStep | null>(null);
  const [hasCompleted, setHasCompleted] = useState<boolean | null>(null);

  // Load completion state from secure storage
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const val = await secureStore.getItemAsync(STORAGE_KEY);
        if (isMounted) {
          setHasCompleted(val === 'true');
        }
      } catch {
        if (isMounted) setHasCompleted(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Trigger tutorial for brand new user with 0 accounts or first time
  useEffect(() => {
    if (!isAuthenticated || accountsLoading || hasCompleted === null) return;

    if (!hasCompleted) {
      if (accounts.length === 0) {
        setCurrentStep('create_account');
      } else if (!currentStep) {
        setCurrentStep('workspace_intro');
      }
    }
  }, [isAuthenticated, accountsLoading, hasCompleted, accounts.length, currentStep]);

  const advanceToStep = useCallback((step: TutorialStep) => {
    haptics.selection();
    setCurrentStep(step);
  }, []);

  const completeTutorial = useCallback(async () => {
    haptics.success();
    setCurrentStep(null);
    setHasCompleted(true);
    await secureStore.setItemAsync(STORAGE_KEY, 'true');
  }, []);

  const skipTutorial = useCallback(async () => {
    haptics.light();
    setCurrentStep(null);
    setHasCompleted(true);
    await secureStore.setItemAsync(STORAGE_KEY, 'true');
  }, []);

  const resetTutorial = useCallback(async () => {
    haptics.medium();
    await secureStore.deleteItemAsync(STORAGE_KEY);
    setHasCompleted(false);
    setCurrentStep(accounts.length === 0 ? 'create_account' : 'workspace_intro');
  }, [accounts.length]);

  const startTutorial = useCallback(() => {
    haptics.light();
    setCurrentStep('create_account');
  }, []);

  const stepNumber = useMemo(() => {
    switch (currentStep) {
      case 'create_account':
        return 1;
      case 'workspace_intro':
        return 2;
      case 'record_transaction':
        return 3;
      case 'completed':
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
    }),
    [
      currentStep,
      stepNumber,
      startTutorial,
      advanceToStep,
      completeTutorial,
      skipTutorial,
      resetTutorial,
    ]
  );

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
};
