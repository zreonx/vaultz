import React from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "@/theme/colors";
import { radii, spacing } from "@/theme/tokens";

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

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: getBackgroundColor(),
            borderColor: getBorderColor(),
            opacity: pressed ? 0.9 : 1,
          },
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.base,
  },
});
