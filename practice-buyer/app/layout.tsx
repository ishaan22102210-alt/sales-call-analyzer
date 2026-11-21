import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Practice Buyer",
  description: "Practise sales discovery calls against an AI buyer, built on AssemblyAI's Voice Agent API.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
