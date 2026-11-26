import { appearanceVariables, parseAppearance } from "@/theme/app-colors";
import { typographyVariables } from "@/ui/section";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import { getTheme } from "@/theme/catalog";
import "./globals.css";
import "@/theme/themes.css";

const display = localFont({ src: "fonts/bebasneue/BebasNeue-Regular.woff2",
  weight: "400",
  variable: "--font-display",
});

const body = localFont({ src: "fonts/urbanist/Urbanist[wght].ttf", weight: "100 900",
  variable: "--font-body",
});

const formType = localFont({ src: "fonts/spacegrotesk/SpaceGrotesk[wght].woff2", weight: "300 700",
  variable: "--font-form",
});

const rallyDisplay = localFont({ src: "fonts/archivoblack/ArchivoBlack-Regular.woff2",
  weight: "400",
  variable: "--font-rally-display",
});

const rallyComic = localFont({ src: "fonts/bangers/Bangers-Regular.woff2",
  weight: "400",
  variable: "--font-rally-comic",
});

const overtaek = localFont({ src: "fonts/nunitosans/NunitoSans[YTLC,opsz,wdth,wght].woff2",
  weight: "900",
  variable: "--font-overtaek",
});

export const metadata: Metadata = {
  title: "Overtaek",
  description: "Everyday training, weekly fields, and progress with your crew.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const appearance = parseAppearance(undefined);
  const theme = getTheme();
  return (
    <html
      lang="en"
      suppressHydrationWarning
      style={{ ...typographyVariables(), ...appearanceVariables(appearance) }}
      data-appearance={appearance}
      data-theme={theme.id}
      className={`${display.variable} ${body.variable} ${formType.variable} ${rallyDisplay.variable} ${rallyComic.variable} ${overtaek.variable} ${theme.htmlClass}`}
    >
      <body>
        <Providers initialTheme={null} initialAppearance={null}>{children}</Providers>
      </body>
    </html>
  );
}
