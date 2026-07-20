/**
 * Shared state machine for the "scan a photo/screenshot" flow used by both
 * Add Game (schedule) and Roster (players): pick a photo → run it through a
 * vision parser → review/exclude rows before the caller saves them.
 */
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { showAlert } from '@/lib/alert';

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

  const pickImage = async (useCamera) => {
    try {
      let result;
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          showAlert('Camera access needed', `Allow camera access to snap your ${noun}.`);
          return;
        }
        result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          showAlert('Photos access needed', 'Allow photo access to upload a screenshot.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
      }
      const asset = result?.assets?.[0];
      if (!asset?.uri) return;

      setStage('processing');
      const { items, error } = await parseImage({ uri: asset.uri, mimeType: asset.mimeType });
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
