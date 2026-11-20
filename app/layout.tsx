import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { APP_NAME } from "@/lib/config";
import "./globals.css";

// The recording uses an Inter-style typeface
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = { title: APP_NAME };
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#463ac5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
