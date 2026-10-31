import type { ReactNode } from "react";
import { FocusSheet } from "./focus";

export function DetailSheet({ open, title, body, onClose, children }: {
  open: boolean;
  title: string;
  body: string;
  onClose: () => void;
  children?: ReactNode;
}) {
  return <FocusSheet open={open} title={title} body={body} onClose={onClose}>{children}</FocusSheet>;
}
