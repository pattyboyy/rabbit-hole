import React from 'react';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ExplorationProvider } from '@/context/ExplorationContext';
import ExplorationLayout from '@/components/ExplorationLayout';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rabbit Hole - Knowledge Exploration Platform",
  description: "Infinitely explore any topic through AI-generated layers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ExplorationProvider>
          <ExplorationLayout>
            {children}
          </ExplorationLayout>
        </ExplorationProvider>
      </body>
    </html>
  );
} 