import { createContext, useContext, type ReactNode } from "react";
import type { SportId } from "@fitness-battle/shared";
export type PreviewFrame = { x: number; y: number; width: number; height: number };
export type CompeteExperience = {
  event: { account: string; sport: SportId } | null;
  immersive: boolean;
  enter(account: string, sport: SportId): void;
  close(): void;
  viewport?: PreviewFrame;
  updateViewport?: (frame: PreviewFrame) => void;
  previews?: Partial<Record<SportId, PreviewFrame>>;
  registerPreview?: (sport: SportId, measure: (() => void) | null) => void;
  updatePreview?: (sport: SportId, frame: PreviewFrame) => void;
  measurePreviews?: () => void;
};
const Context = createContext<CompeteExperience>({ event: null, immersive: false, enter() {}, close() {} });
export function CompeteExperienceProvider({ value, children }: { value: CompeteExperience; children: ReactNode }) { return <Context.Provider value={value}>{children}</Context.Provider>; }
export function useCompeteExperience() { return useContext(Context); }
