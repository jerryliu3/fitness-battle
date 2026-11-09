import { createContext, useContext, type ReactNode } from "react";
import type { CompeteEvent } from "@fitness-battle/shared";
export type CompeteExperience = {
  event: { account: string; sport: CompeteEvent } | null;
  immersive: boolean;
  enter(account: string, sport: CompeteEvent): void;
  close(): void;

};
const Context = createContext<CompeteExperience>({ event: null, immersive: false, enter() {}, close() {} });
export function CompeteExperienceProvider({ value, children }: { value: CompeteExperience; children: ReactNode }) { return <Context.Provider value={value}>{children}</Context.Provider>; }
export function useCompeteExperience() { return useContext(Context); }
