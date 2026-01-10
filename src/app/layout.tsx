/**
 * @fileoverview Root Layout Component for Raw System Application
 * 
 * This is the main layout component that wraps all pages in the Next.js application.
 * It provides:
 * - Global font configuration (Geist Sans and Geist Mono)
 * - Application metadata (title, description)
 * - Sidebar navigation layout wrapper
 * - Global CSS styles
 * 
 * The layout uses Next.js App Router architecture and serves as the entry point
 * for the multi-tenant Salesforce-like system with Supabase authentication.
 * 
 * @author Raw System Team
 * @version 1.0.0
 * @since 2026-01-04
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SidebarLayout from "@/components/layout/SidebarLayout";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Raw System",
  description: "Secure authentication system with Supabase",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SidebarLayout>
          {children}
        </SidebarLayout>
      </body>
    </html>
  );
}
