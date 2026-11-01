import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from '@/theme/colors';
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
  const getBadgeStyle = () => {
    switch (variant) {
      case 'success':
        return styles.badgeSuccess;
      case 'danger':
        return styles.badgeDanger;
      case 'warning':
        return styles.badgeWarning;
      case 'info':
        return styles.badgeInfo;
      case 'outline':
        return styles.badgeOutline;
      default:
        return styles.badgeDefault;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'success':
        return styles.textSuccess;
      case 'danger':
        return styles.textDanger;
      case 'warning':
        return styles.textWarning;
      case 'info':
        return styles.textInfo;
      case 'outline':
        return styles.textOutline;
      default:
        return styles.textDefault;
    }
  };

  return (
    <View style={[styles.badge, getBadgeStyle(), style]}>
      <Text style={[styles.text, getTextStyle(), textStyle]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
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
  badgeDefault: {
    backgroundColor: colors.surfaceHover,
  },
  textDefault: {
    color: colors.textSecondary,
  },
  badgeSuccess: {
    backgroundColor: colors.accentMuted,
  },
  textSuccess: {
    color: colors.accent,
  },
  badgeDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  textDanger: {
    color: colors.danger,
  },
  badgeWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  textWarning: {
    color: colors.warning,
  },
  badgeInfo: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  textInfo: {
    color: '#60A5FA',
  },
  badgeOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  textOutline: {
    color: colors.textSecondary,
  },
});
