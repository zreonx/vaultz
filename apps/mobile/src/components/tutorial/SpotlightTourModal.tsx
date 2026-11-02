import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTutorial } from '@/context/TutorialContext';
import { colors } from '@/theme/colors';
import { typography, radius, spacing } from '@/theme/tokens';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SpotlightTourModalProps {
  onActionTrigger?: (actionType: 'create_account' | 'record_transaction') => void;
}

export const SpotlightTourModal: React.FC<SpotlightTourModalProps> = ({ onActionTrigger }) => {
  const insets = useSafeAreaInsets();
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

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isTourActive) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [isTourActive, pulseAnim]);

  if (!isTourActive || !currentTourStep) {
    return null;
  }

  const isLastStep = currentStepIndex === totalTourSteps - 1;

  // Calculate Popover placement
  const cardPadding = spacing.md;
  const cardMarginHorizontal = spacing.md;
  const cardWidth = SCREEN_WIDTH - cardMarginHorizontal * 2;
  const estimatedCardHeight = 220;

  let popoverTop: number | null = null;
  let popoverBottom: number | null = null;
  let isCentered = false;

  if (activeTargetRect) {
    const cutoutY = Math.max(0, activeTargetRect.y - 6);
    const cutoutH = activeTargetRect.height + 12;
    const cutoutBottom = cutoutY + cutoutH;

    const spaceBelow = SCREEN_HEIGHT - insets.bottom - cutoutBottom;
    const spaceAbove = cutoutY - insets.top;

    if (spaceBelow >= estimatedCardHeight + 16) {
      // Dock below
      popoverTop = cutoutBottom + 14;
    } else if (spaceAbove >= estimatedCardHeight + 16) {
      // Dock above
      popoverBottom = SCREEN_HEIGHT - cutoutY + 14;
    } else {
      // Dock where there is maximum room or clamp
      if (spaceBelow > spaceAbove) {
        popoverTop = Math.max(insets.top + 16, cutoutBottom + 10);
      } else {
        popoverBottom = Math.max(insets.bottom + 16, SCREEN_HEIGHT - cutoutY + 10);
      }
    }
  } else {
    isCentered = true;
  }

  const handleAction = () => {
    if (currentTourStep.actionType) {
      onActionTrigger?.(currentTourStep.actionType);
    }
  };

  return (
    <Modal
      visible={isTourActive}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={skipTour}
    >
      <View style={styles.fullscreenContainer}>
        {/* Dimmed Background Overlay with Cutout Spotlight */}
        {activeTargetRect ? (
          <>
            {/* Top Dimmed Rect */}
            <View
              style={[
                styles.dimmedSlice,
                {
                  top: 0,
                  left: 0,
                  right: 0,
                  height: Math.max(0, activeTargetRect.y - 6),
                },
              ]}
            />

            {/* Bottom Dimmed Rect */}
            <View
              style={[
                styles.dimmedSlice,
                {
                  top: activeTargetRect.y + activeTargetRect.height + 6,
                  left: 0,
                  right: 0,
                  bottom: 0,
                },
              ]}
            />

            {/* Left Dimmed Rect */}
            <View
              style={[
                styles.dimmedSlice,
                {
                  top: Math.max(0, activeTargetRect.y - 6),
                  left: 0,
                  width: Math.max(0, activeTargetRect.x - 6),
                  height: activeTargetRect.height + 12,
                },
              ]}
            />

            {/* Right Dimmed Rect */}
            <View
              style={[
                styles.dimmedSlice,
                {
                  top: Math.max(0, activeTargetRect.y - 6),
                  left: activeTargetRect.x + activeTargetRect.width + 6,
                  right: 0,
                  height: activeTargetRect.height + 12,
                },
              ]}
            />

            {/* Glowing Emerald Ring around Focused Component */}
            <Animated.View
              style={[
                styles.focusRing,
                {
                  top: activeTargetRect.y - 6,
                  left: activeTargetRect.x - 6,
                  width: activeTargetRect.width + 12,
                  height: activeTargetRect.height + 12,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
              pointerEvents="none"
            />
          </>
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.fallbackDimmed]} />
        )}

        {/* Floating Step Popover Card */}
        <View
          style={[
            styles.popoverCard,
            { width: cardWidth, marginHorizontal: cardMarginHorizontal },
            isCentered && styles.centeredCard,
            popoverTop !== null && { top: popoverTop },
            popoverBottom !== null && { bottom: popoverBottom },
          ]}
        >
          {/* Header Row */}
          <View style={styles.cardHeader}>
            <View style={styles.badgeWrapper}>
              <View style={styles.pulseDot} />
              <Text style={styles.badgeText}>
                STEP {currentStepIndex + 1} OF {totalTourSteps}: {currentTourStep.badge}
              </Text>
            </View>

            <TouchableOpacity
              onPress={skipTour}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.skipBtnText}>Skip Tour</Text>
            </TouchableOpacity>
          </View>

          {/* Body Content */}
          <Text style={styles.cardTitle}>{currentTourStep.title}</Text>
          <Text style={styles.cardDesc}>{currentTourStep.description}</Text>

          {/* Optional Action Button */}
          {currentTourStep.actionText && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleAction}
              activeOpacity={0.8}
            >
              <Ionicons name="sparkles-outline" size={15} color={colors.accent} />
              <Text style={styles.actionBtnText}>{currentTourStep.actionText}</Text>
            </TouchableOpacity>
          )}

          {/* Footer Controls */}
          <View style={styles.cardFooter}>
            {/* Step Dots */}
            <View style={styles.dotsRow}>
              {Array.from({ length: totalTourSteps }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === currentStepIndex ? styles.activeDot : styles.inactiveDot,
                  ]}
                />
              ))}
            </View>

            {/* Navigation Buttons */}
            <View style={styles.navButtonsRow}>
              <TouchableOpacity
                onPress={prevStep}
                disabled={currentStepIndex === 0}
                style={[
                  styles.backBtn,
                  currentStepIndex === 0 && styles.disabledBtn,
                ]}
              >
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={currentStepIndex === 0 ? colors.textMuted : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.backBtnText,
                    currentStepIndex === 0 && styles.disabledBtnText,
                  ]}
                >
                  Back
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={nextStep}
                style={styles.nextBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.nextBtnText}>
                  {isLastStep ? 'Finish' : 'Next'}
                </Text>
                <Ionicons
                  name={isLastStep ? 'checkmark' : 'chevron-forward'}
                  size={16}
                  color="#101413"
                />
              </TouchableOpacity>
            </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
  },
  fallbackDimmed: {
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
  },
  focusRing: {
    position: 'absolute',
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  popoverCard: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 12,
  },
  centeredCard: {
    top: '38%',
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
  skipBtnText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  cardTitle: {
    ...typography.title,
    fontSize: 15,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    marginBottom: 4,
  },
  cardDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
    fontSize: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  actionBtnText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  activeDot: {
    width: 14,
    backgroundColor: colors.accent,
  },
  inactiveDot: {
    width: 4,
    backgroundColor: colors.border,
  },
  navButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backBtnText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  disabledBtn: {
    opacity: 0.4,
  },
  disabledBtnText: {
    color: colors.textMuted,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    gap: 4,
  },
  nextBtnText: {
    ...typography.caption,
    color: '#101413',
    fontWeight: '700',
    fontSize: 12,
  },
});
