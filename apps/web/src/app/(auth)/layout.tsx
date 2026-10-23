import "@/features/club/auth.css";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="fb fb-auth">{children}</div>;
}
