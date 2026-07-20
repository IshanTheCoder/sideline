/**
 * Shared state machine for the "scan a photo/screenshot" flow used by both
 * Add Game (schedule) and Roster (players): pick a photo → run it through a
 * vision parser → review/exclude rows before the caller saves them.
 */
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { showAlert } from '@/lib/alert';

// Full camera-roll photos (often 3000-4000px wide) make for a slow round trip:
// a bigger base64 payload takes longer to upload, and vision models tokenize
// (and price) by image resolution, so inference is slower too. The schedule/
// roster text stays perfectly legible well below this, so shrink anything
// larger before it ever leaves the device.
const MAX_SCAN_WIDTH = 1400;

// Screenshots are commonly PNG, which is lossless and often huge for a busy
// graphic (one real schedule photo: 1.9MB PNG -> 165KB JPEG at this quality,
// same pixel dimensions, same extraction result). Re-encoding to JPEG shrinks
// the upload dramatically even when the image is already under MAX_SCAN_WIDTH.
const SCAN_COMPRESSION = 0.7;

/**
 * @param {(imageAsset: {uri: string, mimeType?: string}) => Promise<{items: Array<object>, error: Error|null}>} parseImage
 * @param {string} noun - what's being scanned, for alert copy (e.g. "roster", "schedule")
 */
export function useScreenshotScan(parseImage, noun) {
  const [stage, setStage] = useState('pick'); // 'pick' | 'processing' | 'review'
  const [results, setResults] = useState([]);
  const [excluded, setExcluded] = useState([]);

  const reset = () => {
    setStage('pick');
    setResults([]);
    setExcluded([]);
  };

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showAlert('Photos access needed', 'Allow photo access to upload a screenshot.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
      const asset = result?.assets?.[0];
      if (!asset?.uri) return;

      setStage('processing');

      let imageAsset = { uri: asset.uri, mimeType: asset.mimeType };
      try {
        const actions = asset.width > MAX_SCAN_WIDTH ? [{ resize: { width: MAX_SCAN_WIDTH } }] : [];
        const compressed = await ImageManipulator.manipulateAsync(asset.uri, actions, {
          compress: SCAN_COMPRESSION,
          format: ImageManipulator.SaveFormat.JPEG,
        });
        imageAsset = { uri: compressed.uri, mimeType: 'image/jpeg' };
      } catch {
        // fall back to the original image if compression fails for any reason
      }

      const { items, error } = await parseImage(imageAsset);
      if (error || items.length === 0) {
        setStage('pick');
        showAlert(
          `Could not read ${noun}`,
          error?.message ?? `Nothing found in that image — try a clearer photo.`
        );
        return;
      }
      setResults(items);
      setExcluded([]);
      setStage('review');
    } catch (e) {
      setStage('pick');
      showAlert('Scan failed', e?.message ?? 'Something went wrong reading the image.');
    }
  };

  const toggleExcluded = (i) => {
    setExcluded((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  };

  const includedCount = results.length - excluded.length;
  const included = () => results.filter((_, i) => !excluded.includes(i));

  return { stage, results, excluded, includedCount, included, pickImage, toggleExcluded, reset };
}
