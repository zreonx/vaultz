import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { accountsApi } from "@/api/accounts";
import { currenciesApi } from "@/api/currencies";
import { notificationsApi } from "@/api/notifications";
import { secureStore } from "@/security/secureStore";
import { useAuth } from "./AuthContext";
import { AccountResponse } from "@/types/api";

const CACHED_ACCOUNTS_KEY = "vaultz_cached_accounts";
const ACTIVE_ACCOUNT_KEY = "vaultz_active_account_id";

interface WorkspaceContextValue {
  accounts: AccountResponse[];
  activeWorkspace: AccountResponse | null;
  activeAccountId: string | null;
  activeCurrencyCode: string;
  isLoading: boolean;
  hideBalance: boolean;
  unreadNotificationsCount: number;
  setActiveAccountId: (id: string) => void;
  setActiveWorkspace: (acc: AccountResponse) => void;
  toggleHideBalance: () => void;
  refreshAccounts: () => Promise<any>;
  refetchAll: () => Promise<any>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within a WorkspaceProvider");
  return ctx;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, token, isHideBalance, toggleHideBalance } = useAuth();
  const queryClient = useQueryClient();

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [offlineAccounts, setOfflineAccounts] = useState<AccountResponse[]>([]);

  const isAuthActive = Boolean(token && user);

  // Clear stale state & query cache immediately on logout / user switch
  useEffect(() => {
    if (!isAuthActive) {
      setSelectedAccountId(null);
      setOfflineAccounts([]);
      queryClient.clear();
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const [storedAccounts, savedActiveId] = await Promise.all([
          secureStore.getItemAsync(CACHED_ACCOUNTS_KEY),
          secureStore.getItemAsync(ACTIVE_ACCOUNT_KEY),
        ]);
        if (!mounted) return;
        if (storedAccounts) {
          const parsed = JSON.parse(storedAccounts) as AccountResponse[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setOfflineAccounts(parsed);
          }
        }
        if (savedActiveId) {
          setSelectedAccountId(savedActiveId);
        }
      } catch {
        // Ignore storage errors
      }
    })();

    // Populate live FX rates silently for converter & cross-currency transfers
    void currenciesApi.getRates().catch(() => null);

    return () => {
      mounted = false;
    };
  }, [isAuthActive, queryClient]);

  const {
    data: rawAccounts = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const fetched = await accountsApi.getAccounts();
      if (Array.isArray(fetched) && fetched.length > 0) {
        void secureStore.setItemAsync(CACHED_ACCOUNTS_KEY, JSON.stringify(fetched));
        setOfflineAccounts(fetched);
      }
      return fetched;
    },
    enabled: isAuthActive,
  });

  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => notificationsApi.getNotifications(1),
    enabled: isAuthActive,
    refetchInterval: 45_000,
  });

  const accounts: AccountResponse[] = useMemo(() => {
    if (!isAuthActive) return [];
    const source = rawAccounts.length > 0 ? rawAccounts : offlineAccounts;
    return source.map((a) => ({
      ...a,
      currency: a.currencyCode,
      currentBalance: a.balance,
    }));
  }, [isAuthActive, rawAccounts, offlineAccounts]);

  // Ensure an account is always selected (saved account, default account, or first one)
  useEffect(() => {
    if (accounts.length > 0) {
      const exists = accounts.some((a) => a.id === selectedAccountId);
      if (!exists) {
        const preferred = accounts.find((a) => a.isDefault) ?? accounts[0];
        if (preferred) {
          setSelectedAccountId(preferred.id);
          void secureStore.setItemAsync(ACTIVE_ACCOUNT_KEY, preferred.id);
        }
      }
    } else {
      setSelectedAccountId(null);
    }
  }, [accounts, selectedAccountId]);

  const activeWorkspace = useMemo(() => {
    if (!selectedAccountId || accounts.length === 0) return null;
    return accounts.find((a) => a.id === selectedAccountId) ?? accounts[0] ?? null;
  }, [accounts, selectedAccountId]);

  const activeCurrencyCode = useMemo(() => {
    return activeWorkspace?.currencyCode ?? user?.defaultCurrencyCode ?? "USD";
  }, [activeWorkspace, user]);

  const setActiveAccountId = useCallback((id: string) => {
    setSelectedAccountId(id);
    void secureStore.setItemAsync(ACTIVE_ACCOUNT_KEY, id);
  }, []);

  const setActiveWorkspace = useCallback((acc: AccountResponse) => {
    setSelectedAccountId(acc.id);
    void secureStore.setItemAsync(ACTIVE_ACCOUNT_KEY, acc.id);
  }, []);

  const refetchAll = useCallback(async () => {
    await Promise.all([
      refetch(),
      queryClient.invalidateQueries({ queryKey: ["accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] }),
    ]);
  }, [queryClient, refetch]);

  const unreadNotificationsCount = isAuthActive ? (unreadData?.unreadCount ?? 0) : 0;

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      accounts,
      activeWorkspace,
      activeAccountId: selectedAccountId,
      activeCurrencyCode,
      isLoading,
      hideBalance: isHideBalance,
      unreadNotificationsCount,
      setActiveAccountId,
      setActiveWorkspace,
      toggleHideBalance,
      refreshAccounts: refetch,
      refetchAll,
    }),
    [
      accounts,
      activeWorkspace,
      selectedAccountId,
      activeCurrencyCode,
      isLoading,
      isHideBalance,
      unreadNotificationsCount,
      setActiveAccountId,
      setActiveWorkspace,
      toggleHideBalance,
      refetch,
      refetchAll,
    ]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
