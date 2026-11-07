import { createContext, useContext, type ReactNode } from "react";
import type { SportId } from "@fitness-battle/shared";
export type CompeteExperience = {
  event: { account: string; sport: SportId } | null;
  immersive: boolean;
  enter(account: string, sport: SportId): void;
  close(): void;

};
const Context = createContext<CompeteExperience>({ event: null, immersive: false, enter() {}, close() {} });
export function CompeteExperienceProvider({ value, children }: { value: CompeteExperience; children: ReactNode }) { return <Context.Provider value={value}>{children}</Context.Provider>; }
export function useCompeteExperience() { return useContext(Context); }
