import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import NavbarWrapper from "./_components/NavbarWrapper";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "LegalMatch",
  description: "Consulenza legale professionale, semplice e veloce.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <NavbarWrapper />
        {children}
      </body>
    </html>
  );
}
