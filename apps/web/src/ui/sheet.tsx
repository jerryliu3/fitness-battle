"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { playCue } from "@/lib/haptics";

export function Sheet({
  open,
  title,
  body,
  onClose,
  children,
  preventAutoFocus = true,
  returnFocusTo,
  minimal = false,
  fullScreen = false,
}: {
  open: boolean;
  title: string;
  body: string;
  onClose: () => void;
  children?: ReactNode;
  minimal?: boolean;
  fullScreen?: boolean;
  /** Stops mobile browsers from focusing the first field when the sheet opens. */
  preventAutoFocus?: boolean;
  /** Preserve the original opener when an intermediate preview unmounts. */
  returnFocusTo?: RefObject<HTMLElement | null>;
}) {
  const reduced = useReducedMotion();
  const returnFocus = useRef<HTMLElement | null>(null);
  const heading = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => {
    if (open) void playCue("light");
  }, [open]);
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
                onOpenAutoFocus={(event) => {
                  returnFocus.current =
                    document.activeElement instanceof HTMLElement
                      ? document.activeElement
                      : null;
                  if (preventAutoFocus) {
                    event.preventDefault();
                    heading.current?.focus({ preventScroll: true });
                  }
                }}
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                  const target=returnFocusTo?.current??returnFocus.current;
                  if(target?.isConnected)target.focus({ preventScroll: true });
                }}
              >
                <motion.div
                  className={`sheet-content focus-sheet${fullScreen ? " club-fullscreen-sheet" : ""}`}
                  initial={
                    reduced ? false : { y: "100%", x: "-50%", opacity: 0.98 }
                  }
                  animate={{ y: 0, x: "-50%", opacity: 1 }}
                  exit={{
                    y: reduced ? 0 : "100%",
                    x: "-50%",
                    opacity: reduced ? 1 : 0.98,
                  }}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : { type: "spring", bounce: 0.12, duration: 0.42 }
                  }
                >
                  <div className="sheet-grab" aria-hidden="true" />
                  <div className="club-sheet-heading">
                    <Dialog.Title ref={heading} tabIndex={-1}>{title}</Dialog.Title>
                    {!minimal && <Dialog.Close asChild><button type="button" className="club-sheet-dismiss" aria-label="Close dialog">×</button></Dialog.Close>}
                  </div>
                  <Dialog.Description>{body}</Dialog.Description>
                  {children}
                </motion.div>
              </Dialog.Content>
            </>
          ) : null}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
