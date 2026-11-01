export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const radius = radii;

export const typography = {
  display: {
    fontSize: 32,
    fontWeight: "700" as const,
    lineHeight: 38,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700" as const,
    lineHeight: 28,
  },
  title: {
    fontSize: 18,
    fontWeight: "600" as const,
    lineHeight: 24,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: "500" as const,
    lineHeight: 22,
  },
  body: {
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600" as const,
    lineHeight: 18,
  },
  caption: {
    fontSize: 11,
    fontWeight: "400" as const,
    lineHeight: 16,
  },
} as const;
