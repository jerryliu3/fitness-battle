"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getAppColors, resolveColorMode, type AppearancePreference } from "@fitness-battle/shared";
import { APPEARANCE_COOKIE, appearanceVariables, parseAppearance } from "./app-colors";

const AppearanceContext = createContext<{ preference: AppearancePreference; setPreference: (value: AppearancePreference) => void }>({preference:"system",setPreference(){}});
export function AppearanceProvider({ initialAppearance, children }: { initialAppearance?: string | null; children: ReactNode }) {
  const [preference,setPreference] = useState<AppearancePreference>(()=>parseAppearance(initialAppearance));
  useEffect(()=>{
    const root=document.documentElement;
    root.dataset.appearance=preference;
    const variables=appearanceVariables(preference);
    for(const [key,value] of Object.entries(variables)) if(key.startsWith("--")) root.style.setProperty(key,String(value));
    root.style.colorScheme=preference==="system"?"light dark":preference;
    document.cookie=`${APPEARANCE_COOKIE}=${preference}; Path=/; Max-Age=31536000; SameSite=Lax`;
    const media=window.matchMedia("(prefers-color-scheme: dark)");
    const updateMeta=()=>{const mode=resolveColorMode(preference,media.matches?"dark":"light");document.querySelector('meta[name="theme-color"]')?.setAttribute("content",getAppColors(mode).surfaceCanvas);};
    updateMeta();media.addEventListener("change",updateMeta);return()=>media.removeEventListener("change",updateMeta);
  },[preference]);
  return <AppearanceContext.Provider value={{preference,setPreference}}>{children}</AppearanceContext.Provider>;
}
export function useAppearance() { return useContext(AppearanceContext); }


/** Reusable control for screens adopting the appearance contract. */
export function AppearanceControl() {
  const { preference, setPreference } = useAppearance();
  return <fieldset><legend>Appearance</legend>
    {(["system", "light", "dark"] as const).map(value => <label key={value}>
      <input type="radio" name="appearance" value={value} checked={preference === value}
        onChange={() => setPreference(value)} />
      {value === "system" ? "System" : value === "light" ? "Light" : "Dark"}
    </label>)}
  </fieldset>;
}
