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
          className={`flex-1 min-w-0 transition-all duration-300 ${
            sidebarCollapsed ? 'ml-20' : 'ml-20 lg:ml-64'
          }`}
        >
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>
    </WorkoutProvider>
  );
}