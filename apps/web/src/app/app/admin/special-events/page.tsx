"use client";

import { AdminShell } from "@/features/you/admin-shell";
import { AdminSpecialEventsWorkspace } from "@/features/you/admin-special-events-workspace";

export default function AdminSpecialEventsPage() {
  return (
    <AdminShell title="Special event editions">
      <AdminSpecialEventsWorkspace />
    </AdminShell>
  );
}
