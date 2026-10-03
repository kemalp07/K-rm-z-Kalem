import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getDay, getLetter, sideLetterCandidates } from '../content/loader';
import { mixIntoStack, pickSideLetters } from '../logic/sideLetters';
import type { Decision, HelpId } from '../content/types';
import { addMark, advancePhase, clearCensor, closeLedger, decide, finishEvening, openEnvelope, readMorning, setReason, startDay, type DayState } from '../logic/dayFlow';

interface GameStore {
  state: DayState;
  /** Pen strokes as SVG path strings, per letter — so a reopened app shows the same scrawl. */
  strokes: Record<string, string[]>;
  hydrated: boolean;
  /** Instruction sheets the player has already been shown once. */
  seenHelp: HelpId[];

  open: (letterId: string) => void;
  censor: (letterId: string, segId: string) => void;
  reveal: (letterId: string, segId: string) => void;
  inspect: (letterId: string, inspId: string) => void;
  /** A red ring around `target`; `wrong` places are recorded so the ledger can say so. */
  mark: (letterId: string, target: string, isAnomaly: boolean) => void;
  addStroke: (letterId: string, svg: string) => void;
  /** Rub out the pen work on a letter still on the desk. */
  erase: (letterId: string) => void;
  /** The reason ticked on the slip; must come before `stamp`. */
  reason: (letterId: string, reason: string) => void;
  stamp: (letterId: string, d: Decision) => void;
  advance: () => void;
  /** The morning papers are put away; work begins. */
  readMorning: () => void;
  /** Close the day's ledger: the Şube reckons the day into the purse. */
  closeLedger: () => void;
  /** Pay the chosen evening costs and purchases (ids) and end the day. */
  finishEvening: (paid: string[]) => void;
  /** The next authored day, with its side letters drawn; nothing if there is none yet. */
  nextDay: () => void;
  restart: () => void;
  markHelpSeen: (id: HelpId) => void;
}

const firstDay = (): DayState => {
  const day = getDay(1);
  if (!day) throw new Error('content/day01.json is missing');
  // A new desk each game: which side letters come, and where in the pile, is drawn here
  // once and then saved with the day.
  const seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
  const side = pickSideLetters(sideLetterCandidates, day.calendar.rumi, day.sideLetters ?? 0, seed);
  return startDay(day, undefined, mixIntoStack(day.letters.map((l) => l.id), side, seed));
};

export const useGame = create<GameStore>()(
  persist(
    (set) => ({
      state: firstDay(),
      strokes: {},
      hydrated: false,
      seenHelp: [],

      open: (id) => set((g) => ({ state: openEnvelope(g.state, id) })),
      censor: (id, seg) => set((g) => ({ state: addMark(g.state, id, 'censored', seg) })),
      reveal: (id, seg) => set((g) => ({ state: addMark(g.state, id, 'revealed', seg) })),
      inspect: (id, insp) => set((g) => ({ state: addMark(g.state, id, 'inspected', insp) })),
      mark: (id, target, isAnomaly) => set((g) => ({ state: addMark(g.state, id, isAnomaly ? 'marked' : 'wrongMarked', target) })),
      addStroke: (id, svg) =>
        set((g) => ({ strokes: { ...g.strokes, [id]: [...(g.strokes[id] ?? []), svg] } })),
      erase: (id) =>
        set((g) => (g.state.letters[id]?.decision ? g : { state: clearCensor(g.state, id), strokes: { ...g.strokes, [id]: [] } })),
      reason: (id, r) => set((g) => ({ state: setReason(g.state, id, r) })),
      stamp: (id, d) => set((g) => ({ state: decide(g.state, id, d) })),
      advance: () => set((g) => ({ state: advancePhase(g.state) })),
      readMorning: () => set((g) => ({ state: readMorning(g.state) })),
      closeLedger: () => set((g) => ({ state: closeLedger(g.state, getLetter) })),
      finishEvening: (paid) => set((g) => ({ state: finishEvening(g.state, paid) })),
      nextDay: () =>
        set((g) => {
          const day = getDay(g.state.day + 1);
          if (!day) return g;
          const seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
          const seen = new Set(Object.keys(g.state.letters));
          const side = pickSideLetters(sideLetterCandidates, day.calendar.rumi, day.sideLetters ?? 0, seed, seen);
          return { state: startDay(day, g.state, mixIntoStack(day.letters.map((l) => l.id), side, seed)) };
        }),
      restart: () => set({ state: firstDay(), strokes: {} }),
      markHelpSeen: (id) => set((g) => (g.seenHelp.includes(id) ? g : { seenHelp: [...g.seenHelp, id] })),
    }),
    {
      name: 'kirmizi-kalem/save',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (g) => ({ state: g.state, strokes: g.strokes, seenHelp: g.seenHelp }),
      onRehydrateStorage: () => () => useGame.setState({ hydrated: true }),
    },
  ),
);
