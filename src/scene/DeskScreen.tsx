import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';
import { Canvas, Circle, Group, Skia, type SkPath, type Transforms3d } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Easing, useAnimatedReaction, useDerivedValue, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { GLIDE, RETURN_SPRING, SETTLE, T } from './motion';
import * as Haptics from 'expo-haptics';

import { desk, getDay, getLetter, hasTool, LAST_AUTHORED_DAY, morningPapers } from '../content/loader';
import { MorningPapers } from '../objects/MorningPapers';
import type { Decision, HelpId, Letter as LetterContent } from '../content/types';
import { isBlackedOut, makeCoverage, strokeOver, type LineCoverage, type Point } from '../logic/censor';
import { economy, eveningBill, flagsOf, purseOf, rankOf } from '../logic/dayFlow';
import { guideCards, guideStep, type GuideHold } from '../logic/guide';
import { DEFAULT_REVEAL, heatTarget, stepHeat, type RevealTuning } from '../logic/reveal';

/** The market's thick beeswax candle: its heat reaches further and works faster. */
const STRONG_CANDLE: RevealTuning = { ...DEFAULT_REVEAL, near: 40, far: 175, rise: 0.8 };
import { resolveSegments } from '../logic/variants';
import { useGame } from '../state/store';
import { loopSfx, playSfx } from '../sfx/sfx';

import { BEGIN_RECT, BeginAgain } from '../objects/BeginAgain';
import { BrassPlate } from '../objects/BrassPlate';
import { CalendarLeaf } from '../objects/CalendarLeaf';
import { ContinueCard, NEXT_RECT, RESTART_RECT } from '../objects/ContinueCard';
import { Para } from './Para';
import { t } from '../content/strings';
import { EnvelopeAddress, EnvelopeBack, EnvelopeBody, envelopeSize, LiftShadow, STAMP_AT, stackPose } from '../objects/Envelope';
import { Kettle, KETTLE_R, SPOUT } from '../objects/Kettle';
import { Ledger } from '../objects/Ledger';
import { GuideCallout } from '../objects/Guide';
import { HELP_IDS, HelpSheetView, HelpSlip } from '../objects/Help';
import { BookletOnDesk, BookletView, spreadCount } from '../objects/Booklet';
import { bookletPages, sampleCards, slipReasons } from '../content/booklet';
import { postmarkOf } from '../content/postmark';
import { ReasonSlip, reasonRows } from '../objects/ReasonSlip';
import { DismissedCard, EveningSheet, eveningLayout } from '../objects/EveningSheet';
import { CARD_HOME, CARD_REGION, SampleCardFace, onCard, useCardTransform } from '../objects/SampleCard';
import { imprintPoint, Letter, LetterMarks, LetterStill, letterRegion, type ImprintAt } from '../objects/Letter';
import { waxBuries, waxRadius, waxRibbon, waxRing } from '../objects/wax';
import { layoutLetter, markTargets, type LaidSegment, closeCorner } from '../objects/letterLayout';
import { underGlass } from '../logic/marking';
import { LockedTray } from '../objects/LockedTray';
import { MoneyNote } from '../objects/MoneyNote';
import { PackageItems } from '../objects/PackageItems';
import { Ashtray } from '../objects/Ashtray';
import { DECISIONS, StampPress, Stamps, stampHome, stampSlots } from '../objects/Stamps';
import { Candle, CANDLE_FLAME, CANDLE_R, Eraser, LENS_R, MAG_HANDLE_END, MagnifierFrame, PEN_LENGTH, RedPen } from '../objects/Tools';

import { BakedImage, DESK_REGION, DeskSurface, useBaked } from './DeskBoard';
import { Fade } from './Fade';
import { FontsBridge, useSceneFonts } from './fonts';
import { clampTo, dist, distToRect, distToSegment, fromLocalFrame, inRotatedRect, PEN_DRAW_ANGLE, PEN_WRITE_ANGLE, stickEnd, toLocalFrame } from './hit';
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
  | { kind: 'magnifier'; ox: number; oy: number; start: Point }
  | { kind: 'card'; ox: number; oy: number }
  | { kind: 'pen-carry'; start: Point; wasInHand: boolean }
  /** `done`: sentences this stroke has covered; they are written down when the pen lifts. */
  | { kind: 'pen-stroke'; last: Point; points: Point[]; radii: number[]; done: string[]; dateDone: boolean }
  /**
   * A rubber stamp in hand. It comes down once the finger rests over the paper
   * (`still` waits for that, `timer` for the press to finish); lifting early puts it back.
   */
  | { kind: 'stamp'; d: Decision; pressAt: Point | null; still?: ReturnType<typeof setTimeout>; timer?: ReturnType<typeof setTimeout>; done: boolean }
  /** A burnable letter, carried toward the ashtray. */
  | { kind: 'letter'; ox: number; oy: number }
  | { kind: 'ledger' }
  | { kind: 'restart' }
  | { kind: 'begin' }
  | { kind: 'next' };

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
  burned: { dx: 0, dy: 0, rot: 0.4 }, // the ashtray takes it; this slide is not used
};


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
  const savedRings = useGame((g) => g.rings);
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
  const rings = useMemo(
    () => (state.open ? ((savedRings ?? {})[state.open] ?? []).map((s) => Skia.Path.MakeFromSVGString(s)).filter((p): p is SkPath => !!p) : []),
    [savedRings, state.open],
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
  /** Offset while a burnable letter is carried, and how far it has gone into the fire. */
  const letterDx = useSharedValue(0);
  const letterDy = useSharedValue(0);
  const burn = useSharedValue(0);
  const ashFlare = useSharedValue(0);
  /** The envelope stays visible while the sheet opens out of it. */
  const envFade = useSharedValue(1);
  const exitDir = useSharedValue(EXIT.delivered);

  const penX = useSharedValue<number>(LAYOUT.rest.pen.x);
  const penY = useSharedValue<number>(LAYOUT.rest.pen.y);
  const penAngle = useSharedValue<number>(LAYOUT.rest.pen.angle);
  const penLift = useSharedValue(0);
  /** The pointer, while the pencil is held. The nib sits on it; the barrel trails behind. */
  const gripX = useSharedValue(0);
  const gripY = useSharedValue(0);
  const gripOn = useSharedValue(0);

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
  const showMorning = state.phase === 'desk' && state.morningDone === false && papers.length > 0;
  const morningIn = useSharedValue(0);
  /** 0 while the morning paper is still folded, 1 once it has opened. */
  const newsSpread = useSharedValue(1);
  const [newsOpen, setNewsOpen] = useState(true);
  // The director opens with a promotion when yesterday earned one.
  const morningLead = (state.events ?? []).includes(`d${state.day - 1}:promoted`)
    ? [economy.text.promoted!.replace('{rank}', rankOf(state).name).replace('{wage}', String(rankOf(state).wage))]
    : [];
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
  // A tool's note lies on the desk only once the tool does.
  const slipIds = HELP_IDS.filter((id) => (id === 'candle' ? hasCandle : id === 'magnifier' ? hasMagnifier : id === 'kettle' ? hasKettle : true));
  const card = useMemo(() => sampleCards(state.day)[0], [state.day]);
  // The live stroke layer is costly even when empty, so it exists only mid-stroke.
  const [drawing, setDrawing] = useState(false);
  /** Day-1 guide: the pen or the glass is already in hand, so the next label can show. */
  const [guideHold, setGuideHold] = useState<GuideHold>(null);
  const [warm, setWarm] = useState(false);
  // While the eraser works the marks fade, which needs a layer; otherwise they draw plain.
  const [rubbing, setRubbing] = useState(false);
  const warmRef = useRef(false);

  // --- mutable interaction state ----------------------------------------------
  const drag = useRef<Drag | null>(null);
  const penInHand = useRef(false);
  const exiting = useRef(false);
  const coverage = useRef(new Map<string, { lines: LineCoverage[]; laid: LaidSegment }>());
  /** Columns across the date sentence. A censor stroke fills them, the same as any line. */
  const dateLine = useRef<LineCoverage[] | null>(null);
  const heatLocal = useRef<Record<string, number>>({});

  const resetCoverage = useCallback(() => {
    coverage.current = new Map(
      (layout?.segments ?? []).filter((s) => s.seg.kind !== 'hiddenInk').map((s) => [s.seg.id, { lines: makeCoverage(s.lines), laid: s }]),
    );
    dateLine.current = layout?.date ? makeCoverage(layout.date.lines) : null;
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

  // --- day phases ---------------------------------------------------------------
  const advance = actions.advance;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    switch (state.phase) {
      case 'desk':
        // No oil bought last night: the lamp burns low all day.
        lampLevel.value = withTiming(lowOil ? 0.62 : 1, { duration: 1400, easing: GLIDE });
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
        continueOpacity.value = withTiming(1, { duration: 2000, easing: GLIDE });
        break;
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [state.phase, advance, lampLevel, ledgerY, continueOpacity, eveningIn, dismissedIn, lowOil]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setGuideHold((h) => (h === 'pen' ? null : h));
    gripOn.value = 0;
    const home = { duration: T.home, easing: GLIDE };
    penX.value = withTiming(LAYOUT.rest.pen.x, home);
    penY.value = withTiming(LAYOUT.rest.pen.y, home);
    penAngle.value = withTiming(LAYOUT.rest.pen.angle, home);
    penLift.value = withTiming(0, home);
  }, [gripOn, penX, penY, penAngle, penLift]);

  // The nib stays under the pointer. Turning the pencil swings the barrel, not the line.
  useAnimatedReaction(
    () => ({ on: gripOn.value, x: gripX.value, y: gripY.value }),
    (cur) => {
      if (!cur.on) return;
      penX.value = cur.x;
      penY.value = cur.y;
    },
  );

  const holdPen = (p: Point, angle: number) => {
    gripX.value = p.x;
    gripY.value = p.y;
    gripOn.value = 1;
    penAngle.value = angle;
  };

  /** The stamp goes back onto its card, then is no longer drawn in hand. */
  const stampChoicesRef = useRef<readonly Decision[]>(DECISIONS);
  stampChoicesRef.current = openLetter?.burnable ? ['delivered'] : DECISIONS;

  const stampBack = useCallback(
    (d: Decision) => {
      const home = stampHome(d, stampChoicesRef.current);
      stampX.value = withTiming(home.x, { duration: T.home, easing: GLIDE });
      stampY.value = withTiming(home.y, { duration: T.home, easing: GLIDE });
      stampProgress.value = withTiming(0, { duration: 260, easing: SETTLE });
      setTimeout(() => setPressing((cur) => (cur === d ? null : cur)), T.home);
    },
    [stampX, stampY, stampProgress],
  );

  /** The sheet slides into the dish, dwindles, and the fire takes it. */
  const burnIntoAsh = (id: string) => {
    const paper = layout?.paper;
    if (!paper) return;
    exiting.current = true;
    const dish = LAYOUT.ashtray;
    const glide = { duration: 640, easing: SETTLE };
    letterDx.value = withTiming(dish.x - (paper.x + paper.w / 2), glide);
    letterDy.value = withTiming(dish.y - (paper.y + paper.h / 2), glide);
    burn.value = withTiming(1, { duration: 880, easing: SETTLE });
    ashFlare.value = withDelay(320, withSequence(withTiming(1, { duration: 180, easing: SETTLE }), withTiming(0.15, { duration: 720, easing: GLIDE })));
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    playSfx('paper', 0.5);
    setTimeout(() => {
      useGame.getState().stamp(id, 'burned');
      letterDx.value = 0;
      letterDy.value = 0;
      burn.value = 0;
      letterIn.value = 0;
      ashFlare.value = withTiming(0, { duration: 480, easing: GLIDE });
      exiting.current = false;
    }, 900);
  };

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
      const taught = guideStep(useGame.getState().state, (lid) => getLetter(lid));
      if (taught && taught !== 'stamp') {
        stampBack(d);
        return;
      }
      exiting.current = true;
      haptic(Haptics.ImpactFeedbackStyle.Heavy);
      playSfx('stamp');
      // A hand never stamps quite straight.
      setImprint({ d, ...imprintPoint(layout.paper, at), rot: -0.12 + Math.random() * 0.16 });
      imprintIn.value = 0;
      imprintIn.value = withTiming(1, { duration: 260, easing: SETTLE });
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
    (id: HelpId) => {
      if (penInHand.current) penHome();
      useGame.getState().markHelpSeen(id);
      setHelp(id);
      setSpread(0);
      helpIn.value = 0;
      helpIn.value = withTiming(1, { duration: 600, easing: SETTLE });
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
  /** Day 1's voice is already telling them what to do, so the tool itself should work. */
  const teaching = () => guideStep(useGame.getState().state, (id) => getLetter(id)) != null;

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
    const folded = papers[0]?.kind === 'newspaper';
    setNewsOpen(!folded);
    newsSpread.value = folded ? 0 : 1;
    if (showMorning) morningIn.value = withTiming(1, { duration: 700, easing: SETTLE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.day, showMorning]);

  // The Şube's rules lie open on the desk the very first night, once the morning papers are read.
  useEffect(() => {
    if (state.day === 1 || state.phase !== 'desk' || showMorning || seenHelp.includes('rules')) return;
    const timer = setTimeout(() => openHelp('rules'), 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMorning]);

  const onBegin = (p: Point) => {
    const g = useGame.getState();
    const s = g.state;

    if (inRect(p, BEGIN_RECT, 6)) {
      drag.current = { kind: 'begin' };
      return;
    }

    if (showMorning) {
      drag.current = null;
      const paper = papers[morningIdx];
      if (paper?.kind === 'newspaper' && !newsOpen) {
        setNewsOpen(true);
        newsSpread.value = withTiming(1, { duration: 720, easing: SETTLE });
        playSfx('paper', 0.65);
        return;
      }
      playSfx('paper', 0.5);
      if (morningIdx + 1 < papers.length) {
        const next = papers[morningIdx + 1];
        const folded = next?.kind === 'newspaper';
        setNewsOpen(!folded);
        newsSpread.value = folded ? 0 : 1;
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
    if (s.phase === 'continued') {
      drag.current = inRect(p, RESTART_RECT, 10) ? { kind: 'restart' } : nextReady && inRect(p, NEXT_RECT, 10) ? { kind: 'next' } : null;
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
      if (!teaching() && introduce('magnifier')) return;
      if (penInHand.current) penHome();
      if (guideStep(useGame.getState().state, (id) => getLetter(id)) === 'glass') setGuideHold('glass');
      drag.current = { kind: 'magnifier', ox: lens.x - p.x, oy: lens.y - p.y, start: p };
      magLift.value = withTiming(1, { duration: T.lift, easing: SETTLE });
      haptic(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    // Already in hand: the wax comes out under the pointer, so a touch on the
    // letter draws there. This has to win over picking the pencil up again.
    if (penInHand.current && s.open && !envView) {
      if (inRect(p, LAYOUT.letter)) {
        holdPen(p, PEN_DRAW_ANGLE);
        penLift.value = withTiming(0.2, { duration: 120, easing: SETTLE });
        drag.current = { kind: 'pen-stroke', last: p, points: [p], radii: [waxRadius(2)], done: [], dateDone: false };
        livePath.value = waxRibbon([{ x: p.x, y: p.y, r: waxRadius(2) }]);
        penHint.value = { hover: '', done: [] };
        setDrawing(true);
        playSfx('pen', 0.5);
        return;
      }
    }

    const nib = { x: penX.value, y: penY.value };
    if (distToSegment(p, nib, stickEnd(nib, penAngle.value, PEN_LENGTH)) < 16) {
      if (!teaching() && introduce('pen')) return;
      drag.current = { kind: 'pen-carry', start: p, wasInHand: penInHand.current };
      penInHand.current = true;
      setGuideHold('pen');
      holdPen(p, PEN_WRITE_ANGLE);
      penLift.value = withTiming(0.72, { duration: T.lift, easing: SETTLE });
      haptic(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    const e = LAYOUT.eraser;
    if (dist(p, { x: e.x + e.w / 2, y: e.y + e.h / 2 }) < 28) {
      if (!teaching() && introduce('pen')) return;
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

    const slipHit = slipIds.find((id) => inRect(p, LAYOUT.help[id], 4));
    if (slipHit && !(penInHand.current && s.open && inRect(p, LAYOUT.letter))) {
      openHelp(slipHit);
      return;
    }

    if (s.open && layout) {
      const slot = envView ? undefined : stampSlots(stampChoicesRef.current).find((sl) => inRect(p, sl.rect, 4));
      if (slot) {
        if (!teaching() && introduce('stamps')) return;
        if (penInHand.current) penHome();
        setPressing(slot.d);
        stampProgress.value = 0;
        stampX.value = p.x;
        stampY.value = p.y;
        drag.current = { kind: 'stamp', d: slot.d, pressAt: null, done: false };
        haptic(Haptics.ImpactFeedbackStyle.Light);
        return;
      }
      if (openLetter?.burnable && !penInHand.current && !envView && inRect(p, layout.paper)) {
        drag.current = { kind: 'letter', ox: letterDx.value - p.x, oy: letterDy.value - p.y };
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
          envFade.value = 1;
          drag.current = { kind: 'envelope', id, ox: pose.x - p.x, oy: pose.y - p.y };
          setGuideHold('letter');
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
        const openId = useGame.getState().state.open;
        const date = layout?.date;
        const job = openLetter?.inspectables?.find((i) => i.target === 'date' && i.line);
        if (openId && date && job) {
          const at = toLocalFrame(c, { x: date.x, y: date.y }, date.tilt, date.skew);
          const reach = LENS_R * lensK;
          const over = date.lines.some((r) => {
            const cx = Math.max(r.x, Math.min(at.x, r.x + r.w));
            const cy = Math.max(r.y, Math.min(at.y, r.y + r.h));
            return Math.hypot(at.x - cx, at.y - cy) <= reach;
          });
          const seen = useGame.getState().state.letters[openId]?.inspected ?? [];
          if (over && !seen.includes(job.id)) useGame.getState().inspect(openId, job.id);
        }
        break;
      }
      case 'pen-carry': {
        const c = clampTo(p, BOARD, 4);
        gripX.value = c.x;
        gripY.value = c.y;
        break;
      }
      case 'pen-stroke': {
        const id = useGame.getState().state.open;
        if (!id) return;
        const c = clampTo(p, BOARD, 4);
        gripX.value = c.x;
        gripY.value = c.y;
        const tip = c;
        // The finger reports jagged points; the pencil draws the curve through them.
        const prev = d.points[d.points.length - 1]!;
        if (Math.hypot(tip.x - prev.x, tip.y - prev.y) < 1.5) break;
        const gap = Math.hypot(tip.x - prev.x, tip.y - prev.y);
        d.points.push(tip);
        d.radii.push(waxRadius(gap));
        livePath.value = waxRibbon(d.points.map((pt, i) => ({ x: pt.x, y: pt.y, r: d.radii[i] ?? waxRadius(2) })));
        // Covering a sentence is felt at once but recorded when the pen lifts: a store
        // update mid-stroke re-renders and re-rasterises the letter, which stutters.
        let hover = '';
        for (const [segId, { lines, laid }] of coverage.current) {
          const local = (q: Point) => toLocalFrame(q, laid, laid.tilt, laid.skew);
          const at = local(tip);
          if (!hover && lines.some(({ rect: r }) => at.x >= r.x - 4 && at.x <= r.x + r.w + 4 && at.y >= r.y - 3 && at.y <= r.y + r.h + 3)) hover = segId;
          if (!strokeOver(lines, local(d.last), at, 5, waxBuries(d.radii[d.radii.length - 1] ?? 0))) continue;
          const already = d.done.includes(segId) || useGame.getState().state.letters[id]?.censored.includes(segId);
          if (!already && isBlackedOut(lines)) {
            d.done.push(segId);
            Haptics.selectionAsync().catch(() => {});
          }
        }
        if (layout?.date && dateLine.current) {
          const origin = { x: layout.date.x, y: layout.date.y };
          const atDate = (q: Point) => toLocalFrame(q, origin, layout.date!.tilt, layout.date!.skew);
          const counts = waxBuries(d.radii[d.radii.length - 1] ?? 0);
          if (strokeOver(dateLine.current, atDate(d.last), atDate(tip), 5, counts) && !d.dateDone && isBlackedOut(dateLine.current)) {
            d.dateDone = true;
            Haptics.selectionAsync().catch(() => {});
          }
        }
        if (hover !== penHint.value.hover || d.done.length !== penHint.value.done.length) penHint.value = { hover, done: [...d.done] };
        d.last = tip;
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
      case 'letter':
        letterDx.value = p.x + d.ox;
        letterDy.value = p.y + d.oy;
        break;
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
        if (inRect(p, NEXT_RECT, 10)) g.nextDay();
        break;
      case 'begin':
        if (inRect(p, BEGIN_RECT, 8)) g.restart();
        break;
      case 'restart':
        if (inRect(p, RESTART_RECT, 10)) {
          g.restart();
          penHome();
          const home = { duration: T.home, easing: GLIDE };
          candleX.value = withTiming(LAYOUT.rest.candle.x, home);
          candleY.value = withTiming(LAYOUT.rest.candle.y, home);
          magX.value = withTiming(LAYOUT.rest.magnifier.x, home);
          magY.value = withTiming(LAYOUT.rest.magnifier.y, home);
        }
        break;
      case 'envelope': {
        setGuideHold((h) => (h === 'letter' ? null : h));
        const l = getLetter(d.id)!;
        const { w, h } = envelopeSize(l);
        // Where the finger put it, not where the trailing animation has got to yet.
        const center = { x: p.x + d.ox + w / 2, y: p.y + d.oy + h / 2 };
        if (inRect(center, LAYOUT.dropZone) && !g.state.open) {
          g.open(d.id);
          const lay = { duration: 760, easing: SETTLE };
          envX.value = withTiming(LAYOUT.letter.x + (LAYOUT.letter.w - w) / 2, lay);
          envY.value = withTiming(LAYOUT.letter.y + 30, lay);
          envAngle.value = withTiming(0.02, lay);
          envFade.value = withDelay(260, withTiming(0, { duration: 640, easing: GLIDE }));
          letterDx.value = 0;
          letterDy.value = 0;
          burn.value = 0;
          letterIn.value = 0;
          letterIn.value = withDelay(200, withTiming(1, { duration: T.unfold, easing: SETTLE }));
          playSfx('paper', 0.45);
          setTimeout(() => playSfx('envelope_tear'), 240);
          haptic(Haptics.ImpactFeedbackStyle.Light);
          setTimeout(() => setDragId((cur) => (cur === d.id ? null : cur)), T.unfold + 240);
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
      case 'magnifier': {
        magLift.value = withTiming(0, { duration: T.lift + 100, easing: SETTLE });
        setGuideHold((h) => (h === 'glass' ? null : h));
        // A tap, not a drag: the glass is already on a seal, a date or a postmark.
        const id = g.state.open;
        if (id && openLetter && layout && !envView && dist(p, d.start) < 8) {
          const lens = { x: magX.value, y: magY.value };
          const hit = underGlass(lens, LENS_R * lensK, markTargets(openLetter, layout));
          const prog = g.state.letters[id];
          const already = !!hit && ((prog?.marked ?? []).includes(hit.target) || (prog?.wrongMarked ?? []).includes(hit.target));
          if (hit && !already) {
            g.mark(id, hit.target, hit.anomaly);
            g.addRing(id, waxRing(hit.x, hit.y, hit.r).toSVGString());
            haptic(Haptics.ImpactFeedbackStyle.Medium);
          }
        }
        break;
      }
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
        if (id && openLetter && d.dateDone) {
          const insp = openLetter.inspectables?.find((i) => i.target === 'date');
          const prog = g.state.letters[id];
          const already = (prog?.marked ?? []).includes('date') || (prog?.wrongMarked ?? []).includes('date');
          if (insp && !already) g.mark(id, 'date', insp.anomaly === true || insp.line === true);
        }
        if (id && d.points.length > 2) {
          g.addStroke(
            id,
            waxRibbon(d.points.map((pt, i) => ({ x: pt.x, y: pt.y, r: d.radii[i] ?? waxRadius(2) }))).toSVGString(),
          );
        }
        livePath.value = Skia.Path.Make();
        setDrawing(false);
        if (penInHand.current) {
          holdPen(p, PEN_WRITE_ANGLE);
          penLift.value = withTiming(0.72, { duration: 160, easing: SETTLE });
        }
        break;
      }
      case 'stamp':
        clearTimeout(d.still);
        if (!d.done) {
          clearTimeout(d.timer);
          stampBack(d.d);
        }
        break;
      case 'letter': {
        const id = g.state.open;
        const paper = layout?.paper;
        const dish = LAYOUT.ashtray;
        if (id && paper && openLetter?.burnable) {
          const cx = paper.x + paper.w / 2 + letterDx.value;
          const cy = paper.y + paper.h / 2 + letterDy.value;
          if (Math.hypot(cx - dish.x, cy - dish.y) < dish.r + 36) {
            burnIntoAsh(id);
            break;
          }
        }
        const back = { duration: 560, easing: SETTLE };
        letterDx.value = withTiming(0, back);
        letterDy.value = withTiming(0, back);
        break;
      }
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
    const laid = v * v * (3 - 2 * v);
    return [
      { translateX: o.x + e.dx * out + letterDx.value },
      { translateY: o.y + e.dy * out + (1 - laid) * 64 + letterDy.value },
      { rotate: e.rot * out + (1 - laid) * -0.05 + burn.value * 0.35 },
      // Folded back into the envelope: it shrinks down toward it and is gone.
      { translateY: envViewIn.value * 150 },
      { scaleY: (0.46 + 0.54 * laid) * (1 - 0.6 * envViewIn.value) * (1 - burn.value * 0.82) },
      { scaleX: (0.7 + 0.3 * laid) * (1 - 0.6 * envViewIn.value) * (1 - burn.value * 0.82) },
      { translateX: -o.x },
      { translateY: -o.y },
    ];
  });
  const letterOpacity = useDerivedValue(() => {
    const v = letterIn.value;
    const laid = v * v * (3 - 2 * v);
    return laid * (1 - letterOut.value * letterOut.value) * (1 - envViewIn.value) * (1 - burn.value);
  });
  const envTurn = useDerivedValue<Transforms3d>(() => [
    { translateX: WORLD.w / 2 },
    { translateY: ENV_TOP + 120 },
    { scale: 0.7 + 0.3 * envViewIn.value },
    { translateX: -WORLD.w / 2 },
    { translateY: -(ENV_TOP + 120) },
  ]);
  const envTransform = useDerivedValue<Transforms3d>(() => [{ translateX: envX.value }, { translateY: envY.value }, { rotate: envAngle.value }]);
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
  const marksKey = openLetter && progress ? `marks:${openLetter.id}:${hash(savedStrokes[openLetter.id] ?? [])}` : '';
  const hasMarks = !!progress && (progress.censored.length > 0 || strokes.length > 0);
  const letterMarks = useBaked(layout && progress && hasMarks ? <LetterMarks strokes={strokes} /> : null, region, fit.scale, marksKey);

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
          revealed={progress.revealed}
          strokes={strokes}
          rings={rings}
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
  const guide = guideStep(state, (id) => getLetter(id));
  const guideList = (() => {
    if (!guide || help || drawing || envView) return [];
    const top = state.stack[0];
    const piled = top ? getLetter(top) : undefined;
    const pose = piled ? stackPose(piled, 0, LAYOUT.stack) : null;
    const size = piled ? envelopeSize(piled) : null;
    const censored = new Set(state.open ? (state.letters[state.open]?.censored ?? []) : []);
    const laid = layout?.segments.find((s) => s.seg.kind === 'sensitive' && !censored.has(s.seg.id) && (s.lines?.length ?? 0) > 0);
    const rails = (block: { x: number; y: number; tilt: number; skew: number }, rects: { x: number; y: number; w: number; h: number }[], yOf: (r: { y: number; h: number }) => number) =>
      rects.map((r) => {
        const origin = { x: block.x, y: block.y };
        const y = yOf(r);
        return {
          a: fromLocalFrame({ x: r.x, y }, origin, block.tilt, block.skew),
          b: fromLocalFrame({ x: r.x + r.w, y }, origin, block.tilt, block.skew),
        };
      });
    const lineAlong = laid ? rails(laid, laid.lines, (r) => r.y + r.h / 2) : [];
    const mid = lineAlong[Math.floor(lineAlong.length / 2)];
    const line = mid ? { x: (mid.a.x + mid.b.x) / 2, y: (mid.a.y + mid.b.y) / 2 } : null;
    const anomaly = openLetter?.inspectables?.find((i) => i.anomaly);
    const dateRails = layout?.date ? rails(layout.date, layout.date.lines, (r) => r.y + r.h / 2) : [];
    const dateTip = dateRails[dateRails.length - 1];
    const mark =
      anomaly?.target === 'seal' && layout?.seal
        ? { x: layout.seal.cx, y: layout.seal.cy, kind: 'seal' as const }
        : dateTip
          ? { x: (dateTip.a.x + dateTip.b.x) / 2, y: (dateTip.a.y + dateTip.b.y) / 2, kind: 'date' as const }
          : null;
    const wanted = openLetter?.reasons?.find((id) => reasons.some((r) => r.id === id));
    const row = slip && wanted ? reasonRows(reasons).find((r) => r.r.id === wanted) : undefined;
    const rest = LAYOUT.rest.pen;
    return guideCards({
      step: guide,
      hold: guideHold,
      letterId: state.open ?? null,
      envelope: pose && size ? { x: pose.x, y: pose.y, w: size.w, h: size.h } : null,
      pen: stickEnd(rest, rest.angle, 70),
      line,
      lineAlong,
      lens: { x: LAYOUT.rest.magnifier.x, y: LAYOUT.rest.magnifier.y },
      mark,
      markAlong: mark?.kind === 'date' ? dateRails : undefined,
      reason: row && wanted ? { x: row.rect.x + 6, y: row.rect.y + 4, id: wanted } : null,
      stamps: { x: LAYOUT.stamps.x + LAYOUT.stamps.w / 2, y: LAYOUT.stamps.y + 28 },
    });
  })();
  // Split by how often each part changes, so opening a letter redoes only small images.
  const deskKey = [day.day, showSlips, seenHelp.join(','), purseOf(state), state.warnings ?? 0, state.rank ?? 0].join('|');
  const desk_ = useBaked(
    <FontsBridge fonts={fonts}>
      <DeskSurface />
      <NightWindow />
      <CalendarLeaf calendar={day.calendar} />
      <MoneyNote kurus={purseOf(state)} warnings={state.warnings ?? 0} />
      <BrassPlate rank={{ name: rankOf(state).name, title: desk.rank.title }} />
      <LockedTray />
      {showSlips && slipIds.filter((id) => id !== 'rules').map((id) => <HelpSlip key={id} id={id} unread={!seenHelp.includes(id)} />)}
      {showSlips && <BookletOnDesk unread={!seenHelp.includes('rules')} />}
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
      <Para text={t('envelope.close')} x={0} y={ENV_TOP + envelopeSize(openLetter).h * ENV_ZOOM + 14} width={WORLD.w} family="Caveat" size={17} color="rgba(236,222,192,0.85)" align="center" />
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
    `pile:${stackIds.join(',')}|${dragId}`,
  );
  const stampCards = useBaked(
    <FontsBridge fonts={fonts}>
      <Stamps enabled={stampsEnabled} carried={pressing} decisions={openLetter?.burnable ? ['delivered'] : DECISIONS} />
    </FontsBridge>,
    STAMPS_REGION,
    fit.scale,
    `stamps:${stampsEnabled}:${pressing}:${openLetter?.burnable ? 'burn' : 'all'}`,
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
              <Fade opacity={envFade} transform={envTransform}>
                <LiftShadow {...envelopeSize(draggedLetter)} />
                <EnvelopeBody letter={draggedLetter} postmark={postmarkOf(draggedLetter, day.calendar.rumi)} />
                <EnvelopeAddress letter={draggedLetter} />
              </Fade>
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

            {(state.phase === 'ledger' || state.phase === 'continued') && <Ledger state={state} day={day} slide={ledgerTransform} />}

            <Lamp flicker={flicker} level={lampLevel} />
            <Ashtray flicker={flicker} flare={ashFlare} />
            <LightPool flicker={flicker} level={lampLevel} candleX={candleX} candleY={candleY} candleFlicker={candleFlicker} candleOffset={CANDLE_FLAME} dimmed={state.phase !== 'desk'} candle={hasCandle} candleReach={reveal === DEFAULT_REVEAL ? 120 : 165} />
            <Vignette />
            {showMorning && papers[morningIdx] && (
              <MorningPapers
                paper={papers[morningIdx]!}
                flags={flagsOf(state)}
                date={day.calendar.rumi}
                opacity={morningIn}
                lead={morningLead}
                spread={newsSpread}
                opened={newsOpen}
              />
            )}
            {guideList.map((card) => (
              <GuideCallout key={`${card.what}:${card.tip.x}:${card.tip.y}`} card={card} />
            ))}
            {help === 'rules' ? <BookletView pages={pages} spread={spread} opacity={helpIn} /> : help && <HelpSheetView id={help} opacity={helpIn} />}
            {(state.phase === 'evening' || (state.phase === 'continued' && state.account)) && <EveningSheet state={state} paid={paid} opacity={eveningIn} today={day.calendar.rumi} />}
            {state.phase === 'dismissed' && <DismissedCard opacity={dismissedIn} />}
            {state.phase === 'continued' && <ContinueCard nextDay={nextDay} ready={nextReady} opacity={continueOpacity} />}
            <BeginAgain />
          </Group>
        </FontsBridge>
      </Canvas>
    </GestureDetector>
  );
}
