/**
 * AlertHost — mounted once at the app root. Renders a centered, brand-styled
 * dialog (dimmed backdrop, white card, pill buttons matching the rest of the
 * app) in place of the native OS alert / browser window.alert/confirm.
 * showAlert() in lib/alert.js drives it imperatively.
 */
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Brand, Shape } from '@/constants/brand';
import { _registerAlertDispatcher } from '@/lib/alert';

export default function AlertHost() {
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    _registerAlertDispatcher(setAlert);
    return () => _registerAlertDispatcher(null);
  }, []);

  const close = useCallback(() => setAlert(null), []);

  if (!alert) return null;

  const buttons = alert.buttons?.length ? alert.buttons : [{ text: 'OK' }];
  const cancelBtn = buttons.find((b) => b.style === 'cancel');
  const actionBtns = buttons.filter((b) => b !== cancelBtn);

  const press = (btn) => {
    close();
    btn.onPress?.();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => press(cancelBtn ?? {})} />
        <View style={styles.card}>
          <Text style={styles.title}>{alert.title}</Text>
          {!!alert.message && <Text style={styles.message}>{alert.message}</Text>}
          <View style={styles.actions}>
            {actionBtns.map((btn, i) => (
              <Pressable
                key={i}
                onPress={() => press(btn)}
                style={({ pressed }) => [
                  styles.btn,
                  btn.style === 'destructive' ? styles.btnDestructive : styles.btnPrimary,
                  pressed && styles.btnPressed,
                ]}
              >
                <Text
                  style={btn.style === 'destructive' ? styles.btnDestructiveText : styles.btnPrimaryText}
                >
                  {btn.text}
                </Text>
              </Pressable>
            ))}
            {cancelBtn && (
              <Pressable
                onPress={() => press(cancelBtn)}
                style={({ pressed }) => [styles.cancelBtn, pressed && styles.btnPressed]}
              >
                <Text style={styles.cancelText}>{cancelBtn.text}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,12,16,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Brand.card,
    borderRadius: Shape.cardRadius,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 20,
    alignItems: 'center',
    ...Shape.cardShadow,
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: Brand.ink,
    textAlign: 'center',
  },
  message: {
    fontSize: 14.5,
    lineHeight: 20,
    color: Brand.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  actions: {
    width: '100%',
    marginTop: 20,
    gap: 10,
  },
  btn: {
    width: '100%',
    height: 50,
    borderRadius: Shape.smallButtonRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.8,
  },
  btnPrimary: {
    backgroundColor: Brand.green,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 15.5,
    fontWeight: '700',
  },
  btnDestructive: {
    backgroundColor: Brand.card,
    borderWidth: 1.5,
    borderColor: Brand.danger,
  },
  btnDestructiveText: {
    color: Brand.danger,
    fontSize: 15.5,
    fontWeight: '700',
  },
  cancelBtn: {
    width: '100%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: Brand.muted,
    fontSize: 15,
    fontWeight: '600',
  },
});
