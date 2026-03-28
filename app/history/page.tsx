'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import Link from 'next/link';

export default function HistoryPage() {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    setLoading(true);
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .order('created_at', { ascending: false }); // Most recent first

    if (!error) setWorkouts(data || []);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 pb-24">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">History</h1>
      </header>

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400 font-bold">Loading...</div>
      ) : workouts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <p className="text-slate-400 font-bold">No sessions found.</p>
          <Link href="/" className="text-blue-500 font-bold mt-2 inline-block underline">Start your first workout</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {workouts.map((workout) => (
            <div key={workout.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              {/* Session Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Workout Session</h2>
                  <p className="text-lg font-bold text-slate-800">
                    {new Date(workout.created_at).toLocaleDateString('en-US', { 
                      weekday: 'short', month: 'short', day: 'numeric' 
                    })}
                  </p>
                </div>
                <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">
                  {workout.all_exercises?.length || 0} Exercises
                </div>
              </div>

              {/* Nested Exercise List */}
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
                {workout.all_exercises?.map((ex: any, i: number) => (
                  <div 
                    key={i} 
                    className="min-w-[160px] bg-slate-50 p-4 rounded-2xl border border-slate-100 snap-start"
                  >
                    <p className="font-black text-slate-800 text-sm mb-2 border-b border-slate-200 pb-1 truncate">
                      {ex.name}
                    </p>
                    <div className="space-y-1">
                      {ex.sets.map((set: any, si: number) => (
                        <div key={si} className="flex justify-between text-[11px] font-bold">
                          <span className="text-slate-400">S{si+1}</span>
                          <span className="text-slate-700">{set.weight}kg x {set.reps}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}   ``