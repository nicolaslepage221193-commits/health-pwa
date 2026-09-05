'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {supabase} from '../supabase';
import {
  Calendar as CalendarIcon,
  Apple,
  CalendarCheck,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  Play,
  MessageSquare,
  ClipboardList,
  FileText,
} from 'lucide-react';

type SidebarProps = {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
};

export default function Sidebar({ collapsed, onCollapse }: SidebarProps) {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);

  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleCollapse = () => {
    onCollapse(!collapsed);
  };

  const navItems = [
    { name: 'Train', icon: <Play size={20} />, href: '/workout/train' },
    { name: 'Library', icon: <ClipboardList size={20} />, href: '/workout/library' },
    { name: 'Plan', icon: <FileText size={20} />, href: '/plan' },
    { name: 'History', icon: <CalendarIcon size={20} />, href: '/history' },
    { name: 'Nutrition', icon: <Apple size={20} />, href: '#' },
    { name: 'Calendar', icon: <CalendarCheck size={20} />, href: '/calendar' },
    { name: 'Profile', icon: <UserCircle size={20} />, href: '#' },
    { name: 'COMMENTS', icon: <MessageSquare size={20} />, href: '/comments' },
  ];

  useEffect(() => {
    async function testConnection() {
      if (!supabase) {
        setIsOnline(false);
        return;
      }

      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        setIsOnline(false);
        return;
      }

      try {
        // A simple, light query to check if Supabase responds
        const { error } = await supabase.from('exercise_library').select('id').limit(1);
        setIsOnline(!error);
      } catch (err) {
        setIsOnline(false);
      }
    }
    if (mounted) {
      testConnection();
    }
  }, [mounted]);

  if (!mounted) {
    return (
      <aside
        className={`h-screen bg-white border-r border-slate-100 flex flex-col p-4 fixed left-0 top-0 z-50 ${collapsed ? 'w-20' : 'w-64'}`}
      >
        <div className="animate-pulse text-slate-400">Loading sidebar...</div>
      </aside>
    );
  }

  return (
    <aside
      style={{ touchAction: 'manipulation' }}
      className={`h-screen bg-white border-r border-slate-100 flex flex-col p-4 fixed left-0 top-0 z-50 transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="group flex items-center gap-2 transition-transform active:scale-95"
        >
          <div className="text-blue-600 font-black uppercase tracking-tight">
            {collapsed ? 'HC' : 'HealthCore'}
          </div>
        </Link>
        <button
          type="button"
          onClick={toggleCollapse}
          className="rounded-lg p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <div key={item.name} className="space-y-1">
              <Link
                href={item.href}
                className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-3 rounded-2xl transition-all group ${
                  isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="group-hover:scale-110 transition-transform">{item.icon}</span>
                  {!collapsed && (
                    <span className="font-bold text-sm uppercase tracking-tight">{item.name}</span>
                  )}
                </div>
              </Link>
            </div>
          );
        })}
      </nav>

      <div className={`mt-auto pt-6 border-t border-slate-50 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest ${
        collapsed ? 'hidden' : ''
      }`}>
        v1.0.5
      </div>

      {/* --- CONNECTION STATUS INDICATOR --- */}
      <div className="mt-auto p-4 border-t border-slate-50">
        <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${collapsed ? 'justify-center' : 'bg-slate-50'}`}>
          <div className="relative flex h-2 w-2">
            {isOnline && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              isOnline === null ? 'bg-slate-300' : isOnline ? 'bg-green-500' : 'bg-red-500'
            }`}></span>
          </div>
          
          {!collapsed && (
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              {isOnline === null ? 'Syncing...' : isOnline ? 'Engine Online' : 'Sync Failed'}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
