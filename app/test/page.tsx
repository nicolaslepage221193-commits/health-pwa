'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

type Exercise = {
  id: number;
  name: string;
  muscle: string;
};

export default function TestPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchExercises() {
      try {
        const { data, error } = await supabase
          .from('exercise_library')
          .select('id, name, muscle')
          .order('name');

        if (error) {
          setError(error.message);
        } else {
          setExercises(data || []);
        }
      } catch (err) {
        setError('Failed to fetch exercises');
      } finally {
        setLoading(false);
      }
    }

    fetchExercises();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Exercises</h1>
        <p>Loading exercises...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Exercises</h1>
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    
    <div className="p-8">
      <div> 
        <h1 className="text-2xl font-bold mb-4 text-slate-800">Exercisessss</h1>

      </div>
      <h1 className="text-2xl font-bold mb-4">Exercisessssssssssssssssss</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {exercises.map((exercise) => (
          <div key={exercise.id} className="border rounded-lg p-4 shadow-sm">
            <h2 className="text-lg font-semibold">{exercise.name}</h2>
            <p className="text-gray-600">{exercise.muscle}</p>
          </div>
        ))}
      </div>
      {exercises.length === 0 && (
        <p className="text-gray-500">No exercises found.</p>
      )}
    </div>
  );
}
