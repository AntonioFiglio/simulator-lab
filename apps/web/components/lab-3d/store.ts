import { create } from "zustand";
export const useReplay = create<{
  elapsed: number;
  seek: (seconds: number) => void;
  tick: (delta: number) => void;
  epoch: number;
  restart: () => void;
  playing: boolean;
  speed: number;
  selected: string;
  setPlaying: (v: boolean) => void;
  setSpeed: (v: number) => void;
  select: (v: string) => void;
}>((set) => ({
  elapsed: 0,
  seek: (elapsed) => set({ elapsed: Math.max(0, Math.min(14, elapsed)), playing: false }),
  tick: (delta) => set((s) => {
    const elapsed = Math.min(14, s.elapsed + delta);
    return { elapsed, playing: elapsed < 14 };
  }),
  epoch: 0,
  restart: () =>
    set((s) => ({ epoch: s.epoch + 1, elapsed: 0, playing: true, selected: "" })),
  playing: true,
  speed: 1,
  selected: "",
  setPlaying: (playing) => set({ playing }),
  setSpeed: (speed) => set({ speed }),
  select: (selected) => set({ selected }),
}));
