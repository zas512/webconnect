import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { NextAuthSessionProvider } from "@/providers/session-provider";
import { ThemeProvider } from "@/providers/theme-provider";

const notoSans = Noto_Sans({ variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Adaptive Voice Dialer - Call Center Solution",
  description: "Professional call center solution with advanced dialer functionality",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={notoSans.variable} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <NextAuthSessionProvider>
            <QueryProvider>{children}</QueryProvider>
          </NextAuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
