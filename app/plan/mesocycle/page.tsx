'use client';

import Link from 'next/link';
import { ArrowLeft, Gauge, Layers3, Waves } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabase';

type MesocycleFocus = 'BASE' | 'BUILD' | 'PEAK' | 'TAPER' | 'RECOVERY' | 'TRANSITION';

type MacrocycleRow = {
  id: string;
  title: string;
  mesocycle_ids: string[] | null;
  start_date: string;
  end_date: string;
};

type MesocycleRow = {
  id: string;
  title: string;
  focus: MesocycleFocus;
  start_date: string;
  end_date: string;
  microcycle_count: number | null;
  microcycle_ids: string[] | null;
};

type MicrocycleRow = {
  id: string;
  week_number: number;
  start_date: string;
  end_date: string;
  length_days: number | null;
  scheduled_workouts: unknown;
  is_recovery_week: boolean | null;
};

type ScheduledWorkoutEntry = {
  dayNumber: number;
  workoutId: string;
  notes?: string;
};

interface MesocycleSummary {
  id: string;
  title: string;
  focus: MesocycleFocus;
  startDate: string;
  endDate: string;
  microcycleCount: number;
  microcycleIds: string[];
}

interface MesocyclePlan {
  macrocycleTitle: string;
  mesocycles: MesocycleSummary[];
  activeMesocycleId: string;
  activeMesocycleWorkoutCount: number;
  activeMesocycleRecoveryWeeks: number;
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  return `${fmt.format(start)} - ${fmt.format(end)}`;
}

function parseScheduledWorkouts(raw: unknown): ScheduledWorkoutEntry[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const dayNumber = Number(record.day_number);
      const workoutId = typeof record.workout_id === 'string' ? record.workout_id.trim() : '';
      const notes = typeof record.notes === 'string' ? record.notes : undefined;

      if (!Number.isInteger(dayNumber) || dayNumber < 1 || !workoutId) return null;

      const entry: ScheduledWorkoutEntry = {
        dayNumber,
        workoutId,
      };

      if (notes) {
        entry.notes = notes;
      }

      return entry;
    })
    .filter((entry): entry is ScheduledWorkoutEntry => Boolean(entry));
}

export default function MesocyclePage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [plan, setPlan] = useState<MesocyclePlan | null>(null);

  useEffect(() => {
    async function fetchMesocyclePlan() {
      if (!supabase) {
        setErrorMsg('Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
        setLoading(false);
        return;
      }

      const { data: macrocycleRows, error: macrocycleError } = await supabase
        .from('macrocycles')
        .select('id, title, mesocycle_ids, start_date, end_date')
        .order('start_date', { ascending: true });

      if (macrocycleError) {
        setErrorMsg(`Failed to load macrocycles: ${macrocycleError.message}`);
        setLoading(false);
        return;
      }

      if (!macrocycleRows || macrocycleRows.length === 0) {
        setErrorMsg('No macrocycles found.');
        setLoading(false);
        return;
      }

      const today = new Date();
      const typedMacrocycles = macrocycleRows as MacrocycleRow[];
      const activeMacrocycle =
        typedMacrocycles.find((row) => {
          const start = new Date(`${row.start_date}T00:00:00`);
          const end = new Date(`${row.end_date}T23:59:59`);
          return today >= start && today <= end;
        }) || typedMacrocycles[0];

      const mesocycleIds = activeMacrocycle.mesocycle_ids || [];
      if (mesocycleIds.length === 0) {
        setErrorMsg('The selected macrocycle has no mesocycles.');
        setLoading(false);
        return;
      }

      const { data: mesocycleRows, error: mesocycleError } = await supabase
        .from('mesocycles')
        .select('id, title, focus, start_date, end_date, microcycle_count, microcycle_ids')
        .in('id', mesocycleIds);

      if (mesocycleError) {
        setErrorMsg(`Failed to load mesocycles: ${mesocycleError.message}`);
        setLoading(false);
        return;
      }

      const mesocycleLookup = new Map<string, MesocycleRow>(((mesocycleRows || []) as MesocycleRow[]).map((row) => [row.id, row]));
      const orderedMesocycles = mesocycleIds
        .map((id) => mesocycleLookup.get(id))
        .filter((row): row is MesocycleRow => Boolean(row))
        .map((row) => ({
          id: row.id,
          title: row.title,
          focus: row.focus,
          startDate: row.start_date,
          endDate: row.end_date,
          microcycleCount: row.microcycle_count ?? (row.microcycle_ids || []).length,
          microcycleIds: row.microcycle_ids || [],
        }));

      if (orderedMesocycles.length === 0) {
        setErrorMsg('No linked mesocycle records could be loaded for this macrocycle.');
        setLoading(false);
        return;
      }

      const allMicrocycleIds = Array.from(
        new Set(orderedMesocycles.flatMap((mesocycle) => mesocycle.microcycleIds)),
      );

      const { data: microcycleRows, error: microcycleError } = await supabase
        .from('microcycles')
        .select('id, week_number, start_date, end_date, length_days, scheduled_workouts, is_recovery_week')
        .in('id', allMicrocycleIds);

      if (microcycleError) {
        setErrorMsg(`Failed to load microcycles: ${microcycleError.message}`);
        setLoading(false);
        return;
      }

      const microcycleLookup = new Map<string, MicrocycleRow>(((microcycleRows || []) as MicrocycleRow[]).map((row) => [row.id, row]));

      const activeMicrocycleId = allMicrocycleIds.find((microcycleId) => {
        const row = microcycleLookup.get(microcycleId);
        if (!row?.start_date || !row.end_date) return false;
        const start = new Date(`${row.start_date}T00:00:00`);
        const end = new Date(`${row.end_date}T23:59:59`);
        return today >= start && today <= end;
      });

      const activeMesocycleId =
        orderedMesocycles.find((mesocycle) =>
          activeMicrocycleId ? mesocycle.microcycleIds.includes(activeMicrocycleId) : false,
        )?.id || orderedMesocycles[0].id;

      const activeMesocycle = orderedMesocycles.find((mesocycle) => mesocycle.id === activeMesocycleId) || orderedMesocycles[0];

      const activeMesocycleRecoveryWeeks = activeMesocycle.microcycleIds.reduce((sum, microcycleId) => {
        const row = microcycleLookup.get(microcycleId);
        return sum + (row?.is_recovery_week ? 1 : 0);
      }, 0);

      const activeMesocycleWorkoutCount = activeMesocycle.microcycleIds.reduce((sum, microcycleId) => {
        const row = microcycleLookup.get(microcycleId);
        return sum + parseScheduledWorkouts(row?.scheduled_workouts).length;
      }, 0);

      setPlan({
        macrocycleTitle: activeMacrocycle.title,
        mesocycles: orderedMesocycles,
        activeMesocycleId,
        activeMesocycleWorkoutCount,
        activeMesocycleRecoveryWeeks,
      });
      setLoading(false);
    }

    fetchMesocyclePlan();
  }, []);

  const activeMesocycle = useMemo(() => {
    if (!plan) return null;
    return plan.mesocycles.find((mesocycle) => mesocycle.id === plan.activeMesocycleId) || plan.mesocycles[0] || null;
  }, [plan]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(to_bottom_right,#3b577e,#539974)] px-6 py-10 text-slate-300">
        <div className="mx-auto max-w-3xl animate-pulse rounded-3xl border border-slate-700/50 bg-slate-900/40 p-6">
          Loading mesocycle data...
        </div>
      </div>
    );
  }

  if (errorMsg || !plan || !activeMesocycle) {
    return (
      <div className="min-h-screen bg-[linear-gradient(to_bottom_right,#3b577e,#539974)] px-6 py-10 text-slate-300">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-800/50 bg-red-950/40 p-6">
          {errorMsg || 'Unable to load mesocycle data.'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(to_bottom_right,#3b577e,#539974)] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-12 pt-8 sm:px-6">
        <Link
          href="/plan"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-white/60 bg-transparent px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-white transition hover:border-emerald-300 hover:text-emerald-200"
        >
          <ArrowLeft size={16} />
          Back To Plan
        </Link>

        <header className="mt-6 rounded-[2rem] border border-slate-300/40 bg-transparent p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-3 text-teal-300">
            <Layers3 size={20} />
            <span className="text-[11px] font-black uppercase tracking-[0.35em]">Mesocycle</span>
          </div>
          <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
            {activeMesocycle.title}
          </h1>
          <p className="mt-3 text-sm font-medium text-slate-200/90 sm:text-base">
            {plan.macrocycleTitle} | Focus: {activeMesocycle.focus} | {formatDateRange(activeMesocycle.startDate, activeMesocycle.endDate)}
          </p>
        </header>

        <section className="mt-6 w-full rounded-[2rem] bg-[#c4ced6] p-5 -mx-4 sm:-mx-6">
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-[1.5rem] border border-slate-400/40 bg-white/70 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
              <Gauge className="text-[#3E8A68]" size={22} />
              <h2 className="mt-3 text-lg font-black uppercase tracking-tight text-slate-900">Load Strategy</h2>
              <p className="mt-2 text-sm text-slate-700">Primary focus: {activeMesocycle.focus}</p>
            </article>
            <article className="rounded-[1.5rem] border border-slate-400/40 bg-white/70 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
              <Waves className="text-[#3E8A68]" size={22} />
              <h2 className="mt-3 text-lg font-black uppercase tracking-tight text-slate-900">Fatigue Wave</h2>
              <p className="mt-2 text-sm text-slate-700">{plan.activeMesocycleRecoveryWeeks} recovery week(s) in this mesocycle</p>
            </article>
            <article className="rounded-[1.5rem] border border-slate-400/40 bg-white/70 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
              <Layers3 className="text-[#3E8A68]" size={22} />
              <h2 className="mt-3 text-lg font-black uppercase tracking-tight text-slate-900">Workout Volume</h2>
              <p className="mt-2 text-sm text-slate-700">{plan.activeMesocycleWorkoutCount} planned workouts linked</p>
            </article>
          </div>
        </section>

        <section className="mt-6 w-full rounded-[2rem] bg-[#c4ced6] p-5 -mx-4 sm:-mx-6">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-600">Linked Blocks</p>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-slate-900">Mesocycle Order</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {plan.mesocycles.map((mesocycle, index) => (
              <article
                key={mesocycle.id}
                className={`rounded-[1.75rem] border p-5 shadow-[0_14px_40px_rgba(0,0,0,0.12)] ${
                  mesocycle.id === plan.activeMesocycleId
                    ? 'border-[#3E8A68]/70 bg-[#549c76]/85'
                    : 'border-slate-400/40 bg-white/70'
                }`}
              >
                <div className={`text-[10px] font-black uppercase tracking-[0.3em] ${mesocycle.id === plan.activeMesocycleId ? 'text-slate-100' : 'text-slate-700'}`}>
                  Block {index + 1}
                </div>
                <h3 className={`mt-2 text-2xl font-black uppercase tracking-tight ${mesocycle.id === plan.activeMesocycleId ? 'text-white' : 'text-slate-900'}`}>
                  {mesocycle.title}
                </h3>
                <p className={`mt-3 text-sm ${mesocycle.id === plan.activeMesocycleId ? 'text-slate-100/90' : 'text-slate-700'}`}>
                  Focus: {mesocycle.focus}
                </p>
                <p className={`mt-1 text-sm ${mesocycle.id === plan.activeMesocycleId ? 'text-slate-100/90' : 'text-slate-700'}`}>
                  Dates: {formatDateRange(mesocycle.startDate, mesocycle.endDate)}
                </p>
                <p className={`mt-1 text-sm ${mesocycle.id === plan.activeMesocycleId ? 'text-slate-100/90' : 'text-slate-700'}`}>
                  Microcycles: {mesocycle.microcycleCount}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
