import "./globals.css";
import type { Metadata } from "next";
import { Inter, Bricolage_Grotesque } from "next/font/google";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], display: "swap" });
// Police d'affichage (titres de mois, numéros de la constellation du calendrier).
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ephemeride.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Éphéméride — Agenda culturel et citoyen du vignoble nantais",
    template: "%s — Éphéméride",
  },
  description: "L'agenda culturel et citoyen du vignoble nantais",
  authors: [{ name: "Éphéméride" }],
  openGraph: {
    title: "Éphéméride — Agenda culturel et citoyen du vignoble nantais",
    description: "L'agenda culturel et citoyen du vignoble nantais",
    type: "website",
    locale: "fr_FR",
    siteName: "Éphéméride",
    images: ["/og-image.jpg"],
  },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning className={bricolage.variable}>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
