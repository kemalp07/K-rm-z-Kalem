import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';
import { Canvas, Circle, Group, Skia, type SkPath, type Transforms3d } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Easing, useDerivedValue, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { GLIDE, RETURN_SPRING, SETTLE, SLAM, T } from './motion';
import * as Haptics from 'expo-haptics';

import { desk, getDay, getLetter, hasTool, LAST_AUTHORED_DAY, morningPapers } from '../content/loader';
import { MorningPapers } from '../objects/MorningPapers';
import type { Decision, HelpId, Letter as LetterContent } from '../content/types';
import { isBlackedOut, makeCoverage, strokeOver, type LineCoverage, type Point } from '../logic/censor';
import { economy, eveningBill, flagsOf, purseOf, rankOf } from '../logic/dayFlow';
import { DEFAULT_REVEAL, heatTarget, stepHeat, type RevealTuning } from '../logic/reveal';

/** The market's thick beeswax candle: its heat reaches further and works faster. */
const STRONG_CANDLE: RevealTuning = { ...DEFAULT_REVEAL, near: 40, far: 175, rise: 0.8 };
import { resolveSegments } from '../logic/variants';
import { useGame } from '../state/store';
import { loopSfx, playSfx } from '../sfx/sfx';

import { BrassPlate } from '../objects/BrassPlate';
import { CalendarLeaf } from '../objects/CalendarLeaf';
import { ContinueCard, RESTART_RECT } from '../objects/ContinueCard';
import { DayPlate } from '../objects/DayPlate';
import { Para } from './Para';
import { t } from '../content/strings';
import { EnvelopeAddress, EnvelopeBack, EnvelopeBody, envelopeSize, LiftShadow, STAMP_AT, stackPose } from '../objects/Envelope';
import { Kettle, KETTLE_R, SPOUT } from '../objects/Kettle';
import { Ledger } from '../objects/Ledger';
import { HelpSheetView } from '../objects/Help';
import { BookletOnDesk, BookletView, spreadCount } from '../objects/Booklet';
import { bookletPages, sampleCards, slipReasons } from '../content/booklet';
import { dossierCount, lessonOf, lessonSpread, morningAsides, pinsOf } from '../logic/pulse';
import { postmarkOf } from '../content/postmark';
import { ReasonSlip, reasonRows } from '../objects/ReasonSlip';
import { DismissedCard, EveningSheet, eveningLayout } from '../objects/EveningSheet';
import { CARD_HOME, CARD_REGION, SampleCardFace, onCard, useCardTransform } from '../objects/SampleCard';
import { imprintPoint, Letter, LetterMarks, LetterStill, letterRegion, type ImprintAt } from '../objects/Letter';
import { PinRail } from '../objects/PinRail';
import { layoutLetter, markTargets, type LaidSegment, closeCorner } from '../objects/letterLayout';
import { isClosedLoop, ringed } from '../logic/marking';
import { LockedTray } from '../objects/LockedTray';
import { MoneyNote } from '../objects/MoneyNote';
import { PackageItems } from '../objects/PackageItems';
import { StampPress, Stamps, stampHome, stampSlots } from '../objects/Stamps';
import { Candle, CANDLE_FLAME, CANDLE_R, Eraser, LENS_R, MAG_HANDLE_END, MagnifierFrame, PEN_LENGTH, RedPen } from '../objects/Tools';

import { BakedImage, DESK_REGION, DeskSurface, useBaked } from './DeskBoard';
import { Fade } from './Fade';
import { FontsBridge, useSceneFonts } from './fonts';
import { clampTo, dist, distToRect, distToSegment, inRotatedRect, stickEnd, toLocalFrame } from './hit';
import { Lamp } from './Lamp';
import { LightPool, Vignette } from './LightPool';
import { C } from './palette';
import { useFlicker } from './useFlicker';
import { NightWindow } from './Window';
import { fitWorld, inRect, LAYOUT, toWorld, WORLD } from './world';

type Drag =
  | { kind: 'envelope'; id: string; ox: number; oy: number }
  | { kind: 'candle'; ox: number; oy: number }
  | { kind: 'kettle'; ox: number; oy: number }
  | { kind: 'magnifier'; ox: number; oy: number }
  | { kind: 'card'; ox: number; oy: number }
  | { kind: 'pen-carry'; start: Point; wasInHand: boolean }
  /** `done`: sentences this stroke has covered; they are written down when the pen lifts. */
  | { kind: 'pen-stroke'; last: Point; points: Point[]; done: string[] }
  /**
   * A rubber stamp in hand. It comes down once the finger rests over the paper
   * (`still` waits for that, `timer` for the press to finish); lifting early puts it back.
   */
  | { kind: 'stamp'; d: Decision; pressAt: Point | null; still?: ReturnType<typeof setTimeout>; timer?: ReturnType<typeof setTimeout>; done: boolean }
  | { kind: 'ledger' }
  | { kind: 'restart' }
  | { kind: 'next' };

const PEN_IN_HAND_ANGLE = 0.5;
/** How large the envelope is shown when its letter is folded back in. */
const ENV_ZOOM = 1.75;
const ENV_TOP = 120;
/** Front and back of the envelope, side by side over where the letter lies. */
const envRects = (l: LetterContent) => {
  const { w, h } = envelopeSize(l);
  const W = w * ENV_ZOOM;
  const H = h * ENV_ZOOM;
  return [
    { x: WORLD.w / 2 - W - 10, y: ENV_TOP, w: W, h: H },
    { x: WORLD.w / 2 + 10, y: ENV_TOP, w: W, h: H },
  ];
};
const STAMP_HOLD_MS = 450;
/** How long a carried stamp must rest over the paper before it starts to come down. */
const STAMP_REST_MS = 140;
const TICK_MS = 50;
const BOARD = { x: 0, y: 0, w: WORLD.w, h: WORLD.h };

/** Where a decided letter goes as it leaves the desk. */
const EXIT: Record<Decision, { dx: number; dy: number; rot: number }> = {
  delivered: { dx: 640, dy: -40, rot: 0.18 }, // out to the post bag
  held: { dx: 0, dy: 520, rot: -0.05 }, // into the drawer
  stopped: { dx: -520, dy: 260, rot: -0.22 }, // onto the refused pile
  reported: { dx: 120, dy: -560, rot: 0.1 }, // up to the Şube's folder
};


/** Quadratic curve through the midpoints of a finger's track: no corners, no jitter. */
function smoothPath(pts: Point[]): SkPath {
  const b = Skia.PathBuilder.Make();
  const first = pts[0]!;
  b.moveTo(first.x, first.y);
  if (pts.length === 1) return b.lineTo(first.x + 0.1, first.y).build();
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const c = pts[i + 1]!;
    b.quadTo(a.x, a.y, (a.x + c.x) / 2, (a.y + c.y) / 2);
  }
  const last = pts[pts.length - 1]!;
  b.lineTo(last.x, last.y);
  return b.build();
}

const haptic = (style: Haptics.ImpactFeedbackStyle) => Haptics.impactAsync(style).catch(() => {});

/** Cheap content fingerprint for cache keys. */
const PILE_REGION = { x: LAYOUT.stack.x - 50, y: LAYOUT.stack.y - 50, w: LAYOUT.stack.w + 100, h: WORLD.h - LAYOUT.stack.y + 50 };
const STAMPS_REGION = { x: LAYOUT.stamps.x - 24, y: LAYOUT.stamps.y - 20, w: LAYOUT.stamps.w + 48, h: LAYOUT.stamps.h + 40 };

const hash = (parts: string[]) => {
  let h = 5381;
  for (const part of parts) for (let i = 0; i < part.length; i++) h = ((h << 5) + h + part.charCodeAt(i)) | 0;
  return `${parts.length}.${h >>> 0}`;
};

export function DeskScreen() {
  const { width, height } = useWindowDimensions();
  const fit = useMemo(() => fitWorld(width, height), [width, height]);
  const fonts = useSceneFonts();

  const state = useGame((g) => g.state);
  const savedStrokes = useGame((g) => g.strokes);
  const seenHelp = useGame((g) => g.seenHelp);
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
    () => (openLetter ? layoutLetter(fonts.provider, openLetter, segments, LAYOUT.letter, postmarkOf(openLetter, day.calendar.rumi)) : null),
    [fonts.provider, openLetter, segments, day.calendar.rumi],
  );
  const strokes = useMemo(
    () => (state.open ? (savedStrokes[state.open] ?? []).map((s) => Skia.Path.MakeFromSVGString(s)).filter((p): p is SkPath => !!p) : []),
    [savedStrokes, state.open],
  );

  // --- animated values -------------------------------------------------------
  const flicker = useFlicker();
  const candleFlicker = useFlicker(3.7);
  const lampLevel = useSharedValue(state.phase === 'desk' ? 1 : 0.3);

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

  const kettleX = useSharedValue<number>(LAYOUT.rest.kettle.x);
  const kettleY = useSharedValue<number>(LAYOUT.rest.kettle.y);
  const kettleLift = useSharedValue(0);
  const kettlePuff = useSharedValue(0);

  const magX = useSharedValue<number>(LAYOUT.rest.magnifier.x);
  const magY = useSharedValue<number>(LAYOUT.rest.magnifier.y);
  const magLift = useSharedValue(0);

  const heat = useSharedValue<Record<string, number>>({});
  const livePath = useSharedValue<SkPath>(Skia.Path.Make());
  /** Which sentence the pen is over, and which this stroke has covered. */
  const penHint = useSharedValue<{ hover: string; done: string[] }>({ hover: '', done: [] });
  const stampProgress = useSharedValue(0);
  const cardX = useSharedValue(CARD_HOME.x);
  const cardY = useSharedValue(CARD_HOME.y);
  const cardScale = useSharedValue(CARD_HOME.scale);
  const cardRot = useSharedValue(CARD_HOME.rot);
  const stampX = useSharedValue(0);
  const stampY = useSharedValue(0);
  const imprintIn = useSharedValue(0);
  const slipIn = useSharedValue(0);
  const eveningIn = useSharedValue(state.phase === 'evening' ? 1 : 0);
  const dismissedIn = useSharedValue(state.phase === 'dismissed' ? 1 : 0);
  const helpIn = useSharedValue(0);
  const eraserRub = useSharedValue(0);
  const eraserLift = useSharedValue(0);
  const marksFade = useSharedValue(1);
  const ledgerY = useSharedValue(state.phase === 'ledger' ? 0 : 640);
  const continueOpacity = useSharedValue(state.phase === 'continued' ? 1 : 0);

  // --- React state for things that change what is drawn, not where -------------
  const [dragId, setDragId] = useState<string | null>(null);
  const [pressing, setPressing] = useState<Decision | null>(null);
  const [imprint, setImprint] = useState<ImprintAt | null>(null);
  const [help, setHelp] = useState<HelpId | null>(null);
  const [spread, setSpread] = useState(0);
  // The morning's papers come before the work; one at a time, a touch puts each away.
  const papers = useMemo(() => morningPapers(state.day), [state.day]);
  const [morningIdx, setMorningIdx] = useState(0);
  const skipOpen = useRef(false);
  const [openPlate, setOpenPlate] = useState(() => {
    const s = useGame.getState().state;
    return s.phase === 'desk' && !s.morningDone;
  });
  const openVeil = useSharedValue(1);
  const showMorning = state.phase === 'desk' && state.morningDone === false && papers.length > 0 && !openPlate;
  const morningIn = useSharedValue(0);
  // The director opens with a promotion when yesterday earned one.
  const asides = useMemo(
    () => morningAsides(state.day, state.events ?? [], dossierCount(state.letters, getLetter)),
    [state.day, state.events, state.letters],
  );
  const morningLead = [
    ...((state.events ?? []).includes(`d${state.day - 1}:promoted`)
      ? [economy.text.promoted!.replace('{rank}', rankOf(state).name).replace('{wage}', String(rankOf(state).wage))]
      : []),
    ...asides.mudur,
  ];
  const lesson = useMemo(() => {
    if (state.phase !== 'ledger') return null;
    const decided = state.done.flatMap((id) => {
      const letter = getLetter(id);
      const p = state.letters[id];
      return letter && p?.decision ? [{ letter, p }] : [];
    });
    return lessonOf(decided);
  }, [state.phase, state.done, state.letters]);
  const pins = useMemo(() => pinsOf(state.letters, getLetter), [state.letters]);
  const dossier = useMemo(() => dossierCount(state.letters, getLetter), [state.letters]);
  /** The opened envelope turned over in the hand: front and back, larger. */
  const [envView, setEnvView] = useState(false);
  const envViewIn = useSharedValue(0);
  /** Evening costs and purchases ticked so far; all due costs start ticked. */
  const [paid, setPaid] = useState<string[]>(() => eveningBill(state).expenses.map((e) => e.id));
  /** A DURDUR or İSTİHBARAT stamp waits on its reason slip before the letter leaves. */
  const [slip, setSlip] = useState<{ id: string; d: Decision; chosen: string | null } | null>(null);
  const reasons = useMemo(() => slipReasons(state.day), [state.day]);
  const pages = useMemo(() => bookletPages(state.day), [state.day]);
  const hasCandle = hasTool('candle', state.day);
  const hasKettle = hasTool('kettle', state.day);
  const lowOil = (state.events ?? []).includes(`d${state.day - 1}:unpaid:gaz`);
  // Bought at the market: a wider, sharper glass and a thick beeswax candle.
  const lensK = (state.owned ?? []).includes('buyutec') ? 1.35 : 1;
  const lensZoom = lensK > 1 ? 2.4 : 1.9;
  const reveal = (state.owned ?? []).includes('mum') ? STRONG_CANDLE : DEFAULT_REVEAL;
  const hasMagnifier = hasTool('magnifier', state.day);
  const card = useMemo(() => sampleCards(state.day)[0], [state.day]);
  // The live stroke layer is costly even when empty, so it exists only mid-stroke.
  const [drawing, setDrawing] = useState(false);
  const [warm, setWarm] = useState(false);
  // While the eraser works the marks fade, which needs a layer; otherwise they draw plain.
  const [rubbing, setRubbing] = useState(false);
  const warmRef = useRef(false);

  // --- mutable interaction state ----------------------------------------------
  const drag = useRef<Drag | null>(null);
  const penInHand = useRef(false);
  const exiting = useRef(false);
  const coverage = useRef(new Map<string, { lines: LineCoverage[]; laid: LaidSegment }>());
  const heatLocal = useRef<Record<string, number>>({});

  const resetCoverage = useCallback(() => {
    coverage.current = new Map(
      (layout?.segments ?? []).filter((s) => s.seg.kind !== 'hiddenInk').map((s) => [s.seg.id, { lines: makeCoverage(s.lines), laid: s }]),
    );
  }, [layout]);

  // Fresh coverage and heat for each letter that lands on the desk.
  useEffect(() => {
    setEnvView(false);
    envViewIn.value = 0;
    resetCoverage();
    heatLocal.current = {};
    warmRef.current = false;
    setWarm(false);
    heat.value = {};
  }, [resetCoverage, heat]);

  useEffect(() => {
    if (hasCandle) loopSfx('flame', 0.12);
  }, [hasCandle]);

  // The day opens on its own plate. Coming from that plate at night does not show it twice.
  useEffect(() => {
    if (skipOpen.current) {
      skipOpen.current = false;
      setOpenPlate(false);
      openVeil.value = 0;
      return;
    }
    if (state.morningDone || state.phase !== 'desk') {
      setOpenPlate(false);
      return;
    }
    openVeil.value = 1;
    setOpenPlate(true);
  }, [state.day, openVeil]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- day phases ---------------------------------------------------------------
  const advance = actions.advance;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    switch (state.phase) {
      case 'desk':
        eveningIn.value = 0;
        dismissedIn.value = 0;
        ledgerY.value = 640;
        continueOpacity.value = withTiming(0, { duration: 900, easing: GLIDE });
        break;
      case 'dusk':
        playSfx('drawer', 0.6);
        lampLevel.value = withTiming(0.3, { duration: 3600, easing: Easing.inOut(Easing.quad) });
        timer = setTimeout(advance, 3900);
        break;
      case 'ledger':
        lampLevel.value = withTiming(0.3, { duration: 900, easing: GLIDE });
        playSfx('paper', 0.7);
        ledgerY.value = withTiming(0, { duration: T.ledger, easing: SETTLE });
        break;
      case 'evening':
        setPaid(eveningBill(useGame.getState().state).expenses.map((e) => e.id));
        ledgerY.value = withTiming(640, { duration: 600, easing: GLIDE });
        eveningIn.value = withTiming(1, { duration: 700, easing: SETTLE });
        playSfx('paper', 0.6);
        break;
      case 'dismissed':
        ledgerY.value = withTiming(640, { duration: 600, easing: GLIDE });
        lampLevel.value = withTiming(0.04, { duration: 2000, easing: GLIDE });
        dismissedIn.value = withTiming(1, { duration: 2000, easing: GLIDE });
        break;
      case 'continued':
        eveningIn.value = withTiming(0, { duration: 500, easing: GLIDE });
        lampLevel.value = withTiming(0.04, { duration: 2000, easing: GLIDE });
        continueOpacity.value = withTiming(1, { duration: 180, easing: SETTLE });
        break;
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [state.phase, advance, lampLevel, ledgerY, continueOpacity, eveningIn, dismissedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  // No oil last night: the flame sags, and on the last letter it nearly goes out.
  const lettersLeft = state.stack.length + (state.open ? 1 : 0);
  useEffect(() => {
    if (state.phase !== 'desk') return;
    const dim = lowOil && lettersLeft <= 1 ? 0.22 : lowOil ? 0.55 : 1;
    lampLevel.value = withTiming(dim, { duration: 900, easing: GLIDE });
  }, [state.phase, lowOil, lettersLeft, lampLevel]);

  // --- steam: held over the stamp of a folded-away letter, it lifts the stamp ----------
  useEffect(() => {
    if (!hasKettle || !envView || !openLetter) return;
    const id = openLetter.id;
    const front = envRects(openLetter)[0]!;
    const stamp = { x: front.x + (envelopeSize(openLetter).w + STAMP_AT.dx) * ENV_ZOOM, y: front.y + STAMP_AT.cy * ENV_ZOOM };
    let steam = 0;
    const tick = setInterval(() => {
      const p = useGame.getState().state.letters[id];
      if (!p || p.revealed.includes('stamp') || kettleLift.value < 0.5) return;
      const spout = { x: kettleX.value + SPOUT.dx, y: kettleY.value + SPOUT.dy };
      steam = dist(spout, stamp) < 38 ? steam + 0.1 : Math.max(0, steam - 0.05);
      if (steam >= 1.2) {
        useGame.getState().reveal(id, 'stamp');
        haptic(Haptics.ImpactFeedbackStyle.Soft);
        playSfx('paper', 0.4);
      }
    }, 100);
    return () => clearInterval(tick);
  }, [hasKettle, envView, openLetter, kettleX, kettleY, kettleLift]);

  // --- candle heat: a slow 20 Hz tick on the JS side --------
  useEffect(() => {
    if (!layout || !openLetter || !hasCandle) return;
    const hidden = layout.segments.filter((s) => s.seg.kind === 'hiddenInk' && s.seg.revealBy === 'mum');
    const id = openLetter.id;
    const tick = setInterval(() => {
      if (exiting.current) return;
      if (hidden.length) {
        // Heat comes from the flame, which stands above the saucer the finger holds.
        const c = { x: candleX.value + CANDLE_FLAME.dx, y: candleY.value + CANDLE_FLAME.dy };
        let changed = false;
        const next = { ...heatLocal.current };
        for (const s of hidden) {
          const local = toLocalFrame(c, s, s.tilt, s.skew);
          const d = Math.min(...s.lines.map((l) => distToRect(local, l)));
          const before = next[s.seg.id] ?? 0;
          const after = stepHeat(before, heatTarget(d, reveal), TICK_MS / 1000, reveal);
          if (after !== before) {
            next[s.seg.id] = after;
            changed = true;
          }
          const p = useGame.getState().state.letters[id];
          if (after >= reveal.readAt && p && !p.revealed.includes(s.seg.id)) {
            useGame.getState().reveal(id, s.seg.id);
            haptic(Haptics.ImpactFeedbackStyle.Soft);
          }
        }
        if (changed) {
          heatLocal.current = next;
          heat.value = next;
          const isWarm = Object.values(next).some((h) => h > 0.004);
          if (isWarm !== warmRef.current) {
            warmRef.current = isWarm;
            setWarm(isWarm);
          }
        }
      }
    }, TICK_MS);
    return () => clearInterval(tick);
  }, [layout, openLetter, hasCandle, candleX, candleY, heat]);

  // --- tool helpers -------------------------------------------------------------
  const penHome = useCallback(() => {
    penInHand.current = false;
    const home = { duration: T.home, easing: GLIDE };
    penX.value = withTiming(LAYOUT.rest.pen.x, home);
    penY.value = withTiming(LAYOUT.rest.pen.y, home);
    penAngle.value = withTiming(LAYOUT.rest.pen.angle, home);
    penLift.value = withTiming(0, home);
  }, [penX, penY, penAngle, penLift]);

  /** The stamp goes back onto its card, then is no longer drawn in hand. */
  const stampBack = useCallback(
    (d: Decision) => {
      const home = stampHome(d);
      stampX.value = withTiming(home.x, { duration: T.home, easing: GLIDE });
      stampY.value = withTiming(home.y, { duration: T.home, easing: GLIDE });
      stampProgress.value = withTiming(0, { duration: 260, easing: SETTLE });
      setTimeout(() => setPressing((cur) => (cur === d ? null : cur)), T.home);
    },
    [stampX, stampY, stampProgress],
  );

  /** The stamped letter goes its way and the decision is written down. */
  const sendOff = useCallback(
    (id: string, d: Decision, after: number) => {
      exitDir.value = EXIT[d];
      setTimeout(() => {
        letterOut.value = withTiming(1, { duration: T.leave, easing: GLIDE });
      }, after);
      setTimeout(() => {
        useGame.getState().stamp(id, d);
        letterOut.value = 0;
        letterIn.value = 0;
        setImprint(null);
        exiting.current = false;
      }, after + T.leave + 50);
    },
    [exitDir, letterOut, letterIn],
  );

  const finishStamp = useCallback(
    (d: Decision, at: Point) => {
      const id = useGame.getState().state.open;
      if (!id || !layout) return;
      exiting.current = true;
      haptic(Haptics.ImpactFeedbackStyle.Heavy);
      playSfx('stamp');
      // A hand never stamps quite straight. The desk takes the blow.
      setImprint({ d, ...imprintPoint(layout.paper, at), rot: -0.12 + Math.random() * 0.16 });
      imprintIn.value = 0;
      imprintIn.value = withTiming(1, { duration: 150, easing: SLAM });
      setTimeout(() => stampBack(d), 200);
      if (d === 'stopped' || d === 'reported') {
        // The Şube wants to know why: the slip comes, and the letter leaves once it is ticked.
        setTimeout(() => {
          setSlip({ id, d, chosen: null });
          slipIn.value = withTiming(1, { duration: 380, easing: SETTLE });
          playSfx('paper', 0.4);
        }, T.stampRest);
        return;
      }
      sendOff(id, d, T.stampRest);
    },
    [layout, stampBack, imprintIn, slipIn, sendOff],
  );

  /** Over the paper and holding still: the stamp starts to come down. */
  const pressStamp = (d: Extract<Drag, { kind: 'stamp' }>, p: Point) => {
    d.pressAt = p;
    stampProgress.value = withTiming(1, { duration: STAMP_HOLD_MS, easing: Easing.inOut(Easing.quad) });
    d.timer = setTimeout(() => {
      d.done = true;
      finishStamp(d.d, p);
    }, STAMP_HOLD_MS);
  };

  // --- gesture handlers (JS thread; positions go out through shared values) ------
  // --- instruction sheets ---------------------------------------------------------
  const openHelp = useCallback(
    (id: HelpId, at = 0) => {
      if (penInHand.current) penHome();
      useGame.getState().markHelpSeen(id);
      setHelp(id);
      setSpread(id === 'rules' ? at : 0);
      helpIn.value = 0;
      helpIn.value = withTiming(1, { duration: 420, easing: SETTLE });
      playSfx('paper', 0.6);
    },
    [helpIn, penHome],
  );
  const closeHelp = useCallback(() => {
    helpIn.value = withTiming(0, { duration: 420, easing: GLIDE });
    setTimeout(() => setHelp(null), 420);
  }, [helpIn]);
  /** Out of the envelope again and back onto the desk. */
  const openLetterAgain = () => {
    envViewIn.value = withTiming(0, { duration: 460, easing: GLIDE });
    setTimeout(() => setEnvView(false), 460);
    playSfx('paper', 0.4);
  };
  /** First time a tool is touched, its note opens instead; returns true when it did. */
  const introduce = (id: HelpId) => {
    if (useGame.getState().seenHelp.includes(id)) return false;
    openHelp(id);
    return true;
  };

  /** The eraser rubs the open letter's pen work away; found ink and anomalies stay found. */
  const erasing = useRef(false);
  const erase = () => {
    const g = useGame.getState();
    const id = g.state.open;
    if (penInHand.current) penHome();
    haptic(Haptics.ImpactFeedbackStyle.Light);
    eraserLift.value = withSequence(withTiming(1, { duration: T.lift, easing: SETTLE }), withTiming(1, { duration: 520 }), withTiming(0, { duration: 360, easing: SETTLE }));
    const hasMarks = !!id && ((g.strokes[id]?.length ?? 0) > 0 || (g.state.letters[id]?.censored.length ?? 0) > 0);
    if (!hasMarks || erasing.current) return;
    erasing.current = true;
    setRubbing(true);
    eraserRub.value = withSequence(withRepeat(withSequence(withTiming(-4, { duration: 80 }), withTiming(4, { duration: 80 })), 4), withTiming(0, { duration: 120, easing: SETTLE }));
    playSfx('paper', 0.35);
    marksFade.value = withTiming(0, { duration: 600, easing: GLIDE });
    setTimeout(() => {
      useGame.getState().erase(id);
      resetCoverage();
      marksFade.value = 1;
      erasing.current = false;
      setRubbing(false);
    }, 640);
  };

  // A new day's papers rise onto the desk.
  useEffect(() => {
    setMorningIdx(0);
    if (showMorning) morningIn.value = withTiming(1, { duration: 700, easing: SETTLE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.day, showMorning]);

  // The Şube's rules lie open on the desk the very first night, once the morning papers are read.
  useEffect(() => {
    if (state.phase !== 'desk' || showMorning || seenHelp.includes('rules')) return;
    const timer = setTimeout(() => openHelp('rules'), 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMorning]);

  const onBegin = (p: Point) => {
    const g = useGame.getState();
    const s = g.state;

    if (showMorning) {
      drag.current = null;
      playSfx('paper', 0.5);
      if (morningIdx + 1 < papers.length) {
        morningIn.value = 0;
        setMorningIdx(morningIdx + 1);
        morningIn.value = withTiming(1, { duration: 500, easing: SETTLE });
      } else {
        morningIn.value = withTiming(0, { duration: 400, easing: GLIDE });
        setTimeout(() => g.readMorning(), 400);
      }
      return;
    }

    // The letter is back in its envelope: touching the envelope takes it out again.
    if (envView && openLetter && envRects(openLetter).some((r) => inRect(p, r, 4))) {
      drag.current = null;
      openLetterAgain();
      return;
    }

    if (help) {
      drag.current = null;
      // The booklet turns a page when its edge is tapped; anywhere else closes it.
      const book = LAYOUT.bookletOpen;
      if (help === 'rules' && inRect(p, book)) {
        const forward = p.x > book.x + book.w / 2;
        const next = spread + (forward ? 1 : -1);
        if (next >= 0 && next < spreadCount(pages.length)) {
          setSpread(next);
          playSfx('paper', 0.4);
          return;
        }
        if (!forward) return;
      }
      closeHelp();
      return;
    }

    // While the reason slip waits, only a tick on it counts.
    if (slip) {
      drag.current = null;
      if (slip.chosen) return;
      const row = reasonRows(reasons).find((r) => inRect(p, r.rect, 2));
      if (!row) return;
      setSlip({ ...slip, chosen: row.r.id });
      g.reason(slip.id, row.r.id);
      haptic(Haptics.ImpactFeedbackStyle.Light);
      playSfx('pen', 0.4);
      setTimeout(() => {
        slipIn.value = withTiming(0, { duration: 320, easing: GLIDE });
        sendOff(slip.id, slip.d, 200);
        setTimeout(() => setSlip(null), 340);
      }, 520);
      return;
    }

    if (s.phase === 'ledger') {
      if (lesson && inRect(p, LAYOUT.lesson, 4)) {
        drag.current = null;
        openHelp('rules', lessonSpread(pages, lesson.pageId));
        return;
      }
      drag.current = { kind: 'ledger' };
      return;
    }
    if (s.phase === 'evening') {
      drag.current = null;
      const ev = eveningLayout(s);
      const row = ev.rows.find((x) => inRect(p, x.rect, 3));
      if (row) {
        setPaid((cur) => (cur.includes(row.id) ? cur.filter((x) => x !== row.id) : [...cur, row.id]));
        playSfx('pen', 0.3);
      } else if (inRect(p, ev.button, 6)) {
        g.finishEvening(paid);
      }
      return;
    }
    if (s.phase === 'dismissed') {
      drag.current = inRect(p, RESTART_RECT, 10) ? { kind: 'restart' } : null;
      return;
    }
    if (openPlate && s.phase === 'desk') {
      drag.current = null;
      openVeil.value = withTiming(0, { duration: 220, easing: GLIDE });
      setTimeout(() => setOpenPlate(false), 220);
      return;
    }

    if (s.phase === 'continued') {
      drag.current = inRect(p, RESTART_RECT, 10) ? { kind: 'restart' } : nextReady ? { kind: 'next' } : null;
      return;
    }
    if (s.phase !== 'desk' || exiting.current) return;

    const saucer = { x: candleX.value, y: candleY.value };
    if (hasCandle && (dist(p, saucer) < CANDLE_R + 6 || (Math.abs(p.x - saucer.x) < 14 && p.y < saucer.y && p.y > saucer.y + CANDLE_FLAME.dy - 10))) {
      if (introduce('candle')) return;
      if (penInHand.current) penHome();
      drag.current = { kind: 'candle', ox: candleX.value - p.x, oy: candleY.value - p.y };
      candleLift.value = withTiming(1, { duration: T.lift, easing: SETTLE });
      haptic(Haptics.ImpactFeedbackStyle.Light);
      playSfx('candle', 0.5);
      return;
    }

    if (hasKettle && dist(p, { x: kettleX.value, y: kettleY.value }) < KETTLE_R) {
      if (introduce('kettle')) return;
      if (penInHand.current) penHome();
      drag.current = { kind: 'kettle', ox: kettleX.value - p.x, oy: kettleY.value - p.y };
      kettleLift.value = withTiming(1, { duration: T.lift, easing: SETTLE });
      kettlePuff.value = 0;
      kettlePuff.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.linear }), -1, false);
      haptic(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    const lens = { x: magX.value, y: magY.value };
    const handleEnd = { x: lens.x + MAG_HANDLE_END.x * lensK, y: lens.y + MAG_HANDLE_END.y * lensK };
    if (hasMagnifier && (dist(p, lens) < LENS_R * lensK + 6 || distToSegment(p, lens, handleEnd) < 14)) {
      if (introduce('magnifier')) return;
      if (penInHand.current) penHome();
      drag.current = { kind: 'magnifier', ox: lens.x - p.x, oy: lens.y - p.y };
      magLift.value = withTiming(1, { duration: T.lift, easing: SETTLE });
      haptic(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    const nib = { x: penX.value, y: penY.value };
    if (distToSegment(p, nib, stickEnd(nib, penAngle.value, PEN_LENGTH)) < 16) {
      if (introduce('pen')) return;
      drag.current = { kind: 'pen-carry', start: p, wasInHand: penInHand.current };
      penInHand.current = true;
      penLift.value = withTiming(1, { duration: T.lift, easing: SETTLE });
      penAngle.value = withTiming(PEN_IN_HAND_ANGLE, { duration: T.lift + 120, easing: SETTLE });
      penX.value = withTiming(p.x, { duration: T.lift, easing: SETTLE });
      penY.value = withTiming(p.y, { duration: T.lift, easing: SETTLE });
      haptic(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    const e = LAYOUT.eraser;
    if (dist(p, { x: e.x + e.w / 2, y: e.y + e.h / 2 }) < 28) {
      if (introduce('pen')) return;
      erase();
      return;
    }

    // The sample card: lifted to full size to lay beside (or over) the letter.
    if (card && onCard(p, { x: cardX.value, y: cardY.value, scale: cardScale.value, rot: cardRot.value })) {
      drag.current = { kind: 'card', ox: cardX.value - p.x, oy: cardY.value - p.y };
      cardScale.value = withTiming(1, { duration: T.lift + 80, easing: SETTLE });
      cardRot.value = withTiming(0.02, { duration: T.lift + 80, easing: SETTLE });
      haptic(Haptics.ImpactFeedbackStyle.Light);
      playSfx('paper', 0.3);
      return;
    }

    if (s.open && layout && !envView && openLetter?.kind !== 'paket' && inRect(p, closeCorner(layout.paper), 4)) {
      if (penInHand.current) penHome();
      setEnvView(true);
      envViewIn.value = withTiming(1, { duration: 520, easing: SETTLE });
      playSfx('paper', 0.5);
      return;
    }

    const slipHit = inRect(p, LAYOUT.help.rules, 4) ? 'rules' : undefined;
    if (slipHit && !(penInHand.current && s.open && inRect(p, LAYOUT.letter))) {
      openHelp(slipHit);
      return;
    }

    if (s.open && layout) {
      if (penInHand.current && !envView && inRect(p, LAYOUT.letter)) {
        drag.current = { kind: 'pen-stroke', last: p, points: [p], done: [] };
        penHint.value = { hover: '', done: [] };
        setDrawing(true);
        penX.value = p.x;
        penY.value = p.y;
        playSfx('pen', 0.5);
        return;
      }
      const slot = envView ? undefined : stampSlots().find((sl) => inRect(p, sl.rect, 4));
      if (slot) {
        if (introduce('stamps')) return;
        if (penInHand.current) penHome();
        setPressing(slot.d);
        stampProgress.value = 0;
        stampX.value = p.x;
        stampY.value = p.y;
        drag.current = { kind: 'stamp', d: slot.d, pressAt: null, done: false };
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
          envAngle.value = withTiming(pose.angle * 0.3, { duration: 500, easing: SETTLE });
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
      // Carried things sit exactly under the finger. (Easing toward each new pointer
      // position restarted an animation per event, which read as lag and sliding.)
      case 'envelope':
        envX.value = p.x + d.ox;
        envY.value = p.y + d.oy;
        break;
      case 'kettle': {
        const c = clampTo({ x: p.x + d.ox, y: p.y + d.oy }, BOARD, 30);
        kettleX.value = c.x;
        kettleY.value = c.y;
        break;
      }
      case 'candle': {
        const c = clampTo({ x: p.x + d.ox, y: p.y + d.oy }, BOARD, 20);
        candleX.value = c.x;
        candleY.value = c.y;
        break;
      }
      case 'card': {
        const c = clampTo({ x: p.x + d.ox, y: p.y + d.oy }, BOARD, 30);
        cardX.value = c.x;
        cardY.value = c.y;
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
        // The finger reports jagged points; the pencil draws the curve through them.
        const prev = d.points[d.points.length - 1]!;
        if (Math.hypot(p.x - prev.x, p.y - prev.y) < 1.5) break;
        d.points.push(p);
        livePath.value = smoothPath(d.points);
        penX.value = p.x;
        penY.value = p.y;
        // Covering a sentence is felt at once but recorded when the pen lifts: a store
        // update mid-stroke re-renders and re-rasterises the letter, which stutters.
        let hover = '';
        for (const [segId, { lines, laid }] of coverage.current) {
          const local = (q: Point) => toLocalFrame(q, laid, laid.tilt, laid.skew);
          const at = local(p);
          if (!hover && lines.some(({ rect: r }) => at.x >= r.x - 4 && at.x <= r.x + r.w + 4 && at.y >= r.y - 3 && at.y <= r.y + r.h + 3)) hover = segId;
          if (!strokeOver(lines, local(d.last), at, 5)) continue;
          const already = d.done.includes(segId) || useGame.getState().state.letters[id]?.censored.includes(segId);
          if (!already && isBlackedOut(lines)) {
            d.done.push(segId);
            Haptics.selectionAsync().catch(() => {});
          }
        }
        if (hover !== penHint.value.hover || d.done.length !== penHint.value.done.length) penHint.value = { hover, done: [...d.done] };
        d.last = p;
        break;
      }
      case 'stamp': {
        if (d.done) break;
        stampX.value = p.x;
        stampY.value = p.y;
        // Moving off the spot lifts the stamp again; nothing is decided until it lands.
        if (d.pressAt && dist(p, d.pressAt) > 8) {
          clearTimeout(d.timer);
          d.pressAt = null;
          stampProgress.value = withTiming(0, { duration: 160, easing: SETTLE });
        }
        clearTimeout(d.still);
        if (!d.pressAt && layout && inRect(p, layout.paper)) d.still = setTimeout(() => pressStamp(d, p), STAMP_REST_MS);
        break;
      }
    }
  };

  const onEnd = (p: Point) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const g = useGame.getState();
    switch (d.kind) {
      case 'ledger':
        if (inRect(p, LAYOUT.ledger)) g.closeLedger();
        break;
      case 'next':
        skipOpen.current = true;
        setOpenPlate(false);
        g.nextDay();
        break;
      case 'restart':
        if (inRect(p, RESTART_RECT, 10)) {
          g.restart();
          openVeil.value = 1;
          setOpenPlate(true);
          penHome();
          const home = { duration: T.home, easing: GLIDE };
          candleX.value = withTiming(LAYOUT.rest.candle.x, home);
          candleY.value = withTiming(LAYOUT.rest.candle.y, home);
          magX.value = withTiming(LAYOUT.rest.magnifier.x, home);
          magY.value = withTiming(LAYOUT.rest.magnifier.y, home);
        }
        break;
      case 'envelope': {
        const l = getLetter(d.id)!;
        const { w, h } = envelopeSize(l);
        // Where the finger put it, not where the trailing animation has got to yet.
        const center = { x: p.x + d.ox + w / 2, y: p.y + d.oy + h / 2 };
        if (inRect(center, LAYOUT.dropZone) && !g.state.open) {
          g.open(d.id);
          setDragId(null);
          letterIn.value = 0;
          letterIn.value = withTiming(1, { duration: T.unfold, easing: SETTLE });
          playSfx('envelope_tear');
          playSfx('paper', 0.55);
          haptic(Haptics.ImpactFeedbackStyle.Medium);
        } else {
          const i = g.state.stack.indexOf(d.id);
          const pose = stackPose(l, Math.max(0, i), LAYOUT.stack);
          envX.value = withSpring(pose.x, RETURN_SPRING);
          envY.value = withSpring(pose.y, RETURN_SPRING);
          envAngle.value = withTiming(pose.angle, { duration: 600, easing: SETTLE });
          setTimeout(() => setDragId((cur) => (cur === d.id ? null : cur)), 700);
        }
        break;
      }
      case 'kettle': {
        // A hot kettle goes back to its place rather than sit on the papers.
        const home = { duration: T.home, easing: GLIDE };
        kettleLift.value = withTiming(0, { duration: T.lift + 100, easing: SETTLE });
        kettleX.value = withTiming(LAYOUT.rest.kettle.x, home);
        kettleY.value = withTiming(LAYOUT.rest.kettle.y, home);
        break;
      }
      case 'candle':
        candleLift.value = withTiming(0, { duration: T.lift + 100, easing: SETTLE });
        break;
      case 'magnifier':
        magLift.value = withTiming(0, { duration: T.lift + 100, easing: SETTLE });
        break;
      case 'card':
        // Put back near its place, it tucks itself away again.
        if (dist({ x: cardX.value, y: cardY.value }, CARD_HOME) < 90) {
          const home = { duration: T.home, easing: GLIDE };
          cardX.value = withTiming(CARD_HOME.x, home);
          cardY.value = withTiming(CARD_HOME.y, home);
          cardScale.value = withTiming(CARD_HOME.scale, home);
          cardRot.value = withTiming(CARD_HOME.rot, home);
        }
        break;
      case 'pen-carry':
        // A tap on the pen you're already holding puts it down.
        if (d.wasInHand && dist(p, d.start) < 6) penHome();
        else penLift.value = withTiming(0.6, { duration: T.lift, easing: SETTLE });
        break;
      case 'pen-stroke': {
        const id = g.state.open;
        if (id) for (const segId of d.done) g.censor(id, segId);
        if (id && d.points.length > 2) g.addStroke(id, smoothPath(d.points).toSVGString());
        // A closed ring marks whatever it encloses as suspicious; the ledger judges it.
        if (id && openLetter && layout && isClosedLoop(d.points)) {
          const hits = ringed(d.points, markTargets(openLetter, layout));
          for (const t of hits) g.mark(id, t.target, t.anomaly);
          if (hits.length) haptic(Haptics.ImpactFeedbackStyle.Medium);
        }
        livePath.value = Skia.Path.Make();
        setDrawing(false);
        break;
      }
      case 'stamp':
        clearTimeout(d.still);
        if (!d.done) {
          clearTimeout(d.timer);
          stampBack(d.d);
        }
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
  const letterTransform = useDerivedValue<Transforms3d>(() => {
    const o = { x: LAYOUT.letter.x + LAYOUT.letter.w / 2, y: LAYOUT.letter.y };
    const v = letterIn.value;
    const out = letterOut.value;
    const e = exitDir.value;
    return [
      { translateX: o.x + e.dx * out },
      { translateY: o.y + e.dy * out + (1 - v) * 8 },
      { rotate: e.rot * out + (1 - v) * -0.02 },
      // Folded back into the envelope: it shrinks down toward it and is gone.
      { translateY: envViewIn.value * 150 },
      { scale: (0.96 + 0.04 * v) * (1 - 0.6 * envViewIn.value) },
      { translateX: -o.x },
      { translateY: -o.y },
    ];
  });
  const letterOpacity = useDerivedValue(() => Math.min(1, letterIn.value * 1.4) * (1 - letterOut.value * letterOut.value) * (1 - envViewIn.value));
  const envTurn = useDerivedValue<Transforms3d>(() => [
    { translateX: WORLD.w / 2 },
    { translateY: ENV_TOP + 120 },
    { scale: 0.7 + 0.3 * envViewIn.value },
    { translateX: -WORLD.w / 2 },
    { translateY: -(ENV_TOP + 120) },
  ]);
  const envTransform = useDerivedValue(() => [{ translateX: envX.value }, { translateY: envY.value }, { rotate: envAngle.value }]);
  const lensClip = useDerivedValue(() => {
    return Skia.PathBuilder.Make().addCircle(magX.value, magY.value, LENS_R * lensK - 2).build();
  }, [lensK]);
  const lensTransform = useDerivedValue(() => [
    { translateX: magX.value },
    { translateY: magY.value },
    { scale: lensZoom },
    { translateX: -magX.value },
    { translateY: -magY.value },
  ], [lensZoom]);
  const ledgerTransform = useDerivedValue(() => [{ translateY: ledgerY.value }]);

  const stackIds = state.stack;
  const draggedLetter = dragId ? getLetter(dragId) : undefined;
  const nextDay = state.day + 1;
  const nextReady = nextDay <= LAST_AUTHORED_DAY;

  // The open letter's paper and text, and separately its pen work, likewise rasterised.
  const region = layout ? letterRegion(layout.paper) : LAYOUT.letter;
  const stillKey = openLetter ? `still:${openLetter.id}` : '';
  const letterStill = useBaked(openLetter && layout ? <FontsBridge fonts={fonts}><LetterStill letter={openLetter} layout={layout} /></FontsBridge> : null, region, fit.scale, stillKey);
  const marksKey = openLetter && progress ? `marks:${openLetter.id}:${progress.censored.join(',')}:${hash(savedStrokes[openLetter.id] ?? [])}` : '';
  const hasMarks = !!progress && (progress.censored.length > 0 || strokes.length > 0);
  const letterMarks = useBaked(layout && progress && hasMarks ? <LetterMarks layout={layout} censored={progress.censored} strokes={strokes} /> : null, region, fit.scale, marksKey);

  let marksNode: ReactNode = undefined; // undefined: draw the marks live until recorded
  if (!hasMarks) marksNode = null;
  else if (letterMarks?.key === marksKey) {
    const recorded = <BakedImage baked={letterMarks} />;
    marksNode = rubbing ? (
      <Fade opacity={marksFade} bounds={region}>
        {recorded}
      </Fade>
    ) : (
      recorded
    );
  }

  // "7 Mayıs 1331" as a rubber stamp carries it: "7 MAYIS 331".
  const stampDate = day.calendar.rumi.toLocaleUpperCase('tr').replace(/ 1(3\d\d)$/, ' $1');
  const letterNode =
    openLetter && layout && progress ? (
      <Fade transform={letterTransform} opacity={letterOpacity} bounds={region}>
        <Letter
          letter={openLetter}
          layout={layout}
          censored={progress.censored}
          revealed={progress.revealed}
          strokes={strokes}
          livePath={drawing ? livePath : undefined}
          hint={drawing ? penHint : undefined}
          today={stampDate}
          heat={heat}
          warm={warm}
          imprint={imprint ?? undefined}
          imprintIn={imprintIn}
          marksFade={marksFade}
          still={letterStill?.key === stillKey ? <BakedImage baked={letterStill} /> : undefined}
          marks={marksNode}
        />
      </Fade>
    ) : null;

  // Everything that sits still, rasterised once per change (see useBakedLayer).
  const stampsEnabled = !!openLetter && state.phase === 'desk';
  const showSlips = state.phase === 'desk';
  // Split by how often each part changes, so opening a letter redoes only small images.
  const deskKey = [day.day, showSlips, seenHelp.join(','), purseOf(state), state.warnings ?? 0, state.rank ?? 0, pins.map((p) => p.id).join(','), dossier].join('|');
  const desk_ = useBaked(
    <FontsBridge fonts={fonts}>
      <DeskSurface />
      <NightWindow />
      <CalendarLeaf calendar={day.calendar} />
      <MoneyNote kurus={purseOf(state)} warnings={state.warnings ?? 0} />
      <BrassPlate rank={{ name: rankOf(state).name, title: desk.rank.title }} />
      <LockedTray />
      {showSlips && <BookletOnDesk />}
      {showSlips && <PinRail pins={pins} dossier={dossier} />}
    </FontsBridge>,
    DESK_REGION,
    fit.scale,
    deskKey,
  );
  const cardImage = useBaked(card ? <FontsBridge fonts={fonts}><SampleCardFace card={card} /></FontsBridge> : null, CARD_REGION, fit.scale, `card:${card?.id}`);
  const cardTransform = useCardTransform(cardX, cardY, cardScale, cardRot);
  const cardNode = card && state.phase === 'desk' && cardImage ? (
    <Group transform={cardTransform}>
      <BakedImage baked={cardImage} />
    </Group>
  ) : null;
  // The letter folded back: its envelope, front and back side by side, where the letter lay.
  const envNode = envView && openLetter ? (
    <Fade opacity={envViewIn} transform={envTurn}>
      {[0, 1].map((side) => {
        const r = envRects(openLetter)[side]!;
        return (
          <Group key={side} transform={[{ translateX: r.x }, { translateY: r.y }, { scale: ENV_ZOOM }]}>
            {side === 0 ? (
              <>
                <EnvelopeBody letter={openLetter} postmark={postmarkOf(openLetter, day.calendar.rumi)} steamed={!!progress?.revealed.includes('stamp')} />
                <EnvelopeAddress letter={openLetter} />
              </>
            ) : (
              <EnvelopeBack letter={openLetter} />
            )}
          </Group>
        );
      })}
    </Fade>
  ) : null;
  const pile = useBaked(
    <FontsBridge fonts={fonts}>
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
              <EnvelopeBody letter={l} postmark={postmarkOf(l, day.calendar.rumi)} />
              <EnvelopeAddress letter={l} />
            </Group>
          );
        })}
    </FontsBridge>,
    PILE_REGION,
    fit.scale,
    `pile:${stackIds.join(',')}|${dragId ?? ''}`,
  );
  const stampCards = useBaked(
    <FontsBridge fonts={fonts}>
      <Stamps enabled={stampsEnabled} carried={pressing} />
    </FontsBridge>,
    STAMPS_REGION,
    fit.scale,
    `stamps:${stampsEnabled}:${pressing}`,
  );

  return (
    <GestureDetector gesture={gesture}>
      <Canvas style={{ flex: 1, backgroundColor: C.deskDark }}>
        <FontsBridge fonts={fonts}>
          <Group transform={boardTransform}>
            <BakedImage baked={desk_} />
            <BakedImage baked={pile} />
            {openLetter?.kind === 'paket' && openLetter.items && <PackageItems items={openLetter.items} />}
            <BakedImage baked={stampCards} />
            {letterNode}
            {envNode}
            {cardNode}
            <StampPress pressing={pressing} progress={stampProgress} x={stampX} y={stampY} />

            {draggedLetter && (
              <Group transform={envTransform}>
                <LiftShadow {...envelopeSize(draggedLetter)} />
                <EnvelopeBody letter={draggedLetter} postmark={postmarkOf(draggedLetter, day.calendar.rumi)} />
                <EnvelopeAddress letter={draggedLetter} />
              </Group>
            )}

            {/* What the glass sees: the same desk, larger */}
            {hasMagnifier && <Group clip={lensClip}>
              <Group transform={lensTransform}>
                <BakedImage baked={desk_} />
                <BakedImage baked={pile} />
                <BakedImage baked={stampCards} />
                {letterNode}
                {envNode}
                {cardNode}
              </Group>
              <Circle cx={magX} cy={magY} r={LENS_R * lensK} color="rgba(255,230,190,0.04)" />
            </Group>}
            {state.phase === 'desk' && <Eraser rub={eraserRub} lift={eraserLift} />}
            {hasMagnifier && <MagnifierFrame x={magX} y={magY} lift={magLift} scale={lensK} />}
            {hasCandle && <Candle x={candleX} y={candleY} flicker={candleFlicker} lift={candleLift} />}
            {hasKettle && state.phase === 'desk' && <Kettle x={kettleX} y={kettleY} lift={kettleLift} puff={kettlePuff} />}
            <RedPen x={penX} y={penY} angle={penAngle} lift={penLift} />
            {slip && <ReasonSlip decision={slip.d} reasons={reasons} chosen={slip.chosen} opacity={slipIn} />}

            {(state.phase === 'ledger' || state.phase === 'continued') && <Ledger state={state} day={day} slide={ledgerTransform} lesson={lesson} />}

            <Lamp flicker={flicker} level={lampLevel} />
            <LightPool flicker={flicker} level={lampLevel} candleX={candleX} candleY={candleY} candleFlicker={candleFlicker} candleOffset={CANDLE_FLAME} dimmed={state.phase !== 'desk'} candle={hasCandle} candleReach={reveal === DEFAULT_REVEAL ? 120 : 165} />
            <Vignette />
            {openPlate && state.phase === 'desk' && (
              <DayPlate n={state.day} rumi={day.calendar.rumi} weekday={day.calendar.weekday} post={rankOf(state).name} office={desk.rank.title} warnings={state.warnings ?? 0} opacity={openVeil} />
            )}
            {showMorning && papers[morningIdx] && (
              <MorningPapers paper={papers[morningIdx]!} flags={flagsOf(state)} date={day.calendar.rumi} opacity={morningIn} lead={morningLead} aside={asides.family} />
            )}
            {help === 'rules' ? <BookletView pages={pages} spread={spread} opacity={helpIn} /> : help && <HelpSheetView id={help} opacity={helpIn} />}
            {(state.phase === 'evening' || (state.phase === 'continued' && state.account)) && <EveningSheet state={state} paid={paid} opacity={eveningIn} today={day.calendar.rumi} />}
            {state.phase === 'dismissed' && <DismissedCard opacity={dismissedIn} />}
            {state.phase === 'continued' && (
              <ContinueCard
                nextDay={nextDay}
                ready={nextReady}
                opacity={continueOpacity}
                rumi={getDay(nextDay)?.calendar.rumi ?? ''}
                weekday={getDay(nextDay)?.calendar.weekday ?? ''}
                post={rankOf(state).name}
                office={desk.rank.title}
                warnings={state.warnings ?? 0}
              />
            )}
          </Group>
        </FontsBridge>
      </Canvas>
    </GestureDetector>
  );
}
