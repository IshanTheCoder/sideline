/**
 * BottomSheet — the redesign's shared slide-up sheet: dimmed backdrop,
 * white panel with 28px top corners and a drag-handle bar, spring-in
 * animation. Content scrolls when it exceeds maxHeightPct of the window.
 */
import { useEffect, useRef } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Brand, Shape } from '@/constants/brand';

export default function BottomSheet({ visible, onClose, children, maxHeightPct = 0.86, scrollable = true }) {
  const { height: windowHeight } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(windowHeight)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(windowHeight);
      backdrop.setValue(0);
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 24,
          stiffness: 260,
          mass: 0.9,
        }),
      ]).start();
    }
  }, [visible, windowHeight, translateY, backdrop]);

  if (!visible) return null;

  const Body = scrollable ? ScrollView : View;
  const bodyProps = scrollable
    ? { showsVerticalScrollIndicator: false, keyboardShouldPersistTaps: 'handled' }
    : {};

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            { maxHeight: windowHeight * maxHeightPct, transform: [{ translateY }] },
          ]}
        >
          <View style={styles.handle} />
          <Body {...bodyProps}>{children}</Body>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    // match the app shell's centered mobile column on web
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,12,16,0.45)',
  },
  sheet: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: Brand.card,
    borderTopLeftRadius: Shape.sheetRadius,
    borderTopRightRadius: Shape.sheetRadius,
    paddingTop: 12,
    paddingHorizontal: 22,
    paddingBottom: 34,
  },
  handle: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: Brand.border2,
    alignSelf: 'center',
    marginBottom: 16,
  },
});
