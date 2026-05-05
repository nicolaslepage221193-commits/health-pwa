'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface Set {
  weight: number;
  reps: number;
}

export interface SessionExercise {
  name: string;
  sets: Set[];
}

export interface WorkoutSession {
  id: string;
  activePlan: any | null;
  selectedEx: any | null;
  sessionExercises: SessionExercise[];
  currentSets: Set[];
  weight: string;
  reps: string;
  customDate: string;
  isDraft: boolean; // true = saved as draft to DB, false = only in memory
}

interface WorkoutContextType {
  session: WorkoutSession | null;
  createSession: (plan?: any) => void;
  updateSession: (updates: Partial<WorkoutSession>) => void;
  clearSession: () => void;
  loadSession: () => void;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

const STORAGE_KEY = 'healthapp_workout_session';

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load session from localStorage on mount
  useEffect(() => {
    const loadSession = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setSession(parsed);
        }
      } catch (error) {
        console.error('Failed to load workout session from localStorage:', error);
      }
    };
    
    loadSession();
    setIsHydrated(true);
  }, []);

  // Save session to localStorage whenever it changes
  useEffect(() => {
    if (isHydrated && session) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } catch (error) {
        console.error('Failed to save workout session to localStorage:', error);
      }
    }
  }, [session, isHydrated]);

  const createSession = (plan?: any) => {
    const newSession: WorkoutSession = {
      id: Date.now().toString(),
      activePlan: plan || null,
      selectedEx: null,
      sessionExercises: [],
      currentSets: [],
      weight: '',
      reps: '',
      customDate: new Date().toISOString().split('T')[0],
      isDraft: false,
    };
    setSession(newSession);
  };

  const updateSession = (updates: Partial<WorkoutSession>) => {
    setSession(prev => {
      if (!prev) return prev;
      return { ...prev, ...updates };
    });
  };

  const clearSession = () => {
    setSession(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear workout session:', error);
    }
  };

  const loadSession = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSession(parsed);
      }
    } catch (error) {
      console.error('Failed to load workout session from localStorage:', error);
    }
  };

  if (!isHydrated) {
    return <>{children}</>;
  }

  return (
    <WorkoutContext.Provider value={{ session, createSession, updateSession, clearSession, loadSession }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
}
