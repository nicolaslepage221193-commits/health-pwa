'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Plus, Trash2, X, ChevronRight, LayoutGrid, Dumbbell, Edit2 } from 'lucide-react';

export default function LibraryPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [library, setLibrary] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(false);
  const [isCreatingExercise, setIsCreatingExercise] = useState(false);
  const [isEditingExercise, setIsEditingExercise] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  
  // New Template State
  const [newPlanName, setNewPlanName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<any[]>([]);
  
  // New Exercise State
  const [newExerciseName, setNewExerciseName] = useState('');
  const [editingExerciseName, setEditingExerciseName] = useState('');
  
  // Edit Template State
  const [editingTemplateName, setEditingTemplateName] = useState('');
  const [editingTemplateExercises, setEditingTemplateExercises] = useState<any[]>([]);

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
      const { error: unlinkError } = await supabase
        .from('workouts')
        .update({ template_id: null })
        .eq('template_id', id);

      if (unlinkError) {
        alert(unlinkError.message);
        return;
      }

      const { error: deleteError } = await supabase
        .from('workout_templates')
        .delete()
        .eq('id', id);

      if (deleteError) {
        alert(deleteError.message);
        return;
      }

      fetchData();
    }
  };

  const saveExercise = async () => {
    if (!newExerciseName || !supabase) return;

    const { error } = await supabase.from('exercise_library').insert([
      { 
        name: newExerciseName
      }
    ]);

    if (!error) {
      setNewExerciseName('');
      setIsCreatingExercise(false);
      fetchData();
    } else {
      alert(error.message);
    }
  };

  const startEditExercise = (exercise: any) => {
    setEditingExerciseId(exercise.id);
    setEditingExerciseName(exercise.name);
    setIsEditingExercise(true);
  };

  const updateExercise = async () => {
    if (!editingExerciseName || !editingExerciseId || !supabase) return;

    const { error } = await supabase
      .from('exercise_library')
      .update({ name: editingExerciseName })
      .eq('id', editingExerciseId);

    if (!error) {
      setEditingExerciseName('');
      setEditingExerciseId(null);
      setIsEditingExercise(false);
      fetchData();
    } else {
      alert(error.message);
    }
  };

  const deleteExercise = async (id: string) => {
    if (!supabase) return;
    const client = supabase;

    const targetExercise = library.find(ex => ex.id === id);
    const targetName = targetExercise?.name;

    const [tmplRes, workoutRes] = await Promise.all([
      client.from('workout_templates').select('id, name, exercises'),
      client.from('workouts').select('id, all_exercises')
    ]);

    if (tmplRes.error) {
      alert(tmplRes.error.message);
      return;
    }

    if (workoutRes.error) {
      alert(workoutRes.error.message);
      return;
    }

    const templatesUsingExercise = (tmplRes.data || []).filter((tmpl: any) =>
      Array.isArray(tmpl.exercises) && tmpl.exercises.some((ex: any) => ex.id === id || (targetName && ex.name === targetName))
    );

    const workoutsUsingExercise = (workoutRes.data || []).filter((workout: any) =>
      Array.isArray(workout.all_exercises) && workout.all_exercises.some((ex: any) => ex.id === id || (targetName && ex.name === targetName))
    );

    const isUsed = templatesUsingExercise.length > 0 || workoutsUsingExercise.length > 0;

    if (isUsed) {
      const confirmed = confirm(
        `This exercise is currently used in ${templatesUsingExercise.length} routine(s) and ${workoutsUsingExercise.length} logged workout(s). Delete anyway? It will be removed from routines, but kept in logged workouts.`
      );
      if (!confirmed) return;

      const templateUpdates = templatesUsingExercise.map((tmpl: any) => {
        const filteredExercises = (tmpl.exercises || []).filter(
          (ex: any) => ex.id !== id && (!targetName || ex.name !== targetName)
        );

        return client
          .from('workout_templates')
          .update({ exercises: filteredExercises })
          .eq('id', tmpl.id);
      });

      const updateResults = await Promise.all(templateUpdates);
      const updateError = updateResults.find((res: any) => res.error)?.error;

      if (updateError) {
        alert(updateError.message);
        return;
      }
    } else {
      const confirmed = confirm("Delete this exercise?");
      if (!confirmed) return;
    }

    const { error: deleteError } = await client.from('exercise_library').delete().eq('id', id);
    if (deleteError) {
      alert(deleteError.message);
      return;
    }

    setSelectedExercises(prev => prev.filter(ex => ex.id !== id));
    setEditingTemplateExercises(prev => prev.filter(ex => ex.id !== id));
    fetchData();
  };

  const startEditTemplate = (template: any) => {
    setEditingTemplateId(template.id);
    setEditingTemplateName(template.name);
    setEditingTemplateExercises([...template.exercises]);
    setIsEditingTemplate(true);
  };

  const toggleEditingTemplateExercise = (ex: any) => {
    const exists = editingTemplateExercises.find(s => s.id === ex.id);
    if (exists) {
      setEditingTemplateExercises(editingTemplateExercises.filter(s => s.id !== ex.id));
    } else {
      setEditingTemplateExercises([...editingTemplateExercises, { id: ex.id, name: ex.name }]);
    }
  };

  const updateTemplate = async () => {
    if (!editingTemplateName || editingTemplateExercises.length === 0 || !editingTemplateId || !supabase) return;

    const { error } = await supabase
      .from('workout_templates')
      .update({ name: editingTemplateName, exercises: editingTemplateExercises })
      .eq('id', editingTemplateId);

    if (!error) {
      setEditingTemplateName('');
      setEditingTemplateExercises([]);
      setEditingTemplateId(null);
      setIsEditingTemplate(false);
      fetchData();
    } else {
      alert(error.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* HEADER */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 sm:gap-0 mb-8 sm:mb-12">
        <div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 italic uppercase tracking-tighter">Workout Library</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] mt-1">Design your routines</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-blue-600 text-white p-3 sm:p-5 rounded-[1.5rem] hover:scale-105 transition-all shadow-xl shadow-blue-100 flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start"
        >
          <Plus size={20} />
          <span className="font-black uppercase text-[10px] tracking-widest hidden md:block">Create New</span>
        </button>
      </header>

      {/* --- CREATE/EDIT MODAL --- */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsCreating(false)}></div>
          <div className="bg-white w-full max-w-2xl rounded-[2rem] sm:rounded-[3rem] shadow-2xl p-6 sm:p-10 relative z-10 border border-slate-100 flex flex-col max-h-[85vh]">
            
            <div className="flex justify-between items-center mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 italic uppercase">New Routine</h2>
              <button onClick={() => setIsCreating(false)} className="text-slate-300 hover:text-slate-900"><X size={24} /></button>
            </div>

            <input 
              type="text" 
              placeholder="Routine Name (e.g. Upper Body B)" 
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              className="w-full text-2xl sm:text-3xl font-black uppercase italic border-b-4 border-slate-100 focus:border-blue-600 outline-none pb-4 mb-6 sm:mb-8 transition-colors"
            />

            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Select Exercises</p>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 overflow-y-auto mb-6 sm:mb-8 pr-2">
              {library.map(ex => {
                const isSelected = selectedExercises.find(s => s.id === ex.id);
                return (
                  <button 
                    key={ex.id} 
                    onClick={() => toggleExercise(ex)}
                    className={`p-2 sm:p-4 rounded-xl sm:rounded-2xl text-left border-2 transition-all ${
                      isSelected ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-50 bg-slate-50 text-slate-400'
                    }`}
                  >
                    <p className="font-black text-[9px] sm:text-[11px] uppercase italic truncate">{ex.name}</p>
                  </button>
                );
              })}
            </div>

            <button 
              onClick={saveTemplate}
              className="w-full bg-slate-900 text-white py-4 sm:py-6 rounded-[1.5rem] sm:rounded-[2rem] font-black uppercase italic tracking-widest hover:bg-blue-600 transition-colors shadow-lg text-sm sm:text-base"
            >
              Confirm Routine
            </button>
          </div>
        </div>
      )}

      {/* --- CREATE EXERCISE MODAL --- */}
      {isCreatingExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsCreatingExercise(false)}></div>
          <div className="bg-white w-full max-w-2xl rounded-[2rem] sm:rounded-[3rem] shadow-2xl p-6 sm:p-10 relative z-10 border border-slate-100 flex flex-col">
            
            <div className="flex justify-between items-center mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 italic uppercase">New Exercise</h2>
              <button onClick={() => setIsCreatingExercise(false)} className="text-slate-300 hover:text-slate-900"><X size={24} /></button>
            </div>

            <input 
              type="text" 
              placeholder="Exercise Name (e.g. Bench Press)" 
              value={newExerciseName}
              onChange={(e) => setNewExerciseName(e.target.value)}
              className="w-full text-2xl sm:text-3xl font-black uppercase italic border-b-4 border-slate-100 focus:border-blue-600 outline-none pb-4 mb-6 sm:mb-8 transition-colors"
            />

            <button 
              onClick={saveExercise}
              className="w-full bg-slate-900 text-white py-4 sm:py-6 rounded-[1.5rem] sm:rounded-[2rem] font-black uppercase italic tracking-widest hover:bg-blue-600 transition-colors shadow-lg text-sm sm:text-base"
            >
              Create Exercise
            </button>
          </div>
        </div>
      )}

      {/* --- EDIT EXERCISE MODAL --- */}
      {isEditingExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsEditingExercise(false)}></div>
          <div className="bg-white w-full max-w-2xl rounded-[2rem] sm:rounded-[3rem] shadow-2xl p-6 sm:p-10 relative z-10 border border-slate-100 flex flex-col">
            
            <div className="flex justify-between items-center mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 italic uppercase">Edit Exercise</h2>
              <button onClick={() => setIsEditingExercise(false)} className="text-slate-300 hover:text-slate-900"><X size={24} /></button>
            </div>

            <input 
              type="text" 
              placeholder="Exercise Name" 
              value={editingExerciseName}
              onChange={(e) => setEditingExerciseName(e.target.value)}
              className="w-full text-2xl sm:text-3xl font-black uppercase italic border-b-4 border-slate-100 focus:border-blue-600 outline-none pb-4 mb-6 sm:mb-8 transition-colors"
            />

            <button 
              onClick={updateExercise}
              className="w-full bg-slate-900 text-white py-4 sm:py-6 rounded-[1.5rem] sm:rounded-[2rem] font-black uppercase italic tracking-widest hover:bg-blue-600 transition-colors shadow-lg text-sm sm:text-base"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* --- EDIT TEMPLATE MODAL --- */}
      {isEditingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsEditingTemplate(false)}></div>
          <div className="bg-white w-full max-w-2xl rounded-[2rem] sm:rounded-[3rem] shadow-2xl p-6 sm:p-10 relative z-10 border border-slate-100 flex flex-col max-h-[85vh]">
            
            <div className="flex justify-between items-center mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 italic uppercase">Edit Routine</h2>
              <button onClick={() => setIsEditingTemplate(false)} className="text-slate-300 hover:text-slate-900"><X size={24} /></button>
            </div>

            <input 
              type="text" 
              placeholder="Routine Name" 
              value={editingTemplateName}
              onChange={(e) => setEditingTemplateName(e.target.value)}
              className="w-full text-2xl sm:text-3xl font-black uppercase italic border-b-4 border-slate-100 focus:border-blue-600 outline-none pb-4 mb-6 sm:mb-8 transition-colors"
            />

            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Select Exercises</p>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 overflow-y-auto mb-6 sm:mb-8 pr-2">
              {library.map(ex => {
                const isSelected = editingTemplateExercises.find(s => s.id === ex.id);
                return (
                  <button 
                    key={ex.id} 
                    onClick={() => toggleEditingTemplateExercise(ex)}
                    className={`p-2 sm:p-4 rounded-xl sm:rounded-2xl text-left border-2 transition-all ${
                      isSelected ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-50 bg-slate-50 text-slate-400'
                    }`}
                  >
                    <p className="font-black text-[9px] sm:text-[11px] uppercase italic truncate">{ex.name}</p>
                  </button>
                );
              })}
            </div>

            <button 
              onClick={updateTemplate}
              className="w-full bg-slate-900 text-white py-4 sm:py-6 rounded-[1.5rem] sm:rounded-[2rem] font-black uppercase italic tracking-widest hover:bg-blue-600 transition-colors shadow-lg text-sm sm:text-base"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* --- LIST OF EXISTING ROUTINES --- */}
      <div className="grid gap-6">
        {templates.map(tmpl => (
          <div key={tmpl.id} className="group p-4 sm:p-8 bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
            <div className="flex-1 min-w-0">
              <p className="font-black text-slate-800 text-lg sm:text-2xl italic tracking-tight uppercase">{tmpl.name}</p>
              <div className="flex flex-wrap gap-2 mt-3 sm:mt-4">
                {tmpl.exercises.map((ex: any, i: number) => (
                  <span key={i} className="bg-slate-50 text-slate-400 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest border border-slate-100">
                    {ex.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 sm:ml-6 self-end sm:self-auto">
              <button 
                onClick={() => startEditTemplate(tmpl)}
                className="p-3 text-slate-200 hover:text-blue-500 transition-colors"
              >
                <Edit2 size={20} />
              </button>
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
            <p className="font-black text-slate-200 uppercase tracking-widest text-xs">No Workouts Found In Database</p>
          </div>
        )}
      </div>

      {/* --- EXERCISE LIBRARY SECTION --- */}
      <div className="mt-12 sm:mt-16">
        <div className="flex justify-between items-center gap-4 sm:gap-6 mb-4 sm:mb-6">
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 italic uppercase tracking-tighter">Exercise Library</h1>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsCreatingExercise(true)}
              className="bg-blue-600 text-white p-2 sm:p-3 rounded-lg hover:scale-105 transition-all shadow-lg flex items-center gap-2"
            >
              <Plus size={18} />
              <span className="font-black uppercase text-[10px] tracking-widest hidden sm:block">New</span>
            </button>
            <button 
              onClick={() => setIsLibraryExpanded(!isLibraryExpanded)}
              className="flex-shrink-0 p-2 hover:bg-slate-100 rounded-lg transition-all"
            >
              <ChevronRight size={24} className={`text-slate-300 transition-transform ${isLibraryExpanded ? 'rotate-90' : ''}`} />
            </button>
          </div>
        </div>

        {isLibraryExpanded && (
          <div className="mt-4 p-4 sm:p-6 bg-slate-50 rounded-[2rem] sm:rounded-[2.5rem] animate-in fade-in duration-300">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {library.map(ex => (
                <div key={ex.id} className="p-2 sm:p-4 bg-white rounded-lg sm:rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                  <p className="font-black text-slate-600 text-[9px] sm:text-[11px] uppercase italic truncate flex-1 mb-2">{ex.name}</p>
                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => startEditExercise(ex)}
                      className="flex-1 p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center justify-center"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => deleteExercise(ex.id)}
                      className="flex-1 p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors flex items-center justify-center"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {library.length === 0 && (
              <p className="text-center text-slate-400 font-black text-[10px] uppercase tracking-widest">No exercises available</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}