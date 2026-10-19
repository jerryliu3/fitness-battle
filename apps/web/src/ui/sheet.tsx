"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

export function Sheet({
  open,
  title,
  body,
  onClose,
  children,
  preventAutoFocus = false,
}: {
  open: boolean;
  title: string;
  body: string;
  onClose: () => void;
  children?: ReactNode;
  /** Stops mobile browsers from focusing the first field when the sheet opens. */
  preventAutoFocus?: boolean;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay" />
        <Dialog.Content
          className="sheet-content focus-sheet"
          onOpenAutoFocus={preventAutoFocus ? (event) => event.preventDefault() : undefined}
        >
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{body}</Dialog.Description>
          {children}
          <Dialog.Close className="sheet-close">Close</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
