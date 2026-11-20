import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import { authApi } from "@/api/auth";
import { ApiError, setOnUnauthorizedCallback } from "@/api/client";
import { biometrics } from "@/security/biometrics";
import { secureStore } from "@/security/secureStore";
import { AuthResponse, UserResponse } from "@/types/api";

const CACHED_ACCOUNTS_KEY = "vaultz_cached_accounts";
const ACTIVE_ACCOUNT_KEY = "vaultz_active_account_id";
const OFFLINE_QUEUE_KEY = "vaultz_offline_pending_transactions_v1";

export interface LoginOutcome {
  requiresTwoFactor: boolean;
  twoFactorType?: string | null;
  twoFactorToken?: string | null;
}

interface AuthContextValue {
  user: UserResponse | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBiometricLocked: boolean;
  isBiometricSupported: boolean;
  isBiometricEnabled: boolean;
  isHideBalance: boolean;
  login: (email: string, pass: string) => Promise<LoginOutcome>;
  verifyTwoFactor: (
    email: string,
    code: string,
    twoFactorToken: string,
    isRecoveryCode?: boolean
  ) => Promise<void>;
  register: (
    emailOrName: string,
    passOrEmail: string,
    nameOrPass?: string,
    curr?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  unlockWithBiometrics: () => Promise<boolean>;
  toggleBiometrics: (enabled: boolean) => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<boolean>;
  toggleHideBalance: () => Promise<void>;
  applyAuthResult: (res: AuthResponse) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBiometricLocked, setIsBiometricLocked] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isHideBalance, setIsHideBalance] = useState(false);

  const applyAuthResult = useCallback(async (res: AuthResponse) => {
    if (res.token) {
      await secureStore.saveToken(res.token);
      setToken(res.token);
    }
    await secureStore.saveUserProfile(JSON.stringify(res.user));
    setUser(res.user);
    setIsBiometricLocked(false);
  }, []);

  // Load session on startup
  const bootstrapAsync = useCallback(async () => {
    try {
      const storedToken = await secureStore.getToken();
      const bioSupported = await biometrics.isAvailable();
      const bioEnabled = await secureStore.isBiometricEnabled();
      const hideBal = await secureStore.isHideBalanceEnabled();

      setIsBiometricSupported(bioSupported);
      setIsBiometricEnabled(bioEnabled);
      setIsHideBalance(hideBal);

      if (storedToken) {
        setToken(storedToken);
        const profileJson = await secureStore.getUserProfile();
        if (profileJson) {
          try {
            setUser(JSON.parse(profileJson));
          } catch {
            // Ignore
          }
        }

        // If biometric lock is enabled, require authentication on cold start
        if (bioSupported && bioEnabled) {
          setIsBiometricLocked(true);
          const unlocked = await biometrics.authenticate("Unlock Vaultz");
          if (unlocked) {
            setIsBiometricLocked(false);
          }
        }

        // Verify token and refresh profile against server
        try {
          const freshUser = await authApi.getCurrentUser();
          if (!freshUser) {
            // Expired/invalid session (204 from /api/v1/auth/me)
            await secureStore.removeToken();
            setToken(null);
            setUser(null);
            setIsBiometricLocked(false);
          } else {
            setUser(freshUser);
            await secureStore.saveUserProfile(JSON.stringify(freshUser));
          }
        } catch (err) {
          // Only keep offline cached session on genuine network errors
          const isOfflineNetwork = err instanceof ApiError && err.status === 0;
          if (!isOfflineNetwork) {
            await secureStore.removeToken();
            setToken(null);
            setUser(null);
            setIsBiometricLocked(false);
          }
        }
      }
    } catch {
      // Ignore bootstrap errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void bootstrapAsync();
  }, [bootstrapAsync]);

  // Handle automatic logout on 401
  useEffect(() => {
    setOnUnauthorizedCallback(() => {
      setToken(null);
      setUser(null);
      setIsBiometricLocked(false);
    });
  }, []);

  // Lock when returning from background if biometrics is enabled
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "background" && isBiometricEnabled && isBiometricSupported && token) {
        setIsBiometricLocked(true);
      }
    });
    return () => subscription.remove();
  }, [isBiometricEnabled, isBiometricSupported, token]);

  const unlockWithBiometrics = async (): Promise<boolean> => {
    const success = await biometrics.authenticate("Unlock Vaultz");
    if (success) {
      setIsBiometricLocked(false);
      return true;
    }
    return false;
  };

  const login = async (email: string, pass: string): Promise<LoginOutcome> => {
    const res = await authApi.login(email, pass);
    if (res.requiresTwoFactor && res.twoFactorToken) {
      return {
        requiresTwoFactor: true,
        twoFactorType: res.twoFactorType,
        twoFactorToken: res.twoFactorToken,
      };
    }

    await applyAuthResult(res);
    return { requiresTwoFactor: false };
  };

  const verifyTwoFactor = async (
    email: string,
    code: string,
    twoFactorToken: string,
    isRecoveryCode = false
  ): Promise<void> => {
    const res = await authApi.verifyTwoFactor(email, code, twoFactorToken, isRecoveryCode);
    await applyAuthResult(res);
  };

  const register = async (
    emailOrName: string,
    passOrEmail: string,
    nameOrPass?: string,
    curr = "USD"
  ): Promise<void> => {
    let email = emailOrName;
    let pass = passOrEmail;
    let name = nameOrPass || emailOrName.split("@")[0];

    if (emailOrName.includes("@")) {
      email = emailOrName;
      pass = passOrEmail;
      name = nameOrPass || email.split("@")[0];
    } else {
      name = emailOrName;
      email = passOrEmail;
      pass = nameOrPass || "";
    }

    const res = await authApi.register(name, email, pass, curr);
    await applyAuthResult(res);
  };

  const setBiometricEnabled = async (enabled: boolean): Promise<boolean> => {
    if (enabled) {
      const available = await biometrics.isAvailable();
      if (!available) return false;
      const authenticated = await biometrics.authenticate("Confirm biometrics to enable");
      if (authenticated) {
        await secureStore.setBiometricEnabled(true);
        setIsBiometricEnabled(true);
        return true;
      }
      return false;
    } else {
      await secureStore.setBiometricEnabled(false);
      setIsBiometricEnabled(false);
      setIsBiometricLocked(false);
      return true;
    }
  };

  const logout = async (): Promise<void> => {
    await authApi.logout();
    await secureStore.clearAll();
    await Promise.all([
      secureStore.deleteItemAsync(CACHED_ACCOUNTS_KEY),
      secureStore.deleteItemAsync(ACTIVE_ACCOUNT_KEY),
      secureStore.deleteItemAsync(OFFLINE_QUEUE_KEY),
    ]);
    setToken(null);
    setUser(null);
    setIsBiometricLocked(false);
  };

  const toggleBiometrics = async (enabled: boolean): Promise<void> => {
    if (enabled) {
      const authenticated = await biometrics.authenticate("Confirm biometrics to enable");
      if (authenticated) {
        await secureStore.setBiometricEnabled(true);
        setIsBiometricEnabled(true);
      }
    } else {
      await secureStore.setBiometricEnabled(false);
      setIsBiometricEnabled(false);
      setIsBiometricLocked(false);
    }
  };

  const toggleHideBalance = async (): Promise<void> => {
    const next = !isHideBalance;
    setIsHideBalance(next);
    await secureStore.setHideBalanceEnabled(next);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isLoading,
        isBiometricLocked,
        isBiometricSupported,
        isBiometricEnabled,
        isHideBalance,
        login,
        verifyTwoFactor,
        register,
        logout,
        unlockWithBiometrics,
        toggleBiometrics,
        setBiometricEnabled,
        toggleHideBalance,
        applyAuthResult,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
