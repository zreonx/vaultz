import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTutorial } from '@/context/TutorialContext';
import { Button } from '@/components/ui/Button';
import { colors } from '@/theme/colors';
import { typography, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

interface TutorialBannerProps {
  onOpenCreateAccount?: () => void;
  onOpenCreateTransaction?: () => void;
}

export const TutorialBanner: React.FC<TutorialBannerProps> = ({
  onOpenCreateAccount,
  onOpenCreateTransaction,
}) => {
  const { currentStep, stepNumber, totalSteps, advanceToStep, completeTutorial, skipTutorial } =
    useTutorial();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
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
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  if (!currentStep) return null;

  const getContent = () => {
    switch (currentStep) {
      case 'create_account':
        return {
          badge: `STEP 1 OF ${totalSteps}: FINANCIAL CONTAINER`,
          title: 'Create Your First Account',
          desc: 'Vaultz keeps every account in strict personal isolation. Let\'s start by creating an account container (e.g. Checking, Cash, or Savings).',
          buttonTitle: 'Create Account Now',
          icon: 'wallet-outline' as const,
          action: () => {
            haptics.light();
            onOpenCreateAccount?.();
          },
        };
      case 'workspace_intro':
        return {
          badge: `STEP 2 OF ${totalSteps}: WORKSPACE SCOPING`,
          title: 'Account Isolation Active',
          desc: 'Notice the account pill in the top header. In Vaultz, all balances, cash flow metrics, and transactions are strictly scoped to this container.',
          buttonTitle: 'Next: Record Transaction',
          icon: 'shield-checkmark-outline' as const,
          action: () => {
            haptics.light();
            advanceToStep('record_transaction');
          },
        };
      case 'record_transaction':
        return {
          badge: `STEP 3 OF ${totalSteps}: LOG ACTIVITY`,
          title: 'Record Your First Transaction',
          desc: 'Tap "Expense" or "Income" below to post a real financial transaction. Vaultz will immediately calculate your scoped net balance.',
          buttonTitle: 'Log Transaction',
          icon: 'receipt-outline' as const,
          action: () => {
            haptics.light();
            onOpenCreateTransaction?.();
          },
        };
      case 'completed':
        return {
          badge: 'TUTORIAL COMPLETE',
          title: 'You\'re Ready to Track!',
          desc: 'You\'ve set up your isolated account and logged your transaction. You can hide balances anytime with the privacy eye, switch accounts, and track IOUs.',
          buttonTitle: 'Get Started',
          icon: 'checkmark-circle-outline' as const,
          action: () => {
            haptics.success();
            completeTutorial();
          },
        };
    }
  };

  const content = getContent();

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
      <View style={styles.topRow}>
        <View style={styles.badgeContainer}>
          <View style={styles.pulseDot} />
          <Text style={styles.badgeText}>{content.badge}</Text>
        </View>

        <TouchableOpacity
          onPress={skipTutorial}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.skipBtn}
        >
          <Text style={styles.skipText}>Skip Guide</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bodyRow}>
        <View style={styles.iconCircle}>
          <Ionicons name={content.icon} size={22} color={colors.accent} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.desc}>{content.desc}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Button
          title={content.buttonTitle}
          variant="primary"
          size="sm"
          onPress={content.action}
          style={styles.actionButton}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginRight: 6,
  },
  badgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  skipBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  skipText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.title,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  desc: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    minWidth: 140,
  },
});
