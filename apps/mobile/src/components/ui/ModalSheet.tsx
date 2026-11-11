import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
  maxHeightRatio?: number;
}

export const ModalSheet: React.FC<ModalSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  maxHeightRatio = 0.85,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const handleClose = () => {
    haptics.light();
    onClose();
  };

  const bottomInset = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? 20 : 16
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View
          style={[
            styles.backdrop,
            { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.65)' : 'rgba(0, 0, 0, 0.4)' },
          ]}
        >
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                  maxHeight: `${Math.round(maxHeightRatio * 100)}%`,
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

              {/* Header */}
              {(title || subtitle) && (
                <View
                  style={[
                    styles.header,
                    { borderBottomColor: colors.borderSubtle },
                  ]}
                >
                  <View style={styles.headerTextContainer}>
                    {title && (
                      <Text style={[styles.title, { color: colors.textPrimary }]}>
                        {title}
                      </Text>
                    )}
                    {subtitle && (
                      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                        {subtitle}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={handleClose}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Content */}
              <ScrollView
                style={styles.content}
                contentContainerStyle={[
                  styles.scrollContent,
                  { paddingBottom: spacing.lg + bottomInset },
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {children}
              </ScrollView>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    width: '100%',
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
  },
  title: {
    ...typography.title,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  closeButton: {
    padding: spacing.xs,
    marginLeft: spacing.md,
  },
  content: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: spacing.base,
  },
});
