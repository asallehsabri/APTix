import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "APTix — ADTEC Pedas ICT Ticketing System",
  description:
    "APTix (i-Aduan ICT) — centralised ICT incident reporting, assignment and resolution-tracking platform for ADTEC JTM Kampus Pedas. Built per JTM ICT Ticketing System PRD.",
  keywords: ["APTix", "ADTEC Pedas", "JTM", "ICT Ticketing", "i-Aduan ICT", "Help Desk"],
  authors: [{ name: "ADTEC Pedas ICT Unit" }],
  robots: { index: false, follow: false },
  icons: { icon: "/logo-adtec.png", apple: "/logo-adtec.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
