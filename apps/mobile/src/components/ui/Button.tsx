import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { radii, spacing, typography } from "@/theme/tokens";
import { PressableScale } from "./PressableScale";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  leftIcon?: keyof typeof Ionicons.glyphMap;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled = false,
  style,
  textStyle,
  icon,
  leftIcon,
}: ButtonProps) {
  const { colors } = useTheme();

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case "secondary":
        return {
          backgroundColor: colors.surfaceSubtle,
          borderColor: colors.border,
          borderWidth: 1,
        };
      case "danger":
        return {
          backgroundColor: colors.danger,
        };
      case "ghost":
        return {
          backgroundColor: "transparent",
        };
      case "primary":
      default:
        return {
          backgroundColor: colors.accent,
        };
    }
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case "sm":
        return {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          minHeight: 36,
        };
      case "lg":
        return {
          paddingVertical: spacing.base,
          paddingHorizontal: spacing.xl,
          minHeight: 52,
        };
      case "md":
      default:
        return {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.base,
          minHeight: 46,
        };
    }
  };

  const getTextColor = (): string => {
    if (disabled) return colors.textMuted;
    switch (variant) {
      case "secondary":
      case "ghost":
        return colors.textPrimary;
      case "danger":
        return colors.white;
      case "primary":
      default:
        return colors.accentForeground;
    }
  };

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || isLoading}
      style={[
        styles.base,
        getSizeStyle(),
        getVariantStyle(),
        disabled && styles.disabled,
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? colors.accentForeground : colors.accent}
        />
      ) : (
        <>
          {leftIcon && (
            <Ionicons
              name={leftIcon}
              size={18}
              color={getTextColor()}
              style={{ marginRight: spacing.xs + 2 }}
            />
          )}
          {icon}
          <Text
            style={[
              typography.label,
              { color: getTextColor(), marginLeft: icon ? spacing.sm : 0 },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.5,
  },
});
