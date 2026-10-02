import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { Canvas, Circle, Group, Rect, Skia, type SkPath } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Easing, useDerivedValue, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { desk, getDay, getLetter, LAST_AUTHORED_DAY } from '../content/loader';
import type { Decision } from '../content/types';
import { isBlackedOut, makeCoverage, strokeOver, type LineCoverage, type Point } from '../logic/censor';
import { flagsOf } from '../logic/dayFlow';
import { DEFAULT_REVEAL, heatTarget, stepHeat } from '../logic/reveal';
import { resolveSegments } from '../logic/variants';
import { useGame } from '../state/store';
import { loopSfx, playSfx } from '../sfx/sfx';

import { BrassPlate } from '../objects/BrassPlate';
import { CalendarLeaf } from '../objects/CalendarLeaf';
import { ContinueCard, RESTART_RECT } from '../objects/ContinueCard';
import { EnvelopeAddress, EnvelopeBody, envelopeSize, LiftShadow, stackPose } from '../objects/Envelope';
import { InspectionSlip } from '../objects/InspectionSlip';
import { Ledger } from '../objects/Ledger';
import { Letter } from '../objects/Letter';
import { inspectPoints, layoutLetter } from '../objects/letterLayout';
import { LockedTray } from '../objects/LockedTray';
import { MoneyNote } from '../objects/MoneyNote';
import { PackageItems } from '../objects/PackageItems';
import { Stamps, stampSlots } from '../objects/Stamps';
import { Candle, CANDLE_R, LENS_R, MagnifierFrame, PEN_LENGTH, RedPen } from '../objects/Tools';

import { DeskBoard, useDeskTexture } from './DeskBoard';
import { FontsBridge, useSceneFonts } from './fonts';
import { clampTo, dist, distToRect, distToSegment, inRotatedRect, stickEnd } from './hit';
import { Lamp } from './Lamp';
import { LightPool, Vignette } from './LightPool';
import { C } from './palette';
import { useFlicker } from './useFlicker';
import { NightWindow } from './Window';
import { fitWorld, inRect, LAYOUT, toWorld, WORLD } from './world';

type Drag =
  | { kind: 'envelope'; id: string; ox: number; oy: number }
  | { kind: 'candle'; ox: number; oy: number }
  | { kind: 'magnifier'; ox: number; oy: number }
  | { kind: 'pen-carry'; start: Point; wasInHand: boolean }
  | { kind: 'pen-stroke'; last: Point; path: SkPath }
  | { kind: 'stamp'; d: Decision; start: Point; timer: ReturnType<typeof setTimeout> }
  | { kind: 'ledger' }
  | { kind: 'restart' };

const PEN_IN_HAND_ANGLE = 0.5;
const STAMP_HOLD_MS = 450;
const TICK_MS = 50;
const INSPECT_RADIUS = 30;
const INSPECT_DWELL_MS = 450;
const BOARD = { x: 0, y: 0, w: WORLD.w, h: WORLD.h };

/** Where a decided letter goes as it leaves the desk. */
const EXIT: Record<Decision, { dx: number; dy: number; rot: number }> = {
  delivered: { dx: 640, dy: -40, rot: 0.18 }, // out to the post bag
  held: { dx: 0, dy: 520, rot: -0.05 }, // into the drawer
  stopped: { dx: -520, dy: 260, rot: -0.22 }, // onto the refused pile
  reported: { dx: 120, dy: -560, rot: 0.1 }, // up to the Şube's folder
};

const haptic = (style: Haptics.ImpactFeedbackStyle) => Haptics.impactAsync(style).catch(() => {});

export function DeskScreen() {
  const { width, height } = useWindowDimensions();
  const fit = useMemo(() => fitWorld(width, height), [width, height]);
  const fonts = useSceneFonts();

  const state = useGame((g) => g.state);
  const savedStrokes = useGame((g) => g.strokes);
  const actions = useGame.getState();

  const day = getDay(state.day)!;
  const openLetter = state.open ? getLetter(state.open) : undefined;
  const progress = state.open ? state.letters[state.open] : undefined;

  // Segments are resolved once, when the envelope is opened; a letter doesn't rewrite itself while read.
  const segments = useMemo(
    () => (openLetter ? resolveSegments(openLetter, flagsOf(state)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [openLetter?.id],
  );
  const layout = useMemo(
    () => (openLetter ? layoutLetter(fonts.provider, openLetter, segments, LAYOUT.letter) : null),
    [fonts.provider, openLetter, segments],
  );
  const strokes = useMemo(
    () => (state.open ? (savedStrokes[state.open] ?? []).map((s) => Skia.Path.MakeFromSVGString(s)).filter((p): p is SkPath => !!p) : []),
    [savedStrokes, state.open],
  );

  // --- animated values -------------------------------------------------------
  const flicker = useFlicker();
  const candleFlicker = useFlicker(3.7);
  const lampLevel = useSharedValue(state.phase === 'desk' ? 1 : 0.3);
  const deskTexture = useDeskTexture(fit.scale);

  const envX = useSharedValue(0);
  const envY = useSharedValue(0);
  const envAngle = useSharedValue(0);

  const letterIn = useSharedValue(state.open ? 1 : 0);
  const letterOut = useSharedValue(0);
  const exitDir = useSharedValue(EXIT.delivered);

  const penX = useSharedValue<number>(LAYOUT.rest.pen.x);
  const penY = useSharedValue<number>(LAYOUT.rest.pen.y);
  const penAngle = useSharedValue<number>(LAYOUT.rest.pen.angle);
  const penLift = useSharedValue(0);

  const candleX = useSharedValue<number>(LAYOUT.rest.candle.x);
  const candleY = useSharedValue<number>(LAYOUT.rest.candle.y);
  const candleLift = useSharedValue(0);

  const magX = useSharedValue<number>(LAYOUT.rest.magnifier.x);
  const magY = useSharedValue<number>(LAYOUT.rest.magnifier.y);
  const magLift = useSharedValue(0);

  const heat = useSharedValue<Record<string, number>>({});
  const livePath = useSharedValue<SkPath>(Skia.Path.Make());
  const stampProgress = useSharedValue(0);
  const slipOpacity = useSharedValue(0);
  const ledgerY = useSharedValue(state.phase === 'ledger' ? 0 : 640);
  const continueOpacity = useSharedValue(state.phase === 'continued' ? 1 : 0);

  // --- React state for things that change what is drawn, not where -------------
  const [dragId, setDragId] = useState<string | null>(null);
  const [pressing, setPressing] = useState<Decision | null>(null);
  const [imprint, setImprint] = useState<Decision | null>(null);
  const [slip, setSlip] = useState<{ note: string; x: number; y: number } | null>(null);

  // --- mutable interaction state ----------------------------------------------
  const drag = useRef<Drag | null>(null);
  const penInHand = useRef(false);
  const exiting = useRef(false);
  const coverage = useRef(new Map<string, LineCoverage[]>());
  const heatLocal = useRef<Record<string, number>>({});
  const dwell = useRef<{ id: string; ms: number } | null>(null);
  const slipShownFor = useRef<string | null>(null);
  const slipHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fresh coverage and heat for each letter that lands on the desk.
  useEffect(() => {
    coverage.current = new Map(
      (layout?.segments ?? []).filter((s) => s.seg.kind !== 'hiddenInk').map((s) => [s.seg.id, makeCoverage(s.lines)]),
    );
    heatLocal.current = {};
    heat.value = {};
    dwell.current = null;
    slipShownFor.current = null;
  }, [layout, heat]);

  useEffect(() => {
    loopSfx('flame', 0.12);
  }, []);

  // --- day phases ---------------------------------------------------------------
  const advance = actions.advance;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    switch (state.phase) {
      case 'desk':
        lampLevel.value = withTiming(1, { duration: 900 });
        ledgerY.value = 640;
        continueOpacity.value = withTiming(0, { duration: 600 });
        break;
      case 'dusk':
        playSfx('drawer', 0.6);
        lampLevel.value = withTiming(0.3, { duration: 3600, easing: Easing.inOut(Easing.quad) });
        timer = setTimeout(advance, 3900);
        break;
      case 'ledger':
        lampLevel.value = withTiming(0.3, { duration: 600 });
        playSfx('paper', 0.7);
        ledgerY.value = withTiming(0, { duration: 900, easing: Easing.out(Easing.cubic) });
        break;
      case 'continued':
        lampLevel.value = withTiming(0.04, { duration: 1600 });
        continueOpacity.value = withTiming(1, { duration: 1600 });
        break;
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [state.phase, advance, lampLevel, ledgerY, continueOpacity]);

  // --- candle heat and magnifier dwell: a slow 20 Hz tick on the JS side --------
  useEffect(() => {
    if (!layout || !openLetter) return;
    const hidden = layout.segments.filter((s) => s.seg.kind === 'hiddenInk' && s.seg.revealBy === 'mum');
    const points = inspectPoints(openLetter, layout);
    const id = openLetter.id;
    const tick = setInterval(() => {
      if (exiting.current) return;
      if (hidden.length) {
        const c = { x: candleX.value, y: candleY.value };
        let changed = false;
        const next = { ...heatLocal.current };
        for (const s of hidden) {
          const d = Math.min(...s.lines.map((l) => distToRect(c, l)));
          const before = next[s.seg.id] ?? 0;
          const after = stepHeat(before, heatTarget(d), TICK_MS / 1000);
          if (after !== before) {
            next[s.seg.id] = after;
            changed = true;
          }
          const p = useGame.getState().state.letters[id];
          if (after >= DEFAULT_REVEAL.readAt && p && !p.revealed.includes(s.seg.id)) {
            useGame.getState().reveal(id, s.seg.id);
            haptic(Haptics.ImpactFeedbackStyle.Soft);
          }
        }
        if (changed) {
          heatLocal.current = next;
          heat.value = next;
        }
      }
      if (points.length) {
        const lens = { x: magX.value, y: magY.value };
        const over = points.find((pt) => dist(lens, pt) < INSPECT_RADIUS);
        if (over) {
          dwell.current = dwell.current?.id === over.id ? { id: over.id, ms: dwell.current.ms + TICK_MS } : { id: over.id, ms: 0 };
          if (dwell.current.ms >= INSPECT_DWELL_MS && slipShownFor.current !== over.id) {
            slipShownFor.current = over.id;
            if (slipHideTimer.current) clearTimeout(slipHideTimer.current);
            setSlip({ note: over.note, x: lens.x, y: lens.y });
            slipOpacity.value = withTiming(1, { duration: 350 });
            useGame.getState().inspect(id, over.id);
            haptic(Haptics.ImpactFeedbackStyle.Light);
          }
        } else if (dwell.current) {
          dwell.current = null;
          if (slipShownFor.current) {
            slipShownFor.current = null;
            slipHideTimer.current = setTimeout(() => {
              slipOpacity.value = withTiming(0, { duration: 700 });
            }, 2200);
          }
        }
      }
    }, TICK_MS);
    return () => clearInterval(tick);
  }, [layout, openLetter, candleX, candleY, magX, magY, heat, slipOpacity]);

  // --- tool helpers -------------------------------------------------------------
  const penHome = useCallback(() => {
    penInHand.current = false;
    penX.value = withTiming(LAYOUT.rest.pen.x, { duration: 380 });
    penY.value = withTiming(LAYOUT.rest.pen.y, { duration: 380 });
    penAngle.value = withTiming(LAYOUT.rest.pen.angle, { duration: 380 });
    penLift.value = withTiming(0, { duration: 380 });
  }, [penX, penY, penAngle, penLift]);

  const finishStamp = useCallback(
    (d: Decision) => {
      const id = useGame.getState().state.open;
      if (!id) return;
      exiting.current = true;
      haptic(Haptics.ImpactFeedbackStyle.Heavy);
      playSfx('stamp');
      setImprint(d);
      stampProgress.value = withTiming(0, { duration: 220 });
      setTimeout(() => setPressing(null), 220);
      slipOpacity.value = withTiming(0, { duration: 300 });
      exitDir.value = EXIT[d];
      setTimeout(() => {
        letterOut.value = withTiming(1, { duration: 560, easing: Easing.in(Easing.cubic) });
      }, 750);
      setTimeout(() => {
        useGame.getState().stamp(id, d);
        letterOut.value = 0;
        letterIn.value = 0;
        setImprint(null);
        setSlip(null);
        exiting.current = false;
      }, 1350);
    },
    [stampProgress, slipOpacity, exitDir, letterOut, letterIn],
  );

  // --- gesture handlers (JS thread; positions go out through shared values) ------
  const onBegin = (p: Point) => {
    const g = useGame.getState();
    const s = g.state;

    if (s.phase === 'ledger') {
      drag.current = { kind: 'ledger' };
      return;
    }
    if (s.phase === 'continued') {
      drag.current = inRect(p, RESTART_RECT, 10) ? { kind: 'restart' } : null;
      return;
    }
    if (s.phase !== 'desk' || exiting.current) return;

    if (dist(p, { x: candleX.value, y: candleY.value }) < CANDLE_R + 8) {
      if (penInHand.current) penHome();
      drag.current = { kind: 'candle', ox: candleX.value - p.x, oy: candleY.value - p.y };
      candleLift.value = withTiming(1, { duration: 160 });
      haptic(Haptics.ImpactFeedbackStyle.Light);
      playSfx('candle', 0.5);
      return;
    }

    const lens = { x: magX.value, y: magY.value };
    const handleEnd = { x: lens.x + (LENS_R + 72) * Math.SQRT1_2, y: lens.y + (LENS_R + 72) * Math.SQRT1_2 };
    if (dist(p, lens) < LENS_R + 6 || distToSegment(p, lens, handleEnd) < 12) {
      if (penInHand.current) penHome();
      drag.current = { kind: 'magnifier', ox: lens.x - p.x, oy: lens.y - p.y };
      magLift.value = withTiming(1, { duration: 160 });
      haptic(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    const nib = { x: penX.value, y: penY.value };
    if (distToSegment(p, nib, stickEnd(nib, penAngle.value, PEN_LENGTH)) < 16) {
      drag.current = { kind: 'pen-carry', start: p, wasInHand: penInHand.current };
      penInHand.current = true;
      penLift.value = withTiming(1, { duration: 160 });
      penAngle.value = withTiming(PEN_IN_HAND_ANGLE, { duration: 200 });
      penX.value = withTiming(p.x, { duration: 120 });
      penY.value = withTiming(p.y, { duration: 120 });
      haptic(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    if (s.open && layout) {
      if (penInHand.current && inRect(p, LAYOUT.letter)) {
        const path = Skia.Path.Make();
        path.moveTo(p.x, p.y);
        drag.current = { kind: 'pen-stroke', last: p, path };
        penX.value = p.x;
        penY.value = p.y;
        playSfx('pen', 0.5);
        return;
      }
      const slot = stampSlots().find((sl) => inRect(p, sl.rect, 4));
      if (slot) {
        if (penInHand.current) penHome();
        setPressing(slot.d);
        stampProgress.value = 0;
        stampProgress.value = withTiming(1, { duration: STAMP_HOLD_MS, easing: Easing.in(Easing.quad) });
        drag.current = { kind: 'stamp', d: slot.d, start: p, timer: setTimeout(() => finishStamp(slot.d), STAMP_HOLD_MS) };
        haptic(Haptics.ImpactFeedbackStyle.Light);
        return;
      }
    }

    if (!s.open) {
      // Topmost first: stack[0] is drawn last.
      for (let i = 0; i < s.stack.length; i++) {
        const id = s.stack[i]!;
        const l = getLetter(id)!;
        const pose = stackPose(l, i, LAYOUT.stack);
        const { w, h } = envelopeSize(l);
        if (inRotatedRect(p, pose.x, pose.y, w, h, pose.angle)) {
          if (penInHand.current) penHome();
          envX.value = pose.x;
          envY.value = pose.y;
          envAngle.value = pose.angle;
          envAngle.value = withTiming(pose.angle * 0.3, { duration: 300 });
          drag.current = { kind: 'envelope', id, ox: pose.x - p.x, oy: pose.y - p.y };
          setDragId(id);
          haptic(Haptics.ImpactFeedbackStyle.Light);
          playSfx('paper', 0.4);
          return;
        }
      }
    }

    if (penInHand.current) penHome();
  };

  const onMove = (p: Point) => {
    const d = drag.current;
    if (!d) return;
    switch (d.kind) {
      case 'envelope':
        envX.value = p.x + d.ox;
        envY.value = p.y + d.oy;
        break;
      case 'candle': {
        const c = clampTo({ x: p.x + d.ox, y: p.y + d.oy }, BOARD, 20);
        candleX.value = c.x;
        candleY.value = c.y;
        break;
      }
      case 'magnifier': {
        const c = clampTo({ x: p.x + d.ox, y: p.y + d.oy }, BOARD, 10);
        magX.value = c.x;
        magY.value = c.y;
        break;
      }
      case 'pen-carry': {
        const c = clampTo(p, BOARD, 4);
        penX.value = c.x;
        penY.value = c.y;
        break;
      }
      case 'pen-stroke': {
        const id = useGame.getState().state.open;
        if (!id) return;
        d.path.lineTo(p.x, p.y);
        livePath.value = d.path.copy();
        penX.value = p.x;
        penY.value = p.y;
        for (const [segId, lines] of coverage.current) {
          if (!strokeOver(lines, d.last, p, 5)) continue;
          const already = useGame.getState().state.letters[id]?.censored.includes(segId);
          if (!already && isBlackedOut(lines)) {
            useGame.getState().censor(id, segId);
            Haptics.selectionAsync().catch(() => {});
          }
        }
        d.last = p;
        break;
      }
      case 'stamp':
        if (dist(p, d.start) > 14) cancelStamp(d);
        break;
    }
  };

  const cancelStamp = (d: Extract<Drag, { kind: 'stamp' }>) => {
    clearTimeout(d.timer);
    stampProgress.value = withTiming(0, { duration: 140 });
    setTimeout(() => setPressing((cur) => (cur === d.d && !exiting.current ? null : cur)), 140);
    drag.current = null;
  };

  const onEnd = (p: Point) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const g = useGame.getState();
    switch (d.kind) {
      case 'ledger':
        if (inRect(p, LAYOUT.ledger)) g.advance();
        break;
      case 'restart':
        if (inRect(p, RESTART_RECT, 10)) {
          g.restart();
          penHome();
          candleX.value = withTiming(LAYOUT.rest.candle.x);
          candleY.value = withTiming(LAYOUT.rest.candle.y);
          magX.value = withTiming(LAYOUT.rest.magnifier.x);
          magY.value = withTiming(LAYOUT.rest.magnifier.y);
        }
        break;
      case 'envelope': {
        const l = getLetter(d.id)!;
        const { w, h } = envelopeSize(l);
        const center = { x: envX.value + w / 2, y: envY.value + h / 2 };
        if (inRect(center, LAYOUT.dropZone) && !g.state.open) {
          g.open(d.id);
          setDragId(null);
          letterIn.value = 0;
          letterIn.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
          playSfx('envelope_tear');
          haptic(Haptics.ImpactFeedbackStyle.Medium);
        } else {
          const i = g.state.stack.indexOf(d.id);
          const pose = stackPose(l, Math.max(0, i), LAYOUT.stack);
          envX.value = withSpring(pose.x, { damping: 18 });
          envY.value = withSpring(pose.y, { damping: 18 });
          envAngle.value = withTiming(pose.angle, { duration: 300 });
          setTimeout(() => setDragId((cur) => (cur === d.id ? null : cur)), 420);
        }
        break;
      }
      case 'candle':
        candleLift.value = withTiming(0, { duration: 200 });
        break;
      case 'magnifier':
        magLift.value = withTiming(0, { duration: 200 });
        break;
      case 'pen-carry':
        // A tap on the pen you're already holding puts it down.
        if (d.wasInHand && dist(p, d.start) < 6) penHome();
        else penLift.value = withTiming(0.6, { duration: 160 });
        break;
      case 'pen-stroke': {
        const id = g.state.open;
        if (id && d.path.countPoints() > 2) g.addStroke(id, d.path.toSVGString());
        livePath.value = Skia.Path.Make();
        break;
      }
      case 'stamp':
        cancelStamp(d);
        break;
    }
  };

  const handlers = useRef({ onBegin, onMove, onEnd });
  handlers.current = { onBegin, onMove, onEnd };
  const fitRef = useRef(fit);
  fitRef.current = fit;

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .maxPointers(1)
        .runOnJS(true)
        .onBegin((e) => handlers.current.onBegin(toWorld(fitRef.current, e.x, e.y)))
        .onUpdate((e) => handlers.current.onMove(toWorld(fitRef.current, e.x, e.y)))
        .onFinalize((e) => handlers.current.onEnd(toWorld(fitRef.current, e.x, e.y))),
    [],
  );

  // --- derived transforms ---------------------------------------------------------
  const boardTransform = [{ translateX: fit.ox }, { translateY: fit.oy }, { scale: fit.scale }];
  const letterTransform = useDerivedValue(() => {
    const o = { x: LAYOUT.letter.x + LAYOUT.letter.w / 2, y: LAYOUT.letter.y };
    const v = letterIn.value;
    const out = letterOut.value;
    const e = exitDir.value;
    return [
      { translateX: o.x + e.dx * out },
      { translateY: o.y + e.dy * out - (1 - v) * 14 },
      { rotate: e.rot * out },
      { scaleY: 0.32 + 0.68 * v },
      { translateX: -o.x },
      { translateY: -o.y },
    ];
  });
  const letterOpacity = useDerivedValue(() => Math.min(1, letterIn.value * 1.6) * (1 - letterOut.value * 0.9));
  const envTransform = useDerivedValue(() => [{ translateX: envX.value }, { translateY: envY.value }, { rotate: envAngle.value }]);
  const lensClip = useDerivedValue(() => {
    const path = Skia.Path.Make();
    path.addCircle(magX.value, magY.value, LENS_R - 2);
    return path;
  });
  const lensTransform = useDerivedValue(() => [
    { translateX: magX.value },
    { translateY: magY.value },
    { scale: 1.9 },
    { translateX: -magX.value },
    { translateY: -magY.value },
  ]);
  const ledgerTransform = useDerivedValue(() => [{ translateY: ledgerY.value }]);

  const stackIds = state.stack;
  const draggedLetter = dragId ? getLetter(dragId) : undefined;
  const nextDay = Math.min(state.day + 1, LAST_AUTHORED_DAY + 1);

  const letterNode =
    openLetter && layout && progress ? (
      <Group transform={letterTransform} opacity={letterOpacity}>
        <Letter
          letter={openLetter}
          layout={layout}
          censored={progress.censored}
          revealed={progress.revealed}
          strokes={strokes}
          livePath={livePath}
          heat={heat}
          imprint={imprint ?? undefined}
        />
      </Group>
    ) : null;

  const props = (
    <>
      <NightWindow />
      <CalendarLeaf calendar={day.calendar} />
      <MoneyNote purse={day.purse} />
      <BrassPlate rank={desk.rank} />
      <LockedTray />
    </>
  );

  return (
    <GestureDetector gesture={gesture}>
      <Canvas style={{ flex: 1, backgroundColor: C.deskDark }}>
        <FontsBridge fonts={fonts}>
          <Group transform={boardTransform}>
            <DeskBoard texture={deskTexture} />
            {props}

            {/* Envelopes, bottom of the pile first */}
            {[...stackIds]
              .map((id, i) => ({ id, i }))
              .reverse()
              .filter(({ id }) => id !== dragId)
              .map(({ id, i }) => {
                const l = getLetter(id)!;
                const pose = stackPose(l, i, LAYOUT.stack);
                return (
                  <Group key={id} transform={[{ translateX: pose.x }, { translateY: pose.y }, { rotate: pose.angle }]}>
                    <EnvelopeBody letter={l} />
                    <EnvelopeAddress letter={l} />
                  </Group>
                );
              })}

            {openLetter?.kind === 'paket' && openLetter.items && <PackageItems items={openLetter.items} />}
            {letterNode}
            <Stamps enabled={!!openLetter && state.phase === 'desk'} pressing={pressing} progress={stampProgress} />

            {draggedLetter && (
              <Group transform={envTransform}>
                <LiftShadow {...envelopeSize(draggedLetter)} />
                <EnvelopeBody letter={draggedLetter} />
                <EnvelopeAddress letter={draggedLetter} />
              </Group>
            )}

            {/* What the glass sees: the same desk, larger */}
            <Group clip={lensClip}>
              <Group transform={lensTransform}>
                <Rect x={0} y={0} width={WORLD.w} height={WORLD.h} color={C.deskMid} />
                <DeskBoard texture={deskTexture} />
                {props}
                {letterNode}
              </Group>
              <Circle cx={magX} cy={magY} r={LENS_R} color="rgba(255,230,190,0.04)" />
            </Group>
            <MagnifierFrame x={magX} y={magY} lift={magLift} />
            <Candle x={candleX} y={candleY} flicker={candleFlicker} lift={candleLift} />
            <RedPen x={penX} y={penY} angle={penAngle} lift={penLift} />
            {slip && <InspectionSlip note={slip.note} x={slip.x} y={slip.y} opacity={slipOpacity} />}

            {(state.phase === 'ledger' || state.phase === 'continued') && <Ledger state={state} day={day} slide={ledgerTransform} />}

            <Lamp flicker={flicker} level={lampLevel} />
            <LightPool flicker={flicker} level={lampLevel} candleX={candleX} candleY={candleY} candleFlicker={candleFlicker} />
            <Vignette />
            {state.phase === 'continued' && <ContinueCard nextDay={nextDay} opacity={continueOpacity} />}
          </Group>
        </FontsBridge>
      </Canvas>
    </GestureDetector>
  );
}
