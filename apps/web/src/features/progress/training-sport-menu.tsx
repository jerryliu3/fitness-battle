"use client";
import { useEffect, useRef, useState } from "react";
import {
  SPORTS,
  defaultTrainingSports,
  isAllTrainingSports,
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
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const toggle = (id: SportId) => {
    const next = value.includes(id)
      ? value.filter((sport) => sport !== id)
      : [...value, id];
    onChange(next.length ? next : [...defaultTrainingSports()]);
  };

  return (
    <div className="training-sport-menu" ref={root}>
      <button
        type="button"
        className={`fb-chip${allSelected ? " on" : ""}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
      >
        {label}
        <span aria-hidden="true" className="training-sport-menu-caret">
          ▾
        </span>
      </button>
      {open ? (
        <div className="training-sport-menu-panel" role="listbox" aria-label="Sports">
          <button
            type="button"
            className="training-sport-menu-all"
            onClick={() => onChange(defaultTrainingSports())}
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
                  onChange={() => toggle(sport.id)}
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
