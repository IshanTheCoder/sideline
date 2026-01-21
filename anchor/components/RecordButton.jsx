import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

/**
 * Large circular record button with pulsing animation and timer display
 * 
 * @param isRecording - Whether recording is currently active
 * @param recordingDuration - Duration of current recording in seconds
 * @param onPress - Handler function called when button is pressed
 * @param disabled - Whether the button should be disabled
 */
export function RecordButton({
  isRecording,
  recordingDuration,
  onPress,
  disabled = false,
}: RecordButtonProps) {
  const pulseAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(1);

  // Pulsing animation when recording
  useEffect(() => {
    if (isRecording) {
      pulseAnim.value = withRepeat(
        withTiming(1, { duration: 1000 }),
        -1,
        true
      );
    } else {
      pulseAnim.value = withTiming(0, { duration: 200 });
    }
  }, [isRecording, pulseAnim]);

  // Scale animation on press
  const handlePressIn = () => {
    if (!disabled) {
      scaleAnim.value = withTiming(0.95, { duration: 100 });
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scaleAnim.value = withTiming(1, { duration: 100 });
    }
  };

  const handlePress = () => {
    if (!disabled) {
      onPress();
    }
  };

  // Animated styles for pulsing effect
  const pulseStyle = useAnimatedStyle(() => {
    const scale = interpolate(pulseAnim.value, [0, 1], [1, 1.15]);
    const opacity = interpolate(pulseAnim.value, [0, 1], [0, 0.3]);
    
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  // Animated style for button scale
  const buttonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleAnim.value }],
    };
  });

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const buttonColor = isRecording ? '#FF3B30' : '#007AFF'; // Red when recording, blue otherwise
  const backgroundColor = useThemeColor({}, 'background');

  return (
    <View style={styles.container}>
      {/* Pulsing ring effect */}
      {isRecording && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              backgroundColor: buttonColor,
            },
            pulseStyle,
          ]}
        />
      )}
      
      {/* Main button */}
      <Animated.View style={buttonStyle}>
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: buttonColor,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          activeOpacity={0.9}
        >
          <View style={styles.buttonInner}>
            {isRecording ? (
              <View style={styles.recordingContent}>
                {/* Stop icon (square) */}
                <View style={styles.stopIcon} />
                {/* Timer - Clean formatted display */}
                <View style={styles.timerContainer}>
                  <ThemedText style={styles.timer} lightColor="#fff" darkColor="#fff">
                    {formatDuration(recordingDuration)}
                  </ThemedText>
                </View>
              </View>
            ) : (
              <View style={styles.recordIcon} />
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  button: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  buttonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
  recordingContent: {
    alignItems: 'center',
    gap: 12,
  },
  stopIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  timer: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    color: '#fff',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
