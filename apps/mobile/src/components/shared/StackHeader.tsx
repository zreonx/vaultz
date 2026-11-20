import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@/context/ThemeContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { radius, spacing, typography } from "@/theme/tokens";
import { haptics } from "@/utils/haptics";

interface StackHeaderProps {
  title: string;
  subtitle?: string;
  showPrivacyToggle?: boolean;
  rightAction?: React.ReactNode;
  onBack?: () => void;
}

export const StackHeader: React.FC<StackHeaderProps> = ({
  title,
  subtitle,
  showPrivacyToggle = true,
  rightAction,
  onBack,
}) => {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const { hideBalance, toggleHideBalance } = useWorkspace();

  const handleBack = () => {
    haptics.light();
    if (onBack) {
      onBack();
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View
      style={[
        styles.topBar,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.borderSubtle,
        },
      ]}
    >
      <TouchableOpacity
        onPress={handleBack}
        accessibilityLabel="Go back"
        style={[
          styles.backBtn,
          {
            backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
            borderColor: colors.borderSubtle,
          },
        ]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <View style={styles.titleBlock}>
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.screenSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightAction ? (
        <View style={styles.rightWrap}>{rightAction}</View>
      ) : showPrivacyToggle ? (
        <TouchableOpacity
          onPress={() => {
            haptics.light();
            toggleHideBalance();
          }}
          accessibilityLabel={hideBalance ? "Show balances" : "Hide balances"}
          style={styles.rightBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={hideBalance ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={hideBalance ? colors.accent : colors.textSecondary}
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.rightSpacer} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  screenTitle: {
    ...typography.title,
    fontSize: 18,
    fontWeight: "700",
  },
  screenSubtitle: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 1,
  },
  rightWrap: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  rightBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  rightSpacer: {
    width: 44,
    height: 44,
  },
});
