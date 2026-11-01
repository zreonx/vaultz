import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/theme/colors";

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  disableKeyboardAvoid?: boolean;
}

export function ScreenWrapper({
  children,
  style,
  disableKeyboardAvoid = false,
}: ScreenWrapperProps) {
  const content = (
    <SafeAreaView style={[styles.container, style]}>
      <StatusBar style="light" />
      {children}
    </SafeAreaView>
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
