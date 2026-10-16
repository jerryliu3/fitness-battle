import type { Metadata } from "next";
import { ArenaScene } from "./scene";
export const metadata: Metadata = {
  title: "Arena lanes",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <ArenaScene />;
}
