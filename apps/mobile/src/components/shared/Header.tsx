import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useOfflineSync } from '@/context/OfflineSyncContext';
import { useAuth } from '@/context/AuthContext';
import { useTutorial } from '@/context/TutorialContext';
import { useTheme } from '@/context/ThemeContext';
import { AccountPickerModal } from './AccountPickerModal';
import { CreateAccountModal } from './CreateAccountModal';
import { PressableScale } from '@/components/ui/PressableScale';
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
  const { pendingCount, isSyncing, syncQueue } = useOfflineSync();
  const { user } = useAuth();
  const { registerTargetRect } = useTutorial();
  const { colors, isDark } = useTheme();
  const [accountPickerVisible, setAccountPickerVisible] = useState(false);
  const [createAccountVisible, setCreateAccountVisible] = useState(false);
  const pillRef = React.useRef<any>(null);

  // Status dot breathing pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const handlePillLayout = () => {
    pillRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
      if (width > 0 && height > 0) {
        registerTargetRect('workspace_pill', { x, y, width, height });
      }
    });
  };

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
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        {/* Left Side: App Brand / Title */}
        <View style={styles.leftContainer}>
          <Text style={[styles.brandTitle, { color: colors.accent }]}>VAULTZ</Text>
          {showAccountPicker && (
            <View ref={pillRef} onLayout={handlePillLayout}>
              <PressableScale
                style={[
                  styles.workspacePill,
                  {
                    backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => {
                  haptics.light();
                  setAccountPickerVisible(true);
                }}
              >
                <Animated.View
                  style={[
                    styles.statusDot,
                    { backgroundColor: colors.accent, opacity: pulseAnim },
                  ]}
                />
                <Text
                  style={[styles.workspaceName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {activeWorkspace?.name || 'Select Account'}
                </Text>
                <Ionicons name="chevron-down" size={13} color={colors.textSecondary} />
              </PressableScale>
            </View>
          )}
          {title && !showAccountPicker && (
            <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
              {title}
            </Text>
          )}
        </View>

        {/* Right Side: Sync pill + Privacy eye + Avatar */}
        <View style={styles.rightContainer}>
          {pendingCount > 0 && (
            <TouchableOpacity
              style={[
                styles.headerSyncPill,
                {
                  backgroundColor: isDark ? 'rgba(217, 119, 6, 0.15)' : 'rgba(245, 158, 11, 0.12)',
                  borderColor: colors.warning,
                },
              ]}
              onPress={() => syncQueue()}
              disabled={isSyncing}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isSyncing ? 'sync' : 'cloud-upload-outline'}
                size={13}
                color={colors.warning}
              />
              <Text style={[styles.headerSyncText, { color: colors.warning }]}>
                {pendingCount}
              </Text>
            </TouchableOpacity>
          )}

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

          <View
            style={[
              styles.avatar,
              {
                backgroundColor: isDark ? colors.surfaceSubtle : colors.surfaceMuted,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.avatarText, { color: colors.textPrimary }]}>
              {getInitials(user?.email, user?.fullName)}
            </Text>
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
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
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
    marginRight: spacing.sm,
  },
  workspacePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    maxWidth: 190,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  workspaceName: {
    ...typography.caption,
    fontWeight: '600',
    marginRight: 4,
    maxWidth: 130,
    fontSize: 12,
  },
  screenTitle: {
    ...typography.title,
    fontSize: 19,
    fontWeight: '700',
    marginLeft: 2,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerSyncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  headerSyncText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  iconButton: {
    padding: spacing.xs,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
});
