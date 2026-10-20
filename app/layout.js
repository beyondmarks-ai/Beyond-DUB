import { Lexend, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const heading = Lexend({ subsets: ["latin"], variable: "--font-heading" });
const body = Source_Sans_3({ subsets: ["latin"], variable: "--font-body" });

export const metadata = {
  title: "Sarvam Dub — Translate video speech",
  description: "Detect a video's spoken language and create a timestamp-aligned dub with Sarvam AI.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${heading.variable} ${body.variable}`}>{children}</body>
    </html>
  );
}
