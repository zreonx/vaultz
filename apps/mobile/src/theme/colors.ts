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
  accentSoft: "#EAF2EF", // Solid calibrated soft tone (matches web --accent-soft)
  accentMuted: "#EAF2EF",
  accentForeground: "#FDFCFB",

  danger: "#B43C3C",
  dangerSoft: "#FBECEC", // Solid calibrated soft tone (matches web --danger-soft)

  warning: "#B4690E",
  warningSoft: "#FBF3E6", // Solid calibrated soft tone (matches web --warning-soft)

  white: "#FFFFFF",
  black: "#000000",
};

export const darkColors: ThemeColors = {
  // Deep dark graphite & radiant emerald palette (matches web theme)
  background: "#121417",
  surface: "#181B1F",
  surfaceSubtle: "#1B1F24",
  surfaceMuted: "#1F2328", // Distinct muted surface (matches web --surface-muted)
  surfaceHover: "#272B31",

  border: "#272B31",
  borderSubtle: "#202429", // Delicate hairline divider (matches web --border-subtle)
  borderLight: "#333942",

  textPrimary: "#ECEBE6",
  textSecondary: "#96938C",
  textMuted: "#6E6A63",
  textDisabled: "#4E545E",

  accent: "#479980", // Calm radiant emerald
  accentSoft: "#192924", // Solid calibrated soft tone (matches web --accent-soft)
  accentMuted: "#192924",
  accentForeground: "#101413",

  danger: "#E06C6C",
  dangerSoft: "#2B1919", // Solid calibrated soft tone (matches web --danger-soft)

  warning: "#D99B43",
  warningSoft: "#292116", // Solid calibrated soft tone (matches web --warning-soft)

  white: "#FFFFFF",
  black: "#000000",
};

// Default fallback export
export const colors: ThemeColors = darkColors;
export type Colors = ThemeColors;
