import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google"; // Keep your existing font imports
import "./globals.css";
import { Providers } from "./providers"; // <--- Import this

// ... keep your font configurations and metadata ...

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers> {/* <--- Add this wrapper */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
