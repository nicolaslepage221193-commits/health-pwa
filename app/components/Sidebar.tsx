'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {supabase} from '../supabase';
import {
  Dumbbell,
  Calendar as CalendarIcon,
  Apple,
  Pill,
  CalendarCheck,
  UserCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Play,
  Shovel,
  ClipboardList,
} from 'lucide-react';

type SidebarProps = {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
};

export default function Sidebar({ collapsed, onCollapse }: SidebarProps) {
  const [showDebug, setShowDebug] = useState(true);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const [mounted, setMounted] = useState(false);
  const [userAgent, setUserAgent] = useState('');

  const pathname = usePathname();
  const [workoutOpen, setWorkoutOpen] = useState(true);
  const [collapsedSubmenuOpen, setCollapsedSubmenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setUserAgent(window.navigator.userAgent);
    }
  }, []);

  const toggleCollapse = () => {
    onCollapse(!collapsed);
    setCollapsedSubmenuOpen(false);
  };

  const navItems = [
    {
      name: 'Workout',
      icon: <Dumbbell size={20} />,
      href: '/workout',
      hasSubmenu: true,
      subItems: [
        { name: 'Train', icon: <Play size={14} />, href: '/workout/train' },
        { name: 'LIBRARY', icon: <ClipboardList size={14} />, href: '/workout/library' },
      ],
    },
    { name: 'History', icon: <CalendarIcon size={20} />, href: '/history' },
    { name: 'Nutrition', icon: <Apple size={20} />, href: '#' },
    { name: 'Medication', icon: <Pill size={20} />, href: '#' },
    { name: 'Calendar', icon: <CalendarCheck size={20} />, href: '/calendar' },
    { name: 'Profile', icon: <UserCircle size={20} />, href: '#' },
    { name: 'Test', icon: <Shovel size={20} />, href: '/test' },
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
      onMouseLeave={() => {
        if (collapsedSubmenuOpen) {
          setCollapsedSubmenuOpen(false);
        }
      }}
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

          const onItemClick = (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement, MouseEvent>) => {
            if (item.hasSubmenu) {
              event.preventDefault();

              if (collapsed) {
                setCollapsedSubmenuOpen((prev) => !prev);
                return;
              }

              setWorkoutOpen((prev) => !prev);
            }
          };

          return (
            <div key={item.name} className="space-y-1">
              {item.hasSubmenu ? (
            <button
              type="button"
              onClick={onItemClick}
              className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-3 rounded-2xl transition-all text-left group ${
                isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="group-hover:scale-110 transition-transform">{item.icon}</span>
                {!collapsed && (
                  <span className="font-bold text-sm uppercase tracking-tight">{item.name}</span>
                )}
              </div>
              {!collapsed && (
                <ChevronDown size={16} className={`transition-transform ${workoutOpen ? 'rotate-180' : ''}`} />
              )}
            </button>
          ) : (
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
          )}

              {item.hasSubmenu && !collapsed && workoutOpen && (
                <div className="ml-6 space-y-1 animate-in slide-in-from-top-2 duration-200">
                  {item.subItems.map((sub) => {
                    const isSubActive = pathname === sub.href;
                    return (
                      <Link
                        key={sub.name}
                        href={sub.href}
                        onClick={() => {
                          if (collapsed) {
                            setCollapsedSubmenuOpen(false);
                          }
                        }}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                          isSubActive ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        {sub.icon}
                        <span className="font-bold text-[11px] uppercase tracking-tight whitespace-nowrap">{sub.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}

              {item.hasSubmenu && collapsed && collapsedSubmenuOpen && (
                <div className="absolute left-20 top-16 z-50 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                  <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-tight text-slate-400">{item.name}</div>
                  {item.subItems.map((sub) => {
                    const isSubActive = pathname === sub.href;
                    return (
                      <Link
                        key={sub.name}
                        href={sub.href}
                        onClick={() => setCollapsedSubmenuOpen(false)}
                        className={`block rounded-lg px-3 py-2 text-sm transition ${
                          isSubActive ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {sub.icon}
                          <span className="font-medium whitespace-nowrap">{sub.name}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
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
            {/* --- DEBUG OVERLAY --- */}
      {showDebug && !collapsed && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl animate-in fade-in zoom-in-95">
          <p className="text-[8px] font-black text-red-400 uppercase mb-1">Debug Info</p>
          <p className="text-[10px] font-mono text-red-600 break-all bg-white p-2 rounded-md border border-red-100">
            URL: {envUrl || "UNDEFINED (Check .env)"}
          </p>
          <p className="text-[10px] font-mono text-red-600 mt-2 bg-white p-2 rounded-md border border-red-100">
            User Agent: {mounted ? (userAgent.includes('iPhone') ? 'iPhone Detected' : 'Other') : 'Loading...'}
          </p>
        </div>
      )}
    </aside>
  );
}
