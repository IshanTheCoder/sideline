import { Alert, Platform } from 'react-native';

/**
 * Cross-platform alert that works on iOS, Android, AND web.
 * On native it delegates to React Native's Alert.alert.
 * On web it falls back to window.confirm / window.alert because
 * RN's Alert.alert is a no-op in the browser.
 */
export function showAlert(title, message, buttons) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  if (!buttons || buttons.length === 0) {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }

  const cancel = buttons.find((b) => b.style === 'cancel');
  const destructive = buttons.find((b) => b.style === 'destructive');
  const primary = buttons.find((b) => b !== cancel && b !== destructive) ?? destructive;

  if (buttons.length === 1) {
    window.alert(message ? `${title}\n\n${message}` : title);
    buttons[0].onPress?.();
    return;
  }

  const confirmed = window.confirm(message ? `${title}\n\n${message}` : title);
  if (confirmed) {
    (primary ?? destructive)?.onPress?.();
  } else {
    cancel?.onPress?.();
  }
}
