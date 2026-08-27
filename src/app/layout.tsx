import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CoolCity AI — Autonomous Heat-Relief Resource Planner",
  description: "Hyperlocal heat risk intelligence and autonomous cooling resource planning for Phoenix, Arizona.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
