import { Alert, Platform } from 'react-native';

/**
 * Universal alert that works everywhere — iOS, Android, AND web, no sweat.
 * On native we use React Native's built-in Alert (the easy W).
 * On web we fall back to window.confirm / window.alert (not pretty, but it gets the job done).
 *
 * Fun catch: window.confirm only gives you "OK" and "Cancel" — zero customization.
 * So we sneak the intended button names into the message body. Janky? Sure. Ships? Absolutely.
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

  // sneak in a cheat sheet so web users know what OK/Cancel actually mean
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
