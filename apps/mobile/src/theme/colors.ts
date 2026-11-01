export const colors = {
  // Dark theme default (premium minimalist fintech palette)
  background: "#0B0F17",
  surface: "#121824",
  surfaceSubtle: "#182030",
  surfaceMuted: "#1E293B",
  surfaceHover: "#182030",

  border: "#1E293B",
  borderSubtle: "#16202E",
  borderLight: "#2A374A",

  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  textDisabled: "#475569",

  accent: "#10B981", // Emerald accent (matching Vaultz brand)
  accentSoft: "rgba(16, 185, 129, 0.15)",
  accentMuted: "rgba(16, 185, 129, 0.15)",
  accentForeground: "#064E3B",

  danger: "#EF4444",
  dangerSoft: "rgba(239, 68, 68, 0.15)",

  warning: "#F59E0B",
  warningSoft: "rgba(245, 158, 11, 0.15)",

  white: "#FFFFFF",
  black: "#000000",
} as const;

export type Colors = typeof colors;
