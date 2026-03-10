import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ARMAF — Decode the Mission",
  description:
    "Your mission begins. Solve puzzles, earn Intel Tokens, and unlock the vault.",
  openGraph: {
    title: "ARMAF — Decode the Mission",
    description: "Only some will reach the vault. Accept the mission.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-mission-black text-mission-white`}
      >
        {children}
        <div className="scanline-overlay" />
      </body>
    </html>
  );
}
