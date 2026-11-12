import { redirect } from "next/navigation";

/** Legacy path — vitals body demo lives under /ux (same access gate). */
export default function VitalsBodyDesignRedirect() {
  redirect("/ux/vitals-body");
}
