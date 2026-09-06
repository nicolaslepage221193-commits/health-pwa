'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import { WorkoutProvider } from '../context/WorkoutContext';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <WorkoutProvider>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
        <main
          className={`flex-1 min-w-0 px-4 py-6 transition-all duration-300 sm:px-6 lg:px-10 ${
            sidebarCollapsed ? 'ml-20' : 'ml-20 lg:ml-64'
          }`}
        >
          <div className="mx-auto w-full max-w-screen-xl">
            {children}
          </div>
        </main>
      </div>
    </WorkoutProvider>
  );
}