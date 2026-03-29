'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Plus, Trash2, X, ChevronRight, LayoutGrid, Dumbbell } from 'lucide-react';

export default function LibraryPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [library, setLibrary] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  
  // New Template State
  const [newPlanName, setNewPlanName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    if (!supabase) return;
    
    const [tmplRes, libRes] = await Promise.all([
      supabase.from('workout_templates').select('*').order('name'),
      supabase.from('exercise_library').select('*').order('name')
    ]);
    if (tmplRes.data) setTemplates(tmplRes.data);
    if (libRes.data) setLibrary(libRes.data);
  }

  const toggleExercise = (ex: any) => {
    const exists = selectedExercises.find(s => s.id === ex.id);
    if (exists) {
      setSelectedExercises(selectedExercises.filter(s => s.id !== ex.id));
    } else {
      setSelectedExercises([...selectedExercises, { id: ex.id, name: ex.name }]);
    }
  };

  const saveTemplate = async () => {
    if (!newPlanName || selectedExercises.length === 0 || !supabase) return;

    const { error } = await supabase.from('workout_templates').insert([
      { 
        name: newPlanName, 
        exercises: selectedExercises 
      }
    ]);

    if (!error) {
      setNewPlanName('');
      setSelectedExercises([]);
      setIsCreating(false);
      fetchData();
    } else {
      alert(error.message);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (confirm("Delete this routine?") && supabase) {
      await supabase.from('workout_templates').delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* HEADER */}
      <header className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-5xl font-black text-slate-900 italic uppercase tracking-tighter">Library</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] mt-1">Design your routines</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-blue-600 text-white p-5 rounded-[1.5rem] hover:scale-105 transition-all shadow-xl shadow-blue-100 flex items-center gap-2"
        >
          <Plus size={20} />
          <span className="font-black uppercase text-[10px] tracking-widest hidden md:block">Create New</span>
        </button>
      </header>

      {/* --- CREATE/EDIT MODAL --- */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsCreating(false)}></div>
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-10 relative z-10 border border-slate-100 flex flex-col max-h-[85vh]">
            
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-900 italic uppercase">New Routine</h2>
              <button onClick={() => setIsCreating(false)} className="text-slate-300 hover:text-slate-900"><X size={24} /></button>
            </div>

            <input 
              type="text" 
              placeholder="Routine Name (e.g. Upper Body B)" 
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              className="w-full text-3xl font-black uppercase italic border-b-4 border-slate-100 focus:border-blue-600 outline-none pb-4 mb-8 transition-colors"
            />

            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Select Exercises</p>
            <div className="grid grid-cols-2 gap-3 overflow-y-auto mb-8 pr-2">
              {library.map(ex => {
                const isSelected = selectedExercises.find(s => s.id === ex.id);
                return (
                  <button 
                    key={ex.id} 
                    onClick={() => toggleExercise(ex)}
                    className={`p-4 rounded-2xl text-left border-2 transition-all ${
                      isSelected ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-50 bg-slate-50 text-slate-400'
                    }`}
                  >
                    <p className="font-black text-[11px] uppercase italic truncate">{ex.name}</p>
                  </button>
                );
              })}
            </div>

            <button 
              onClick={saveTemplate}
              className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase italic tracking-widest hover:bg-blue-600 transition-colors shadow-lg"
            >
              Confirm Routine
            </button>
          </div>
        </div>
      )}

      {/* --- LIST OF EXISTING ROUTINES --- */}
      <div className="grid gap-6">
        {templates.map(tmpl => (
          <div key={tmpl.id} className="group p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between">
            <div className="flex-1">
              <p className="font-black text-slate-800 text-2xl italic tracking-tight uppercase">{tmpl.name}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {tmpl.exercises.map((ex: any, i: number) => (
                  <span key={i} className="bg-slate-50 text-slate-400 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-100">
                    {ex.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 ml-6">
              <button 
                onClick={() => deleteTemplate(tmpl.id)}
                className="p-3 text-slate-200 hover:text-red-500 transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
            <Dumbbell className="mx-auto text-slate-100 mb-4" size={48} />
            <p className="font-black text-slate-200 uppercase tracking-widest text-xs">No Routines Built Yet</p>
          </div>
        )}
      </div>
    </div>
  );
}