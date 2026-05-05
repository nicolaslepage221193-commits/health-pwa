'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import Link from 'next/link';

type WorkoutSet = {
  weight: number;
  reps: number;
};

type WorkoutExercise = {
  name: string;
  sets: WorkoutSet[];
};

type Workout = {
  id: string;
  created_at: string;
  all_exercises: WorkoutExercise[];
};

export default function HistoryPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [editedExercises, setEditedExercises] = useState<WorkoutExercise[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingWorkoutId, setDeletingWorkoutId] = useState<string | null>(null);

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

    if (!error) {
      setWorkouts((data || []).map((workout: any) => ({
        ...workout,
        all_exercises: Array.isArray(workout.all_exercises) ? workout.all_exercises : [],
      })));
    }
    setLoading(false);
  }

  function startEditWorkout(workout: Workout) {
    const cloned = (workout.all_exercises || []).map((exercise) => ({
      name: typeof exercise.name === 'string' ? exercise.name : '',
      sets: Array.isArray(exercise.sets)
        ? exercise.sets.map((set) => ({
            weight: Number(set.weight) || 0,
            reps: Number(set.reps) || 0,
          }))
        : [],
    }));

    setEditingWorkoutId(workout.id);
    setEditedExercises(cloned);
  }

  function closeEditModal() {
    setEditingWorkoutId(null);
    setEditedExercises([]);
  }

  function addExercise() {
    setEditedExercises((prev) => [...prev, { name: 'New Exercise', sets: [] }]);
  }

  function deleteExercise(exerciseIndex: number) {
    setEditedExercises((prev) => prev.filter((_, idx) => idx !== exerciseIndex));
  }

  function updateExerciseName(exerciseIndex: number, name: string) {
    setEditedExercises((prev) => prev.map((exercise, idx) => {
      if (idx !== exerciseIndex) return exercise;
      return { ...exercise, name };
    }));
  }

  function addSet(exerciseIndex: number) {
    setEditedExercises((prev) => prev.map((exercise, idx) => {
      if (idx !== exerciseIndex) return exercise;
      return {
        ...exercise,
        sets: [...exercise.sets, { weight: 0, reps: 0 }],
      };
    }));
  }

  function deleteSet(exerciseIndex: number, setIndex: number) {
    setEditedExercises((prev) => prev.map((exercise, idx) => {
      if (idx !== exerciseIndex) return exercise;
      return {
        ...exercise,
        sets: exercise.sets.filter((_, sIdx) => sIdx !== setIndex),
      };
    }));
  }

  function updateSet(exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', rawValue: string) {
    const parsed = Number(rawValue);
    const value = Number.isFinite(parsed) ? parsed : 0;

    setEditedExercises((prev) => prev.map((exercise, idx) => {
      if (idx !== exerciseIndex) return exercise;
      return {
        ...exercise,
        sets: exercise.sets.map((set, sIdx) => {
          if (sIdx !== setIndex) return set;
          return { ...set, [field]: value };
        }),
      };
    }));
  }

  async function saveWorkoutEdit() {
    if (!supabase || !editingWorkoutId) return;

    const sanitized = editedExercises
      .map((exercise) => ({
        name: exercise.name.trim() || 'Exercise',
        sets: exercise.sets
          .filter((set) => Number.isFinite(set.weight) && Number.isFinite(set.reps))
          .map((set) => ({ weight: Number(set.weight), reps: Number(set.reps) })),
      }))
      .filter((exercise) => exercise.sets.length > 0);

    setIsSavingEdit(true);
    const { error } = await supabase
      .from('workouts')
      .update({ all_exercises: sanitized })
      .eq('id', editingWorkoutId);

    setIsSavingEdit(false);

    if (error) {
      alert(`Failed to update workout: ${error.message}`);
      return;
    }

    setWorkouts((prev) => prev.map((workout) => {
      if (workout.id !== editingWorkoutId) return workout;
      return { ...workout, all_exercises: sanitized };
    }));

    closeEditModal();
  }

  async function deleteWorkout(workoutId: string) {
    if (!supabase) return;
    if (!confirm('Delete this workout permanently?')) return;

    setDeletingWorkoutId(workoutId);
    const { error } = await supabase.from('workouts').delete().eq('id', workoutId);
    setDeletingWorkoutId(null);

    if (error) {
      alert(`Failed to delete workout: ${error.message}`);
      return;
    }

    setWorkouts((prev) => prev.filter((workout) => workout.id !== workoutId));
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
                <div className="flex items-center gap-2">
                  <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">
                    {workout.all_exercises?.length || 0} Exercises
                  </div>
                  <button
                    type="button"
                    onClick={() => startEditWorkout(workout)}
                    className="px-3 py-1 rounded-full text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-100"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteWorkout(workout.id)}
                    disabled={deletingWorkoutId === workout.id}
                    className="px-3 py-1 rounded-full text-xs font-bold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingWorkoutId === workout.id ? 'Deleting...' : 'Delete'}
                  </button>
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
                          <span className="text-slate-700">{set.weight}lbs x {set.reps}</span>
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

      {editingWorkoutId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 p-4 sm:p-8 overflow-y-auto">
          <div className="max-w-3xl mx-auto bg-white rounded-3xl p-5 sm:p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between gap-3 mb-6">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Edit Workout</h2>
              <button
                type="button"
                onClick={closeEditModal}
                className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider border border-slate-300 text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              {editedExercises.map((exercise, exerciseIndex) => (
                <div key={exerciseIndex} className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="text"
                      value={exercise.name}
                      onChange={(e) => updateExerciseName(exerciseIndex, e.target.value)}
                      className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-800"
                      placeholder="Exercise name"
                    />
                    <button
                      type="button"
                      onClick={() => deleteExercise(exerciseIndex)}
                      className="px-3 py-2 rounded-xl text-xs font-bold border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      Delete Exercise
                    </button>
                  </div>

                  <div className="space-y-2">
                    {exercise.sets.map((set, setIndex) => (
                      <div key={setIndex} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                        <input
                          type="number"
                          value={set.weight}
                          onChange={(e) => updateSet(exerciseIndex, setIndex, 'weight', e.target.value)}
                          className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                          placeholder="Weight (lbs)"
                        />
                        <input
                          type="number"
                          value={set.reps}
                          onChange={(e) => updateSet(exerciseIndex, setIndex, 'reps', e.target.value)}
                          className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                          placeholder="Reps"
                        />
                        <button
                          type="button"
                          onClick={() => deleteSet(exerciseIndex, setIndex)}
                          className="px-3 py-2 rounded-xl text-xs font-bold border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          Delete Set
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => addSet(exerciseIndex)}
                    className="mt-3 px-3 py-2 rounded-xl text-xs font-bold border border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    Add Set
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addExercise}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                Add Exercise
              </button>
              <button
                type="button"
                onClick={saveWorkoutEdit}
                disabled={isSavingEdit}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {isSavingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}