import type { Metadata } from "next";
import localFont from "next/font/local";
import { WorldsLab } from "@/app/design/_studies/worlds-lab/worlds-lab";

const comic = localFont({ src: "../../fonts/bangers/Bangers-Regular.woff2",
  weight: "400",
  variable: "--font-world-comic",
});
const broadcast = localFont({ src: "../../fonts/archivoblack/ArchivoBlack-Regular.woff2",
  weight: "400",
  variable: "--font-world-broadcast",
});
const rounded = localFont({ src: "../../fonts/outfit/Outfit[wght].woff2", weight: "100 900",
  variable: "--font-world-rounded",
});
const music = localFont({ src: "../../fonts/spacegrotesk/SpaceGrotesk[wght].woff2", weight: "300 700",
  variable: "--font-world-music",
});

export const metadata: Metadata = {
  title: "Five product worlds · Design lab",
  description:
    "Flip, Rally, Roam, a rebuilt Loop and Tempo: five mascot-led interactive fitness concepts.",
  robots: { index: false, follow: false },
};

export default function WorldsPage() {
  return (
    <div
      className={`${comic.variable} ${broadcast.variable} ${rounded.variable} ${music.variable}`}
    >
      <WorldsLab />
    </div>
  );
}
