"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { countedActivityIds, newCountedIds } from "@fitness-battle/shared";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
export function ReturnProgress() {
  const { user } = useAuth();
  const { state, loadStatus } = useCompete();
  const path = usePathname();
  const router = useRouter();
  const [added, setAdded] = useState(0);
  const initialized = useRef<string | null>(null);
  useEffect(() => {
    if (!state || !user || loadStatus !== "ready") return;
    const key = `fb-focus-seen:${user.id}`;
    const ids = countedActivityIds(state);
    try {
      if (initialized.current !== user.id) {
        initialized.current = user.id;
        const raw = localStorage.getItem(key);
        const seen: unknown = raw ? JSON.parse(raw) : null;
        if (Array.isArray(seen) && seen.every((id) => typeof id === "string")) {
          const count = newCountedIds(seen, ids).length;
          if (count > 0) {
            setAdded(count);
            router.replace("/arena");
          }
        }
      }
      localStorage.setItem(key, JSON.stringify(ids));
    } catch {
      /* Progress remains available if device storage is disabled. */
    }
  }, [state, user?.id, loadStatus, router]);
  if (!added || path !== "/arena") return null;
  return (
    <section className="focus-return" aria-label="New training progress">
      <div>
        <b>
          {added} new counted {added === 1 ? "session" : "sessions"}.
        </b>
        <p>Your effort went somewhere. Explore your updated lanes.</p>
      </div>
      <button
        onClick={() => {
          setAdded(0);
          router.push("/today");
        }}
      >
        Continue to Home →
      </button>
    </section>
  );
}
