"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Ace } from "./ace";
import {
  formatRallyValue,
  gapText,
  type RallyMove,
  type RallyReference,
  type RallySnapshot,
  type RallyUnit,
} from "./model";

export function RallyDetailDialog({
  detail,
  onClose,
}: {
  detail: { title: string; body: ReactNode; kind: "activity" | "info" } | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (detail && !dialog.current?.open) dialog.current?.showModal();
    if (!detail && dialog.current?.open) dialog.current.close();
  }, [detail]);

  return (
    <dialog
      ref={dialog}
      className={`rf-dialog rf-dialog-${detail?.kind ?? "info"}`}
      aria-labelledby="rf-detail-title"
      onClose={onClose}
      onCancel={onClose}
    >
      <header>
        <h2 id="rf-detail-title">{detail?.title}</h2>
        <button type="button" aria-label="Close detail" onClick={onClose}>
          ×
        </button>
      </header>
      <div>{detail?.body}</div>
      <button type="button" className="rf-dialog-done" onClick={onClose}>
        Back to Rally
      </button>
    </dialog>
  );
}

export function ActivityReceipt({
  move,
  at,
  reference,
  unit,
}: {
  move: RallyMove;
  at: RallySnapshot;
  reference: RallyReference;
  unit: RallyUnit;
}) {
  return (
    <>
      <p className="rf-kicker">
        {move.day} · {move.date} ·{" "}
        {move.verified ? "Verified import" : "Counted import"}
      </p>
      <div className="rf-receipt-poster">
        <div>
          <span className="rf-sticker">NICE MOVE!</span>
          <h3>
            THAT ONE
            <br />
            COUNTED.
          </h3>
        </div>
        <Ace decorative={false} />
      </div>
      <div className="rf-receipt-frames">
        <section>
          <span>01 / THE MOVE</span>
          <strong>
            {unit === "km" ? move.km.toFixed(1) : move.minutes}
            <small>{unit === "km" ? "km" : "min"}</small>
          </strong>
          <p>
            {move.minutes} min · {move.source}
          </p>
        </section>
        <section>
          <span>02 / YOUR WEEK AFTER IT</span>
          <strong>
            {formatRallyValue(at.total, unit)}
            <small>{unit}</small>
          </strong>
          <p>
            {at.count} counted {at.count === 1 ? "outing" : "outings"}
          </p>
        </section>
        <section>
          <span>03 / SAME POINT IN THE WEEK</span>
          <strong className="rf-receipt-gap">{gapText(at.gap, unit)}</strong>
          <p>
            {reference.ghost
              ? "of your previous week"
              : `compared with ${reference.name.split(" ")[0]}`}{" "}
            ({formatRallyValue(at.against, unit)} {unit})
          </p>
        </section>
      </div>
      <p className="rf-receipt-note">{move.note}</p>
      <p className="rf-source-note">
        Counted once from your connected tracker. Opening a receipt always
        compares the same point in the week.
      </p>
    </>
  );
}
