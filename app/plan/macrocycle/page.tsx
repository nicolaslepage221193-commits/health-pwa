'use client';

import Link from 'next/link';
import { ArrowLeft, Flag, Layers3, TimerReset } from 'lucide-react';
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
  microcycle_ids: string[] | null;
};

interface MesocycleSummary {
  id: string;
  title: string;
  focus: MesocycleFocus;
  microcycleIds: string[];
}

interface MacrocyclePlan {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  mesocycles: MesocycleSummary[];
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const fmt = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${fmt.format(start)} - ${fmt.format(end)}`;
}

export default function MacrocyclePage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [plan, setPlan] = useState<MacrocyclePlan | null>(null);

  useEffect(() => {
    async function fetchMacrocyclePlan() {
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

      const now = new Date();
      const typedMacrocycles = macrocycleRows as MacrocycleRow[];
      const activeMacrocycle =
        typedMacrocycles.find((row) => {
          const start = new Date(`${row.start_date}T00:00:00`);
          const end = new Date(`${row.end_date}T23:59:59`);
          return now >= start && now <= end;
        }) || typedMacrocycles[0];

      const mesocycleIds = activeMacrocycle.mesocycle_ids || [];

      let orderedMesocycles: MesocycleSummary[] = [];
      if (mesocycleIds.length > 0) {
        const { data: mesocycleRows, error: mesocycleError } = await supabase
          .from('mesocycles')
          .select('id, title, focus, microcycle_ids')
          .in('id', mesocycleIds);

        if (mesocycleError) {
          setErrorMsg(`Failed to load mesocycles: ${mesocycleError.message}`);
          setLoading(false);
          return;
        }

        const typedMesocycles = (mesocycleRows || []) as MesocycleRow[];
        const mesocycleLookup = new Map<string, MesocycleRow>(typedMesocycles.map((row) => [row.id, row]));

        orderedMesocycles = mesocycleIds
          .map((id) => mesocycleLookup.get(id))
          .filter((row): row is MesocycleRow => Boolean(row))
          .map((row) => ({
            id: row.id,
            title: row.title,
            focus: row.focus,
            microcycleIds: row.microcycle_ids || [],
          }));
      }

      setPlan({
        id: activeMacrocycle.id,
        title: activeMacrocycle.title,
        startDate: activeMacrocycle.start_date,
        endDate: activeMacrocycle.end_date,
        mesocycles: orderedMesocycles,
      });
      setLoading(false);
    }

    fetchMacrocyclePlan();
  }, []);

  const totalMicrocycles = useMemo(() => {
    if (!plan) return 0;
    return plan.mesocycles.reduce((sum, mesocycle) => sum + mesocycle.microcycleIds.length, 0);
  }, [plan]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,_#eff6ff_0%,_#ffffff_48%,_#f8fafc_100%)] px-6 py-10 md:px-10 md:py-14">
        <div className="mx-auto max-w-5xl rounded-[2.5rem] border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm md:p-12">
          Loading macrocycle plan...
        </div>
      </div>
    );
  }

  if (errorMsg || !plan) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,_#eff6ff_0%,_#ffffff_48%,_#f8fafc_100%)] px-6 py-10 md:px-10 md:py-14">
        <div className="mx-auto max-w-5xl rounded-[2.5rem] border border-red-200 bg-red-50 p-8 text-sm text-red-700 shadow-sm md:p-12">
          {errorMsg || 'Unable to load macrocycle plan.'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#eff6ff_0%,_#ffffff_48%,_#f8fafc_100%)] px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-5xl space-y-8">
        <Link
          href="/plan"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-slate-500 transition hover:text-blue-600"
        >
          <ArrowLeft size={16} />
          Back To Plan
        </Link>

        <header className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm md:p-12">
          <div className="flex items-center gap-3 text-blue-600">
            <Flag size={20} />
            <span className="text-[11px] font-black uppercase tracking-[0.35em]">Macrocycle</span>
          </div>
          <h1 className="mt-5 text-4xl font-black uppercase tracking-tight text-slate-900 md:text-6xl md:leading-[0.9]">
            {plan.title}
          </h1>
          <p className="mt-5 max-w-3xl text-sm font-medium text-slate-600 md:text-base">
            {formatDateRange(plan.startDate, plan.endDate)}
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <Flag className="text-blue-600" size={24} />
            <h2 className="mt-4 text-2xl font-black uppercase tracking-tight text-slate-900">Plan Window</h2>
            <p className="mt-3 text-sm text-slate-600">{formatDateRange(plan.startDate, plan.endDate)}</p>
          </article>
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <Layers3 className="text-orange-500" size={24} />
            <h2 className="mt-4 text-2xl font-black uppercase tracking-tight text-slate-900">Mesocycles</h2>
            <p className="mt-3 text-sm text-slate-600">{plan.mesocycles.length} blocks linked in order</p>
          </article>
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <TimerReset className="text-emerald-600" size={24} />
            <h2 className="mt-4 text-2xl font-black uppercase tracking-tight text-slate-900">Microcycles</h2>
            <p className="mt-3 text-sm text-slate-600">{totalMicrocycles} weeks linked across all mesocycles</p>
          </article>
        </section>

        <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Periodization Blocks</p>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-slate-900">Mesocycle Order</h2>

          {plan.mesocycles.length === 0 ? (
            <div className="mt-8 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              No mesocycles linked to this macrocycle yet.
            </div>
          ) : (
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {plan.mesocycles.map((mesocycle, index) => (
                <article key={mesocycle.id} className="rounded-[2rem] border border-slate-100 bg-slate-50 p-6">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Block {index + 1}</div>
                  <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-slate-900">{mesocycle.title}</h3>
                  <p className="mt-3 text-sm text-slate-600">Focus: {mesocycle.focus}</p>
                  <p className="mt-1 text-sm text-slate-600">Microcycles: {mesocycle.microcycleIds.length}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
