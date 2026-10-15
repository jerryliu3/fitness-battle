"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function DetailSheet({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="ps-sheet"
      aria-labelledby="ps-sheet-title"
      onCancel={onClose}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <header>
        <h2 id="ps-sheet-title">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>
      <div className="ps-sheet-body">{children}</div>
    </dialog>
  );
}
