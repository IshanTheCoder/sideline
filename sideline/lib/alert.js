import { Alert, Platform } from 'react-native';

/**
 * Cross-platform alert that works on iOS, Android, AND web.
 * On native it delegates to React Native's Alert.alert.
 * On web it falls back to window.confirm / window.alert.
 *
 * Because window.confirm only shows generic "OK"/"Cancel" labels, we append
 * the intended button text to the message so users know what each choice does.
 */
export function showAlert(title, message, buttons) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const body = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length === 0) {
    window.alert(body);
    return;
  }

  if (buttons.length === 1) {
    window.alert(body);
    buttons[0].onPress?.();
    return;
  }

  const cancel = buttons.find((b) => b.style === 'cancel');
  const destructive = buttons.find((b) => b.style === 'destructive');
  const primary = buttons.find((b) => b !== cancel && b !== destructive) ?? destructive;

  const actionLabel = (primary ?? destructive)?.text;
  const cancelLabel = cancel?.text ?? 'Cancel';

  // Append a hint mapping browser buttons → intended labels
  let prompt = body;
  if (actionLabel && actionLabel !== 'OK') {
    prompt += `\n\nOK = "${actionLabel}"  ·  Cancel = "${cancelLabel}"`;
  }

  const confirmed = window.confirm(prompt);
  if (confirmed) {
    (primary ?? destructive)?.onPress?.();
  } else {
    cancel?.onPress?.();
  }
}
