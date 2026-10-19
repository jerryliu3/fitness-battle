"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { playCue } from "@/lib/haptics";

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
  const reduced = useReducedMotion();
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal forceMount>
        <AnimatePresence
          onExitComplete={() => {
            /* focus return handled by Radix */
          }}
        >
          {open ? (
            <>
              <Dialog.Overlay forceMount asChild>
                <motion.div
                  className="sheet-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.22 }}
                />
              </Dialog.Overlay>
              <Dialog.Content
                forceMount
                asChild
                onOpenAutoFocus={
                  preventAutoFocus
                    ? (event) => event.preventDefault()
                    : undefined
                }
              >
                <motion.div
                  className="sheet-content focus-sheet"
                  initial={{ y: "100%", x: "-50%", opacity: reduced ? 1 : 0.98 }}
                  animate={{ y: 0, x: "-50%", opacity: 1 }}
                  exit={{ y: "100%", x: "-50%", opacity: reduced ? 1 : 0.98 }}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { type: "spring", bounce: 0.12, duration: 0.42 }
                  }
                  onAnimationStart={() => {
                    void playCue("light");
                  }}
                >
                  <Dialog.Title>{title}</Dialog.Title>
                  <Dialog.Description>{body}</Dialog.Description>
                  {children}
                  <Dialog.Close className="sheet-close">Close</Dialog.Close>
                </motion.div>
              </Dialog.Content>
            </>
          ) : null}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
