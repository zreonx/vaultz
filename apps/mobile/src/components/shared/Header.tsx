import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useAuth } from '@/context/AuthContext';
import { AccountPickerModal } from './AccountPickerModal';
import { CreateAccountModal } from './CreateAccountModal';
import { colors } from '@/theme/colors';
import { typography, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

interface HeaderProps {
  title?: string;
  showAccountPicker?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showAccountPicker = true,
}) => {
  const { activeWorkspace, hideBalance, toggleHideBalance } = useWorkspace();
  const { user } = useAuth();
  const [accountPickerVisible, setAccountPickerVisible] = useState(false);
  const [createAccountVisible, setCreateAccountVisible] = useState(false);

  const handleToggleHide = () => {
    haptics.light();
    toggleHideBalance();
  };

  const getInitials = (email?: string, name?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'VZ';
  };

  return (
    <>
      <View style={styles.header}>
        {/* Left Side: App Brand / Title */}
        <View style={styles.leftContainer}>
          <Text style={styles.brandTitle}>VAULTZ</Text>
          {showAccountPicker && (
            <TouchableOpacity
              style={styles.workspacePill}
              onPress={() => {
                haptics.light();
                setAccountPickerVisible(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.statusDot} />
              <Text style={styles.workspaceName} numberOfLines={1}>
                {activeWorkspace?.name || 'Select Account'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          {title && !showAccountPicker && (
            <Text style={styles.screenTitle}>{title}</Text>
          )}
        </View>

        {/* Right Side: Privacy eye + Avatar */}
        <View style={styles.rightContainer}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleToggleHide}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={hideBalance ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={hideBalance ? colors.accent : colors.textSecondary}
            />
          </TouchableOpacity>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user?.email, user?.fullName)}</Text>
          </View>
        </View>
      </View>

      <AccountPickerModal
        visible={accountPickerVisible}
        onClose={() => setAccountPickerVisible(false)}
        onOpenCreateAccount={() => setCreateAccountVisible(true)}
      />

      <CreateAccountModal
        visible={createAccountVisible}
        onClose={() => setCreateAccountVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  brandTitle: {
    ...typography.label,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: colors.accent,
    marginRight: spacing.sm,
  },
  workspacePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHover,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 160,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginRight: 6,
  },
  workspaceName: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
    marginRight: 4,
    maxWidth: 110,
  },
  screenTitle: {
    ...typography.title,
    color: colors.textPrimary,
    marginLeft: spacing.xs,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    padding: spacing.xs,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
    fontSize: 11,
  },
});
