'use client';

import Link from 'next/link';
import { Activity, Bike, ChevronLeft, Waves } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../supabase';

type SportType = 'RUN' | 'CYCLE' | 'SWIM';

type ScheduledWorkoutEntry = {
  dayNumber: number;
  workoutId: string;
  notes?: string;
};

interface MesocycleBlock {
  id: string;
  name: string;
  isCurrent: boolean;
}

interface MacrocyclePlan {
  title: string;
  mesocycles: MesocycleBlock[];
}

interface MicrocycleBlock {
  id: string;
  weekNumber: number;
  isCurrentDate: boolean;
}

interface Microcycle {
  id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  isRecoveryWeek: boolean;
}

interface WorkoutTemplate {
  id: string;
  title: string;
  sport: SportType;
  targetDurationMinutes: number;
  targetDistanceKm: number | null;
  targetRpe: number | null;
  workoutType: string | null;
}

interface PlannedWorkout {
  id: string;
  dayNumber: number;
  plannedDate: string;
  title: string;
  sport: SportType;
  targetDurationMinutes: number;
  targetDistanceKm: number | null;
  targetRpe: number | null;
  workoutType: string | null;
  notes: string | null;
}

type MesocycleRow = {
  id: string;
  title: string;
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

type MacrocycleRow = {
  id: string;
  title: string;
  mesocycle_ids: string[] | null;
  start_date: string;
  end_date: string;
};

type WorkoutTemplateRow = {
  id: string;
  title: string;
  sport: SportType;
  target_duration_minutes: number;
  target_distance_km: number | null;
  target_rpe: number | null;
  workout_type: string | null;
};

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  return `${fmt.format(start)}-${fmt.format(end)}`;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDaysInRange(startDate: string, endDate: string) {
  const days: Array<{ key: string; date: Date }> = [];
  const current = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (current <= end) {
    days.push({
      key: toDateKey(current),
      date: new Date(current),
    });
    current.setDate(current.getDate() + 1);
  }

  return days;
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

function buildScheduledDate(startDate: string, dayNumber: number): string {
  const date = new Date(`${startDate}T00:00:00`);
  date.setDate(date.getDate() + dayNumber - 1);
  return toDateKey(date);
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
  const [scheduledByMicrocycle, setScheduledByMicrocycle] = useState<Record<string, ScheduledWorkoutEntry[]>>({});
  const [workoutTemplateById, setWorkoutTemplateById] = useState<Record<string, WorkoutTemplate>>({});
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
        .select('id, title, microcycle_ids')
        .in('id', mesocycleIds);

      if (mesocycleError) {
        setErrorMsg(`Failed to load mesocycles: ${mesocycleError.message}`);
        setLoading(false);
        return;
      }

      const mesocycleLookup = new Map<string, MesocycleRow>(((mesocycleRows || []) as MesocycleRow[]).map((row) => [row.id, row]));
      const orderedMesocycles = mesocycleIds
        .map((id) => mesocycleLookup.get(id))
        .filter((row): row is MesocycleRow => Boolean(row));

      if (orderedMesocycles.length === 0) {
        setErrorMsg('No linked mesocycle records could be loaded for this macrocycle.');
        setLoading(false);
        return;
      }

      const allMicrocycleIds = Array.from(
        new Set(orderedMesocycles.flatMap((mesocycle) => mesocycle.microcycle_ids || [])),
      );

      if (allMicrocycleIds.length === 0) {
        setErrorMsg('No microcycles found in this macrocycle hierarchy.');
        setLoading(false);
        return;
      }

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
        if (!row) return false;
        const start = new Date(`${row.start_date}T00:00:00`);
        const end = new Date(`${row.end_date}T23:59:59`);
        return today >= start && today <= end;
      }) || allMicrocycleIds[0];

      const activeMesocycleId =
        orderedMesocycles.find((mesocycle) => (mesocycle.microcycle_ids || []).includes(activeMicrocycleId))?.id ||
        orderedMesocycles[0].id;

      const activeMesocycle = orderedMesocycles.find((mesocycle) => mesocycle.id === activeMesocycleId);
      const activeMesocycleMicrocycleIds = activeMesocycle?.microcycle_ids || [];

      const mappedMicrocycles: Microcycle[] = activeMesocycleMicrocycleIds
        .map((microcycleId) => microcycleLookup.get(microcycleId))
        .filter((row): row is MicrocycleRow => Boolean(row))
        .map((row) => ({
          id: row.id,
          weekNumber: row.week_number,
          startDate: row.start_date,
          endDate: row.end_date,
          isRecoveryWeek: row.is_recovery_week ?? false,
        }));

      const microcycleBlocks: MicrocycleBlock[] = mappedMicrocycles.map((microcycle) => ({
        id: microcycle.id,
        weekNumber: microcycle.weekNumber,
        isCurrentDate: microcycle.id === activeMicrocycleId,
      }));

      const scheduledMap: Record<string, ScheduledWorkoutEntry[]> = {};
      const workoutIds = new Set<string>();

      activeMesocycleMicrocycleIds.forEach((microcycleId) => {
        const row = microcycleLookup.get(microcycleId);
        const entries = parseScheduledWorkouts(row?.scheduled_workouts);
        scheduledMap[microcycleId] = entries;
        entries.forEach((entry) => workoutIds.add(entry.workoutId));
      });

      let templateMap: Record<string, WorkoutTemplate> = {};
      const workoutIdsList = Array.from(workoutIds);

      if (workoutIdsList.length > 0) {
        const { data: workoutTemplateRows, error: workoutTemplateError } = await supabase
          .from('planned_workouts')
          .select('id, title, sport, target_duration_minutes, target_distance_km, target_rpe, workout_type')
          .in('id', workoutIdsList);

        if (workoutTemplateError) {
          setErrorMsg(`Failed to load workout templates: ${workoutTemplateError.message}`);
          setLoading(false);
          return;
        }

        ((workoutTemplateRows || []) as WorkoutTemplateRow[]).forEach((row) => {
          templateMap[row.id] = {
            id: row.id,
            title: row.title,
            sport: row.sport,
            targetDurationMinutes: row.target_duration_minutes,
            targetDistanceKm: row.target_distance_km,
            targetRpe: row.target_rpe,
            workoutType: row.workout_type,
          };
        });
      }

      setMacrocyclePlan({
        title: activeMacrocycle.title || 'TRAINING PLAN',
        mesocycles: orderedMesocycles.map((row) => ({
          id: row.id,
          name: row.title,
          isCurrent: row.id === activeMesocycleId,
        })),
      });
      setMicrocyclePlan(microcycleBlocks);
      setMicrocycles(mappedMicrocycles);
      setScheduledByMicrocycle(scheduledMap);
      setWorkoutTemplateById(templateMap);
      setCurrentMicrocycleId(activeMicrocycleId || mappedMicrocycles[0]?.id || null);
      setLoading(false);
    }

    fetchData();
  }, []);

  const currentMicrocycle = useMemo(() => {
    if (microcycles.length === 0) return null;
    return microcycles.find((m) => m.id === currentMicrocycleId) || microcycles[0];
  }, [currentMicrocycleId, microcycles]);

  const plannedWorkouts = useMemo(() => {
    if (!currentMicrocycle) return [] as PlannedWorkout[];
    const scheduledEntries = scheduledByMicrocycle[currentMicrocycle.id] || [];

    return scheduledEntries
      .map((entry) => {
        const template = workoutTemplateById[entry.workoutId];
        if (!template) return null;

        return {
          id: template.id,
          dayNumber: entry.dayNumber,
          plannedDate: buildScheduledDate(currentMicrocycle.startDate, entry.dayNumber),
          title: template.title,
          sport: template.sport,
          targetDurationMinutes: template.targetDurationMinutes,
          targetDistanceKm: template.targetDistanceKm,
          targetRpe: template.targetRpe,
          workoutType: template.workoutType,
          notes: entry.notes || null,
        } satisfies PlannedWorkout;
      })
      .filter((workout): workout is PlannedWorkout => Boolean(workout))
      .sort((a, b) => a.dayNumber - b.dayNumber);
  }, [currentMicrocycle, scheduledByMicrocycle, workoutTemplateById]);

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

  const fallbackSportStyles = getSportStyles('CYCLE');
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
        <header className="rounded-[2rem] border border-slate-300/40 bg-transparent p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
          <div className="flex items-start gap-4">
            <Link
              href="/plan"
              aria-label="Back to plan"
              className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-transparent text-white transition hover:border-emerald-300 hover:text-emerald-200"
            >
              <ChevronLeft size={18} />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white">
                {macrocyclePlan.title}
              </p>
              <p className="mt-2 text-sm font-medium uppercase tracking-[0.12em] text-white">
                {`Mesocycle ${currentMesocycleNumber} | ${currentMesocycleName}`}
              </p>
            </div>
          </div>
        </header>

        <section className="mt-6 rounded-[2rem] border border-slate-300/40 bg-transparent p-5">
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
                    className={`relative flex w-10 flex-col items-center text-center ${isSelected ? 'z-20' : 'z-10'}`}
                    aria-label={`Select microcycle week ${block.weekNumber}`}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-black uppercase tracking-tight transition ${
                        isCurrentDate
                          ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                          : 'border-white/70 bg-transparent text-white'
                      } ${isSelected ? 'border-emerald-200 shadow-[inset_0_0_0_2px_rgba(110,231,183,0.95)]' : ''}`}
                    >
                      {block.weekNumber}
                    </div>
                    <p className={`mt-3 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.18em] ${isSelected ? 'text-emerald-200' : 'text-white'}`}>
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
              {currentMicrocycle
                ? formatDateRange(currentMicrocycle.startDate, currentMicrocycle.endDate)
                : 'No scheduled dates'}
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
                plannedWorkout?.notes,
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
                      isWorkoutPlanned ? workoutStyles?.cardClass || fallbackSportStyles.cardClass : 'border-transparent bg-transparent shadow-none'
                    }`}
                  >
                    {isWorkoutPlanned ? (
                      <div className="flex w-full flex-col justify-between gap-4 sm:flex-row sm:items-start">
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black/15">
                              {workoutStyles?.icon || fallbackSportStyles.icon}
                            </div>
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-200/90">
                                {workoutStyles?.label || fallbackSportStyles.label}
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
                      <div className={`flex w-full items-center justify-center rounded-[1.75rem] border p-4 ${fallbackSportStyles.cardClass}`}>
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
