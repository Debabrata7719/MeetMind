import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Meeting Intelligence System",
  description:
    "Upload or record meetings, generate AI highlights, and chat with your meeting data — powered by Whisper, Groq, and ChromaDB.",
  keywords: ["meeting", "AI", "transcription", "highlights", "chat", "RAG"],
  openGraph: {
    title: "Meeting Intelligence System",
    description: "Turn your meetings into actionable intelligence.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
