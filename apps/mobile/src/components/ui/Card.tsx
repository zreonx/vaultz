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
  borderless?: boolean;
}

export function Card({
  children,
  style,
  onPress,
  variant = "surface",
  borderless = false,
}: CardProps) {
  const { colors, isDark } = useTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case "active":
      case "subtle":
        return colors.surfaceSubtle;
      case "surface":
      default:
        return colors.surface;
    }
  };

  const getBorderColor = () => {
    if (variant === "active") return colors.accent;
    return colors.borderSubtle;
  };

  const cardStyle: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    borderColor: getBorderColor(),
    borderWidth: borderless ? 0 : isDark ? StyleSheet.hairlineWidth : 1,
    borderRadius: radii.lg,
    padding: spacing.base,
    // On dark mode: zero elevation to prevent Android alpha-white surface wash
    // In light mode: minimal soft shadow for crisp tactile boundary
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0 : 0.03,
    shadowRadius: 3,
    elevation: isDark ? 0 : 1,
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
