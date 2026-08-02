import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kept",
  description: "CALL-E doesn't just make calls. It makes sure promises get kept.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
