import { create } from "zustand";
export const useReplay = create<{
  epoch: number;
  restart: () => void;
  playing: boolean;
  speed: number;
  selected: string;
  setPlaying: (v: boolean) => void;
  setSpeed: (v: number) => void;
  select: (v: string) => void;
}>((set) => ({
  epoch: 0,
  restart: () =>
    set((s) => ({ epoch: s.epoch + 1, playing: true, selected: "" })),
  playing: true,
  speed: 1,
  selected: "",
  setPlaying: (playing) => set({ playing }),
  setSpeed: (speed) => set({ speed }),
  select: (selected) => set({ selected }),
}));
