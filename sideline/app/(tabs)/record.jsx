/**
 * Live Capture — redesign: the whole screen is the tap target (tap to start,
 * tap again to stop; holding works walkie-talkie style), with a set switcher,
 * a big purely-visual record circle, a live clock, and a confirmation toast
 * showing the transcribed note's AI label once processing lands. All real:
 * expo-av recording → Supabase upload → background transcription + labeling.
 */
import { Audio } from 'expo-av';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Check, Mic, Square } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Brand } from '@/constants/brand';
import { useActiveSession } from '@/contexts/ActiveSessionContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAudioPermissions } from '@/hooks/use-audio-permissions';
import { showAlert } from '@/lib/alert';
import {
  createRecordingRecord,
  formatDuration,
  serializeRecordingNotes,
  uploadRecording,
} from '@/lib/recording';
import { processRecording } from '@/lib/recordingProcessing';
import { SKILL_CATEGORY_LABELS, parseAiLabels } from '@/lib/volleyballVocabulary';

// Speech-tuned recording profile: mono + 128kbps AAC. Whisper downmixes to mono
// anyway, so stereo just doubles the upload on gym wifi for zero accuracy gain.
// 44.1kHz keeps full voice detail for noisy-environment transcription.
const SPEECH_RECORDING_OPTIONS = {
  isMeteringEnabled: false,
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat?.MPEG_4 ?? 2,
    audioEncoder: Audio.AndroidAudioEncoder?.AAC ?? 3,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat?.MPEG4AAC ?? 'aac ',
    audioQuality: Audio.IOSAudioQuality?.MAX ?? 127,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

// vibration cues so the coach knows recording started/stopped without looking
const hapticStart = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
const hapticStop = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

const WAVE_BARS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

function WaveBar({ index }) {
  const scale = useRef(new Animated.Value(0.25)).current;
  useEffect(() => {
    const dur = 500 + ((index * 37) % 40) * 10;
    const delay = ((index * 83) % 40) * 10;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1, duration: dur, delay, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.25, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [index, scale]);
  return <Animated.View style={[styles.waveBar, { transform: [{ scaleY: scale }] }]} />;
}

function PulseRing({ active }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) return;
    anim.setValue(0);
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [active, anim]);
  if (!active) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pulseRing,
        {
          opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
          transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }],
        },
      ]}
    />
  );
}

export default function RecordScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeSession, clearActiveSession } = useActiveSession();
  const { status, requestPermission } = useAudioPermissions();

  const [isRecording, setIsRecording] = useState(false);
  const [isBusy, setIsBusy] = useState(false); // start/stop in flight
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [liveSec, setLiveSec] = useState(0);
  const [selectedSet, setSelectedSet] = useState(1);
  const [setOffsetSeconds, setSetOffsetSeconds] = useState(null);
  const [processingCount, setProcessingCount] = useState(0);
  const [toast, setToast] = useState(null); // { num, title, meta } | { error: string }
  const [noteCount, setNoteCount] = useState(0);

  const recordingRef = useRef(null);
  const pressAtRef = useRef(0);
  const armedRef = useRef(false);
  const pendingReleaseRef = useRef(false);
  const decideStopRef = useRef(() => {});
  const toastTimer = useRef(null);
  const noteCountRef = useRef(0);
  const isProcessing = processingCount > 0;

  // live clock — seconds since the game session started
  useEffect(() => {
    const startedAt = activeSession?.startedAt?.getTime?.() ?? Date.now();
    const tick = () => setLiveSec(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeSession?.startedAt]);

  // recording duration stopwatch
  useEffect(() => {
    if (!isRecording) {
      setRecordingDuration(0);
      return;
    }
    const interval = setInterval(() => setRecordingDuration((p) => p + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  // configure the mic as soon as this screen loads; kill any live recording on leave
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    }).catch((e) => console.error('Failed to set up audio mode:', e));
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(console.error);
      }
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = useCallback((payload, durationMs = 3200) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(payload);
    toastTimer.current = setTimeout(() => setToast(null), durationMs);
  }, []);

  const startRecording = useCallback(async () => {
    if (recordingRef.current || isBusy) return;
    setIsBusy(true);
    try {
      if (status !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          showToast({ error: 'Microphone access is required — enable it in Settings.' }, 5000);
          return;
        }
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });
      let recording;
      try {
        ({ recording } = await Audio.Recording.createAsync(SPEECH_RECORDING_OPTIONS));
      } catch (presetError) {
        console.warn('Speech recording profile failed, falling back to HIGH_QUALITY:', presetError);
        ({ recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY));
      }
      hapticStart();
      if (activeSession?.startedAt) {
        setSetOffsetSeconds(
          Math.max(0, Math.floor((Date.now() - activeSession.startedAt.getTime()) / 1000))
        );
      }
      recordingRef.current = recording;
      setToast(null);
      setIsRecording(true);
      // the coach may have already released (fast tap, or a hold shorter than
      // mic init time) before createAsync resolved — apply that release now
      if (pendingReleaseRef.current) {
        pendingReleaseRef.current = false;
        decideStopRef.current();
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      showToast({ error: 'Could not start recording — try again.' }, 5000);
    } finally {
      setIsBusy(false);
    }
  }, [activeSession?.startedAt, isBusy, requestPermission, showToast, status]);

  const stopRecording = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording) return;
    recordingRef.current = null;
    setIsRecording(false);
    setIsBusy(true);

    try {
      if (!user?.id) {
        showToast({ error: 'You must be logged in to save recordings.' }, 5000);
        return;
      }
      let uri = null;
      try {
        await recording.stopAndUnloadAsync();
        uri = recording.getURI();
        hapticStop();
      } catch (stopError) {
        console.error('Failed to stop recording:', stopError);
        showToast({ error: 'Could not read the recording — try again.' }, 5000);
        return;
      }
      if (!uri) {
        showToast({ error: 'Recording file not found — try again.' }, 5000);
        return;
      }

      let recordingId;
      try {
        recordingId = Crypto.randomUUID();
      } catch {
        recordingId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      }

      const capturedDuration = recordingDuration;
      const capturedSet = selectedSet;
      const capturedOffset = setOffsetSeconds ?? 0;
      const capturedSessionId = activeSession?.id ?? null;
      const timestamp = new Date().toISOString();
      setSetOffsetSeconds(null);

      noteCountRef.current += 1;
      const noteNum = noteCountRef.current;
      setNoteCount(noteNum);
      setProcessingCount((c) => c + 1);

      // upload + transcribe in the background so the coach can keep watching the court
      (async () => {
        try {
          const { url: audioUrl, error: uploadError } = await uploadRecording(user.id, recordingId, uri);
          if (uploadError || !audioUrl) {
            console.error('Upload error:', uploadError);
            showToast({ error: 'Upload failed — check your connection and try again.' }, 6000);
            return;
          }
          const { data: record, error: dbError } = await createRecordingRecord({
            id: recordingId,
            user_id: user.id,
            game_session_id: capturedSessionId,
            audio_url: audioUrl,
            duration: capturedDuration,
            timestamp,
            manual_notes: serializeRecordingNotes('', [
              { label: `Set ${capturedSet}`, offsetSeconds: capturedOffset, createdAt: timestamp },
            ]),
          });
          if (dbError || !record) {
            console.error('Database error:', dbError);
            showToast({ error: 'Saved audio but the database save failed.' }, 6000);
            return;
          }
          const result = await processRecording(recordingId, user.id);
          if (result.success) {
            const parsed = parseAiLabels(result.label ?? null);
            const player = parsed.taggedPlayers?.[0];
            const tag = parsed.skillCategory ? SKILL_CATEGORY_LABELS[parsed.skillCategory] : null;
            showToast({
              num: noteNum,
              title: parsed.displayLabel || 'Note captured',
              meta: [player, tag, `Set ${capturedSet}`].filter(Boolean).join(' · '),
            });
          } else {
            showToast({
              num: noteNum,
              title: 'Note saved',
              meta: `Set ${capturedSet} · transcription failed — audio is safe`,
            });
          }
        } catch (err) {
          console.error('Background processing error:', err);
          showToast({ error: 'Upload failed — the note will sync when connection returns.' }, 6000);
        } finally {
          setProcessingCount((c) => Math.max(0, c - 1));
        }
      })();
    } finally {
      setIsBusy(false);
    }
  }, [activeSession?.id, recordingDuration, selectedSet, setOffsetSeconds, showToast, user?.id]);

  // whole-screen tap target: tap starts, tap again stops; a genuine hold
  // records walkie-talkie style and stops on release. Only blocks on an
  // in-flight start/stop or an already-running recording — a prior note
  // still uploading/transcribing in the background must never block the
  // next capture, or back-to-back plays get silently dropped.
  const onSurfaceDown = () => {
    if (isBusy || recordingRef.current) {
      pressAtRef.current = 0;
      return;
    }
    pressAtRef.current = Date.now();
    armedRef.current = false;
    pendingReleaseRef.current = false;
    startRecording();
  };
  const decideStop = () => {
    if (pressAtRef.current && Date.now() - pressAtRef.current < 350 && !armedRef.current) {
      armedRef.current = true; // it was a tap — keep recording until the next tap
      return;
    }
    armedRef.current = false;
    stopRecording();
  };
  decideStopRef.current = decideStop;
  const onSurfaceUp = () => {
    if (!recordingRef.current) {
      // mic is still initializing (Audio.Recording.createAsync hasn't
      // resolved yet) — apply this release once it has, so a fast
      // press-and-release before the mic is ready still stops correctly
      pendingReleaseRef.current = true;
      return;
    }
    decideStop();
  };

  const endGame = () => {
    showAlert('End game?', 'Capture stops and you can review the notes.', [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'End game',
        style: 'destructive',
        onPress: async () => {
          if (recordingRef.current) await stopRecording();
          const sessionId = activeSession?.id;
          clearActiveSession();
          if (sessionId) {
            router.replace(`/(tabs)/review/game/${sessionId}`);
          } else {
            router.replace('/(tabs)/review');
          }
        },
      },
    ]);
  };

  // On react-native-web, a Pressable's onPressIn can still fire on a tap
  // that lands on a nested TouchableOpacity (End game, set chips) since the
  // two components use different responder implementations — stop it there
  // so tapping a control doesn't also start a stray recording.
  const swallow = (e) => e?.stopPropagation?.();

  const idleHint =
    status !== 'granted'
      ? 'Tap anywhere to allow the microphone'
      : noteCount === 0
        ? 'Eyes on the court. Say what you saw.'
        : 'Ready for the next one.';

  return (
    <Pressable style={styles.container} onPressIn={onSurfaceDown} onPressOut={onSurfaceUp}>
      {/* top row */}
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.endBtn}
          onPress={endGame}
          onPressIn={swallow}
          onPressOut={swallow}
          activeOpacity={0.7}
        >
          <Text style={styles.endBtnText}>End game</Text>
        </TouchableOpacity>
        <View style={styles.liveRow}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE · {formatDuration(liveSec)}</Text>
        </View>
      </View>

      <Text style={styles.opponent}>vs. {activeSession?.opponentName ?? 'Current Game'}</Text>

      {/* set switcher */}
      <View style={styles.setRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.setChip, selectedSet === n && styles.setChipActive]}
            onPress={() => setSelectedSet(n)}
            onPressIn={swallow}
            onPressOut={swallow}
            activeOpacity={0.8}
          >
            <Text style={[styles.setChipText, selectedSet === n && styles.setChipTextActive]}>
              {n}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* record zone */}
      <View style={styles.recordZone}>
        {isRecording ? (
          <View style={styles.waveRow}>
            {WAVE_BARS.map((i) => (
              <WaveBar key={i} index={i} />
            ))}
          </View>
        ) : (
          <View style={styles.hintBox}>
            <Text style={styles.hintText}>{isProcessing ? '' : idleHint}</Text>
          </View>
        )}

        <View style={styles.recordButtonWrap} pointerEvents="none">
          <PulseRing active={isRecording} />
          <View style={[styles.recordButton, isRecording && styles.recordButtonActive]}>
            {isRecording ? (
              <Square size={64} color="#fff" fill="#fff" strokeWidth={0} />
            ) : (
              <Mic size={72} color="#fff" strokeWidth={1.6} />
            )}
            <Text style={styles.recordButtonText}>
              {isRecording ? 'Tap anywhere to stop' : 'Tap anywhere'}
            </Text>
            {isRecording && (
              <Text style={styles.recordButtonClock}>{formatDuration(recordingDuration)}</Text>
            )}
          </View>
        </View>

        <View style={styles.statusSlot}>
          {isProcessing && !toast && (
            <View style={styles.processingRow}>
              <ActivityIndicator size="small" color={Brand.green} />
              <Text style={styles.processingText}>Transcribing…</Text>
            </View>
          )}
          {toast && !isRecording && (
            <View style={styles.toast}>
              {toast.error ? (
                <Text style={styles.toastError}>⚠️ {toast.error}</Text>
              ) : (
                <>
                  <View style={styles.toastNum}>
                    <Text style={styles.toastNumText}>{toast.num}</Text>
                  </View>
                  <View style={styles.toastInfo}>
                    <Text style={styles.toastTitle} numberOfLines={1}>
                      {toast.title}
                    </Text>
                    {!!toast.meta && <Text style={styles.toastMeta}>{toast.meta}</Text>}
                  </View>
                  <Check size={16} color={Brand.successCheck} strokeWidth={2.6} />
                </>
              )}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.bg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  endBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.muted,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Brand.recordRed,
  },
  liveText: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.ink,
  },
  opponent: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: Brand.ink,
    textAlign: 'center',
    marginTop: 10,
  },
  setRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 14,
  },
  setChip: {
    width: 52,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setChipActive: {
    backgroundColor: Brand.green,
    borderColor: Brand.green,
  },
  setChipText: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.muted,
  },
  setChipTextActive: {
    color: '#fff',
  },
  recordZone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 26,
    paddingHorizontal: 28,
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    height: 44,
  },
  waveBar: {
    width: 6,
    height: 44,
    borderRadius: 3,
    backgroundColor: Brand.recordRed,
  },
  hintBox: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    fontSize: 14,
    fontWeight: '500',
    color: Brand.muted,
  },
  recordButtonWrap: {
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Brand.recordRed,
  },
  recordButton: {
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Brand.green,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 12,
  },
  recordButtonActive: {
    backgroundColor: Brand.recordRed,
    shadowOpacity: 0,
    elevation: 0,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  recordButtonClock: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '700',
  },
  statusSlot: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  processingText: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.muted,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Brand.card,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    maxWidth: 330,
  },
  toastNum: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(64,97,58,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastNumText: {
    fontSize: 12,
    fontWeight: '800',
    color: Brand.greenLightInk,
  },
  toastInfo: {
    minWidth: 0,
    flexShrink: 1,
  },
  toastTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Brand.ink,
  },
  toastMeta: {
    fontSize: 12,
    color: Brand.muted,
  },
  toastError: {
    fontSize: 13,
    fontWeight: '600',
    color: Brand.danger,
    flexShrink: 1,
  },
});
