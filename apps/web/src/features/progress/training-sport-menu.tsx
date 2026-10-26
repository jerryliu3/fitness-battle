"use client";
import { useEffect, useRef, useState } from "react";
import {
  SPORTS,
  defaultTrainingSports,
  isAllTrainingSports,
  toggleTrainingSports,
  trainingSportFilterLabel,
  type SportId,
} from "@fitness-battle/shared";

export function TrainingSportMenu({
  value,
  onChange,
}: {
  value: readonly SportId[];
  onChange: (sports: SportId[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const label = trainingSportFilterLabel(value);
  const allSelected = isAllTrainingSports(value);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="training-sport-menu" ref={root}>
      <button
        type="button"
        className={`fb-chip${allSelected ? " on" : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((current) => !current)}
      >
        {label}
        <span aria-hidden="true" className="training-sport-menu-caret">
          ▾
        </span>
      </button>
      {open ? (
        <div
          className="training-sport-menu-panel"
          role="group"
          aria-label="Sports filter"
        >
          <button
            type="button"
            className="training-sport-menu-all"
            onClick={() => {
              onChange(defaultTrainingSports());
              setOpen(false);
            }}
          >
            All sports
          </button>
          {SPORTS.map((sport) => {
            const checked = value.includes(sport.id);
            return (
              <label key={sport.id} className="training-sport-menu-option">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onChange(toggleTrainingSports(value, sport.id))}
                />
                <span>{sport.name}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
