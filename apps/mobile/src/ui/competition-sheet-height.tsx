import { createContext, useContext, useState, type ReactNode } from "react";

const SheetHeight = createContext({ minimum: 0, setMinimum: (_height: number) => {} });

/** Map chrome anchors to the collapsed sheet, independent of its current stop. */
export function CompetitionSheetHeight({ children }: { children: ReactNode }) {
  const [minimum, setMinimum] = useState(0);
  return <SheetHeight.Provider value={{ minimum, setMinimum }}>{children}</SheetHeight.Provider>;
}
export const useCompetitionSheetHeight = () => useContext(SheetHeight);
