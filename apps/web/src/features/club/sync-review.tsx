"use client";
import { AppParagraph, AppText } from "@/ui/section";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clubDuration,
  formatVolume,
  sportById,
  type CompeteState,
  type SportId,
  type SyncReviewReceipt,
} from "@fitness-battle/shared";
import { Sheet } from "@/ui/sheet";
export function SyncReview({
  receipt,
  state,
  onComplete,
}: {
  receipt: SyncReviewReceipt;
  state: CompeteState;
  onComplete: () => SportId | undefined;
}) {
  const router = useRouter(),
    [progress, setProgress] = useState(0),
    start = useRef(0),
    complete = useRef(false);
  const finish = (reveal: boolean) => {
    if (complete.current) return;
    complete.current = true;
    const sport = onComplete();
    if (reveal && sport) router.push(`/arena?event=${sport}`);
  };
  const today = receipt.activities;
  return (
    <Sheet
      open
      title={receipt.preview ? "Sample sync preview" : "Today’s effort"}
      body={
        receipt.preview
          ? "Demo/sample preview. Confirming adds no activities or competition points."
          : "Your sync is saved safely. Older activities were applied automatically. Review today’s activity, then reveal your updated field. Closing applies it without the recap."
      }
      onClose={() => finish(false)}
    >
      <div className="club-sync-recap">
        <AppParagraph typographyRole="badgeLabel" className="fb-kicker">
          {receipt.preview
            ? "PREVIEW · NOT A LIVE CONNECTION"
            : "YOU SHOWED UP"}
        </AppParagraph>
        <strong className="club-sync-total">
          {clubDuration(today.reduce((n, a) => n + a.movingSec, 0))}
        </strong>
        <AppParagraph typographyRole="body" className="fb-copy">
          {today.length} {today.length === 1 ? "activity" : "activities"} from
          today
        </AppParagraph>
        <ul className="club-sync-list">
          {today.map((a) => (
            <li key={a.id}>
              <div>
                <b>{sportById(a.sport).name}</b>
                <span>
                  {formatVolume(a.sport, a.distanceM, a.movingSec, state.units)}{" "}
                  · {clubDuration(a.movingSec)}
                </span>
              </div>
              <AppText as="small" role="caption" secondary>
                {receipt.preview
                  ? "Preview only"
                  : a.verified
                    ? "GPS verified"
                    : "Open activity"}
              </AppText>
            </li>
          ))}
        </ul>
        <div
          className="club-sync-swipe"
          role="slider"
          tabIndex={0}
          aria-label="Swipe to confirm today’s synced activities"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          onKeyDown={(e) => {
            if (["Enter", " ", "End", "ArrowRight"].includes(e.key)) {
              e.preventDefault();
              finish(true);
            }
          }}
          onPointerDown={(e) => {
            start.current = e.clientX;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
            const max = e.currentTarget.clientWidth - 60;
            setProgress(
              Math.max(0, Math.min(1, (e.clientX - start.current) / max)),
            );
          }}
          onPointerUp={(e) => {
            if (
              (e.clientX - start.current) /
                Math.max(1, e.currentTarget.clientWidth - 60) >=
              0.68
            )
              finish(true);
            else setProgress(0);
          }}
          onPointerCancel={() => setProgress(0)}
        >
          <span>Swipe to lock it in</span>
          <i style={{ left: `calc(${progress * 100}% - ${progress * 56}px)` }}>
            →
          </i>
        </div>
        <button className="fb-btn" type="button" onClick={() => finish(true)}>
          {receipt.preview ? "Finish preview" : "Confirm activities"}
        </button>
        <button
          className="fb-btn-line"
          type="button"
          onClick={() => finish(false)}
        >
          {receipt.preview ? "Close preview" : "Apply and skip recap"}
        </button>
      </div>
    </Sheet>
  );
}
