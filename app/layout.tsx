'use client';

import './globals.css';
import Sidebar from './components/Sidebar';
import Link from 'next/link'; // Use Link for fast, no-refresh navigation
import { useState } from 'react';

export const metadata = {
  title: 'HealthCore',
  description: 'A fitness and wellness dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="flex min-h-screen bg-slate-50">
          <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
          <main className={`flex-1 ${sidebarCollapsed ? 'ml-20' : 'ml-64'} p-10 transition-all duration-300`}>
            <div className="max-w-4xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}