import type { Metadata } from "next";
import localFont from "next/font/local";
import { RallyFocus } from "@/app/design/_studies/rally-lab/rally-focus";

const rallyType = localFont({ src: "../../fonts/archivoblack/ArchivoBlack-Regular.woff2",
  weight: "400",
  variable: "--font-rf-display",
});
const comicType = localFont({ src: "../../fonts/bangers/Bangers-Regular.woff2",
  weight: "400",
  variable: "--font-rf-comic",
});

export const metadata: Metadata = {
  title: "Rally · The focused direction",
  description:
    "Rally's structure and Ace, Loop's small-move rings, and optional Flip-inspired highlights.",
  robots: { index: false, follow: false },
};

export default function RallyPage() {
  return (
    <div className={`${rallyType.variable} ${comicType.variable}`}>
      <RallyFocus />
    </div>
  );
}
