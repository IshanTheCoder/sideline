import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

const Slider = Platform.OS !== 'web'
  ? require('@react-native-community/slider').default
  : null;
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AudioPlayer({ audioUrl }) {
  const colorScheme = useColorScheme();
  const [sound, setSound] = useState(null);
  const soundRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationMs, setDurationMs] = useState(null);
  const [positionMs, setPositionMs] = useState(0);
  const [error, setError] = useState(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekingValue, setSeekingValue] = useState(null);
  const wasPlayingRef = useRef(false);

  const tint = Colors[colorScheme ?? 'light'].tint;

  useEffect(() => {
    let isMounted = true;

    const loadSound = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          soundRef.current = null;
          setSound(null);
        }

        let playUri = audioUrl;

        if (Platform.OS !== 'web' && audioUrl && audioUrl.startsWith('http')) {
          const urlPath = audioUrl.split('?')[0];
          const isWebm = urlPath.endsWith('.webm');

          if (isWebm && Platform.OS === 'ios') {
            throw new Error('This recording was made on the web and cannot be played on iOS.');
          }

          const hash = urlPath.split('/').pop() || 'audio';
          const ext = isWebm ? '.webm' : (hash.includes('.') ? '' : '.m4a');
          const localPath = `${FileSystem.cacheDirectory}audio_${hash}${ext}`;
          const info = await FileSystem.getInfoAsync(localPath);
          if (!info.exists) {
            await FileSystem.downloadAsync(audioUrl, localPath);
          }
          playUri = localPath;
        }

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: playUri },
          { shouldPlay: false },
          (status) => {
            if (!status.isLoaded) return;
            if (!isMounted) return;
            setIsPlaying(status.isPlaying);
            if (!isSeeking) {
              setPositionMs(status.positionMillis ?? 0);
            }
            setDurationMs(status.durationMillis ?? null);
          }
        );

        if (!isMounted) {
          await newSound.unloadAsync();
          return;
        }

        soundRef.current = newSound;
        setSound(newSound);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load audio.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSound();

    return () => {
      isMounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => undefined);
        soundRef.current = null;
      }
    };
  }, [audioUrl]);

  const handleTogglePlay = async () => {
    if (!sound) return;
    try {
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) return;
      if (status.isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Playback error.');
    }
  };

  const handleSeekStart = async () => {
    if (!sound) return;
    wasPlayingRef.current = isPlaying;
    setIsSeeking(true);
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        await sound.pauseAsync();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Playback error.');
    }
  };

  const handleSeekComplete = async (value) => {
    if (!sound) return;
    try {
      await sound.setPositionAsync(Math.floor(value));
      setPositionMs(Math.floor(value));
      if (wasPlayingRef.current) {
        await sound.playAsync();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Playback error.');
    } finally {
      setIsSeeking(false);
      setSeekingValue(null);
    }
  };

  const formattedTime = useMemo(() => {
    const total = Math.floor((durationMs ?? 0) / 1000);
    const current = Math.floor(positionMs / 1000);
    const format = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    return `${format(current)} / ${format(total)}`;
  }, [durationMs, positionMs]);

  const sliderValue = isSeeking ? seekingValue ?? positionMs : positionMs;
  const sliderMax = durationMs ?? 1;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.playButton,
          { backgroundColor: tint },
        ]}
        onPress={handleTogglePlay}
        disabled={isLoading || !!error || !sound}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <IconSymbol
            name={isPlaying ? 'pause.fill' : 'play.fill'}
            size={20}
            color="#fff"
          />
        )}
      </TouchableOpacity>

      <View style={styles.info}>
        <ThemedText style={styles.timeText}>{formattedTime}</ThemedText>
        {Platform.OS === 'web' ? (
          <input
            type="range"
            min={0}
            max={sliderMax}
            value={sliderValue}
            disabled={isLoading || !!error || !sound || !durationMs}
            onChange={(e) => setSeekingValue(Number(e.target.value))}
            onMouseDown={handleSeekStart}
            onMouseUp={(e) => handleSeekComplete(Number(e.target.value))}
            onTouchStart={handleSeekStart}
            onTouchEnd={(e) => handleSeekComplete(Number(e.target.value))}
            style={{ width: '100%', accentColor: tint, cursor: 'pointer' }}
          />
        ) : (
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={sliderMax}
            value={sliderValue}
            onSlidingStart={handleSeekStart}
            onValueChange={(value) => setSeekingValue(value)}
            onSlidingComplete={handleSeekComplete}
            minimumTrackTintColor={tint}
            maximumTrackTintColor={colorScheme === 'dark' ? '#333' : '#DDD'}
            thumbTintColor={tint}
            disabled={isLoading || !!error || !sound || !durationMs}
          />
        )}
        {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    gap: 8,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 24,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: '#D32F2F',
  },
});
