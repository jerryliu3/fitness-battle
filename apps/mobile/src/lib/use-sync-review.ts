import { AppState } from "react-native";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import {
  competeNow,
  dayKey,
  changedTodaySync,
  changedSyncActivities,
  countsOnTrack,
  planSyncReview,
  reduceCompete,
  selectedSyncActions,
  type Action,
  type Activity,
  type CompeteState,
  type SportId,
  type SyncReviewReceipt,
} from "@fitness-battle/shared";
/** Account-scoped, memory-only recap. Closing applies it; restarting loads durable server ingest quietly. */
export function useSyncReviewGate(
  raw: (action: Action) => void,
  state: CompeteState | null,
  account: string | null,
  blocked: MutableRefObject<boolean>,
  onApply?: (next: CompeteState, quiet?: boolean) => void,
) {
  const current = useRef({ raw, state, account, onApply });
  current.current = { raw, state, account, onApply };
  const owner = useRef(account),
    batch = useRef(0),
    pending = useRef<{ receipt: SyncReviewReceipt; actions: Action[]; beforeApply?: () => void } | null>(
      null,
    );
  const [receipt, setReceipt] = useState<SyncReviewReceipt | null>(null);
  if (owner.current !== account) {
    owner.current = account;
    pending.current = null;
    batch.current = 0;
    blocked.current = false;
  }
  useEffect(() => {
    setReceipt(null);
  }, [account]);
  const finish = useCallback((selected?: readonly string[], quiet = false) => {
    const value = pending.current;
    pending.current = null;
    blocked.current = false;
    setReceipt(null);
    if (!value || value.receipt.account !== current.current.account) return;
    value.beforeApply?.();
    const actions = selected ? selectedSyncActions(value.actions, selected) : value.actions;
    const before = current.current.state;
    if (before) current.current.onApply?.(actions.reduce(reduceCompete, before), quiet);
    actions.forEach((a) => current.current.raw(a));
    return value.receipt.preview
      ? undefined
      : (value.receipt.activities.find((a) =>
          current.current.state?.ratings.some(
            (r) => r.sport === a.sport && r.optedIn,
          ),
        )?.sport as SportId | undefined);
  }, [blocked]);
  const flushExpired = useCallback(() => {
    const value = pending.current;
    if (
      value &&
      current.current.state &&
      value.receipt.day !== dayKey(competeNow(current.current.state))
    )
      finish(undefined, true);
  }, [finish]);
  useEffect(() => {
    if (!receipt) return;
    const timer = setInterval(flushExpired, 10000);
    return () => clearInterval(timer);
  }, [receipt, flushExpired]);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (status) => {
      if (status === "active") flushExpired();
    });
    return () => listener.remove();
  }, [flushExpired]);
  const dispatch = useCallback(
    (action: Action) => {
      const c = current.current;
      if (action.accountId && action.accountId !== c.account) return;
      if (!c.state) {
        c.raw(action);
        return;
      }
      const normalized = c.account && !action.accountId ? { ...action, accountId: c.account } : action;
      const plan = planSyncReview(normalized, c.state);
      if (plan.immediate.syncPresentation === "quiet" || plan.preview) c.onApply?.(reduceCompete(c.state, plan.immediate), true);
      c.raw(plan.immediate);
      if (!plan.activities.length) return;
      const previous = pending.current;
      if (plan.preview && previous && !previous.receipt.preview) return;
      const all = [
        ...(previous?.receipt.preview && !plan.preview
          ? []
          : (previous?.receipt.activities ?? [])),
        ...plan.activities,
      ];
      const activities = [...new Map(all.map((a) => [a.id, a])).values()];
      const actions = [
        ...(previous?.actions ?? []),
        ...(plan.deferred ? [plan.deferred] : []),
      ];
      pending.current = {
        receipt: {
          account: c.account,
          day: dayKey(competeNow(c.state)),
          activities,
          preview: !actions.length,
        },
        actions,
      };
      blocked.current = !!actions.length;
      if (batch.current === 0) setReceipt({ ...pending.current.receipt });
    },
    [blocked],
  );
  const begin = useCallback((forAccount?: string) => {
    if (forAccount && forAccount !== current.current.account) return;
    batch.current++;
  }, []);
  const end = useCallback((forAccount?: string) => {
    if (forAccount && forAccount !== current.current.account) return;
    batch.current = Math.max(0, batch.current - 1);
    if (batch.current === 0 && pending.current)
      setReceipt({ ...pending.current.receipt });
  }, []);
  const preview = useCallback(() => {
    const c = current.current;
    if (!c.state || pending.current?.actions.length) return;
    const now = competeNow(c.state);
    const activities = changedTodaySync(c.state.activities, [], now);
    pending.current = {
      receipt: {
        account: c.account,
        day: dayKey(now),
        activities,
        preview: true,
      },
      actions: [],
    };
    setReceipt({ ...pending.current.receipt });
  }, []);
  const stage = (activities: Activity[], actions: Action[], beforeApply?: () => void, forState?: CompeteState) => {
    const c = current.current;
    const source = forState ?? c.state;
    if (!source) return;
    pending.current = { receipt: { account: c.account, day: dayKey(competeNow(source)), activities, preview: false }, actions, beforeApply };
    blocked.current = actions.length > 0;
    setReceipt({ ...pending.current.receipt });
  };
  const holdRemote = (next: CompeteState): CompeteState => {
    const c = current.current;
    if (!c.state || pending.current) return next;
    const activities = changedSyncActivities(next.activities, c.state.activities, competeNow(next)).filter(a => countsOnTrack(a, "open") && a.source !== "manual" && a.source !== "history");
    if (!activities.length) return next;
    const actions: Action[] = [...new Set(activities.map(a => a.source))].filter((provider): provider is NonNullable<Action["provider"]> => provider !== "manual" && provider !== "history").map(provider => ({
      type: "apply-sync", provider, accountId: c.account ?? undefined, now: competeNow(next).toISOString(), activities: activities.filter(a => a.source === provider),
    }));
    stage(activities, actions);
    const held = new Set(activities.map(a => a.id));
    return { ...next, activities: [...next.activities.filter(a => !held.has(a.id)), ...c.state.activities.filter(a => held.has(a.id))] };
  };
  return {
    dispatch,
    stage,
    holdRemote,
    preview,
    receipt: receipt?.account === account ? receipt : null,
    finish,
    begin,
    end,
    flushExpired,
    reset: () => { pending.current = null; blocked.current = false; batch.current = 0; setReceipt(null); },
  };
}
