import type { Metadata } from "next";
import "./globals.css";
import { inter, vt323 } from "../lib/fonts";

export const metadata: Metadata = {
  title: "FlappyCaster",
  description: "Daily high-score competition on Farcaster"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${vt323.variable}`}>
      <body className="bg-black text-white min-h-screen">{children}</body>
    </html>
  );
}
