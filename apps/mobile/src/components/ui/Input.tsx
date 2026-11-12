import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { typography, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import {
  CURRENCY_METADATA,
  type SupportedCurrencyCode,
} from '@/utils/currency';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  currencyCode?: string;
  currencySymbol?: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  isPassword?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  currencyCode,
  currencySymbol,
  rightIcon,
  onRightIconPress,
  isPassword = false,
  style,
  ...props
}) => {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!isPassword);

  const handlePasswordToggle = () => {
    haptics.light();
    setShowPassword((prev) => !prev);
  };

  const renderLeading = () => {
    if (currencyCode) {
      const upper = currencyCode.toUpperCase();
      const iconColor = error
        ? colors.danger
        : isFocused
        ? colors.accent
        : colors.textSecondary;

      if (upper === 'USD') {
        return (
          <Ionicons
            name="logo-usd"
            size={18}
            color={iconColor}
            style={[styles.leftIcon, props.multiline && styles.leftIconMultiline]}
          />
        );
      }
      if (upper === 'EUR') {
        return (
          <Ionicons
            name="logo-euro"
            size={18}
            color={iconColor}
            style={[styles.leftIcon, props.multiline && styles.leftIconMultiline]}
          />
        );
      }
      if (upper === 'JPY') {
        return (
          <Ionicons
            name="logo-yen"
            size={18}
            color={iconColor}
            style={[styles.leftIcon, props.multiline && styles.leftIconMultiline]}
          />
        );
      }

      const symbol =
        currencySymbol ||
        CURRENCY_METADATA[upper as SupportedCurrencyCode]?.symbol ||
        upper;

      return (
        <View
          style={[
            styles.currencyBadge,
            props.multiline && styles.currencyBadgeMultiline,
          ]}
        >
          <Text
            style={[
              styles.currencyBadgeText,
              { color: iconColor },
              symbol.length > 2 && styles.currencyBadgeTextSmall,
            ]}
            numberOfLines={1}
          >
            {symbol}
          </Text>
        </View>
      );
    }

    if (leftIcon) {
      return (
        <Ionicons
          name={leftIcon}
          size={18}
          color={
            error ? colors.danger : isFocused ? colors.accent : colors.textMuted
          }
          style={[styles.leftIcon, props.multiline && styles.leftIconMultiline]}
        />
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputContainer,
          props.multiline && styles.inputContainerMultiline,
          {
            backgroundColor: isFocused ? colors.surfaceSubtle : colors.surface,
            borderColor: error
              ? colors.danger
              : isFocused
              ? colors.accent
              : colors.borderSubtle,
            borderWidth: isFocused ? 1 : StyleSheet.hairlineWidth,
          },
        ]}
      >
        {renderLeading()}

        <TextInput
          style={[
            styles.input,
            props.multiline && styles.inputMultiline,
            { color: colors.textPrimary },
            style,
          ]}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          selectionColor={colors.accent}
          textAlignVertical={props.multiline ? 'top' : 'center'}
          {...props}
        />

        {isPassword ? (
          <TouchableOpacity
            style={styles.rightIconButton}
            onPress={handlePasswordToggle}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        ) : rightIcon ? (
          <TouchableOpacity
            style={styles.rightIconButton}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name={rightIcon} size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <Text style={[styles.errorText, { color: colors.danger }]}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.hintText, { color: colors.textMuted }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  inputContainerMultiline: {
    alignItems: 'flex-start',
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    minHeight: 88,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  leftIconMultiline: {
    marginTop: 2,
  },
  currencyBadge: {
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  currencyBadgeMultiline: {
    marginTop: 2,
  },
  currencyBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
  currencyBadgeTextSmall: {
    fontSize: 12,
    fontWeight: '700',
  },
  rightIconButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  input: {
    flex: 1,
    ...typography.body,
    paddingVertical: spacing.sm,
  },
  inputMultiline: {
    minHeight: 64,
    paddingVertical: 0,
  },
  errorText: {
    ...typography.caption,
    marginTop: 4,
  },
  hintText: {
    ...typography.caption,
    marginTop: 4,
  },
});
