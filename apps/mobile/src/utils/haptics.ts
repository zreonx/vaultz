import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export const hapticFeedback = {
  light(): void {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  },

  medium(): void {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  },

  success(): void {
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  },

  warning(): void {
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  },

  error(): void {
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  },

  selection(): void {
    if (Platform.OS !== "web") {
      void Haptics.selectionAsync();
    }
  },
};

export const haptics = hapticFeedback;
