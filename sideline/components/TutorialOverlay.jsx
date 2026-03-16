import React from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTutorial } from '@/contexts/TutorialContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * TutorialOverlay renders a full-screen modal with a semi-transparent backdrop
 * and a tooltip card showing the current tutorial step.
 *
 * Props:
 *  - screenName: the current screen ID to filter which steps to show
 *  - onAction: callback when user taps the primary button (for navigate/open_menu actions)
 */
export default function TutorialOverlay({ screenName, onAction }) {
  const {
    isTutorialActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    nextStep,
    skipTutorial,
    finishTutorial,
  } = useTutorial();

  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isTutorialActive && currentStep?.screen === screenName) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [isTutorialActive, currentStep?.id, screenName]);

  if (!isTutorialActive || !currentStep || currentStep.screen !== screenName) {
    return null;
  }

  const handlePrimaryPress = () => {
    if (currentStep.action === 'finish') {
      finishTutorial();
      return;
    }

    if (currentStep.action === 'navigate' || currentStep.action === 'open_menu') {
      // Let the parent screen handle navigation
      if (onAction) {
        onAction(currentStep);
      }
      nextStep();
      return;
    }

    // Default: next
    nextStep();
  };

  const getButtonText = () => {
    switch (currentStep.action) {
      case 'finish':
        return 'Get Started!';
      case 'navigate':
        return 'Let\'s Go';
      case 'open_menu':
        return 'Open Menu';
      default:
        return 'Next';
    }
  };

  const getTooltipStyle = () => {
    switch (currentStep.position) {
      case 'top':
        return styles.tooltipTop;
      case 'bottom':
        return styles.tooltipBottom;
      case 'center':
      default:
        return styles.tooltipCenter;
    }
  };

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={skipTutorial}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={() => {}}
        >
          <View style={[styles.tooltipContainer, getTooltipStyle()]}>
            {/* Progress indicator */}
            <View style={styles.progressRow}>
              <View style={styles.progressBarContainer}>
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.progressDot,
                      i === currentStepIndex && styles.progressDotActive,
                      i < currentStepIndex && styles.progressDotCompleted,
                    ]}
                  />
                ))}
              </View>
              <ThemedText style={styles.stepCounter}>
                {currentStepIndex + 1}/{totalSteps}
              </ThemedText>
            </View>

            {/* Content */}
            <ThemedText style={styles.title}>{currentStep.title}</ThemedText>
            <ThemedText style={styles.message}>{currentStep.message}</ThemedText>

            {/* Highlight hint */}
            {currentStep.highlightArea && (
              <View style={styles.highlightHint}>
                <View style={styles.highlightDot} />
                <ThemedText style={styles.highlightText}>
                  Look for the highlighted area
                </ThemedText>
              </View>
            )}

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={skipTutorial}
                activeOpacity={0.7}
              >
                <ThemedText style={styles.skipButtonText}>Skip Tutorial</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handlePrimaryPress}
                activeOpacity={0.8}
              >
                <ThemedText style={styles.primaryButtonText}>
                  {getButtonText()}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  backdropTouch: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tooltipContainer: {
    width: Math.min(SCREEN_WIDTH - 48, 360),
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(91, 163, 245, 0.3)',
    shadowColor: '#5BA3F5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  tooltipTop: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 140 : 120,
    left: 24,
    right: 24,
    alignSelf: 'center',
  },
  tooltipCenter: {
    // default centering from parent
  },
  tooltipBottom: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 140 : 120,
    left: 24,
    right: 24,
    alignSelf: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
    marginRight: 12,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  progressDotActive: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#5BA3F5',
  },
  progressDotCompleted: {
    backgroundColor: 'rgba(91, 163, 245, 0.5)',
  },
  stepCounter: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  message: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 22,
    marginBottom: 20,
  },
  highlightHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(91, 163, 245, 0.15)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  highlightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#5BA3F5',
    marginRight: 8,
  },
  highlightText: {
    fontSize: 13,
    color: '#5BA3F5',
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: '#5BA3F5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
