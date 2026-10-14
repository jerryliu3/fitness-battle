import type { Metadata } from "next";
import { Archivo_Black, Bangers, Bebas_Neue, DM_Sans, Space_Grotesk } from "next/font/google";
import { cookies } from "next/headers";
import { Providers } from "@/components/providers";
import { getTheme, parseThemeId } from "@/theme/catalog";
import "./globals.css";
import "@/theme/themes.css";

const display = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const formType = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-form",
});

const rallyDisplay = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-rally-display",
});

const rallyComic = Bangers({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-rally-comic",
});

export const metadata: Metadata = {
  title: "Fitness Battle",
  description: "One-tap group and 1v1 fitness battles with automatic tracking.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const jar = await cookies();
  const theme = getTheme(parseThemeId(jar.get("fb_theme")?.value));
  return (
    <html
      lang="en"
      data-theme={theme.id}
      className={`${display.variable} ${body.variable} ${formType.variable} ${rallyDisplay.variable} ${rallyComic.variable} ${theme.htmlClass}`}
    >
      <body>
        <Providers initialTheme={theme.id}>{children}</Providers>
      </body>
    </html>
  );
}
