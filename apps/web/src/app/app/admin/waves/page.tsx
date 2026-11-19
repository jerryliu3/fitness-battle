"use client";

import { AdminWavesWorkspace } from "@/features/you/admin-waves-workspace";
import { AdminShell } from "@/features/you/admin-shell";

export default function AdminWavesPage() {
  return (
    <AdminShell title="Wave route assignments">
      <AdminWavesWorkspace />
    </AdminShell>
  );
}