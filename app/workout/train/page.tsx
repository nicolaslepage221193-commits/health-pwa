'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../supabase';
import { Play, Plus, CheckCircle2, Activity, Zap, Loader2, ChevronRight, ArrowLeft } from 'lucide-react';

function WorkoutContent() {
  const searchParams = useSearchParams();
  
  // --- UI & LOADING STATE ---
  const [activeView, setActiveView] = useState('train');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // --- DATA STATE ---
  const [library, setLibrary] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);

  // --- ACTIVE SESSION STATE ---
  const [activePlan, setActivePlan] = useState<any | null>(null);
  const [selectedEx, setSelectedEx] = useState<any | null>(null);
  const [sessionExercises, setSessionExercises] = useState<any[]>([]);
  const [currentSets, setCurrentSets] = useState<any[]>([]);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');

  // 1. Fetch Data & Handle Deep Links from Calendar
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        if (!supabase) {
          console.error('Supabase client is not initialized');
          return;
        }
        const [libRes, tmplRes] = await Promise.all([
          supabase.from('exercise_library').select('*').order('name'),
          supabase.from('workout_templates').select('*').order('name')
        ]);

        if (libRes.data) setLibrary(libRes.data);
        if (tmplRes.data) setTemplates(tmplRes.data);

        // Auto-start if redirected from a specific calendar plan
        const autoId = searchParams.get('templateId');
        if (autoId && tmplRes.data) {
          const target = tmplRes.data.find(t => t.id.toString() === autoId);
          if (target) {
            setActivePlan(target);
            setActiveView('executing-plan');
          }
        }
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [searchParams]);

  // 2. Workout Logic
  const startOnTheFly = () => {
    setActivePlan(null);
    setSessionExercises([]);
    setActiveView('executing-plan');
  };

  const addSet = () => {
    if (!weight || !reps) return;
    setCurrentSets([...currentSets, { weight: Number(weight), reps: Number(reps) }]);
    setWeight(''); 
    setReps('');
  };

  const finishExercise = () => {
    if (currentSets.length === 0) return;
    setSessionExercises([...sessionExercises, { name: selectedEx.name, sets: currentSets }]);
    setSelectedEx(null);
    setCurrentSets([]);
  };

  const saveFullWorkout = async () => {
    if (!supabase) {
      alert("Database connection error. Please refresh the page.");
      return;
    }
    setIsSaving(true);
    const { error } = await supabase.from('workouts').insert([
      { 
        all_exercises: sessionExercises,
        created_at: new Date(customDate).toISOString(),
        template_id: activePlan?.id || null // This link is vital for the Calendar logic
      }
    ]);

    if (!error) {
      window.location.href = '/calendar';
    } else {
      alert("Error: " + error.message);
      setIsSaving(false);
    }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <p className="font-black text-slate-300 uppercase tracking-widest text-[10px]">Syncing Engine...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 pb-40">
      
      {/* --- VIEW: TRAIN HUB --- */}
      {activeView === 'train' && (
        <div className="space-y-10 pt-12 animate-in fade-in duration-500">
          <header className="text-left">
            <h1 className="text-5xl font-black text-slate-900 italic uppercase tracking-tighter">Train</h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] mt-1 text-left pl-2">Start a session</p>
          </header>

          <div className="grid gap-6">
            {/* QUICK START */}
            <button
              onClick={startOnTheFly}
              className="flex justify-between group p-8 rounded-[3rem] text-left bg-slate-900 hover:ring-2 hover:ring-blue-500/60 relative overflow-hidden"
            >
              <div>
                <p className="font-black text-white text-3xl italic tracking-tight uppercase">On the Fly Session</p>
                <div className='flex items-center gap-2 mb-2'>
                  <Zap size={14} className="text-blue-400 fill-blue-400" />
                  <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.3em]">Instant Start</p>
                </div>
              </div>
              <div className="w-12 h-12 bg-slate-0 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white">
                <Play size={20} fill="currentColor" className="invisible group-hover:visible" />
                <Activity className="absolute right-[100px] bottom-[-20px] text-white opacity-5" size={180} />
              </div>
            </button>

            {/* SAVED ROUTINES LIST */}
            <div className="pt-6">
              <p className="text-[15px] font-black text-slate-300 uppercase tracking-[0.3em] mb-6 italic underline underline-offset-8">My workouts</p>
              <div className="grid gap-4">
                {templates.map(plan => (
                  <button 
                    key={plan.id} 
                    onClick={() => { setActivePlan(plan); setActiveView('executing-plan'); }} 
                    className="group p-8 bg-white rounded-[2.5rem] border border-slate-100 hover:ring-1 hover:ring-blue-500/60 text-left transition-all shadow-sm flex justify-between items-center"
                  >
                    <div>
                      <p className="font-black text-slate-800 text-2xl group-hover:text-blue-600 italic tracking-tight uppercase">{plan.name}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{plan.exercises.length} Exercises</p>
                    </div>
                    <div className="w-12 h-12 bg-slate-0 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Play size={20} fill="currentColor" className="invisible group-hover:visible" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- VIEW: EXECUTING SESSION --- */}
      {activeView === 'executing-plan' && (
        <div className="space-y-6 pt-12 animate-in slide-in-from-bottom-6">
          <header className="flex justify-between items-center mb-10">
            <button 
              onClick={() => { 
                if (confirm("Abort session? All unsaved progress will be cleared.")) {
                  setActiveView('train'); 
                  setActivePlan(null); 
                  setSessionExercises([]);
                  setSelectedEx(null);
                  setCurrentSets([]);
                }
              }} 
              className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-red-500 transition-colors"
              >
              <ArrowLeft size={14} /> Abort
            </button>
            <h1 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter text-right">
              {activePlan?.name || "On the Fly"}
            </h1>
          </header>

          {!selectedEx ? (
            <div className="space-y-4">
              {/* History of current session */}
              {sessionExercises.map((logged, i) => (
                <div key={i} className="flex items-center p-6 rounded-[2.5rem] bg-slate-900 text-white">
                  <CheckCircle2 className="text-blue-400 mr-4" size={24} />
                  <div className="flex-1">
                    <p className="font-black text-lg italic uppercase">{logged.name}</p>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{logged.sets.length} Sets Finished</p>
                  </div>
                </div>
              ))}

              {/* Exercises suggested by template */}
              {activePlan?.exercises.filter((ex: any) => !sessionExercises.some(s => s.name === ex.name)).map((ex: any, i: number) => (
                <button key={i} onClick={() => setSelectedEx(ex)} className="w-full flex items-center p-6 rounded-[2.5rem] border-2 bg-white border-slate-50 hover:border-blue-600 transition-all text-left group">
                   <div className="w-10 h-10 rounded-xl mr-4 flex items-center justify-center font-black bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors uppercase italic text-[10px]">Next</div>
                   <div className="flex-1">
                    <p className="font-black text-slate-800 text-lg italic uppercase">{ex.name}</p>
                  </div>
                  <ChevronRight size={20} className="text-slate-200" />
                </button>
              ))}

              {/* Manually add from library */}
              <div className="pt-10">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4 px-2 italic">Add Any Movement</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {library.map(ex => (
                    <button key={ex.id} onClick={() => setSelectedEx(ex)} className="p-4 bg-white border border-slate-100 hover:border-blue-200 rounded-2xl text-left shadow-sm">
                      <p className="font-black text-slate-600 text-[11px] uppercase italic truncate">{ex.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* DATA ENTRY UI */
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 animate-in zoom-in-95">
               <button onClick={() => setSelectedEx(null)} className="text-blue-600 font-black mb-6 text-[10px] uppercase tracking-widest">← Back</button>
               <h2 className="text-4xl font-black text-slate-900 mb-10 italic uppercase tracking-tighter underline underline-offset-6 decoration-slate-700/20">{selectedEx.name}</h2>
               
               <div className="flex gap-6 mb-12">
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-slate-700 uppercase block mb-2 tracking-widest">Weight (lbs)</label>
                    <input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="w-full text-5xl font-black border-b-4 border-slate-100 focus:border-blue-600 outline-none pb-2" placeholder="0" />
                  </div>
                  <div className="flex-1 border-l-2 pl-8">
                    <label className="text-[10px] font-black text-slate-700 uppercase block mb-2 tracking-widest">Reps</label>
                    <input type="number" value={reps} onChange={e => setReps(e.target.value)} className="w-full text-5xl font-black border-b-4 border-slate-100 focus:border-blue-600 outline-none pb-2" placeholder="0" />
                  </div>
                  <button onClick={addSet} className="bg-slate-900 text-white w-20 h-20 rounded-3xl flex items-center justify-center text-3xl shadow-xl active:scale-90 transition-transform">✓</button>
               </div>

               <div className="space-y-3 mb-10">
                 {currentSets.map((s, idx) => (
                   <div key={idx} className="flex justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                     <span className="font-black text-[10px] text-slate-400 uppercase tracking-widest">Set {idx + 1}</span>
                     <span className="font-black italic text-slate-900">{s.weight}kg x {s.reps}</span>
                   </div>
                 ))}
               </div>

               <div className="flex gap-4">
                 <button onClick={finishExercise} className="flex-1 py-6 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest italic active:scale-95 transition-all">Save Movement</button>
               </div>
            </div>
          )}
        </div>
      )}

      {/* --- FINISH WORKOUT OVERLAY --- */}
      {sessionExercises.length > 0 && !selectedEx && (
        <div className="fixed bottom-8 left-0 w-full z-50 ">
          <div className="max-w-4xl mx-auto px-6 justify-between">
            <div className="bg-slate-900 text-white p-6 rounded-[3rem] shadow-2xl flex items-center justify-between border border-slate-800">
              <div className="flex items-center gap-6 md:gap-8">
                <div className="bg-slate-800 p-3 rounded-2xl border border-slate-700">
                  <label className="text-[8px] font-black text-slate-500 uppercase block mb-1">Workout Date</label>
                  <input 
                    type="date" 
                    value={customDate} 
                    onChange={e => setCustomDate(e.target.value)} 
                    className="bg-transparent text-white font-black italic text-xs outline-none [color-scheme:dark] cursor-pointer" 
                  />
                </div>
                <div className="hidden sm:block">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Session Progress</p>
                  <p className="font-black text-sm uppercase italic tracking-tight text-blue-400">
                    {sessionExercises.length} Movements Logged
                  </p>
                </div>
              </div>
              
              <button 
                onClick={saveFullWorkout}
                disabled={isSaving}
                className="bg-white text-slate-900 px-10 py-5 rounded-[1.8rem] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-blue-50 transition-all italic shadow-xl disabled:opacity-50"
              >
                {isSaving ? "Syncing..." : "Sync Workout"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function WorkoutPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WorkoutContent />
    </Suspense>
  );
}