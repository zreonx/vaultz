import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import { authApi } from "@/api/auth";
import { setOnUnauthorizedCallback } from "@/api/client";
import { biometrics } from "@/security/biometrics";
import { secureStore } from "@/security/secureStore";
import { UserResponse } from "@/types/api";

interface AuthContextValue {
  user: UserResponse | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBiometricLocked: boolean;
  isBiometricSupported: boolean;
  isBiometricEnabled: boolean;
  isHideBalance: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (emailOrName: string, passOrEmail: string, nameOrPass?: string, curr?: string) => Promise<void>;
  logout: () => Promise<void>;
  unlockWithBiometrics: () => Promise<boolean>;
  toggleBiometrics: (enabled: boolean) => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<boolean>;
  toggleHideBalance: () => Promise<void>;
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

        // Fetch fresh user profile
        try {
          const freshUser = await authApi.getCurrentUser();
          setUser(freshUser);
          await secureStore.saveUserProfile(JSON.stringify(freshUser));
        } catch {
          // If offline, user profile from secureStore is already loaded
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

  const login = async (email: string, pass: string): Promise<void> => {
    const res = await authApi.login(email, pass);
    await secureStore.saveToken(res.token);
    await secureStore.saveUserProfile(JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    setIsBiometricLocked(false);
  };

  const register = async (
    emailOrName: string,
    passOrEmail: string,
    nameOrPass?: string,
    curr = "USD"
  ): Promise<void> => {
    // If 3rd arg is provided and looks like name/pass, discern order
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
    await secureStore.saveToken(res.token);
    await secureStore.saveUserProfile(JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    setIsBiometricLocked(false);
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
        register,
        logout,
        unlockWithBiometrics,
        toggleBiometrics,
        setBiometricEnabled,
        toggleHideBalance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
