"use client";

import { AdminRoutesWorkspace } from "@/features/you/admin-routes-workspace";
import { AdminShell } from "@/features/you/admin-shell";

export default function AdminRoutesPage() {
  return (
    <AdminShell title="3D route catalog">
      <AdminRoutesWorkspace />
    </AdminShell>
  );
}