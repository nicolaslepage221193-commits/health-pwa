'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2, Clock, AlertCircle, Trash2, X, Plus } from 'lucide-react';
import { supabase } from '../supabase';

function CalendarContent() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [history, setHistory] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Helper to get YYYY-MM-DD in local time
  const getLocalDateString = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  useEffect(() => {
    fetchData();
  }, [currentDate.getMonth(), currentDate.getFullYear()]);

  async function fetchData() {
    if (!supabase) return;
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Boundaries for the current month view
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;

    const [histRes, plnsRes, tmplsRes] = await Promise.all([
      // 1. Fetch executed workouts within this month range
      supabase.from('workouts')
        .select('*, workout_templates(name)')
        .gte('created_at', `${firstDay}T00:00:00`)
        .lte('created_at', `${lastDay}T23:59:59`),
      
      // 2. Fetch planned workouts within this month range
      supabase.from('planned_workouts')
        .select('*, workout_templates(name)')
        .gte('planned_date', firstDay)
        .lte('planned_date', lastDay),

      supabase.from('workout_templates').select('*').order('name')
    ]);

    if (histRes.data) setHistory(histRes.data);
    if (plnsRes.data) setPlans(plnsRes.data);
    if (tmplsRes.data) setTemplates(tmplsRes.data);
  }

  const handleDayClick = (day: number | null) => {
    if (!day) return;
    setSelectedDay(day);
    setIsPlanning(true);
  };

  const handleSchedule = async (templateId: number) => {
    if (!selectedDay) return;
    setIsSyncing(true);
    
    // Format: YYYY-MM-DD
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    
    const { error } = await supabase.from('planned_workouts').insert([
      { template_id: templateId, planned_date: dateStr }
    ]);

    setIsSyncing(false);
    if (!error) {
      setIsPlanning(false);
      fetchData();
    }
  };

  const deletePlan = async (e: React.MouseEvent, planId: string) => {
    e.stopPropagation();
    if (confirm("Remove this plan?")) {
      const { error } = await supabase.from('planned_workouts').delete().eq('id', planId);
      if (!error) fetchData();
    }
  };

  const calendarGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const startOffset = new Date(year, month, 1).getDay();
    const days = [];
    for (let i = 0; i < startOffset; i++) days.push({ day: null, key: `pad-${i}` });
    for (let d = 1; d <= totalDays; d++) days.push({ day: d, key: `day-${d}` });
    return days;
  }, [currentDate]);

  return (
    <div className="min-h-screen bg-slate-50 md:py-8 pb-24">
      <div className={`max-w-6xl mx-auto px-2 md:px-6 transition-all duration-500 ${isPlanning ? 'blur-xl scale-95 opacity-40 pointer-events-none' : ''}`}>
        
        {/* --- MOBILE OPTIMIZED HEADER --- */}
        <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 p-2">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 italic uppercase tracking-tighter flex items-center gap-3">
              <CalendarIcon className="text-blue-600" size={32} />
              Schedule
            </h1>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-600" /> <span className="text-[9px] font-black uppercase text-slate-400">Done</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500" /> <span className="text-[9px] font-black uppercase text-slate-400">Plan</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-300" /> <span className="text-[9px] font-black uppercase text-slate-400">Miss</span></div>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end bg-white p-2 rounded-2xl border border-slate-100 shadow-sm gap-2">
            <select 
              value={currentDate.getMonth()} 
              onChange={(e) => setCurrentDate(new Date(currentDate.getFullYear(), Number(e.target.value), 1))} 
              className="bg-slate-50 border-none text-[10px] font-black uppercase tracking-widest p-2 rounded-xl outline-none"
            >
              {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((name, i) => <option key={name} value={i}>{name}</option>)}
            </select>
            <div className="flex gap-1">
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft size={20} /></button>
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronRight size={20} /></button>
            </div>
          </div>
        </header>

        {/* --- GRID: COMPACT ON MOBILE --- */}
        <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] border border-slate-100 shadow-xl p-2 md:p-8 grid grid-cols-7 gap-1 md:gap-4">
          {calendarGrid.map((item) => {
            if (!item.day) return <div key={item.key} className="h-20 md:h-40" />;

            const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), item.day);
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`;
            
            const isToday = new Date().toDateString() === cellDate.toDateString();
            const isPast = cellDate < new Date(new Date().setHours(0,0,0,0));

            const dayHistory = history.filter(h => h.created_at.startsWith(dateStr));
            const dayPlans = plans.filter(p => p.planned_date === dateStr);

            return (
              <div 
                key={item.key} 
                onClick={() => handleDayClick(item.day)}
                className={`min-h-[80px] md:h-40 bg-white rounded-2xl md:rounded-[2rem] p-2 md:p-4 border transition-all cursor-pointer relative flex flex-col group ${
                  isToday ? 'border-blue-500 shadow-blue-50 shadow-lg' : 'border-slate-50 hover:border-blue-200'
                }`}
              >
                <span className={`text-[10px] md:text-xs font-black italic mb-1 ${isToday ? 'text-blue-600' : 'text-slate-300'}`}>
                  {item.day}
                </span>
                
                <div className="flex flex-col gap-1 overflow-hidden">
                  {/* EXECUTED (BLUE) */}
                  {dayHistory.map(h => (
                    <div key={h.id} className="bg-blue-600 text-white px-1.5 py-0.5 rounded-md md:rounded-xl text-[7px] md:text-[9px] font-black uppercase italic truncate">
                      {h.workout_templates?.name || "OTF"}
                    </div>
                  ))}

                  {/* PLANNED (ORANGE/GREY) */}
                  {dayPlans.map(p => {
                    const isFulfilled = dayHistory.some(h => h.template_id === p.template_id);
                    if (isFulfilled) return null;
                    const isMissed = isPast;

                    return (
                      <div 
                        key={p.id} 
                        className={`px-1.5 py-0.5 rounded-md md:rounded-xl text-[7px] md:text-[9px] font-black uppercase italic truncate flex justify-between items-center group/plan ${
                          isMissed ? 'bg-slate-100 text-slate-400 border border-slate-200' : 'bg-orange-500 text-white shadow-sm'
                        }`}
                      >
                        <span className="truncate" onClick={(e) => {
                          if (!isMissed) {
                            e.stopPropagation();
                            window.location.href = `/?view=executing-plan&templateId=${p.template_id}`;
                          }
                        }}>{p.workout_templates?.name}</span>
                        <button onClick={(e) => deletePlan(e, p.id)} className="hidden md:block opacity-0 group-hover/plan:opacity-100 ml-1 hover:text-red-200"><Trash2 size={10} /></button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- MOBILE DRAWER MODAL --- */}
      {isPlanning && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsPlanning(false)}></div>
          <div className="bg-white w-full max-w-md rounded-t-[3rem] md:rounded-[3rem] shadow-2xl p-8 md:p-10 relative z-10 border-t md:border border-slate-100 animate-in slide-in-from-bottom-10">
            <div className="w-12 h-1 bg-slate-100 rounded-full mx-auto mb-6 md:hidden" />
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 italic uppercase tracking-tighter mb-8">Assign Routine</h2>
            <div className="space-y-2 mb-10 max-h-[40vh] overflow-y-auto pr-1">
              {templates.map(t => (
                <button 
                  key={t.id} 
                  onClick={() => handleSchedule(t.id)} 
                  disabled={isSyncing} 
                  className="w-full p-5 bg-slate-50 active:bg-orange-500 active:text-white md:hover:bg-orange-500 md:hover:text-white rounded-2xl text-left transition-all flex justify-between items-center group"
                >
                  <span className="font-black italic uppercase text-sm md:text-lg tracking-tight">{t.name}</span>
                  <Plus size={20} className="text-slate-300 group-active:text-white" />
                </button>
              ))}
            </div>
            <button onClick={() => setIsPlanning(false)} className="w-full py-4 text-slate-300 font-black text-[10px] uppercase tracking-widest hover:text-slate-500 transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="font-black text-slate-200 animate-pulse text-center mt-20 italic">SYNCHRONIZING...</div>}>
      <CalendarContent />
    </Suspense>
  );
}