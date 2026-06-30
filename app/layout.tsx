import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "SQwebRPG",
  description: "A Next.js framework for multiplayer browser RPGs, PBBGs, and MUD-style games."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
