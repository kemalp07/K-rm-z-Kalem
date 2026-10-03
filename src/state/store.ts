import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getDay, sideLetterCandidates } from '../content/loader';
import { mixIntoStack, pickSideLetters } from '../logic/sideLetters';
import type { Decision, HelpId } from '../content/types';
import { addMark, advancePhase, clearCensor, decide, openEnvelope, startDay, type DayState } from '../logic/dayFlow';

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
  addStroke: (letterId: string, svg: string) => void;
  /** Rub out the pen work on a letter still on the desk. */
  erase: (letterId: string) => void;
  stamp: (letterId: string, d: Decision) => void;
  advance: () => void;
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
      addStroke: (id, svg) =>
        set((g) => ({ strokes: { ...g.strokes, [id]: [...(g.strokes[id] ?? []), svg] } })),
      erase: (id) =>
        set((g) => (g.state.letters[id]?.decision ? g : { state: clearCensor(g.state, id), strokes: { ...g.strokes, [id]: [] } })),
      stamp: (id, d) => set((g) => ({ state: decide(g.state, id, d) })),
      advance: () => set((g) => ({ state: advancePhase(g.state) })),
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
