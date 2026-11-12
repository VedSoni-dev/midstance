import type { Metadata, Viewport } from "next";
import { Newsreader, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

const serif = Newsreader({ subsets: ["latin"], variable: "--font-serif", display: "swap", axes: ["opsz"] });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Midstance: a gait-lab dashboard, rebuilt in code",
  description:
    "A designer's fitness & healthcare UI rebuilt as a live, open-source frontend: a halftone load heatmap, a motion-capture runner and a real protocol readout. Design by Praveen Kumar, rebuilt by @forkthis_ai.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#eef0f0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
