import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { secureStore } from '@/security/secureStore';
import { useAuth } from './AuthContext';
import { useWorkspace } from './WorkspaceContext';
import { haptics } from '@/utils/haptics';

export interface ElementRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MobileTourStep {
  id: string;
  badge: string;
  title: string;
  description: string;
  actionText?: string;
  actionType?: 'create_account' | 'record_transaction';
}

export const MOBILE_TOUR_STEPS: MobileTourStep[] = [
  {
    id: 'workspace_pill',
    badge: 'ACCOUNT ISOLATION',
    title: '1. Personal Account Containers',
    description:
      'In Vaultz, every account operates in strict personal isolation. Each container has its own private currency and ledger so balances never get mixed up. Tap here anytime to switch accounts.',
  },
  {
    id: 'balance_card',
    badge: 'ACTIVE SCOPING',
    title: '2. Scoped Net Balance & Cash Flow',
    description:
      'This card shows your live balance and monthly cash flow strictly scoped to the active account. Tap the eye icon to instantly hide sensitive numbers.',
  },
  {
    id: 'quick_actions',
    badge: 'LOG REAL ACTIVITY',
    title: '3. Record Real Transactions',
    description:
      "Tap 'Expense' or 'Income' to quickly record activity. Vaultz immediately recalculates your cash flow, net balance, and spending pace in real time.",
    actionText: '+ Log Expense',
    actionType: 'record_transaction',
  },
  {
    id: 'bottom_tabs',
    badge: 'FINANCIAL TOOLKIT',
    title: '4. Full Financial Toolkit',
    description:
      'Access your entire personal finance toolkit from the bottom bar: manage all Accounts, inspect Activity logs, track debts with IOUs, or replay this tour anytime in Settings.',
  },
];

interface TutorialContextValue {
  isTourActive: boolean;
  currentStepIndex: number;
  currentTourStep: MobileTourStep | null;
  totalTourSteps: number;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  resetTour: () => void;
  registerTargetRect: (id: string, rect: ElementRect) => void;
  activeTargetRect: ElementRect | null;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error('useTutorial must be used within a TutorialProvider');
  return ctx;
}

const STORAGE_KEY = 'vaultz_spotlight_tour_mobile_v2';

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const { accounts, isLoading: accountsLoading } = useWorkspace();
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [hasCompleted, setHasCompleted] = useState<boolean | null>(null);
  const [targetRects, setTargetRects] = useState<Record<string, ElementRect>>({});

  const userStorageKey = useMemo(() => {
    return user?.id ? `${STORAGE_KEY}_${user.id}` : STORAGE_KEY;
  }, [user?.id]);

  // Load completion state from secure storage
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const val = await secureStore.getItemAsync(userStorageKey);
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
  }, [userStorageKey]);

  // Automatically trigger spotlight tour for first time user after layout settles
  useEffect(() => {
    if (!isAuthenticated || accountsLoading || hasCompleted === null) return;

    if (!hasCompleted && currentStepIndex === -1) {
      const timer = setTimeout(() => {
        setCurrentStepIndex(0);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, accountsLoading, hasCompleted, currentStepIndex]);

  const registerTargetRect = useCallback((id: string, rect: ElementRect) => {
    if (rect.width > 0 && rect.height > 0) {
      setTargetRects((prev) => {
        const existing = prev[id];
        if (
          existing &&
          Math.abs(existing.x - rect.x) < 2 &&
          Math.abs(existing.y - rect.y) < 2 &&
          Math.abs(existing.width - rect.width) < 2 &&
          Math.abs(existing.height - rect.height) < 2
        ) {
          return prev;
        }
        return { ...prev, [id]: rect };
      });
    }
  }, []);

  const nextStep = useCallback(async () => {
    haptics.selection();
    setCurrentStepIndex((prev) => {
      if (prev + 1 >= MOBILE_TOUR_STEPS.length) {
        haptics.success();
        (async () => {
          try {
            await secureStore.setItemAsync(userStorageKey, 'true');
          } catch {
            // Ignore
          }
        })();
        setHasCompleted(true);
        return -1;
      }
      return prev + 1;
    });
  }, [userStorageKey]);

  const prevStep = useCallback(() => {
    haptics.selection();
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const skipTour = useCallback(async () => {
    haptics.light();
    setCurrentStepIndex(-1);
    setHasCompleted(true);
    try {
      await secureStore.setItemAsync(userStorageKey, 'true');
    } catch {
      // Ignore
    }
  }, [userStorageKey]);

  const resetTour = useCallback(async () => {
    haptics.medium();
    try {
      await secureStore.deleteItemAsync(userStorageKey);
    } catch {
      // Ignore
    }
    setHasCompleted(false);
    setCurrentStepIndex(0);
  }, [userStorageKey]);

  const currentTourStep = useMemo(() => {
    if (currentStepIndex >= 0 && currentStepIndex < MOBILE_TOUR_STEPS.length) {
      return MOBILE_TOUR_STEPS[currentStepIndex];
    }
    return null;
  }, [currentStepIndex]);

  const activeTargetRect = useMemo(() => {
    if (!currentTourStep) return null;
    return targetRects[currentTourStep.id] || null;
  }, [currentTourStep, targetRects]);

  const value = useMemo(
    () => ({
      isTourActive: currentStepIndex >= 0,
      currentStepIndex,
      currentTourStep,
      totalTourSteps: MOBILE_TOUR_STEPS.length,
      nextStep,
      prevStep,
      skipTour,
      resetTour,
      registerTargetRect,
      activeTargetRect,
    }),
    [
      currentStepIndex,
      currentTourStep,
      nextStep,
      prevStep,
      skipTour,
      resetTour,
      registerTargetRect,
      activeTargetRect,
    ]
  );

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
};
