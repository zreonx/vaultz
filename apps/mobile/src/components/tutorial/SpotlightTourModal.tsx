import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTutorial } from '@/context/TutorialContext';
import { useTheme } from '@/context/ThemeContext';
import { PressableScale } from '@/components/ui';
import { typography, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SpotlightTourModalProps {
  onActionTrigger?: (actionType: 'create_account' | 'record_transaction') => void;
  isActionModalOpen?: boolean;
}

export const SpotlightTourModal: React.FC<SpotlightTourModalProps> = ({
  onActionTrigger,
  isActionModalOpen = false,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const {
    isTourActive,
    currentStepIndex,
    currentTourStep,
    totalTourSteps,
    nextStep,
    prevStep,
    skipTour,
    activeTargetRect,
  } = useTutorial();

  const pulseAnim = useRef(new Animated.Value(0.82)).current;

  useEffect(() => {
    if (!isTourActive || isActionModalOpen) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.82,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [isTourActive, isActionModalOpen, pulseAnim]);

  if (!isTourActive || !currentTourStep || isActionModalOpen) {
    return null;
  }

  const isLastStep = currentStepIndex === totalTourSteps - 1;

  // Layout calculations
  const PADDING = 8;
  const cardMarginHorizontal = spacing.base;
  const cardWidth = Math.min(SCREEN_WIDTH - cardMarginHorizontal * 2, 420);
  const estimatedCardHeight = currentTourStep.actionText ? 240 : 205;
  const GAP = 14;

  const topSafe = insets.top + (Platform.OS === 'android' ? 16 : 12);
  const bottomSafe = insets.bottom + (Platform.OS === 'android' ? 24 : 16);

  let popoverTop: number | null = null;
  let popoverBottom: number | null = null;
  let isCentered = false;

  let cutoutX = 0;
  let cutoutY = 0;
  let cutoutW = 0;
  let cutoutH = 0;

  if (activeTargetRect && activeTargetRect.width > 0 && activeTargetRect.height > 0) {
    cutoutX = Math.max(0, activeTargetRect.x - PADDING);
    cutoutY = Math.max(0, activeTargetRect.y - PADDING);
    cutoutW = Math.min(SCREEN_WIDTH - cutoutX, activeTargetRect.width + PADDING * 2);
    cutoutH = activeTargetRect.height + PADDING * 2;
    const cutoutBottom = cutoutY + cutoutH;

    const spaceBelow = SCREEN_HEIGHT - bottomSafe - cutoutBottom;
    const spaceAbove = cutoutY - topSafe;

    if (spaceBelow >= estimatedCardHeight + GAP) {
      // Comfortably fits below target
      popoverTop = Math.min(cutoutBottom + GAP, SCREEN_HEIGHT - bottomSafe - estimatedCardHeight);
    } else if (spaceAbove >= estimatedCardHeight + GAP) {
      // Comfortably fits above target
      popoverBottom = Math.min(SCREEN_HEIGHT - cutoutY + GAP, SCREEN_HEIGHT - topSafe - estimatedCardHeight);
    } else {
      // Dock on the side with more room
      if (spaceBelow >= spaceAbove) {
        popoverTop = Math.max(topSafe, cutoutBottom + 8);
      } else {
        popoverBottom = Math.max(bottomSafe, SCREEN_HEIGHT - cutoutY + 8);
      }
    }
  } else {
    isCentered = true;
  }

  const handleAction = () => {
    haptics.light();
    if (currentTourStep.actionType) {
      onActionTrigger?.(currentTourStep.actionType);
    }
  };

  const handleNext = () => {
    haptics.selection();
    nextStep();
  };

  const handlePrev = () => {
    haptics.selection();
    prevStep();
  };

  const handleSkip = () => {
    haptics.light();
    skipTour();
  };

  const backdropBg = isDark ? 'rgba(5, 8, 14, 0.70)' : 'rgba(15, 23, 42, 0.48)';

  return (
    <Modal
      visible={isTourActive}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleSkip}
    >
      <View style={styles.fullscreenContainer}>
        {/* Dimmed Background Overlay with Focused Cutout */}
        {activeTargetRect && activeTargetRect.width > 0 ? (
          <>
            {/* Top Dimmed Slice */}
            <View
              style={[
                styles.dimmedSlice,
                {
                  top: 0,
                  left: 0,
                  right: 0,
                  height: cutoutY,
                  backgroundColor: backdropBg,
                },
              ]}
            />

            {/* Bottom Dimmed Slice */}
            <View
              style={[
                styles.dimmedSlice,
                {
                  top: cutoutY + cutoutH,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: backdropBg,
                },
              ]}
            />

            {/* Left Dimmed Slice */}
            <View
              style={[
                styles.dimmedSlice,
                {
                  top: cutoutY,
                  left: 0,
                  width: cutoutX,
                  height: cutoutH,
                  backgroundColor: backdropBg,
                },
              ]}
            />

            {/* Right Dimmed Slice */}
            <View
              style={[
                styles.dimmedSlice,
                {
                  top: cutoutY,
                  left: cutoutX + cutoutW,
                  right: 0,
                  height: cutoutH,
                  backgroundColor: backdropBg,
                },
              ]}
            />

            {/* Glowing Focus Ring around Focused Element */}
            <Animated.View
              style={[
                styles.focusRing,
                {
                  top: cutoutY,
                  left: cutoutX,
                  width: cutoutW,
                  height: cutoutH,
                  borderColor: colors.accent,
                  shadowColor: colors.accent,
                  opacity: pulseAnim,
                },
              ]}
              pointerEvents="none"
            >
              <View
                style={[
                  styles.focusRingInner,
                  {
                    backgroundColor: isDark
                      ? 'rgba(71, 153, 128, 0.06)'
                      : 'rgba(42, 107, 88, 0.04)',
                  },
                ]}
              />
            </Animated.View>
          </>
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: backdropBg }]} />
        )}

        {/* Floating Step Popover Card */}
        <View
          style={[
            styles.popoverCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
              width: cardWidth,
              marginHorizontal: cardMarginHorizontal,
              shadowColor: '#000',
              shadowOpacity: isDark ? 0.45 : 0.15,
            },
            isCentered && styles.centeredCard,
            popoverTop !== null && { top: popoverTop },
            popoverBottom !== null && { bottom: popoverBottom },
          ]}
        >
          {/* Header Row */}
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.badgeWrapper,
                {
                  backgroundColor: isDark
                    ? 'rgba(71, 153, 128, 0.16)'
                    : 'rgba(42, 107, 88, 0.1)',
                  borderColor: isDark
                    ? 'rgba(71, 153, 128, 0.3)'
                    : 'rgba(42, 107, 88, 0.2)',
                },
              ]}
            >
              <View style={[styles.pulseDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.badgeText, { color: colors.accent }]}>
                STEP {currentStepIndex + 1} OF {totalTourSteps} • {currentTourStep.badge}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSkip}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Skip interactive tour"
            >
              <Text style={[styles.skipBtnText, { color: colors.textMuted }]}>
                Skip
              </Text>
            </TouchableOpacity>
          </View>

          {/* Segmented Progress Bar */}
          <View style={styles.progressRow}>
            {Array.from({ length: totalTourSteps }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressBarSegment,
                  {
                    backgroundColor:
                      i <= currentStepIndex
                        ? colors.accent
                        : isDark
                        ? colors.borderSubtle
                        : colors.surfaceMuted,
                  },
                ]}
              />
            ))}
          </View>

          {/* Body Content */}
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            {currentTourStep.title}
          </Text>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
            {currentTourStep.description}
          </Text>

          {/* Optional Action Button */}
          {currentTourStep.actionText && (
            <PressableScale
              style={[
                styles.actionBtn,
                {
                  borderColor: isDark
                    ? 'rgba(71, 153, 128, 0.35)'
                    : 'rgba(42, 107, 88, 0.25)',
                  backgroundColor: isDark
                    ? 'rgba(71, 153, 128, 0.14)'
                    : 'rgba(42, 107, 88, 0.08)',
                },
              ]}
              onPress={handleAction}
            >
              <Ionicons name="sparkles" size={15} color={colors.accent} />
              <Text style={[styles.actionBtnText, { color: colors.accent }]}>
                {currentTourStep.actionText}
              </Text>
            </PressableScale>
          )}

          {/* Footer Controls */}
          <View
            style={[
              styles.cardFooter,
              { borderTopColor: colors.borderSubtle },
            ]}
          >
            {/* Back Button */}
            <TouchableOpacity
              onPress={handlePrev}
              disabled={currentStepIndex === 0}
              style={[
                styles.backBtn,
                currentStepIndex === 0 && styles.disabledBtn,
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="chevron-back"
                size={16}
                color={currentStepIndex === 0 ? colors.textMuted : colors.textSecondary}
              />
              <Text
                style={[
                  styles.backBtnText,
                  { color: colors.textSecondary },
                  currentStepIndex === 0 && { color: colors.textMuted },
                ]}
              >
                Back
              </Text>
            </TouchableOpacity>

            {/* Next / Finish Button */}
            <PressableScale
              onPress={handleNext}
              style={[styles.nextBtn, { backgroundColor: colors.accent }]}
            >
              <Text
                style={[
                  styles.nextBtnText,
                  { color: colors.accentForeground || '#0B0F17' },
                ]}
              >
                {isLastStep ? 'Finish Tour' : 'Next'}
              </Text>
              <Ionicons
                name={isLastStep ? 'checkmark' : 'chevron-forward'}
                size={15}
                color={colors.accentForeground || '#0B0F17'}
              />
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullscreenContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dimmedSlice: {
    position: 'absolute',
  },
  focusRing: {
    position: 'absolute',
    borderRadius: radius.lg,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    elevation: 8,
    overflow: 'hidden',
  },
  focusRingInner: {
    flex: 1,
  },
  popoverCard: {
    position: 'absolute',
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.base,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 12,
    alignSelf: 'center',
  },
  centeredCard: {
    top: '36%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  badgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  skipBtnText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '500',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    marginVertical: spacing.xs + 2,
  },
  progressBarSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  cardTitle: {
    ...typography.title,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.xs,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  cardDesc: {
    ...typography.body,
    fontSize: 13.5,
    lineHeight: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm + 2,
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  actionBtnText: {
    ...typography.label,
    fontSize: 12.5,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    gap: 2,
  },
  backBtnText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '500',
  },
  disabledBtn: {
    opacity: 0.35,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    gap: 5,
  },
  nextBtnText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '700',
  },
});
