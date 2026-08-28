import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MeetMind | Premium AI Meeting Advantage",
  description: "Turn every meeting into a competitive advantage.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="font-body-md text-body-md overflow-x-hidden">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Geist:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface text-on-surface antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
