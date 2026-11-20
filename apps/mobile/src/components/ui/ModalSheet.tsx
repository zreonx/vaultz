import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { typography, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxHeightRatio?: number;
}

export const ModalSheet: React.FC<ModalSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxHeightRatio = 0.88,
}) => {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { colors, isDark } = useTheme();

  const handleClose = () => {
    haptics.light();
    onClose();
  };

  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? 24 : 12
  );

  // Safe clearance above system navigation bar (Android 3-button nav or iOS home indicator)
  // Ensure the footer action buttons have generous breathing room so they never touch
  // or overlap the navigation bar or bottom screen edge.
  const footerBottomPadding = Math.max(
    insets.bottom + (Platform.OS === 'android' ? 18 : 14),
    Platform.OS === 'android' ? 38 : 30
  );

  const bottomInset = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? 20 : 16
  );

  const sheetMaxHeight = Math.min(
    Math.round(windowHeight * maxHeightRatio),
    Math.round(windowHeight - topInset - 12)
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View
          style={[
            styles.backdrop,
            {
              backgroundColor: isDark
                ? 'rgba(0, 0, 0, 0.65)'
                : 'rgba(0, 0, 0, 0.4)',
            },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleClose}
            accessibilityLabel="Close modal"
          />
          <View
            style={[
              styles.sheetContainer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
                maxHeight: sheetMaxHeight,
              },
            ]}
          >
            {/* Top Handle Bar */}
            <View style={styles.handleContainer}>
              <View
                style={[
                  styles.handle,
                  { backgroundColor: isDark ? colors.borderLight : colors.border },
                ]}
              />
            </View>

            {/* Header (pinned) */}
            {(title || subtitle) && (
              <View
                style={[
                  styles.header,
                  { borderBottomColor: colors.borderSubtle },
                ]}
              >
                <View style={styles.headerTextContainer}>
                  {title && (
                    <Text
                      style={[styles.title, { color: colors.textPrimary }]}
                      numberOfLines={2}
                    >
                      {title}
                    </Text>
                  )}
                  {subtitle && (
                    <Text
                      style={[styles.subtitle, { color: colors.textMuted }]}
                      numberOfLines={2}
                    >
                      {subtitle}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel="Close dialog"
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            {/* Scrollable Body */}
            <ScrollView
              style={styles.content}
              contentContainerStyle={[
                styles.scrollContent,
                {
                  paddingBottom: footer ? spacing.lg : spacing.xl + bottomInset,
                },
              ]}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              bounces={false}
              showsVerticalScrollIndicator
            >
              {children}
            </ScrollView>

            {/* Optional Pinned Footer */}
            {footer ? (
              <View
                style={[
                  styles.footer,
                  {
                    borderTopColor: colors.borderSubtle,
                    backgroundColor: colors.surface,
                    paddingBottom: footerBottomPadding,
                  },
                ]}
              >
                {footer}
              </View>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    width: '100%',
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  title: {
    ...typography.title,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexShrink: 1,
  },
  scrollContent: {
    padding: spacing.base,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
  },
});
