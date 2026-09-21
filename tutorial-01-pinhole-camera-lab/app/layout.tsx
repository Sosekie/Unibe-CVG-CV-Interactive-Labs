import type { Metadata } from "next";
import "./globals.css";
import { SiteNavigation } from "@/components/site-navigation";

export const metadata: Metadata = {
  title: "Pinhole Camera Lab",
  description: "An interactive visualizer for the pinhole camera model.",
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}<SiteNavigation /></body>
    </html>
  );
}
