'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../supabase';
import { Play, CheckCircle2, Activity, Zap, Loader2, ChevronRight, ArrowLeft } from 'lucide-react';
import { useWorkout } from '../../context/WorkoutContext';

type LoggedSet = {
  weight: number;
  reps: number;
};

type ExerciseHistoryEntry = {
  created_at: string;
  sets: LoggedSet[];
};

function WorkoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, createSession, updateSession, clearSession } = useWorkout();
  
  // --- UI & LOADING STATE ---
  const [activeView, setActiveView] = useState('train');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // --- DATA STATE ---
  const [library, setLibrary] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [exerciseHistory, setExerciseHistory] = useState<ExerciseHistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // --- LOCAL INPUT STATE (not synced until important events) ---
  const [localWeight, setLocalWeight] = useState('');
  const [localReps, setLocalReps] = useState('');

  // Auto-save draft workout when navigating away
  const saveDraftWorkout = useCallback(async () => {
    if (!session || session.sessionExercises.length === 0 || session.isDraft) return;
    
    try {
      if (!supabase) {
        console.error('Supabase client is not initialized');
        return;
      }

      const { error } = await supabase.from('workouts').insert([
        {
          all_exercises: session.sessionExercises,
          created_at: new Date(session.customDate).toISOString(),
          template_id: session.activePlan?.id || null,
          is_draft: true, // Mark as draft
        }
      ]);

      if (!error) {
        updateSession({ isDraft: true });
        console.log('Workout saved as draft');
      } else {
        console.error('Error saving draft:', error);
      }
    } catch (error) {
      console.error('Error in saveDraftWorkout:', error);
    }
  }, [session, updateSession]);

  // Save draft before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (session && session.sessionExercises.length > 0 && !session.isDraft) {
        // This will be async, so it may not complete before unload
        saveDraftWorkout();
      }
    };

    const handleRouteChange = async () => {
      if (session && session.sessionExercises.length > 0 && !session.isDraft) {
        await saveDraftWorkout();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [session, saveDraftWorkout]);

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

        // Restore session from context
        if (session) {
          setActiveView('executing-plan');
        } else {
          // Auto-start if redirected from a specific calendar plan
          const autoId = searchParams.get('templateId');
          if (autoId && tmplRes.data) {
            const target = tmplRes.data.find(t => t.id.toString() === autoId);
            if (target) {
              createSession(target);
              setActiveView('executing-plan');
            }
          }
        }
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [searchParams, session, createSession]);

  // 2. Workout Logic
  const openExercise = (exercise: any) => {
    setLocalWeight('');
    setLocalReps('');
    updateSession({ selectedEx: exercise });
  };

  const startOnTheFly = () => {
    createSession(null);
    setLocalWeight('');
    setLocalReps('');
    setActiveView('executing-plan');
  };

  const addSet = () => {
    if (!localWeight || !localReps) return;
    const parsedWeight = Number(localWeight);
    const parsedReps = Number(localReps);

    if (!Number.isFinite(parsedWeight) || !Number.isFinite(parsedReps)) return;
    if (parsedWeight < 0 || parsedReps < 0) return;

    const newSets = [...session!.currentSets, { weight: parsedWeight, reps: parsedReps }];
    updateSession({ currentSets: newSets });
    setLocalWeight('');
    setLocalReps('');
  };

  const finishExercise = () => {
    if (!session || session.currentSets.length === 0 || !session.selectedEx) return;
    const newSessionExercises = [
      ...session.sessionExercises,
      { name: session.selectedEx.name, sets: session.currentSets }
    ];
    updateSession({ 
      sessionExercises: newSessionExercises,
      selectedEx: null, 
      currentSets: [] 
    });
    setLocalWeight('');
    setLocalReps('');
  };

  const saveFullWorkout = async () => {
    if (!session || !supabase) {
      alert("Database connection error. Please refresh the page.");
      return;
    }
    setIsSaving(true);
    const { error } = await supabase.from('workouts').insert([
      { 
        all_exercises: session.sessionExercises,
        created_at: new Date(session.customDate).toISOString(),
        template_id: session.activePlan?.id || null,
        is_draft: false, // Final workout
      }
    ]);

    if (!error) {
      clearSession();
      router.push('/calendar');
    } else {
      alert("Error: " + error.message);
      setIsSaving(false);
    }
  };

  const abortSession = () => {
    if (confirm("Abort session? Unsaved progress will be saved as a draft.")) {
      if (session && session.sessionExercises.length > 0 && !session.isDraft) {
        saveDraftWorkout();
      }
      clearSession();
      setActiveView('train');
    }
  };

  useEffect(() => {
    async function loadExerciseHistory() {
      if (!session?.selectedEx?.name || !supabase) {
        setExerciseHistory([]);
        return;
      }

      setIsHistoryLoading(true);
      try {
        const { data, error } = await supabase
          .from('workouts')
          .select('created_at, all_exercises')
          .order('created_at', { ascending: false })
          .limit(60);

        if (error) {
          console.error('Failed to load exercise history:', error.message);
          setExerciseHistory([]);
          return;
        }

        const targetName = session.selectedEx.name.toLowerCase();
        const history = (data || [])
          .map((workout: any) => {
            const exercises = Array.isArray(workout?.all_exercises) ? workout.all_exercises : [];
            const match = exercises.find((ex: any) => typeof ex?.name === 'string' && ex.name.toLowerCase() === targetName);

            if (!match || !Array.isArray(match.sets)) return null;

            return {
              created_at: workout.created_at,
              sets: match.sets
                .filter((set: any) => typeof set?.weight === 'number' && typeof set?.reps === 'number')
                .map((set: any) => ({ weight: set.weight, reps: set.reps })),
            };
          })
          .filter((entry: ExerciseHistoryEntry | null) => entry !== null && entry.sets.length > 0)
          .slice(0, 3) as ExerciseHistoryEntry[];

        setExerciseHistory(history);
      } finally {
        setIsHistoryLoading(false);
      }
    }

    loadExerciseHistory();
  }, [session?.selectedEx?.name]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <p className="font-black text-slate-300 uppercase tracking-widest text-[10px]">Syncing Engine...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-32 sm:pb-40">
      
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
                     onClick={() => { createSession(plan); setLocalWeight(''); setLocalReps(''); setActiveView('executing-plan'); }} 
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
      {activeView === 'executing-plan' && session && (
        <div className="space-y-6 pt-12 animate-in slide-in-from-bottom-6">
          <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-10">
            <button 
              onClick={abortSession}
              className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-red-500 transition-colors self-start md:self-auto"
              >
              <ArrowLeft size={14} /> Cancel Workout
            </button>
            <h1 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter text-left md:text-right mt-4 md:mt-0">
              {session.activePlan?.name || "On the Fly"}
            </h1>
          </header>

          {!session.selectedEx ? (
            <div className="space-y-4">
              {/* History of current session */}
              {session.sessionExercises.map((logged, i) => (
                <div key={i} className="flex items-center p-6 rounded-[2.5rem] bg-slate-900 text-white">
                  <CheckCircle2 className="text-blue-400 mr-4" size={24} />
                  <div className="flex-1">
                    <p className="font-black text-lg italic uppercase">{logged.name}</p>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{logged.sets.length} Sets Finished</p>
                  </div>
                </div>
              ))}

              {/* Exercises suggested by template */}
              {session.activePlan?.exercises.filter((ex: any) => !session.sessionExercises.some(s => s.name === ex.name)).map((ex: any, i: number) => (
                <button key={i} onClick={() => openExercise(ex)} className="w-full flex items-center p-6 rounded-[2.5rem] border-2 bg-white border-slate-50 hover:border-blue-600 transition-all text-left group">
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
                    <button key={ex.id} onClick={() => openExercise(ex)} className="p-4 bg-white border border-slate-100 hover:border-blue-200 rounded-2xl text-left shadow-sm">
                      <p className="font-black text-slate-600 text-[11px] uppercase italic truncate">{ex.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* DATA ENTRY UI */
            <div className="bg-white p-5 sm:p-8 lg:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-2xl border border-slate-100 animate-in zoom-in-95 overflow-hidden">
               <button onClick={() => updateSession({ selectedEx: null })} className="text-blue-600 font-black mb-4 sm:mb-6 text-[10px] uppercase tracking-widest">← Back</button>
               <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 mb-6 sm:mb-10 italic uppercase tracking-tighter underline underline-offset-6 decoration-slate-700/20 break-words">{session.selectedEx.name}</h2>
               
               <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-4 sm:gap-6 mb-8 sm:mb-12 items-end">
                  <div className="min-w-0">
                    <label className="text-[10px] font-black text-slate-700 uppercase block mb-2 tracking-widest">Weight (lbs)</label>
                      <input type="number" min="0" value={localWeight} onChange={e => setLocalWeight(e.target.value)} className="w-full text-4xl sm:text-5xl font-black border-b-4 border-slate-100 focus:border-blue-600 outline-none pb-2" placeholder="0" />
                  </div>
                  <div className="min-w-0 sm:border-l-2 sm:pl-8">
                    <label className="text-[10px] font-black text-slate-700 uppercase block mb-2 tracking-widest">Reps</label>
                      <input type="number" min="0" value={localReps} onChange={e => setLocalReps(e.target.value)} className="w-full text-4xl sm:text-5xl font-black border-b-4 border-slate-100 focus:border-blue-600 outline-none pb-2" placeholder="0" />
                  </div>
                  <button onClick={addSet} className="bg-slate-900 text-white w-full sm:w-20 h-14 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center text-2xl sm:text-3xl shadow-xl active:scale-90 transition-transform">✓</button>
               </div>

               <div className="space-y-3 mb-10">
                 {session.currentSets.map((s, idx) => (
                   <div key={idx} className="flex items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                     <span className="font-black text-[10px] text-slate-400 uppercase tracking-widest">Set {idx + 1}</span>
                     <span className="font-black italic text-slate-900 text-right text-sm sm:text-base">{s.weight}lbs x {s.reps}</span>
                   </div>
                 ))}
               </div>

               <div className="flex gap-4">
                 <button onClick={finishExercise} className="flex-1 py-4 sm:py-6 bg-blue-600 text-white rounded-[1.5rem] sm:rounded-[2rem] font-black uppercase tracking-widest italic active:scale-95 transition-all text-[11px] sm:text-base">Save Exercise</button>
               </div>

               <div className="mt-8 sm:mt-10">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Last 3 Workouts</p>
                 {isHistoryLoading && (
                   <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Loading history...</p>
                 )}

                 {!isHistoryLoading && exerciseHistory.length === 0 && (
                   <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">No previous sets recorded.</p>
                 )}

                 {!isHistoryLoading && exerciseHistory.length > 0 && (
                   <div className="space-y-3">
                     {exerciseHistory.map((entry, entryIdx) => (
                       <div key={`${entry.created_at}-${entryIdx}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                         <div className="flex items-center justify-between gap-3">
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                             {new Date(entry.created_at).toLocaleDateString()}
                           </span>
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                             {entry.sets.length} Sets
                           </span>
                         </div>
                         <div className="mt-3 flex flex-wrap gap-2">
                           {entry.sets.map((set, setIdx) => (
                             <span key={`${entryIdx}-${setIdx}`} className="rounded-xl bg-white px-3 py-1 text-[11px] font-black italic text-slate-700 border border-slate-100">
                               {set.weight}lbs x {set.reps}
                             </span>
                           ))}
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
            </div>
          )}
        </div>
      )}

      {/* --- FINISH WORKOUT OVERLAY --- */}
      {session && session.sessionExercises.length > 0 && !session.selectedEx && (
        <div className="fixed bottom-8 left-0 w-full z-50 ">
          <div className="max-w-4xl mx-auto px-6 justify-between">
            <div className="bg-slate-900 text-white p-6 rounded-[3rem] shadow-2xl flex items-center justify-between border border-slate-800">
              <div className="flex items-center gap-6 md:gap-8">
                <div className="bg-slate-800 p-3 rounded-2xl border border-slate-700">
                  <label className="text-[8px] font-black text-slate-500 uppercase block mb-1">Workout Date</label>
                  <input 
                    type="date" 
                    value={session.customDate} 
                    onChange={e => updateSession({ customDate: e.target.value })} 
                    className="bg-transparent text-white font-black italic text-xs outline-none [color-scheme:dark] cursor-pointer" 
                  />
                </div>
                <div className="hidden sm:block">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Session Progress</p>
                  <p className="font-black text-sm uppercase italic tracking-tight text-blue-400">
                    {session.sessionExercises.length} Movements Logged
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