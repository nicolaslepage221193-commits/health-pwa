'use client';

import Link from 'next/link';
import { ChevronLeft, Gauge, Layers3, Waves } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  macrocycleStartDate: string;
  macrocycleEndDate: string;
  mesocycles: MesocycleSummary[];
  activeMesocycleId: string;
  activeMesocycleWorkoutCount: number;
  activeMesocycleRecoveryWeeks: number;
  microcyclesById: Record<string, MicrocycleRow>;
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
  const [selectedMesocycleId, setSelectedMesocycleId] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const isDraggingTimelineRef = useRef(false);
  const suppressTimelineClickRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);

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
      const microcyclesById = Object.fromEntries(microcycleLookup.entries());

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
        macrocycleStartDate: activeMacrocycle.start_date,
        macrocycleEndDate: activeMacrocycle.end_date,
        mesocycles: orderedMesocycles,
        activeMesocycleId,
        activeMesocycleWorkoutCount,
        activeMesocycleRecoveryWeeks,
        microcyclesById,
      });
      setSelectedMesocycleId(activeMesocycleId);
      setLoading(false);
    }

    fetchMesocyclePlan();
  }, []);

  const activeMesocycle = useMemo(() => {
    if (!plan) return null;
    return plan.mesocycles.find((mesocycle) => mesocycle.id === plan.activeMesocycleId) || plan.mesocycles[0] || null;
  }, [plan]);

  const currentMesocycle = useMemo(() => {
    if (!plan) return null;

    if (selectedMesocycleId) {
      const selected = plan.mesocycles.find((mesocycle) => mesocycle.id === selectedMesocycleId);
      if (selected) return selected;
    }

    return activeMesocycle;
  }, [activeMesocycle, plan, selectedMesocycleId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(to_bottom_right,#3b577e,#539974)] px-6 py-10 text-slate-300">
        <div className="mx-auto max-w-3xl animate-pulse rounded-3xl border border-slate-700/50 bg-slate-900/40 p-6">
          Loading mesocycle data...
        </div>
      </div>
    );
  }

  if (errorMsg || !plan || !activeMesocycle || !currentMesocycle) {
    return (
      <div className="min-h-screen bg-[linear-gradient(to_bottom_right,#3b577e,#539974)] px-6 py-10 text-slate-300">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-800/50 bg-red-950/40 p-6">
          {errorMsg || 'Unable to load mesocycle data.'}
        </div>
      </div>
    );
  }

  const handleTimelineMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    isDraggingTimelineRef.current = true;
    suppressTimelineClickRef.current = false;
    dragStartXRef.current = event.clientX;
    dragStartScrollLeftRef.current = timelineRef.current.scrollLeft;
  };

  const handleTimelineMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !isDraggingTimelineRef.current) return;
    const deltaX = event.clientX - dragStartXRef.current;

    if (Math.abs(deltaX) > 4) {
      suppressTimelineClickRef.current = true;
    }

    timelineRef.current.scrollLeft = dragStartScrollLeftRef.current - deltaX;
  };

  const handleTimelineMouseUpOrLeave = () => {
    isDraggingTimelineRef.current = false;
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(to_bottom_right,#3b577e,#539974)] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-12 pt-8 sm:px-6">
        <header className="mt-6 rounded-[2rem] bg-transparent p-5">
          <div className="flex items-center gap-4">
            <Link
              href="/plan"
              aria-label="Back to plan"
              className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-transparent text-white transition hover:text-emerald-200"
            >
              <ChevronLeft size={32} />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
                {plan.macrocycleTitle}
              </h1>
              <p className="mt-3 text-sm font-medium text-slate-200/90 sm:text-base">
                {formatDateRange(plan.macrocycleStartDate, plan.macrocycleEndDate)}
              </p>
            </div>
          </div>
        </header>

        <section className="mt-6 w-full p-5 -mx-4 sm:-mx-6">
          <div
            ref={timelineRef}
            onMouseDown={handleTimelineMouseDown}
            onMouseMove={handleTimelineMouseMove}
            onMouseUp={handleTimelineMouseUpOrLeave}
            onMouseLeave={handleTimelineMouseUpOrLeave}
            className="mt-3 flex cursor-grab select-none items-center overflow-x-auto pb-2 active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="relative flex w-max items-center px-2">
              <div className="pointer-events-none absolute left-2 right-2 top-1/2 h-2 -translate-y-1/2 bg-slate-300/80" />
              {plan.mesocycles.map((mesocycle, index) => {
                const isSelected = mesocycle.id === currentMesocycle.id;
                const showLabelAbove = index % 2 === 0;

                return (
                  <div key={mesocycle.id} className="relative z-10 flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (suppressTimelineClickRef.current) {
                          suppressTimelineClickRef.current = false;
                          return;
                        }
                        setSelectedMesocycleId(mesocycle.id);
                      }}
                      className="relative flex h-24 w-[120px] items-center justify-center"
                    >
                      {showLabelAbove && (
                        <span
                          className="absolute top-0 flex max-w-[110px] flex-col items-center text-center text-white"
                        >
                          <span className="text-[10px] font-black uppercase tracking-[0.14em]">{`Block ${index + 1}`}</span>
                          <span className="mt-0.5 max-w-[110px] truncate text-[10px] font-semibold uppercase tracking-[0.1em]">
                            {mesocycle.title}
                          </span>
                        </span>
                      )}

                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-black uppercase tracking-tight transition ${
                          isSelected
                            ? 'border-[#3E8A68] bg-[#549c76] text-white'
                            : 'border-slate-500 bg-white text-slate-700'
                        }`}
                      >
                        {index + 1}
                      </span>

                      {!showLabelAbove && (
                        <span
                          className="absolute bottom-0 flex max-w-[110px] flex-col items-center text-center text-white"
                        >
                          <span className="text-[10px] font-black uppercase tracking-[0.14em]">{`Block ${index + 1}`}</span>
                          <span className="mt-0.5 max-w-[110px] truncate text-[10px] font-semibold uppercase tracking-[0.1em]">
                            {mesocycle.title}
                          </span>
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-6 w-full rounded-[2rem] bg-[#c4ced6] p-5 -mx-4 sm:-mx-6">
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-slate-900">
            {currentMesocycle.title}
          </h2>

          <div className="mt-6 space-y-3">
            {currentMesocycle.microcycleIds.map((microcycleId, index) => {
              const microcycle = plan.microcyclesById[microcycleId];
              if (!microcycle) return null;

              const workoutCount = parseScheduledWorkouts(microcycle.scheduled_workouts).length;

              return (
                <div key={microcycle.id} className="flex items-center gap-4">
                  <div className="min-w-[120px] text-xs font-black uppercase tracking-[0.16em] text-slate-600">
                    {formatDateRange(microcycle.start_date, microcycle.end_date)}
                  </div>

                  <Link
                    href={`/plan/microcycle?microcycleId=${microcycle.id}`}
                    className="group min-w-0 flex-1 rounded-[1.75rem] border border-slate-400/40 bg-white/75 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.12)] transition hover:-translate-y-0.5 hover:border-[#3E8A68]/50 hover:bg-white"
                  >
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
                      Week {microcycle.week_number} · Microcycle {index + 1}
                    </div>
                    <p className="mt-1 text-sm text-slate-700">
                      {microcycle.is_recovery_week ? 'Recovery week' : 'Training week'} · {workoutCount} workout(s)
                    </p>
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
