import { typographyVariables } from "@/ui/section";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import { Providers } from "@/components/providers";
import { getTheme, parseThemeId } from "@/theme/catalog";
import "./globals.css";
import "@/theme/themes.css";

const display = localFont({ src: "fonts/bebasneue/BebasNeue-Regular.woff2",
  weight: "400",
  variable: "--font-display",
});

const body = localFont({ src: "fonts/manrope/Manrope[wght].ttf", weight: "200 800",
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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const jar = await cookies();
  const theme = getTheme(parseThemeId(jar.get("fb_theme")?.value));
  return (
    <html
      lang="en"
      style={typographyVariables()}
      data-theme={theme.id}
      className={`${display.variable} ${body.variable} ${formType.variable} ${rallyDisplay.variable} ${rallyComic.variable} ${overtaek.variable} ${theme.htmlClass}`}
    >
      <body>
        <Providers initialTheme={theme.id}>{children}</Providers>
      </body>
    </html>
  );
}
