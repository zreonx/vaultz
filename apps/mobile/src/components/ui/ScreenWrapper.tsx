import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StatusBar as RNStatusBar,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/context/ThemeContext";
import { colors } from "@/theme/colors";

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  disableKeyboardAvoid?: boolean;
  includeBottomInset?: boolean;
  includeTopInset?: boolean;
}

export function ScreenWrapper({
  children,
  style,
  disableKeyboardAvoid = false,
  includeBottomInset = false,
  includeTopInset = true,
}: ScreenWrapperProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  // Top inset: guarantee safe clearance below notch / Dynamic Island / Android status bar
  const topInset = includeTopInset
    ? Math.max(
        insets.top,
        Platform.OS === "android" ? (RNStatusBar.currentHeight || 24) : 0
      )
    : 0;

  // Bottom inset: guarantee safe clearance above Android 3-button nav or iOS home bar
  const bottomInset = includeBottomInset
    ? Math.max(insets.bottom, Platform.OS === "android" ? 16 : 0)
    : 0;

  const content = (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: topInset,
          paddingBottom: bottomInset,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
        style,
      ]}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      {children}
    </View>
  );

  if (disableKeyboardAvoid) {
    return content;
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {content}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
