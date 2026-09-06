'use client';

import Link from 'next/link';
import { Activity, Bike, ChevronLeft, Plus, Waves } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabase';

type SportType = 'RUN' | 'CYCLE' | 'SWIM';

interface MesocycleBlock {
  id: string;
  name: string;
  durationWeeks: number;
  isCurrent: boolean;
}

interface MacrocyclePlan {
  id: string;
  title: string;
  primarySport: SportType;
  mesocycles: MesocycleBlock[];
}

interface Microcycle {
  id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  targetVolumeHours: number;
  targetDistanceKm: number;
  actualVolumeHours: number;
  actualDistanceKm: number;
  isRecoveryWeek: boolean;
}

type MesocycleRow = {
  id: string;
  title: string;
  sequence_order: number;
  start_date: string;
  end_date: string;
  macrocycle_id: string;
  macrocycles:
    | {
    title: string;
    primary_sport: SportType;
  }
    | {
    title: string;
    primary_sport: SportType;
  }[]
    | null;
};

type MicrocycleRow = {
  id: string;
  week_number: number;
  start_date: string;
  end_date: string;
  target_volume_hours: number | null;
  target_distance_km: number | null;
  actual_volume_hours: number | null;
  actual_distance_km: number | null;
  is_recovery_week: boolean | null;
  mesocycles:
    | {
    id: string;
    title: string;
    sequence_order: number;
    start_date: string;
    end_date: string;
    macrocycle_id: string;
    macrocycles:
      | {
      title: string;
      primary_sport: SportType;
    }
      | {
      title: string;
      primary_sport: SportType;
    }[]
      | null;
  }
    | {
    id: string;
    title: string;
    sequence_order: number;
    start_date: string;
    end_date: string;
    macrocycle_id: string;
    macrocycles:
      | {
      title: string;
      primary_sport: SportType;
    }
      | {
      title: string;
      primary_sport: SportType;
    }[]
      | null;
  }[]
    | null;
};

function getDurationWeeks(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  const days = Math.floor(diffMs / 86400000) + 1;
  return Math.max(1, Math.ceil(days / 7));
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  return `${fmt.format(start)}-${fmt.format(end)}`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function getSportStyles(sport: SportType) {
  switch (sport) {
    case 'RUN':
      return {
        cardClass: 'bg-[#2B4C6F]/85 border-[#40688f]/70',
        icon: <Activity size={18} className="text-slate-100" />,
        label: 'RUN',
      };
    case 'SWIM':
      return {
        cardClass: 'bg-[#1F5A73]/85 border-[#317590]/70',
        icon: <Waves size={18} className="text-slate-100" />,
        label: 'SWIM',
      };
    default:
      return {
        cardClass: 'bg-[#2E6B4B]/85 border-[#478b66]/70',
        icon: <Bike size={18} className="text-slate-100" />,
        label: 'CYCLE',
      };
  }
}

export default function MicrocyclePage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [macrocyclePlan, setMacrocyclePlan] = useState<MacrocyclePlan | null>(null);
  const [microcycles, setMicrocycles] = useState<Microcycle[]>([]);
  const [currentMicrocycleId, setCurrentMicrocycleId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!supabase) {
        setErrorMsg('Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
        setLoading(false);
        return;
      }

      const { data: microcycleRows, error: microcycleError } = await supabase
        .from('microcycles')
        .select('id, week_number, start_date, end_date, target_volume_hours, target_distance_km, actual_volume_hours, actual_distance_km, is_recovery_week, mesocycles(id, title, sequence_order, start_date, end_date, macrocycle_id, macrocycles(title, primary_sport))')
        .order('week_number', { ascending: true });

      if (microcycleError) {
        setErrorMsg(`Failed to load microcycles: ${microcycleError.message}`);
        setLoading(false);
        return;
      }

      if (!microcycleRows) {
        setErrorMsg('Microcycle query returned no data.');
        setLoading(false);
        return;
      }

      if (microcycleRows.length === 0) {
        setErrorMsg(`No microcycles found: ${JSON.stringify(microcycleRows)}`);
        setLoading(false);
        return;
      }

      const normalizedRows = (microcycleRows as MicrocycleRow[]).map((row) => {
        const mesocycle = Array.isArray(row.mesocycles) ? row.mesocycles[0] : row.mesocycles;
        const macrocycle = mesocycle
          ? Array.isArray(mesocycle.macrocycles)
            ? mesocycle.macrocycles[0]
            : mesocycle.macrocycles
          : null;

        return {
          row,
          mesocycle,
          macrocycle,
        };
      });

      const rowsWithMesocycle = normalizedRows.filter((entry) => entry.mesocycle);
      if (rowsWithMesocycle.length === 0) {
        setErrorMsg('Microcycles are not linked to any mesocycle records.');
        setLoading(false);
        return;
      }

      const today = new Date();
      const activeMicrocycleEntry =
        rowsWithMesocycle.find((entry) => {
          const start = new Date(`${entry.row.start_date}T00:00:00`);
          const end = new Date(`${entry.row.end_date}T23:59:59`);
          return today >= start && today <= end;
        }) || rowsWithMesocycle[0];

      const activeMesocycleId = activeMicrocycleEntry.mesocycle!.id;
      const activeMacrocycle = activeMicrocycleEntry.macrocycle;

      const uniqueMesocycles = new Map<string, NonNullable<(typeof rowsWithMesocycle)[number]['mesocycle']>>();
      rowsWithMesocycle.forEach((entry) => {
        if (!uniqueMesocycles.has(entry.mesocycle!.id)) {
          uniqueMesocycles.set(entry.mesocycle!.id, entry.mesocycle!);
        }
      });

      const orderedMesocycles = Array.from(uniqueMesocycles.values()).sort(
        (a, b) => a.sequence_order - b.sequence_order,
      );

      const plan: MacrocyclePlan = {
        id: activeMicrocycleEntry.mesocycle!.macrocycle_id,
        title: activeMacrocycle?.title || 'TRAINING PLAN',
        primarySport: activeMacrocycle?.primary_sport || 'CYCLE',
        mesocycles: orderedMesocycles.map((row) => ({
          id: row.id,
          name: row.title,
          durationWeeks: getDurationWeeks(row.start_date, row.end_date),
          isCurrent: row.id === activeMesocycleId,
        })),
      };

      const mappedMicrocycles: Microcycle[] = rowsWithMesocycle
        .filter((entry) => entry.mesocycle!.id === activeMesocycleId)
        .map(({ row }) => ({
        id: row.id,
        weekNumber: row.week_number,
        startDate: row.start_date,
        endDate: row.end_date,
        targetVolumeHours: row.target_volume_hours ?? 0,
        targetDistanceKm: row.target_distance_km ?? 0,
        actualVolumeHours: row.actual_volume_hours ?? 0,
        actualDistanceKm: row.actual_distance_km ?? 0,
        isRecoveryWeek: row.is_recovery_week ?? false,
      }));

      setMacrocyclePlan(plan);
      setMicrocycles(mappedMicrocycles);
      setCurrentMicrocycleId(activeMicrocycleEntry.row.id || mappedMicrocycles[0]?.id || null);
      setLoading(false);
    }

    fetchData();
  }, []);

  const activeMesocycleIndex = useMemo(() => {
    if (!macrocyclePlan) return -1;
    return macrocyclePlan.mesocycles.findIndex((block) => block.isCurrent);
  }, [macrocyclePlan]);

  const currentMicrocycle = useMemo(() => {
    if (microcycles.length === 0) return null;
    return microcycles.find((m) => m.id === currentMicrocycleId) || microcycles[0];
  }, [currentMicrocycleId, microcycles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(to_bottom_right,#3b577e,#3e6e70)] px-6 py-10 text-slate-300">
        <div className="mx-auto max-w-3xl animate-pulse rounded-3xl border border-slate-700/50 bg-slate-900/40 p-6">
          Loading microcycle data...
        </div>
      </div>
    );
  }

  if (errorMsg || !macrocyclePlan) {
    return (
      <div className="min-h-screen bg-[linear-gradient(to_bottom_right,#3b577e,#3e6e70)] px-6 py-10 text-slate-300">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-800/50 bg-red-950/40 p-6">
          {errorMsg || 'Unable to load microcycle data.'}
        </div>
      </div>
    );
  }

  const sportStyles = getSportStyles(macrocyclePlan.primarySport);

  return (
    <div className="min-h-screen bg-[linear-gradient(to_bottom_right,#3b577e,#3e6e70)] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-40 pt-8 sm:px-6">
        <header className="rounded-[2rem] border border-slate-700/50 bg-slate-900/40 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)] backdrop-blur">
          <div className="flex items-start gap-4">
            <Link
              href="/plan"
              aria-label="Back to plan"
              className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700/60 bg-slate-800/70 text-slate-100 transition hover:border-emerald-500/60 hover:text-emerald-300"
            >
              <ChevronLeft size={18} />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.32em] text-slate-400">
                {macrocyclePlan.title}
              </p>
              <p className="mt-2 text-sm font-medium text-teal-300">Microcycle</p>
            </div>
          </div>
        </header>

        <section className="mt-6 rounded-[2rem] border border-slate-700/50 bg-slate-900/35 p-5 backdrop-blur">
          <div className="flex items-center justify-between gap-3 overflow-x-auto pb-2">
            {macrocyclePlan.mesocycles.map((block, index) => {
              const isActive = block.isCurrent;
              const isCompleted = index < activeMesocycleIndex;

              return (
                <div key={block.id} className="flex min-w-[130px] flex-1 items-center">
                  <div className="flex w-full flex-col items-center text-center">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-black uppercase tracking-tight ${
                        isActive
                          ? 'border-emerald-400 bg-emerald-500 text-slate-950'
                          : isCompleted
                            ? 'border-teal-500/80 bg-teal-500/25 text-teal-200'
                            : 'border-slate-600 bg-slate-800/80 text-slate-400'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <p className={`mt-3 text-[10px] font-black uppercase tracking-[0.18em] ${isActive ? 'text-emerald-300' : 'text-slate-400'}`}>
                      {block.name}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">{block.durationWeeks} wks</p>
                  </div>
                  {index < macrocyclePlan.mesocycles.length - 1 && (
                    <div
                      className={`mx-2 mt-[-28px] h-px flex-1 ${
                        index <= activeMesocycleIndex ? 'bg-emerald-500/80' : 'bg-slate-700'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-center gap-2">
            {macrocyclePlan.mesocycles.map((block) => (
              <span
                key={`${block.id}-dot`}
                className={`h-2.5 w-2.5 rounded-full ${block.isCurrent ? 'bg-emerald-400' : 'bg-slate-600'}`}
              />
            ))}
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4 px-1">
            <h1 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
              {currentMicrocycle ? `Microcycle ${currentMicrocycle.weekNumber}` : 'Microcycles'}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {currentMicrocycle ? formatDateRange(currentMicrocycle.startDate, currentMicrocycle.endDate) : 'No weeks yet'}
            </p>
          </div>

          <div className="space-y-4">
            {microcycles.length === 0 && (
              <div className="rounded-[1.75rem] border border-slate-700/60 bg-slate-900/30 p-6 text-sm text-slate-300">
                No microcycles found for this mesocycle.
              </div>
            )}

            {microcycles.map((week) => {
              const recoveryClass = week.isRecoveryWeek ? 'bg-slate-700/60 border-slate-600/70' : sportStyles.cardClass;

              return (
                <article
                  key={week.id}
                  className={`flex items-stretch gap-3 ${currentMicrocycleId === week.id ? '' : 'opacity-80'}`}
                  onMouseEnter={() => setCurrentMicrocycleId(week.id)}
                >
                  <div className="flex w-16 flex-shrink-0 flex-col items-center justify-center rounded-[1.5rem] border border-slate-700/50 bg-slate-900/30 px-2 py-4 text-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Wk</span>
                    <span className="mt-1 text-2xl font-black tracking-tight text-white">{week.weekNumber}</span>
                  </div>

                  <div
                    className={`flex-1 rounded-[1.75rem] border p-4 shadow-[0_14px_40px_rgba(0,0,0,0.18)] ${recoveryClass}`}
                  >
                    <div className="flex min-h-[92px] flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black/15">
                            {week.isRecoveryWeek ? <Plus size={18} className="text-slate-200" /> : sportStyles.icon}
                          </div>
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-200/90">
                              {week.isRecoveryWeek ? 'RECOVERY' : sportStyles.label}
                            </p>
                            <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-white">
                              {week.isRecoveryWeek ? 'Recovery Week' : `Training Week ${week.weekNumber}`}
                            </h2>
                          </div>
                        </div>
                        <p className="mt-3 text-sm text-slate-100/90">
                          {formatDateRange(week.startDate, week.endDate)}
                        </p>
                      </div>

                      <div className="grid min-w-[210px] grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-left text-sm sm:text-right">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Target h</p>
                          <p className="mt-1 font-semibold text-white">{formatNumber(week.targetVolumeHours)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Target km</p>
                          <p className="mt-1 font-semibold text-white">{formatNumber(week.targetDistanceKm)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Actual h</p>
                          <p className="mt-1 font-semibold text-white">{formatNumber(week.actualVolumeHours)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Actual km</p>
                          <p className="mt-1 font-semibold text-white">{formatNumber(week.actualDistanceKm)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-700/50 bg-slate-950/90 px-4 pb-6 pt-4 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <div className="flex items-center justify-center gap-2">
            {microcycles.slice(0, 6).map((week) => (
              <span
                key={`${week.id}-pager`}
                className={`h-2.5 rounded-full ${currentMicrocycleId === week.id ? 'w-8 bg-emerald-400' : 'w-2.5 bg-slate-600'}`}
              />
            ))}
          </div>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-3 rounded-[1.5rem] bg-[#3E8A68] px-6 py-4 text-sm font-black uppercase tracking-[0.25em] text-white transition hover:bg-[#4ca279]"
          >
            <Plus size={18} />
            Add Microcycle
          </button>
        </div>
      </div>
    </div>
  );
}
