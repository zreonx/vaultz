import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { QueryProvider } from "@/lib/api/query-provider";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Vaultz — Personal Finance Management",
  description:
    "Calm, accurate, multi-user personal finance management with exact decimal precision.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-[var(--background)] font-sans text-[var(--foreground)] antialiased">
        <QueryProvider>
          <ToastProvider>{children}</ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
