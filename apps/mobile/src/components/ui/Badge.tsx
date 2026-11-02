import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { typography, radius, spacing } from '@/theme/tokens';

export type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'outline';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  style,
  textStyle,
}) => {
  const { colors, isDark } = useTheme();

  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'success':
        return {
          container: {
            backgroundColor: colors.accentMuted,
            borderColor: colors.accent,
            borderWidth: 0,
          },
          text: { color: colors.accent },
        };
      case 'danger':
        return {
          container: {
            backgroundColor: colors.dangerSoft,
            borderWidth: 0,
          },
          text: { color: colors.danger },
        };
      case 'warning':
        return {
          container: {
            backgroundColor: colors.warningSoft,
            borderWidth: 0,
          },
          text: { color: colors.warning },
        };
      case 'info':
        return {
          container: {
            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(37, 99, 235, 0.1)',
            borderWidth: 0,
          },
          text: { color: isDark ? '#60A5FA' : '#2563EB' },
        };
      case 'outline':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: colors.border,
          },
          text: { color: colors.textSecondary },
        };
      default:
        return {
          container: {
            backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
            borderWidth: 0,
          },
          text: { color: colors.textSecondary },
        };
    }
  };

  const { container: variantContainer, text: variantText } = getVariantStyles();

  return (
    <View style={[styles.badge, variantContainer, style]}>
      <Text style={[styles.text, variantText, textStyle]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
