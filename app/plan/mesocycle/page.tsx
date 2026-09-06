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
  planned_workout_ids: string[] | null;
  is_recovery_week: boolean | null;
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
        .select('id, week_number, start_date, end_date, length_days, planned_workout_ids, is_recovery_week')
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
        return sum + (row?.planned_workout_ids?.length || 0);
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
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fff7ed_0,_#ffffff_48%,_#f8fafc_100%)] px-6 py-10 md:px-10 md:py-14">
        <div className="mx-auto max-w-5xl rounded-[2.5rem] border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm md:p-12">
          Loading mesocycle data...
        </div>
      </div>
    );
  }

  if (errorMsg || !plan || !activeMesocycle) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fff7ed_0,_#ffffff_48%,_#f8fafc_100%)] px-6 py-10 md:px-10 md:py-14">
        <div className="mx-auto max-w-5xl rounded-[2.5rem] border border-red-200 bg-red-50 p-8 text-sm text-red-700 shadow-sm md:p-12">
          {errorMsg || 'Unable to load mesocycle data.'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fff7ed_0,_#ffffff_48%,_#f8fafc_100%)] px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-5xl space-y-8">
        <Link
          href="/plan"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-slate-500 transition hover:text-orange-500"
        >
          <ArrowLeft size={16} />
          Back To Plan
        </Link>

        <header className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm md:p-12">
          <div className="flex items-center gap-3 text-orange-500">
            <Layers3 size={20} />
            <span className="text-[11px] font-black uppercase tracking-[0.35em]">Mesocycle</span>
          </div>
          <h1 className="mt-5 text-4xl font-black uppercase tracking-tight text-slate-900 md:text-6xl md:leading-[0.9]">
            {activeMesocycle.title}
          </h1>
          <p className="mt-5 max-w-3xl text-sm font-medium text-slate-600 md:text-base">
            {plan.macrocycleTitle} | Focus: {activeMesocycle.focus} | {formatDateRange(activeMesocycle.startDate, activeMesocycle.endDate)}
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <Gauge className="text-orange-500" size={24} />
            <h2 className="mt-4 text-2xl font-black uppercase tracking-tight text-slate-900">Load Strategy</h2>
            <p className="mt-3 text-sm text-slate-600">Primary focus: {activeMesocycle.focus}</p>
          </article>
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <Waves className="text-blue-600" size={24} />
            <h2 className="mt-4 text-2xl font-black uppercase tracking-tight text-slate-900">Fatigue Wave</h2>
            <p className="mt-3 text-sm text-slate-600">{plan.activeMesocycleRecoveryWeeks} recovery week(s) in this mesocycle</p>
          </article>
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <Layers3 className="text-emerald-600" size={24} />
            <h2 className="mt-4 text-2xl font-black uppercase tracking-tight text-slate-900">Workout Volume</h2>
            <p className="mt-3 text-sm text-slate-600">{plan.activeMesocycleWorkoutCount} planned workouts linked</p>
          </article>
        </section>

        <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Linked Blocks</p>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-slate-900">Mesocycle Order</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {plan.mesocycles.map((mesocycle, index) => (
              <article
                key={mesocycle.id}
                className={`rounded-[2rem] border p-6 ${
                  mesocycle.id === plan.activeMesocycleId
                    ? 'border-orange-200 bg-orange-50'
                    : 'border-slate-100 bg-slate-50'
                }`}
              >
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Block {index + 1}</div>
                <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-slate-900">{mesocycle.title}</h3>
                <p className="mt-3 text-sm text-slate-600">Focus: {mesocycle.focus}</p>
                <p className="mt-1 text-sm text-slate-600">Dates: {formatDateRange(mesocycle.startDate, mesocycle.endDate)}</p>
                <p className="mt-1 text-sm text-slate-600">Microcycles: {mesocycle.microcycleCount}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
