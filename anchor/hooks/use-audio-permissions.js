import { useState, useEffect, useCallback } from 'react';
import { Alert, Platform, Linking } from 'react-native';
import { Audio } from 'expo-av';

/**
 * Hook to manage audio recording permissions
 * 
 * Returns an object with:
 * - status: 'undetermined' | 'granted' | 'denied'
 * - requestPermission: function to request permission
 * - isLoading: boolean indicating if permission request is in progress
 * 
 * Example:
 * ```
 * const { status, requestPermission, isLoading } = useAudioPermissions();
 * 
 * const handleRecord = async () => {
 *   if (status !== 'granted') {
 *     const granted = await requestPermission();
 *     if (!granted) return;
 *   }
 *   // Start recording...
 * };
 * ```
 */
export function useAudioPermissions() {
  const [status, setStatus] = useState('undetermined');
  const [isLoading, setIsLoading] = useState(false);

  // Check current permission status on mount
  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    try {
      const { status: currentStatus } = await Audio.getPermissionsAsync();
      
      if (currentStatus === 'granted') {
        setStatus('granted');
      } else if (currentStatus === 'denied') {
        setStatus('denied');
      } else {
        setStatus('undetermined');
      }
    } catch (error) {
      console.error('Error checking audio permissions:', error);
      setStatus('undetermined');
    }
  };

  const requestPermission = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Request permission
      const { status: requestStatus } = await Audio.requestPermissionsAsync();
      
      if (requestStatus === 'granted') {
        setStatus('granted');
        setIsLoading(false);
        return true;
      } else {
        setStatus('denied');
        setIsLoading(false);
        
        // Show user-friendly message
        showPermissionDeniedAlert();
        return false;
      }
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
      setStatus('denied');
      setIsLoading(false);
      showPermissionDeniedAlert();
      return false;
    }
  }, []);

  const showPermissionDeniedAlert = () => {
    Alert.alert(
      'Microphone Permission Required',
      'Anchor needs access to your microphone to record voice memos. Please enable microphone access in your device settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          },
        },
      ]
    );
  };

  return {
    status,
    requestPermission,
    isLoading,
  };
}
