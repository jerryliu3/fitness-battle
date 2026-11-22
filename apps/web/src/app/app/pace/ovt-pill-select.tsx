"use client";

import { useEffect, useId, useRef, useState } from "react";

export type OvtPillOption = {
  value: string;
  label: string;
  sublabel?: string;
};

export function OvtPillSelect({
  value,
  options,
  onChange,
  ariaLabel,
  prefix,
  highlighted = false,
  variant = "light",
}: {
  value: string;
  options: readonly OvtPillOption[];
  onChange: (nextValue: string) => void;
  ariaLabel: string;
  prefix?: string;
  highlighted?: boolean;
  variant?: "light" | "dark";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const current = options.find(o => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`ovt-pill-select ${variant === "dark" ? "is-dark" : ""} ${open ? "is-open" : ""} ${highlighted ? "is-highlighted" : ""}`}
    >
      <button
        type="button"
        className="ovt-pill-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(v => !v)}
      >
        {prefix && <span className="ovt-pill-prefix">{prefix}</span>}
        <span className="ovt-pill-value">{current?.label ?? value}</span>
        <svg
          className="ovt-pill-chevron"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2.75 4.5L6 7.75L9.25 4.5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          id={menuId}
          role="listbox"
          aria-label={ariaLabel}
          className="ovt-pill-menu"
        >
          {options.map(opt => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`ovt-pill-option ${isSelected ? "is-selected" : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <span className="ovt-pill-option-text">
                  <span>{opt.label}</span>
                  {opt.sublabel && <small>{opt.sublabel}</small>}
                </span>
                {isSelected && (
                  <span className="ovt-pill-check" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
