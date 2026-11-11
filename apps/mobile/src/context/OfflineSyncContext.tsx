import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { secureStore } from '@/security/secureStore';
import { transactionsApi, CreateTransactionRequest } from '@/api/transactions';
import { ApiError } from '@/api/client';
import { haptics } from '@/utils/haptics';

export interface QueuedTransaction {
  id: string;
  accountId: string;
  accountName: string;
  currency: string;
  type: 'Expense' | 'Income' | 'Transfer';
  amount: number;
  category: string;
  description?: string;
  transactionDate: string;
  destinationAccountId?: string;
  destinationAccountName?: string;
  destinationAmount?: number | null;
  createdAt: string;
  syncStatus: 'pending' | 'syncing' | 'failed';
  errorMessage?: string;
  retryCount: number;
}

interface OfflineSyncContextValue {
  pendingQueue: QueuedTransaction[];
  pendingCount: number;
  isSyncing: boolean;
  isOnline: boolean | null;
  lastSyncAt: Date | null;
  enqueueTransaction: (
    tx: Omit<QueuedTransaction, 'id' | 'createdAt' | 'syncStatus' | 'retryCount'>
  ) => Promise<QueuedTransaction>;
  syncQueue: () => Promise<{ synced: number; failed: number }>;
  removeQueuedTransaction: (id: string) => Promise<void>;
  clearQueue: () => Promise<void>;
  checkConnectivity: () => Promise<boolean>;
}

const STORAGE_KEY = 'vaultz_offline_pending_transactions_v1';

const OfflineSyncContext = createContext<OfflineSyncContextValue | null>(null);

export function useOfflineSync() {
  const ctx = useContext(OfflineSyncContext);
  if (!ctx) {
    throw new Error('useOfflineSync must be used within an OfflineSyncProvider');
  }
  return ctx;
}

export const OfflineSyncProvider: React.FC<{
  children: React.ReactNode;
  onSyncSuccess?: () => Promise<void> | void;
}> = ({ children, onSyncSuccess }) => {
  const [queue, setQueue] = useState<QueuedTransaction[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const isSyncingRef = useRef(false);

  // Load pending queue from secure storage on startup
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const stored = await secureStore.getItemAsync(STORAGE_KEY);
        if (stored && isMounted) {
          const parsed = JSON.parse(stored) as QueuedTransaction[];
          // Reset any items that were stuck in 'syncing' state
          const normalized = (parsed || []).map((item) => ({
            ...item,
            syncStatus: item.syncStatus === 'syncing' ? ('pending' as const) : item.syncStatus,
          }));
          setQueue(normalized);
        }
      } catch {
        // Ignore parsing errors
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Save queue to secure storage whenever it changes
  const persistQueue = async (newQueue: QueuedTransaction[]) => {
    try {
      await secureStore.setItemAsync(STORAGE_KEY, JSON.stringify(newQueue));
    } catch {
      // Storage save error
    }
  };

  // Connectivity check helper
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      // Fast ping check via rates or root API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch('http://192.168.254.194:5180/api/v1/currencies/rates', {
        method: 'GET',
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeoutId);

      const online = res !== null && res.status >= 200 && res.status < 500;
      setIsOnline(online);
      return online;
    } catch {
      setIsOnline(false);
      return false;
    }
  }, []);

  // Sync the pending queue with backend API
  const syncQueue = useCallback(async (): Promise<{ synced: number; failed: number }> => {
    if (isSyncingRef.current) {
      return { synced: 0, failed: 0 };
    }

    // Read latest queue from storage to prevent stale closure
    let currentQueue: QueuedTransaction[] = [];
    try {
      const stored = await secureStore.getItemAsync(STORAGE_KEY);
      if (stored) {
        currentQueue = JSON.parse(stored);
      }
    } catch {
      currentQueue = queue;
    }

    if (currentQueue.length === 0) {
      return { synced: 0, failed: 0 };
    }

    isSyncingRef.current = true;
    setIsSyncing(true);

    let syncedCount = 0;
    let failedCount = 0;
    const remainingQueue: QueuedTransaction[] = [...currentQueue];

    for (let i = 0; i < currentQueue.length; i++) {
      const item = currentQueue[i];

      try {
        const payload: CreateTransactionRequest = {
          accountId: item.accountId,
          type: item.type,
          amount: item.amount,
          currency: item.currency,
          category: item.category,
          description: item.description,
          transactionDate: item.transactionDate,
          occurredOn: item.transactionDate.split('T')[0],
          destinationAccountId: item.destinationAccountId || null,
          destinationAmount: item.destinationAmount || null,
        };

        // Post to API
        await transactionsApi.create(payload);

        // Success: remove this item from the remaining queue
        const itemIdx = remainingQueue.findIndex((q) => q.id === item.id);
        if (itemIdx !== -1) {
          remainingQueue.splice(itemIdx, 1);
        }
        syncedCount++;
        setIsOnline(true);
      } catch (err: unknown) {
        const isNetworkFailure =
          (err instanceof ApiError && err.status === 0) ||
          (err instanceof Error &&
            (err.message.includes('Cannot connect') ||
              err.message.includes('Network request failed') ||
              err.message.includes('NetworkError')));

        if (isNetworkFailure) {
          // Still offline. Abort syncing further items, leave remainder in queue
          setIsOnline(false);
          break;
        } else {
          // Server rejected transaction with business/validation error
          const itemIdx = remainingQueue.findIndex((q) => q.id === item.id);
          if (itemIdx !== -1) {
            remainingQueue[itemIdx] = {
              ...remainingQueue[itemIdx],
              syncStatus: 'failed',
              errorMessage:
                err instanceof Error ? err.message : 'Validation failed on server',
              retryCount: (remainingQueue[itemIdx].retryCount || 0) + 1,
            };
          }
          failedCount++;
        }
      }
    }

    // Persist and update state
    setQueue(remainingQueue);
    await persistQueue(remainingQueue);
    setLastSyncAt(new Date());

    isSyncingRef.current = false;
    setIsSyncing(false);

    if (syncedCount > 0) {
      haptics.success();
      if (onSyncSuccess) {
        await onSyncSuccess();
      }
    }

    return { synced: syncedCount, failed: failedCount };
  }, [queue, onSyncSuccess]);

  // Enqueue a new transaction locally
  const enqueueTransaction = useCallback(
    async (
      tx: Omit<QueuedTransaction, 'id' | 'createdAt' | 'syncStatus' | 'retryCount'>
    ): Promise<QueuedTransaction> => {
      const newItem: QueuedTransaction = {
        ...tx,
        id: `offline_tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: new Date().toISOString(),
        syncStatus: 'pending',
        retryCount: 0,
      };

      const updatedQueue = [...queue, newItem];
      setQueue(updatedQueue);
      await persistQueue(updatedQueue);

      // Immediately attempt background sync if connectivity is alive
      void syncQueue();

      return newItem;
    },
    [queue, syncQueue]
  );

  // Remove a specific queued transaction
  const removeQueuedTransaction = useCallback(
    async (id: string): Promise<void> => {
      const updated = queue.filter((q) => q.id !== id);
      setQueue(updated);
      await persistQueue(updated);
    },
    [queue]
  );

  // Clear entire queue
  const clearQueue = useCallback(async (): Promise<void> => {
    setQueue([]);
    await secureStore.deleteItemAsync(STORAGE_KEY);
  }, []);

  // Listen to AppState (when app comes back from background to active, attempt sync)
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active' && queue.length > 0) {
        void syncQueue();
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [queue.length, syncQueue]);

  // Periodic sync check every 25 seconds if there are pending items
  useEffect(() => {
    if (queue.length === 0) return;

    const interval = setInterval(() => {
      if (!isSyncingRef.current) {
        void syncQueue();
      }
    }, 25000);

    return () => clearInterval(interval);
  }, [queue.length, syncQueue]);

  return (
    <OfflineSyncContext.Provider
      value={{
        pendingQueue: queue,
        pendingCount: queue.filter((q) => q.syncStatus !== 'failed').length,
        isSyncing,
        isOnline,
        lastSyncAt,
        enqueueTransaction,
        syncQueue,
        removeQueuedTransaction,
        clearQueue,
        checkConnectivity,
      }}
    >
      {children}
    </OfflineSyncContext.Provider>
  );
};
