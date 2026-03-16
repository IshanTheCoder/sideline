import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTutorial } from '@/contexts/TutorialContext';

const SPOTLIGHT_PADDING = 10;
const TOOLTIP_MARGIN = 16;
const TOOLTIP_MAX_WIDTH = 340;
const TOOLTIP_ESTIMATED_HEIGHT = 260;
const ARROW_SIZE = 10;
const SAFE_TOP = Platform.OS === 'ios' ? 60 : 44;
const SAFE_BOTTOM = 40;

export default function TutorialOverlay() {
  const {
    isTutorialActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    nextStep,
    prevStep,
    endTutorial,
    getTarget,
    canAdvance,
    rosterPlayerCount,
    recordingCount,
  } = useTutorial();

  const { width: screenW, height: screenH } = useWindowDimensions();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [targetLayout, setTargetLayout] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (isTutorialActive) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [isTutorialActive]);

  useEffect(() => {
    clearInterval(pollRef.current);
    if (!isTutorialActive || !currentStep) {
      setTargetLayout(null);
      return;
    }
    if (!currentStep.targetKey) {
      setTargetLayout(null);
      return;
    }

    setTargetLayout(null);

    let attempts = 0;
    const poll = () => {
      const layout = getTarget(currentStep.targetKey);
      if (layout) {
        setTargetLayout(layout);
        clearInterval(pollRef.current);
      } else if (attempts > 20) {
        setTargetLayout(null);
        clearInterval(pollRef.current);
      }
      attempts++;
    };

    poll();
    if (!getTarget(currentStep.targetKey)) {
      pollRef.current = setInterval(poll, 250);
    }

    return () => clearInterval(pollRef.current);
  }, [isTutorialActive, currentStepIndex, currentStep, getTarget]);

  const spotlightRect = useMemo(() => {
    if (!targetLayout) return null;
    return {
      x: Math.max(0, targetLayout.x - SPOTLIGHT_PADDING),
      y: Math.max(0, targetLayout.y - SPOTLIGHT_PADDING),
      width: targetLayout.width + SPOTLIGHT_PADDING * 2,
      height: targetLayout.height + SPOTLIGHT_PADDING * 2,
    };
  }, [targetLayout]);

  if (!isTutorialActive || !currentStep) return null;

  const isFinalStep = currentStepIndex === totalSteps - 1;
  const isFirstStep = currentStepIndex === 0;
  const hasSpotlight = !!spotlightRect;
  const isInteractive = !!currentStep.interactive;
  const hasPlayerReq = !!currentStep.requirePlayerCount;
  const hasRecordingReq = !!currentStep.requireRecordingCount;

  const tooltipPos = hasSpotlight
    ? computeTooltipPosition(spotlightRect, currentStep.tooltipPosition, screenW, screenH)
    : null;

  const tooltipCard = (
    <View style={[styles.tooltipCard, isInteractive && styles.tooltipCardCompact]}>
      <View style={styles.tooltipHeader}>
        <View style={styles.aiBadge}>
          <IconSymbol name="sparkles" size={14} color="#FFF" />
          <ThemedText style={styles.aiBadgeText}>AI Coach</ThemedText>
        </View>
        <ThemedText style={styles.stepCounter}>
          {currentStep.phaseLabel} · {currentStepIndex + 1}/{totalSteps}
        </ThemedText>
      </View>
      <ThemedText style={[styles.tooltipTitle, isInteractive && styles.tooltipTitleCompact]}>
        {currentStep.title}
      </ThemedText>
      <ThemedText style={[styles.tooltipBody, isInteractive && styles.tooltipBodyCompact]}>
        {currentStep.body}
      </ThemedText>
      {hasPlayerReq && (
        <View style={styles.progressRow}>
          <ThemedText style={styles.progressIcon}>👥</ThemedText>
          <ThemedText style={[
            styles.progressText,
            canAdvance && styles.progressTextDone,
          ]}>
            Players added: {rosterPlayerCount}/{currentStep.requirePlayerCount}
            {canAdvance ? '  ✓' : ''}
          </ThemedText>
        </View>
      )}
      {hasRecordingReq && (
        <View style={styles.progressRow}>
          <ThemedText style={styles.progressIcon}>🎙️</ThemedText>
          <ThemedText style={[
            styles.progressText,
            canAdvance && styles.progressTextDone,
          ]}>
            Recordings: {recordingCount}/{currentStep.requireRecordingCount}
            {canAdvance ? '  ✓' : ''}
          </ThemedText>
        </View>
      )}
      {!isInteractive && (
        <View style={styles.phaseDots}>
          {Array.from({ length: 7 }, (_, i) => (
            <View key={i} style={[styles.dot, currentStep.phase === i + 1 ? styles.dotActive : styles.dotInactive]} />
          ))}
        </View>
      )}
      <View style={styles.tooltipActions}>
        <TouchableOpacity onPress={endTutorial} activeOpacity={0.7} style={styles.skipBtn} hitSlop={12}>
          <ThemedText style={styles.skipText}>Skip Tutorial</ThemedText>
        </TouchableOpacity>
        <View style={styles.navButtons}>
          {!isFirstStep && (
            <TouchableOpacity onPress={prevStep} activeOpacity={0.8} style={styles.backBtn} hitSlop={8}>
              <IconSymbol name="chevron.left" size={16} color="#FFF" />
              <ThemedText style={styles.backBtnText}>Back</ThemedText>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={canAdvance ? nextStep : undefined}
            activeOpacity={canAdvance ? 0.85 : 1}
            disabled={!canAdvance}
            style={[styles.nextBtn, !canAdvance && styles.nextBtnDisabled]}
            hitSlop={8}
          >
            <ThemedText style={[styles.nextBtnText, !canAdvance && styles.nextBtnTextDisabled]}>
              {isFinalStep ? 'Done' : 'Next'}
            </ThemedText>
            {!isFinalStep && (
              <IconSymbol name="chevron.right" size={16} color={canAdvance ? '#FFF' : 'rgba(255,255,255,0.3)'} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (hasSpotlight) {
    return (
      <Animated.View style={[styles.root, { opacity: fadeAnim }]} pointerEvents={isInteractive ? 'box-none' : 'auto'}>
        {/* 4 dark backdrop regions */}
        <View pointerEvents={isInteractive ? 'none' : undefined} style={[styles.backdrop, { top: 0, left: 0, right: 0, height: Math.max(0, spotlightRect.y) }]} />
        <View pointerEvents={isInteractive ? 'none' : undefined} style={[styles.backdrop, { top: spotlightRect.y + spotlightRect.height, left: 0, right: 0, bottom: 0 }]} />
        <View pointerEvents={isInteractive ? 'none' : undefined} style={[styles.backdrop, { top: spotlightRect.y, left: 0, width: Math.max(0, spotlightRect.x), height: spotlightRect.height }]} />
        <View pointerEvents={isInteractive ? 'none' : undefined} style={[styles.backdrop, { top: spotlightRect.y, left: spotlightRect.x + spotlightRect.width, right: 0, height: spotlightRect.height }]} />

        {/* Spotlight ring — visual only */}
        <View
          pointerEvents="none"
          style={[styles.spotlightRing, {
            top: spotlightRect.y,
            left: spotlightRect.x,
            width: spotlightRect.width,
            height: spotlightRect.height,
            borderRadius: Math.min(spotlightRect.width, spotlightRect.height) > 60 ? 16 : 50,
          }]}
        />

        {/* Tooltip */}
        <View pointerEvents="box-none" style={[styles.tooltipAbsolute, tooltipPos]}>
          {tooltipCard}
        </View>
      </Animated.View>
    );
  }

  if (isInteractive) {
    const interactiveStyle = currentStep.tooltipPosition === 'top'
      ? styles.tooltipInteractiveTop
      : styles.tooltipInteractiveBottom;
    return (
      <Animated.View style={[styles.root, { opacity: fadeAnim }]} pointerEvents="box-none">
        <View style={[styles.backdropLight, StyleSheet.absoluteFill]} pointerEvents="none" />
        <View pointerEvents="box-none" style={interactiveStyle}>
          {tooltipCard}
        </View>
      </Animated.View>
    );
  }

  // Centered / no-spotlight — full dark overlay blocks everything except tooltip buttons
  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim }]} pointerEvents="auto">
      <View style={[styles.backdrop, StyleSheet.absoluteFill]} />
      <View pointerEvents="box-none" style={styles.tooltipCentered}>
        {tooltipCard}
      </View>
    </Animated.View>
  );
}

function computeTooltipPosition(rect, preferredPos, screenW, screenH) {
  let left = rect.x + rect.width / 2 - TOOLTIP_MAX_WIDTH / 2;
  left = Math.max(TOOLTIP_MARGIN, Math.min(left, screenW - TOOLTIP_MAX_WIDTH - TOOLTIP_MARGIN));

  const spaceBelow = screenH - (rect.y + rect.height) - SAFE_BOTTOM;
  const spaceAbove = rect.y - SAFE_TOP;

  let pos = preferredPos;
  if (pos === 'bottom' && spaceBelow < TOOLTIP_ESTIMATED_HEIGHT && spaceAbove > spaceBelow) {
    pos = 'top';
  } else if (pos === 'top' && spaceAbove < TOOLTIP_ESTIMATED_HEIGHT && spaceBelow > spaceAbove) {
    pos = 'bottom';
  }

  if (pos === 'bottom') {
    const top = rect.y + rect.height + ARROW_SIZE + 8;
    return { position: 'absolute', top: Math.min(top, screenH - TOOLTIP_ESTIMATED_HEIGHT - SAFE_BOTTOM), left, maxWidth: TOOLTIP_MAX_WIDTH };
  }

  const bottom = screenH - rect.y + ARROW_SIZE + 8;
  return { position: 'absolute', bottom: Math.min(bottom, screenH - SAFE_TOP), left, maxWidth: TOOLTIP_MAX_WIDTH };
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    ...(Platform.OS === 'web' && { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }),
  },
  backdrop: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  backdropLight: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  spotlightRing: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: 'rgba(91, 163, 245, 0.7)',
  },
  tooltipAbsolute: {
    zIndex: 100000,
  },
  tooltipCentered: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: TOOLTIP_MARGIN,
  },
  tooltipBottomFixed: {
    position: 'absolute',
    bottom: SAFE_BOTTOM,
    left: TOOLTIP_MARGIN,
    right: TOOLTIP_MARGIN,
    alignItems: 'center',
  },
  tooltipTopFixed: {
    position: 'absolute',
    top: SAFE_TOP,
    left: TOOLTIP_MARGIN,
    right: TOOLTIP_MARGIN,
    alignItems: 'center',
  },
  tooltipInteractiveTop: {
    position: 'absolute',
    top: SAFE_TOP,
    left: TOOLTIP_MARGIN,
    right: TOOLTIP_MARGIN,
    alignItems: 'center',
  },
  tooltipInteractiveBottom: {
    position: 'absolute',
    bottom: SAFE_BOTTOM,
    left: TOOLTIP_MARGIN,
    right: TOOLTIP_MARGIN,
    alignItems: 'flex-end',
  },
  tooltipCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    maxWidth: TOOLTIP_MAX_WIDTH,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tooltipCardCompact: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    maxWidth: 300,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5BA3F5',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  aiBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stepCounter: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '500',
  },
  tooltipTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 26,
  },
  tooltipTitleCompact: {
    fontSize: 16,
    marginBottom: 4,
    lineHeight: 22,
  },
  tooltipBody: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  tooltipBodyCompact: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 6,
  },
  phaseDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#5BA3F5',
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tooltipActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skipText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    fontWeight: '500',
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  backBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#5BA3F5',
  },
  nextBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  nextBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  nextBtnTextDisabled: {
    color: 'rgba(255,255,255,0.3)',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  progressIcon: {
    fontSize: 16,
  },
  progressText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    fontWeight: '600',
  },
  progressTextDone: {
    color: '#4CD964',
  },
});
