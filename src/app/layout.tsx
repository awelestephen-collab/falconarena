import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Falcon Arena | Live Trivia, Rebus Puzzles & 4-Location Cup — Falcon Corporation Limited",
  description:
    "Interactive multiplayer trivia, Rebus puzzles, Majority Wins icebreakers, Team Squads, 4-Location Cup (Lekki HQ, Ikorodu LDC, Port Harcourt, Lekki Free Trade Zone) & Town Hall Lucky Draw for Falcon Corporation Limited.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#050c1a] text-slate-100 antialiased selection:bg-sky-500 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
