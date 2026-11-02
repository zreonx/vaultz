export interface ThemeColors {
  background: string;
  surface: string;
  surfaceSubtle: string;
  surfaceMuted: string;
  surfaceHover: string;
  border: string;
  borderSubtle: string;
  borderLight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  accent: string;
  accentSoft: string;
  accentMuted: string;
  accentForeground: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  white: string;
  black: string;
}

export const lightColors: ThemeColors = {
  // Soft, warm minimalist light palette — easy on the eyes (matches web theme)
  background: "#F6F5F2",
  surface: "#FDFCFB",
  surfaceSubtle: "#F5F3ED",
  surfaceMuted: "#F0EEE9",
  surfaceHover: "#EAE7DF",

  border: "#E6E4DD",
  borderSubtle: "#EDECE6",
  borderLight: "#D9D6CC",

  textPrimary: "#1C1B18",
  textSecondary: "#6E6A63",
  textMuted: "#8E8A82",
  textDisabled: "#A8A59E",

  accent: "#2A6B58", // Refined forest/emerald
  accentSoft: "rgba(42, 107, 88, 0.12)",
  accentMuted: "rgba(42, 107, 88, 0.12)",
  accentForeground: "#FDFCFB",

  danger: "#B43C3C",
  dangerSoft: "rgba(180, 60, 60, 0.12)",

  warning: "#B4690E",
  warningSoft: "rgba(180, 105, 14, 0.12)",

  white: "#FFFFFF",
  black: "#000000",
};

export const darkColors: ThemeColors = {
  // Deep dark graphite & radiant emerald palette (matches web theme)
  background: "#121417",
  surface: "#181B1F",
  surfaceSubtle: "#1F2328",
  surfaceMuted: "#272B31",
  surfaceHover: "#272B31",

  border: "#272B31",
  borderSubtle: "#202429",
  borderLight: "#333942",

  textPrimary: "#ECEBE6",
  textSecondary: "#96938C",
  textMuted: "#6E6A63",
  textDisabled: "#4E545E",

  accent: "#479980", // Calm radiant emerald
  accentSoft: "rgba(71, 153, 128, 0.18)",
  accentMuted: "rgba(71, 153, 128, 0.18)",
  accentForeground: "#101413",

  danger: "#E06C6C",
  dangerSoft: "rgba(224, 108, 108, 0.18)",

  warning: "#D99B43",
  warningSoft: "rgba(217, 155, 67, 0.18)",

  white: "#FFFFFF",
  black: "#000000",
};

// Default fallback export
export const colors: ThemeColors = darkColors;
export type Colors = ThemeColors;
