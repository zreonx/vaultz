import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { accountsApi } from "@/api/accounts";
import { useAuth } from "./AuthContext";
import { AccountResponse } from "@/types/api";

interface WorkspaceContextValue {
  accounts: AccountResponse[];
  activeWorkspace: AccountResponse | null;
  activeAccountId: string | null;
  activeCurrencyCode: string;
  isLoading: boolean;
  hideBalance: boolean;
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

  const {
    data: rawAccounts = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountsApi.getAccounts(),
    enabled: Boolean(token && user),
  });

  const accounts: AccountResponse[] = useMemo(() => {
    return rawAccounts.map((a) => ({
      ...a,
      currency: a.currencyCode,
      currentBalance: a.balance,
    }));
  }, [rawAccounts]);

  // Ensure an account is always selected (user's default account, or the first one)
  useEffect(() => {
    if (accounts.length > 0) {
      const exists = accounts.some((a) => a.id === selectedAccountId);
      if (!exists) {
        const preferred = accounts.find((a) => a.isDefault) ?? accounts[0];
        if (preferred) {
          setSelectedAccountId(preferred.id);
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
  }, []);

  const setActiveWorkspace = useCallback((acc: AccountResponse) => {
    setSelectedAccountId(acc.id);
  }, []);

  const refetchAll = useCallback(async () => {
    await Promise.all([
      refetch(),
      queryClient.invalidateQueries(),
    ]);
  }, [queryClient, refetch]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      accounts,
      activeWorkspace,
      activeAccountId: selectedAccountId,
      activeCurrencyCode,
      isLoading,
      hideBalance: isHideBalance,
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
      setActiveAccountId,
      setActiveWorkspace,
      toggleHideBalance,
      refetch,
      refetchAll,
    ]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
