import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import { useColorScheme } from "react-native";
import { secureStore } from "@/security/secureStore";
import { darkColors, lightColors, ThemeColors } from "@/theme/colors";
import { haptics } from "@/utils/haptics";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

const STORAGE_KEY = "vaultz_mobile_theme";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");

  // Load saved theme from secure storage on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const saved = await secureStore.getItemAsync(STORAGE_KEY);
        if (
          isMounted &&
          saved &&
          (saved === "light" || saved === "dark" || saved === "system")
        ) {
          setThemeModeState(saved as ThemeMode);
        }
      } catch {
        // Ignore storage errors
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    haptics.selection();
    setThemeModeState(mode);
    try {
      await secureStore.setItemAsync(STORAGE_KEY, mode);
    } catch {
      // Ignore
    }
  }, []);

  const isDark = useMemo(() => {
    if (themeMode === "dark") return true;
    if (themeMode === "light") return false;
    return systemScheme === "dark";
  }, [themeMode, systemScheme]);

  const activeColors = useMemo(() => {
    return isDark ? darkColors : lightColors;
  }, [isDark]);

  const value = useMemo(
    () => ({
      themeMode,
      isDark,
      colors: activeColors,
      setThemeMode,
    }),
    [themeMode, isDark, activeColors, setThemeMode]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
