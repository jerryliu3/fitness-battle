import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";

type Block = { id: string; name: string };
type BlockContextValue = { blocks: Block[]; ready: boolean; error: string; reload: () => Promise<void>; setBlocked: (id: string, blocked: boolean) => Promise<void> };
const BlockContext = createContext<BlockContextValue>({ blocks: [], ready: true, error: "", reload: async () => {}, setBlocked: async () => { throw new Error("Blocking is unavailable."); } });

export function AthleteBlocksProvider({ children }: { children: ReactNode }) {
  const { user, offlineMode } = useAuth();
  const owner = user?.id ?? "";
  const current = useRef(owner);
  const sequence = useRef(0);
  current.current = owner;
  const [snapshot, setSnapshot] = useState<{ owner: string; blocks: Block[]; ready: boolean; error: string }>({ owner: "", blocks: [], ready: false, error: "" });
  const reload = useCallback(async () => {
    const attempt = ++sequence.current;
    if (!owner || offlineMode) { setSnapshot({ owner, blocks: [], ready: true, error: "" }); return; }
    let deadline: ReturnType<typeof setTimeout> | undefined;
    try {
      const expired = new Promise<never>((_, reject) => {
        deadline = setTimeout(() => reject(new Error("Block list timed out")), 15000);
      });
      const blocks: Block[] = [];
      const pageSize = 100;
      let after: string | null = null;
      while (true) {
        let query = supabase.from("athlete_blocks")
          .select("blocked_id, profiles!athlete_blocks_blocked_id_fkey(display_name)")
          .eq("blocker_id", owner).order("blocked_id").limit(pageSize);
        if (after) query = query.gt("blocked_id", after);
        const { data, error } = await Promise.race([query, expired]);
        if (current.current !== owner || sequence.current !== attempt) return;
        if (error) throw error;
        const rows = data ?? [];
        for (const row of rows) {
          const person = row.profiles as unknown as { display_name?: string } | null;
          blocks.push({ id: String(row.blocked_id), name: person?.display_name ?? "Athlete" });
        }
        if (rows.length < pageSize) break;
        after = String(rows[rows.length - 1]!.blocked_id);
      }
      setSnapshot({ owner, blocks, ready: true, error: "" });
    } catch {
      if (current.current === owner && sequence.current === attempt) setSnapshot(previous => ({ owner, blocks: previous.owner === owner ? previous.blocks : [], ready: false, error: "Could not load blocked athletes. Check your connection and retry." }));
    } finally {
      clearTimeout(deadline);
    }
  }, [owner, offlineMode]);
  useEffect(() => { void reload(); }, [reload]);
  const setBlocked = useCallback(async (id: string, blocked: boolean) => {
    if (!owner || offlineMode || id === owner) throw new Error("A live signed-in account is required.");
    const result = blocked
      ? await supabase.from("athlete_blocks").insert({ blocker_id: owner, blocked_id: id })
      : await supabase.from("athlete_blocks").delete().eq("blocker_id", owner).eq("blocked_id", id);
    if (result.error) throw new Error("Could not update this block. Please try again.");
    if (current.current === owner) await reload();
  }, [owner, offlineMode, reload]);
  const value = useMemo(() => ({ blocks: snapshot.owner === owner ? snapshot.blocks : [], ready: snapshot.owner === owner && snapshot.ready, error: snapshot.owner === owner ? snapshot.error : "", reload, setBlocked }), [snapshot, owner, reload, setBlocked]);
  return <BlockContext.Provider value={value}>{children}</BlockContext.Provider>;
}
export const useAthleteBlocks = () => useContext(BlockContext);
