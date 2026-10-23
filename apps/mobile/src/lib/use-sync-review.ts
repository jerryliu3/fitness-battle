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
  planSyncReview,
  type Action,
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
) {
  const current = useRef({ raw, state, account });
  current.current = { raw, state, account };
  const owner = useRef(account),
    batch = useRef(0),
    pending = useRef<{ receipt: SyncReviewReceipt; actions: Action[] } | null>(
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
  const finish = useCallback(() => {
    const value = pending.current;
    pending.current = null;
    blocked.current = false;
    setReceipt(null);
    if (!value || value.receipt.account !== current.current.account) return;
    value.actions.forEach((a) => current.current.raw(a));
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
      finish();
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
      const plan = planSyncReview(action, c.state);
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
  return {
    dispatch,
    preview,
    receipt: receipt?.account === account ? receipt : null,
    finish,
    begin,
    end,
    flushExpired,
  };
}
