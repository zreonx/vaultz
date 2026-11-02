import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing } from "@/theme/tokens";
import { PressableScale } from "./PressableScale";

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  variant?: "surface" | "subtle" | "active";
}

export function Card({
  children,
  style,
  onPress,
  variant = "surface",
}: CardProps) {
  const { colors, isDark } = useTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case "active":
        return colors.surfaceSubtle;
      case "subtle":
        return colors.surfaceSubtle;
      case "surface":
      default:
        return colors.surface;
    }
  };

  const getBorderColor = () => {
    if (variant === "active") return colors.accent;
    return colors.border;
  };

  const cardStyle: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    borderColor: getBorderColor(),
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.base,
    // Subtle elevation shadow in light mode for crisp depth
    shadowColor: isDark ? "#000000" : "#1C1B18",
    shadowOffset: { width: 0, height: isDark ? 2 : 1 },
    shadowOpacity: isDark ? 0.35 : 0.05,
    shadowRadius: isDark ? 8 : 4,
    elevation: isDark ? 2 : 1,
  };

  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={[cardStyle, style]}>
        {children}
      </PressableScale>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
}
