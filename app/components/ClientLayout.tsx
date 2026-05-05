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
        <main className={`flex-1 ${sidebarCollapsed ? 'ml-20' : 'ml-64'} p-10 transition-all duration-300`}>
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </WorkoutProvider>
  );
}