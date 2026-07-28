import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Actually Free?",
  description: "Find one time and one place your group can agree on."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
