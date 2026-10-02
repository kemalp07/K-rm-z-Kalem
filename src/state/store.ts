import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getDay } from '../content/loader';
import type { Decision } from '../content/types';
import { addMark, advancePhase, decide, openEnvelope, startDay, type DayState } from '../logic/dayFlow';

interface GameStore {
  state: DayState;
  /** Pen strokes as SVG path strings, per letter — so a reopened app shows the same scrawl. */
  strokes: Record<string, string[]>;
  hydrated: boolean;

  open: (letterId: string) => void;
  censor: (letterId: string, segId: string) => void;
  reveal: (letterId: string, segId: string) => void;
  inspect: (letterId: string, inspId: string) => void;
  addStroke: (letterId: string, svg: string) => void;
  stamp: (letterId: string, d: Decision) => void;
  advance: () => void;
  restart: () => void;
}

const firstDay = (): DayState => {
  const day = getDay(1);
  if (!day) throw new Error('content/day01.json is missing');
  return startDay(day);
};

export const useGame = create<GameStore>()(
  persist(
    (set) => ({
      state: firstDay(),
      strokes: {},
      hydrated: false,

      open: (id) => set((g) => ({ state: openEnvelope(g.state, id) })),
      censor: (id, seg) => set((g) => ({ state: addMark(g.state, id, 'censored', seg) })),
      reveal: (id, seg) => set((g) => ({ state: addMark(g.state, id, 'revealed', seg) })),
      inspect: (id, insp) => set((g) => ({ state: addMark(g.state, id, 'inspected', insp) })),
      addStroke: (id, svg) =>
        set((g) => ({ strokes: { ...g.strokes, [id]: [...(g.strokes[id] ?? []), svg] } })),
      stamp: (id, d) => set((g) => ({ state: decide(g.state, id, d) })),
      advance: () => set((g) => ({ state: advancePhase(g.state) })),
      restart: () => set({ state: firstDay(), strokes: {} }),
    }),
    {
      name: 'kirmizi-kalem/save',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (g) => ({ state: g.state, strokes: g.strokes }),
      onRehydrateStorage: () => () => useGame.setState({ hydrated: true }),
    },
  ),
);
