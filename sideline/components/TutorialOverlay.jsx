/**
 * TutorialOverlay — the first-run walkthrough. Dims the screen, cuts a
 * spotlight around one real UI element at a time, and explains it in a dark
 * bubble that points at the element.
 *
 * It only *points*. Nothing navigates and nothing is pressable underneath, so a
 * brand-new coach finishes the tour on the same screen they started on instead
 * of being dragged through four screens.
 *
 * Targets are passed in as refs to the live elements and measured in window
 * coordinates, so the spotlight follows the real layout rather than hardcoded
 * positions (and survives web's centered mobile column, rotation, and resize).
 *
 * Usage:
 *   const rosterRef = useRef(null);
 *   <TouchableOpacity ref={rosterRef} ... />
 *   <TutorialOverlay
 *     visible={show}
 *     steps={[{ key: 'roster', ref: rosterRef, shape: 'circle', title, body }]}
 *     onFinish={() => ...}
 *   />
 */
import { ArrowRight, Check } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Brand } from '@/constants/brand';

const HOLE_PAD = 8; // breathing room between the element and the spotlight ring
const BUBBLE_GAP = 10; // spotlight -> caret tip
const CARET_W = 18;
const CARET_H = 9;
const BUBBLE_MAX_W = 320;
const EDGE = 16; // smallest gap the bubble keeps from the window edge
const CARET_INSET = 18; // keeps the caret away from the bubble's rounded corners

// A freshly mounted element can measure 0x0 for a frame or two (and web's
// layout settles a tick after the modal opens), so retry before giving up and
// falling back to a centered bubble with no spotlight.
const MEASURE_RETRIES = 6;
const MEASURE_RETRY_MS = 60;

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

export default function TutorialOverlay({ visible, steps = [], onFinish }) {
  const { width: winW, height: winH } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [bubbleH, setBubbleH] = useState(0);
  const measureRun = useRef(0);

  const step = steps[index];
  const isLast = index >= steps.length - 1;
  // The ref object is stable across renders even when callers rebuild the steps
  // array inline, so measurement keys off it rather than off `step`.
  const targetRef = step?.ref;

  // Restart from step one each time the tour opens.
  useEffect(() => {
    if (visible) {
      setIndex(0);
      setBubbleH(0);
    }
  }, [visible]);

  const measure = useCallback(() => {
    const node = targetRef?.current;
    measureRun.current += 1;
    const run = measureRun.current;

    if (!node?.measureInWindow) {
      setRect(null);
      return;
    }

    let attempts = 0;
    const attempt = () => {
      if (run !== measureRun.current) return; // a newer step is being measured
      node.measureInWindow((x, y, width, height) => {
        if (run !== measureRun.current) return;
        if (width > 0 && height > 0) {
          setRect({ x, y, width, height });
        } else if (++attempts < MEASURE_RETRIES) {
          setTimeout(attempt, MEASURE_RETRY_MS);
        } else {
          setRect(null);
        }
      });
    };
    attempt();
  }, [targetRef]);

  // Re-measure on every step and whenever the window changes size.
  useEffect(() => {
    if (!visible) return;
    measure();
  }, [visible, measure, winW, winH]);

  if (!visible || !step) return null;

  const finish = () => {
    measureRun.current += 1; // stop any in-flight measurement
    onFinish?.();
  };

  const next = () => {
    if (isLast) {
      finish();
      return;
    }
    // The last known height carries over as the placement estimate — onLayout
    // corrects it if this step's copy is taller. Deliberately not reset to 0:
    // onLayout doesn't fire when a step happens to lay out identically, which
    // would leave the bubble stuck invisible.
    setIndex((i) => i + 1);
  };

  const hole = rect
    ? {
        x: rect.x - HOLE_PAD,
        y: rect.y - HOLE_PAD,
        w: rect.width + HOLE_PAD * 2,
        h: rect.height + HOLE_PAD * 2,
      }
    : null;

  const holeRadius = hole
    ? step.shape === 'circle'
      ? hole.h / 2
      : (step.radius ?? 16) + HOLE_PAD
    : 0;

  // Bubble placement: below the spotlight when it fits, above otherwise.
  const bubbleW = Math.min(BUBBLE_MAX_W, winW - EDGE * 2);
  const centerX = hole ? hole.x + hole.w / 2 : winW / 2;
  const bubbleLeft = clamp(centerX - bubbleW / 2, EDGE, Math.max(EDGE, winW - EDGE - bubbleW));

  const offset = CARET_H + BUBBLE_GAP;
  const fitsBelow = hole ? hole.y + hole.h + offset + bubbleH <= winH - EDGE : true;
  const fitsAbove = hole ? hole.y - offset - bubbleH >= EDGE : false;
  const placeBelow = fitsBelow || !fitsAbove;
  const bubbleTop = hole
    ? placeBelow
      ? hole.y + hole.h + offset
      : hole.y - offset - bubbleH
    : Math.max(EDGE, (winH - bubbleH) / 2);

  const caretLeft = clamp(
    centerX - bubbleLeft - CARET_W / 2,
    CARET_INSET,
    Math.max(CARET_INSET, bubbleW - CARET_INSET - CARET_W)
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={finish}>
      <View style={styles.root} accessibilityViewIsModal>
        {/* Dim everything except the spotlight. Four rects around the hole beat
            an SVG mask: no extra dependency and it renders identically on web. */}
        {hole ? (
          <>
            <View pointerEvents="none" style={[styles.dim, { top: 0, left: 0, right: 0, height: Math.max(0, hole.y) }]} />
            <View
              pointerEvents="none"
              style={[styles.dim, { top: hole.y + hole.h, left: 0, right: 0, bottom: 0 }]}
            />
            <View
              pointerEvents="none"
              style={[styles.dim, { top: hole.y, left: 0, width: Math.max(0, hole.x), height: hole.h }]}
            />
            <View
              pointerEvents="none"
              style={[styles.dim, { top: hole.y, left: hole.x + hole.w, right: 0, height: hole.h }]}
            />
          </>
        ) : (
          <View pointerEvents="none" style={[styles.dim, StyleSheet.absoluteFillObject]} />
        )}

        {/* Tap anywhere to continue — the spotlighted control stays inert. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={next}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Finish tutorial' : 'Next tip'}
        />

        {hole && (
          <View
            pointerEvents="none"
            style={[
              styles.ring,
              { top: hole.y, left: hole.x, width: hole.w, height: hole.h, borderRadius: holeRadius },
            ]}
          />
        )}

        <View
          style={[
            styles.bubble,
            {
              top: bubbleTop,
              left: bubbleLeft,
              width: bubbleW,
              // Hold the first bubble back for the frame it takes to learn its
              // own height, otherwise an above-the-spotlight bubble jumps.
              opacity: bubbleH ? 1 : 0,
            },
          ]}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            setBubbleH((prev) => (Math.abs(prev - h) > 0.5 ? h : prev));
          }}
        >
          {hole && (
            <View
              pointerEvents="none"
              style={[
                styles.caret,
                placeBelow
                  ? [styles.caretUp, { top: -CARET_H, left: caretLeft }]
                  : [styles.caretDown, { bottom: -CARET_H, left: caretLeft }],
              ]}
            />
          )}

          <Text style={styles.counter}>
            {index + 1} OF {steps.length}
          </Text>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.body}>{step.body}</Text>

          <View style={styles.footer}>
            <View style={styles.dots}>
              {steps.map((s, i) => (
                <View key={s.key ?? i} style={[styles.dot, i === index && styles.dotActive]} />
              ))}
            </View>
            <View style={styles.actions}>
              {!isLast && (
                <Pressable onPress={finish} hitSlop={8} accessibilityRole="button">
                  <Text style={styles.skip}>Skip</Text>
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [styles.nextBtn, pressed && styles.nextBtnPressed]}
                onPress={next}
                accessibilityRole="button"
                accessibilityLabel={isLast ? 'Got it' : 'Next tip'}
              >
                {isLast ? (
                  <Check size={18} color="#fff" strokeWidth={2.6} />
                ) : (
                  <ArrowRight size={18} color="#fff" strokeWidth={2.6} />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  dim: {
    position: 'absolute',
    backgroundColor: 'rgba(22, 24, 29, 0.74)',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  bubble: {
    position: 'absolute',
    backgroundColor: Brand.ink,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
  },
  caret: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: CARET_W / 2,
    borderRightWidth: CARET_W / 2,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  caretUp: {
    borderBottomWidth: CARET_H,
    borderBottomColor: Brand.ink,
  },
  caretDown: {
    borderTopWidth: CARET_H,
    borderTopColor: Brand.ink,
  },
  counter: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: Brand.greenPale,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: '#fff',
    marginTop: 5,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: Brand.onDarkMuted,
    marginTop: 5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  dotActive: {
    width: 18,
    backgroundColor: Brand.greenLightInk,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  skip: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.onDarkMuted,
  },
  nextBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnPressed: {
    backgroundColor: Brand.greenHover,
  },
});
