/**
 * AddGameSheet — bottom sheet for adding games to the schedule. Two modes:
 * manual entry (opponent / date / time / Home-Away) and "Scan schedule",
 * which runs a photo or screenshot through the Groq vision importer and
 * shows a review list where individual games can be excluded before saving.
 */
import { Camera, Check, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  unstable_createElement,
} from 'react-native';
import BottomSheet from '@/components/BottomSheet';
import { Brand } from '@/constants/brand';
import { useScreenshotScan } from '@/hooks/use-screenshot-scan';
import { createScheduledGame } from '@/lib/gameSessions';
import { format12hTime, gameDateParts, parseFlexibleDate } from '@/lib/scheduleFormat';
import { parseScheduleFromScreenshot } from '@/lib/scheduleScreenshotImport';
import { showAlert } from '@/lib/alert';

const parseScheduleImage = async (imageAsset) => {
  const { games, error } = await parseScheduleFromScreenshot(imageAsset);
  return { items: games, error };
};

// On web, react-native-web can render real DOM nodes — use the browser's own
// date/time pickers instead of freeform text. Native falls back to TextInput.
const isWebPicker = Platform.OS === 'web' && typeof unstable_createElement === 'function';

// Extra CSS the DOM input needs that RN styles don't cover (kept out of
// StyleSheet.create so native never sees web-only properties).
const webPickerCss = {
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  colorScheme: 'light',
};

function WebPickerInput({ type, value, onChange }) {
  return unstable_createElement('input', {
    type,
    value,
    onChange: (e) => onChange(e.target.value),
    style: [styles.input, webPickerCss],
  });
}

export default function AddGameSheet({ visible, onClose, teamId, onAdded }) {
  const [mode, setMode] = useState('manual'); // 'manual' | 'scan'
  const [opponent, setOpponent] = useState('');
  const [dateText, setDateText] = useState('');
  const [timeText, setTimeText] = useState('');
  const [venue, setVenue] = useState('');
  const [saving, setSaving] = useState(false);
  const scan = useScreenshotScan(parseScheduleImage, 'schedule');

  const reset = () => {
    setMode('manual');
    setOpponent('');
    setDateText('');
    setTimeText('');
    setVenue('');
    scan.reset();
    setSaving(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const canSave = opponent.trim().length > 0 && !saving;

  const saveManual = async () => {
    if (!canSave || !teamId) return;
    setSaving(true);
    // Web pickers emit machine formats (YYYY-MM-DD / HH:MM); native text stays freeform.
    const { error } = await createScheduledGame({
      teamId,
      opponentName: opponent.trim(),
      date: isWebPicker
        ? (dateText ? new Date(`${dateText}T00:00:00`) : new Date())
        : (parseFlexibleDate(dateText) ?? new Date()),
      time: isWebPicker ? format12hTime(timeText) : (timeText.trim() || null),
      venue: venue || null,
    });
    setSaving(false);
    if (error) {
      showAlert('Could not add game', error.message);
      return;
    }
    onAdded?.();
    close();
  };

  const confirmScan = async () => {
    if (!teamId || scan.includedCount === 0 || saving) return;
    setSaving(true);
    let failed = 0;
    let skippedNoDate = 0;
    for (const g of scan.included()) {
      // don't silently misdate a game the scan couldn't read a date for —
      // ask the coach to add it manually instead of defaulting to today
      if (!g.date) {
        skippedNoDate++;
        continue;
      }
      const { error } = await createScheduledGame({
        teamId,
        opponentName: g.opponent,
        date: g.date,
        time: g.time || null,
        venue: g.venue || null,
      });
      if (error) failed++;
    }
    setSaving(false);
    const notes = [];
    if (failed > 0) notes.push(`${failed} game${failed === 1 ? '' : 's'} could not be saved.`);
    if (skippedNoDate > 0) {
      notes.push(
        `${skippedNoDate} game${skippedNoDate === 1 ? '' : 's'} had no readable date — add ${
          skippedNoDate === 1 ? 'it' : 'them'
        } manually.`
      );
    }
    if (notes.length > 0) showAlert('Some games need attention', notes.join(' '));
    onAdded?.();
    close();
  };

  return (
    <BottomSheet visible={visible} onClose={close} maxHeightPct={0.88}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Add games</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={close} activeOpacity={0.7}>
          <X size={13} color={Brand.chip} strokeWidth={2.6} />
        </TouchableOpacity>
      </View>

      {/* segmented toggle */}
      <View style={styles.segment}>
        {[
          { key: 'manual', label: 'Enter manually' },
          { key: 'scan', label: 'Scan schedule' },
        ].map((m) => (
          <TouchableOpacity
            key={m.key}
            style={[styles.segmentBtn, mode === m.key && styles.segmentBtnActive]}
            onPress={() => setMode(m.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, mode === m.key && styles.segmentTextActive]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode === 'manual' && (
        <View>
          <Text style={styles.fieldLabel}>OPPONENT</Text>
          <TextInput
            value={opponent}
            onChangeText={setOpponent}
            placeholder="e.g. Ridgefield"
            placeholderTextColor={Brand.faint}
            style={styles.input}
          />
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Text style={styles.fieldLabel}>DATE</Text>
              {isWebPicker ? (
                <WebPickerInput type="date" value={dateText} onChange={setDateText} />
              ) : (
                <TextInput
                  value={dateText}
                  onChangeText={setDateText}
                  placeholder="Jul 20"
                  placeholderTextColor={Brand.faint}
                  style={styles.input}
                />
              )}
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.fieldLabel}>TIME</Text>
              {isWebPicker ? (
                <WebPickerInput type="time" value={timeText} onChange={setTimeText} />
              ) : (
                <TextInput
                  value={timeText}
                  onChangeText={setTimeText}
                  placeholder="6:00 PM"
                  placeholderTextColor={Brand.faint}
                  style={styles.input}
                />
              )}
            </View>
          </View>
          <Text style={styles.fieldLabel}>LOCATION</Text>
          <View style={styles.chipRow}>
            {['Home', 'Away'].map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.venueChip, venue === v && styles.venueChipActive]}
                onPress={() => setVenue(v)}
                activeOpacity={0.8}
              >
                <Text style={[styles.venueChipText, venue === v && styles.venueChipTextActive]}>
                  {v}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={saveManual}
            activeOpacity={0.85}
            disabled={!canSave}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Add Game</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {mode === 'scan' && scan.stage === 'pick' && (
        <View>
          <View style={styles.dropCard}>
            <View style={styles.dropIconCircle}>
              <Camera size={24} color={Brand.green} strokeWidth={1.8} />
            </View>
            <Text style={styles.dropTitle}>Photo or screenshot of your schedule</Text>
            <Text style={styles.dropSub}>
              Snap the printed schedule or upload a screenshot, Sideline reads every game at once.
            </Text>
          </View>
          <View style={styles.scanBtnRow}>
            <TouchableOpacity style={styles.scanBtnPrimary} onPress={() => scan.pickImage(true)} activeOpacity={0.85}>
              <Text style={styles.scanBtnPrimaryText}>Take photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.scanBtnOutline} onPress={() => scan.pickImage(false)} activeOpacity={0.85}>
              <Text style={styles.scanBtnOutlineText}>Upload screenshot</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {mode === 'scan' && scan.stage === 'processing' && (
        <View style={styles.processing}>
          <ActivityIndicator size="large" color={Brand.green} />
          <Text style={styles.processingTitle}>Reading schedule…</Text>
          <Text style={styles.processingSub}>Extracting opponents, dates, times</Text>
        </View>
      )}

      {mode === 'scan' && scan.stage === 'review' && (
        <View>
          <Text style={styles.reviewHint}>
            Found {scan.results.length} game{scan.results.length === 1 ? '' : 's'}, tap to exclude any.
          </Text>
          <View style={styles.reviewList}>
            {scan.results.map((g, i) => {
              const off = scan.excluded.includes(i);
              const parts = gameDateParts(g.date);
              return (
                <TouchableOpacity
                  key={`${g.opponent}-${i}`}
                  style={[styles.reviewRow, off && styles.reviewRowOff]}
                  onPress={() => scan.toggleExcluded(i)}
                  activeOpacity={0.8}
                >
                  <View style={styles.reviewDateChip}>
                    <Text style={styles.reviewDateMon}>{parts.mon}</Text>
                    <Text style={styles.reviewDateDay}>{parts.day || '—'}</Text>
                  </View>
                  <View style={styles.reviewInfo}>
                    <Text style={styles.reviewOpp}>vs. {g.opponent}</Text>
                    <Text style={styles.reviewWhen}>
                      {[g.date ? parts.label : 'Date TBD', g.time, g.venue].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  {off ? (
                    <View style={styles.excludeRing} />
                  ) : (
                    <View style={styles.includeCheck}>
                      <Check size={12} color="#fff" strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.saveBtn, (scan.includedCount === 0 || saving) && styles.saveBtnDisabled]}
            onPress={confirmScan}
            activeOpacity={0.85}
            disabled={scan.includedCount === 0 || saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>
                Add {scan.includedCount} game{scan.includedCount === 1 ? '' : 's'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: Brand.ink,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segment: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: Brand.hairline,
    borderRadius: 14,
    padding: 4,
    marginTop: 16,
  },
  segmentBtn: {
    flex: 1,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: Brand.card,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.muted,
  },
  segmentTextActive: {
    color: Brand.ink,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: Brand.muted,
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: Brand.border2,
    borderRadius: 14,
    paddingHorizontal: 15,
    fontSize: 16,
    color: Brand.ink,
    backgroundColor: Brand.card,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  venueChip: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.border2,
    backgroundColor: Brand.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  venueChipActive: {
    backgroundColor: Brand.green,
    borderColor: Brand.green,
  },
  venueChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.ink,
  },
  venueChipTextActive: {
    color: '#fff',
  },
  saveBtn: {
    marginTop: 22,
    width: '100%',
    height: 54,
    borderRadius: 18,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: Brand.chevron,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  dropCard: {
    marginTop: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Brand.dashed,
    borderRadius: 20,
    paddingVertical: 34,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
    backgroundColor: Brand.cardHover,
  },
  dropIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(64,97,58,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.ink,
    textAlign: 'center',
  },
  dropSub: {
    fontSize: 13,
    color: Brand.muted,
    textAlign: 'center',
    lineHeight: 19.5,
  },
  scanBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  scanBtnPrimary: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtnPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  scanBtnOutline: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Brand.borderBtn,
    backgroundColor: Brand.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtnOutlineText: {
    color: Brand.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  processing: {
    marginTop: 16,
    paddingVertical: 44,
    alignItems: 'center',
    gap: 14,
  },
  processingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.ink,
  },
  processingSub: {
    fontSize: 13,
    color: Brand.muted,
  },
  reviewHint: {
    fontSize: 13,
    color: Brand.muted,
    marginTop: 14,
  },
  reviewList: {
    gap: 8,
    marginTop: 12,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: Brand.card,
    borderWidth: 1,
    borderColor: Brand.greenPaleSub,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  reviewRowOff: {
    backgroundColor: Brand.cardHover,
    borderColor: '#EDECE7',
    opacity: 0.45,
  },
  reviewDateChip: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Brand.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewDateMon: {
    fontSize: 9,
    fontWeight: '700',
    color: Brand.green,
  },
  reviewDateDay: {
    fontSize: 16,
    fontWeight: '800',
    color: Brand.ink,
    lineHeight: 17,
  },
  reviewInfo: {
    flex: 1,
    minWidth: 0,
  },
  reviewOpp: {
    fontSize: 15,
    fontWeight: '700',
    color: Brand.ink,
  },
  reviewWhen: {
    fontSize: 12.5,
    color: Brand.muted,
  },
  includeCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  excludeRing: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.8,
    borderColor: Brand.chevron,
  },
});
