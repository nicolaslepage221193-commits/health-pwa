'use client';

import Link from 'next/link';
import { Activity, Bike, ChevronLeft, Plus, Waves } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
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

interface MicrocycleBlock {
  id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  isCurrentDate: boolean;
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

interface PlannedWorkout {
  id: string;
  plannedDate: string;
  title: string;
  sport: SportType;
  targetDurationMinutes: number;
  targetDistanceKm: number | null;
  targetRpe: number | null;
  workoutType: string | null;
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

type PlannedWorkoutRow = {
  id: string;
  microcycle_id: string;
  scheduled_date: string;
  title: string;
  sport: SportType;
  target_duration_minutes: number;
  target_distance_km: number | null;
  target_rpe: number | null;
  workout_type: string | null;
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

function getDaysInRange(startDate: string, endDate: string) {
  const days: Array<{ key: string; date: Date }> = [];
  const current = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (current <= end) {
    days.push({
      key: current.toISOString().split('T')[0],
      date: new Date(current),
    });
    current.setDate(current.getDate() + 1);
  }

  return days;
}

function getSportStyles(sport: SportType) {
  switch (sport) {
    case 'RUN':
      return {
        cardClass: 'bg-[#549c76]/85 border-[#549c76]/70',
        icon: <Activity size={18} className="text-slate-100" />,
        label: 'RUN',
      };
    case 'SWIM':
      return {
        cardClass: 'bg-[#549c76]/85 border-[#549c76]/70',
        icon: <Waves size={18} className="text-slate-100" />,
        label: 'SWIM',
      };
    default:
      return {
        cardClass: 'bg-[#549c76]/85 border-[#549c76]/70',
        icon: <Bike size={18} className="text-slate-100" />,
        label: 'CYCLE',
      };
  }
}

export default function MicrocyclePage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [macrocyclePlan, setMacrocyclePlan] = useState<MacrocyclePlan | null>(null);
  const [microcyclePlan, setMicrocyclePlan] = useState<MicrocycleBlock[]>([]);
  const [microcycles, setMicrocycles] = useState<Microcycle[]>([]);
  const [plannedWorkouts, setPlannedWorkouts] = useState<PlannedWorkout[]>([]);
  const [currentMicrocycleId, setCurrentMicrocycleId] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const isDraggingTimelineRef = useRef(false);
  const suppressTimelineClickRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);

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

      const microcycleBlocks: MicrocycleBlock[] = mappedMicrocycles.map((microcycle) => ({
        id: microcycle.id,
        weekNumber: microcycle.weekNumber,
        startDate: microcycle.startDate,
        endDate: microcycle.endDate,
        isCurrentDate: microcycle.id === activeMicrocycleEntry.row.id,
      }));

      setMacrocyclePlan(plan);
      setMicrocyclePlan(microcycleBlocks);
      setMicrocycles(mappedMicrocycles);
      setCurrentMicrocycleId(activeMicrocycleEntry.row.id || mappedMicrocycles[0]?.id || null);
      setLoading(false);
    }

    fetchData();
  }, []);

  useEffect(() => {
    async function fetchPlannedWorkoutsForSelectedMicrocycle() {
      if (!supabase || !currentMicrocycleId) {
        setPlannedWorkouts([]);
        return;
      }

      const { data: plannedWorkoutRows, error: plannedWorkoutError } = await supabase
        .from('planned_workouts')
        .select('id, microcycle_id, scheduled_date, title, sport, target_duration_minutes, target_distance_km, target_rpe, workout_type')
        .eq('microcycle_id', currentMicrocycleId)
        .order('scheduled_date', { ascending: true });

      if (plannedWorkoutError) {
        setErrorMsg(`Failed to load planned workouts: ${plannedWorkoutError.message}`);
        setPlannedWorkouts([]);
        return;
      }

      const normalizedPlannedWorkouts: PlannedWorkout[] = ((plannedWorkoutRows || []) as PlannedWorkoutRow[]).map((row) => ({
        id: row.id,
        plannedDate: row.scheduled_date,
        title: row.title,
        sport: row.sport,
        targetDurationMinutes: row.target_duration_minutes,
        targetDistanceKm: row.target_distance_km,
        targetRpe: row.target_rpe,
        workoutType: row.workout_type,
      }));

      setPlannedWorkouts(normalizedPlannedWorkouts);
    }

    fetchPlannedWorkoutsForSelectedMicrocycle();
  }, [currentMicrocycleId]);

  const activeMesocycleIndex = useMemo(() => {
    if (!macrocyclePlan) return -1;
    return macrocyclePlan.mesocycles.findIndex((block) => block.isCurrent);
  }, [macrocyclePlan]);

  const currentMicrocycle = useMemo(() => {
    if (microcycles.length === 0) return null;
    return microcycles.find((m) => m.id === currentMicrocycleId) || microcycles[0];
  }, [currentMicrocycleId, microcycles]);

  const currentMicrocycleDays = useMemo(() => {
    if (!currentMicrocycle) return [];
    return getDaysInRange(currentMicrocycle.startDate, currentMicrocycle.endDate);
  }, [currentMicrocycle]);

  const plannedWorkoutByDate = useMemo(() => {
    const lookup = new Map<string, PlannedWorkout>();
    plannedWorkouts.forEach((workout) => {
      if (workout.title && !lookup.has(workout.plannedDate)) {
        lookup.set(workout.plannedDate, workout);
      }
    });
    return lookup;
  }, [plannedWorkouts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(to_bottom_right,#3b577e,#539974)] px-6 py-10 text-slate-300">
        <div className="mx-auto max-w-3xl animate-pulse rounded-3xl border border-slate-700/50 bg-slate-900/40 p-6">
          Loading microcycle data...
        </div>
      </div>
    );
  }

  if (errorMsg || !macrocyclePlan) {
    return (
      <div className="min-h-screen bg-[linear-gradient(to_bottom_right,#3b577e,#539974)] px-6 py-10 text-slate-300">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-800/50 bg-red-950/40 p-6">
          {errorMsg || 'Unable to load microcycle data.'}
        </div>
      </div>
    );
  }

  const sportStyles = getSportStyles(macrocyclePlan.primarySport);
  const currentMesocycleNumber =
    Math.max(0, macrocyclePlan.mesocycles.findIndex((block) => block.isCurrent)) + 1;
  const currentMesocycleName =
    macrocyclePlan.mesocycles.find((block) => block.isCurrent)?.name ||
    macrocyclePlan.mesocycles[0]?.name ||
    'Mesocycle';

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
          <div className="mb-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-300">
              {`Mesocycle ${currentMesocycleNumber} | ${currentMesocycleName}`}
            </p>
          </div>

          <div
            ref={timelineRef}
            onMouseDown={handleTimelineMouseDown}
            onMouseMove={handleTimelineMouseMove}
            onMouseUp={handleTimelineMouseUpOrLeave}
            onMouseLeave={handleTimelineMouseUpOrLeave}
            className="flex cursor-grab select-none items-start overflow-x-auto pb-2 active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {microcyclePlan.map((block, index) => {
              const isSelected = block.id === currentMicrocycleId;
              const isCurrentDate = block.isCurrentDate;

              return (
                <div key={block.id} className="flex shrink-0 items-start">
                  <button
                    type="button"
                    onClick={() => {
                      if (suppressTimelineClickRef.current) {
                        suppressTimelineClickRef.current = false;
                        return;
                      }
                      setCurrentMicrocycleId(block.id);
                    }}
                    className="relative z-10 flex w-10 flex-col items-center text-center"
                    aria-label={`Select microcycle week ${block.weekNumber}`}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-black uppercase tracking-tight transition ${
                        isCurrentDate
                          ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                          : 'border-slate-600 bg-slate-800/80 text-slate-400'
                      } ${isSelected ? 'ring-2 ring-emerald-300 ring-offset-2 ring-offset-slate-900' : ''}`}
                    >
                      {block.weekNumber}
                    </div>
                    <p className={`mt-3 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.18em] ${isSelected ? 'text-emerald-300' : 'text-slate-400'}`}>
                      Week {block.weekNumber}
                    </p>
                  </button>
                  {index < microcyclePlan.length - 1 && (
                    <div className="mt-4 h-[2px] w-12 shrink-0 bg-slate-600" />
                  )}
                </div>
              );
            })}
          </div>

        </section>

        <section className="mt-6 w-full rounded-[2rem] bg-[#c4ced6] p-5 -mx-4 sm:-mx-6">
          <div className="mb-4 px-1">
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 sm:text-3xl">
              {currentMicrocycle ? `Microcycle ${currentMicrocycle.weekNumber}` : 'Microcycles'}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {currentMicrocycle ? formatDateRange(currentMicrocycle.startDate, currentMicrocycle.endDate) : 'No weeks yet'}
            </p>
          </div>

          <div className="space-y-4">
            {!currentMicrocycle && (
              <div className="rounded-[1.75rem] border border-slate-700/60 bg-slate-900/30 p-6 text-sm text-slate-300">
                No microcycles found for this mesocycle.
              </div>
            )}

            {currentMicrocycle && currentMicrocycleDays.map((day) => {
              const plannedWorkout = plannedWorkoutByDate.get(day.key);
              const isWorkoutPlanned = Boolean(plannedWorkout?.title);
              const workoutName = plannedWorkout?.title || '';
              const workoutStyles = plannedWorkout ? getSportStyles(plannedWorkout.sport) : null;
              const workoutSummaryParts = [
                plannedWorkout?.workoutType,
                plannedWorkout ? `${plannedWorkout.targetDurationMinutes}m` : null,
                plannedWorkout?.targetDistanceKm ? `${plannedWorkout.targetDistanceKm} km` : null,
                plannedWorkout?.targetRpe ? `RPE ${plannedWorkout.targetRpe}` : null,
              ].filter(Boolean);

              return (
                <article
                  key={day.key}
                  className="grid min-h-[120px] grid-cols-[4.25rem_1fr] gap-3 items-stretch"
                >
                  <div className="flex h-full flex-col items-center justify-center rounded-[1.5rem] border border-transparent bg-transparent px-2 py-4 text-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.28em] text-black">
                      {new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(day.date)}
                    </span>
                    <span className="mt-1 text-2xl font-black tracking-tight text-black">{day.date.getDate()}</span>
                  </div>

                  <div
                    className={`flex h-full min-h-[120px] rounded-[1.75rem] border p-4 shadow-[0_14px_40px_rgba(0,0,0,0.18)] ${
                      isWorkoutPlanned ? workoutStyles?.cardClass || sportStyles.cardClass : 'border-transparent bg-transparent shadow-none'
                    }`}
                  >
                    {isWorkoutPlanned ? (
                      <div className="flex w-full flex-col justify-between gap-4 sm:flex-row sm:items-start">
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black/15">
                              {workoutStyles?.icon || sportStyles.icon}
                            </div>
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-200/90">
                                {workoutStyles?.label || sportStyles.label}
                              </p>
                              <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-white">
                                {workoutName}
                              </h2>
                              {workoutSummaryParts.length > 0 && (
                                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-100/80">
                                  {workoutSummaryParts.join(' • ')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className={`flex w-full items-center justify-center rounded-[1.75rem] border p-4 ${sportStyles.cardClass}`}>
                        <span className="text-base font-black uppercase tracking-[0.28em] text-slate-100">
                          Rest
                        </span>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
