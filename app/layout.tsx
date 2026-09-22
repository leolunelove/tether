import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tether — A space for two",
  description: "One shared voice space. Listen, take your time, and pass it on.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
