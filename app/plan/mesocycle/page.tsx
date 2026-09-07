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
  target_volume_hours: number | null;
  average_intensity: number | null;
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

function formatShortDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(parsed);
}

function parseDateOnly(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
}

function dayDiffInclusive(start: Date, end: Date): number {
  const oneDayMs = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / oneDayMs) + 1;
}

function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function normalizeIntensity(value: number | null): number {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) return 0;
  if (value <= 1) return value;
  if (value <= 10) return Math.min(value / 10, 1);
  return Math.min(value / 100, 1);
}

function buildMonotoneSplinePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const n = points.length;
  const d: number[] = [];
  const m: number[] = new Array(n).fill(0);

  for (let i = 0; i < n - 1; i += 1) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    d.push(dx === 0 ? 0 : dy / dx);
  }

  m[0] = d[0];
  m[n - 1] = d[n - 2];

  for (let i = 1; i < n - 1; i += 1) {
    m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  }

  for (let i = 0; i < n - 1; i += 1) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }

    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const sum = a * a + b * b;

    if (sum > 9) {
      const t = 3 / Math.sqrt(sum);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < n - 1; i += 1) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const h = p1.x - p0.x;
    const c1x = p0.x + h / 3;
    const c1y = p0.y + (m[i] * h) / 3;
    const c2x = p1.x - h / 3;
    const c2y = p1.y - (m[i + 1] * h) / 3;
    path += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p1.x} ${p1.y}`;
  }

  return path;
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
  const [hoveredGraphIndex, setHoveredGraphIndex] = useState<number | null>(null);
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
        .select('id, week_number, start_date, end_date, length_days, target_volume_hours, average_intensity, scheduled_workouts, is_recovery_week')
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

  const timelineData = useMemo(() => {
    if (!plan || plan.mesocycles.length === 0) return null;

    const pxPerDay = 6;
    const axisInsetPx = 4;
    const adjacentGapPx = 4;
    const oneDayMs = 24 * 60 * 60 * 1000;
    const sortedMesocycles = [...plan.mesocycles].sort(
      (a, b) => parseDateOnly(a.startDate).getTime() - parseDateOnly(b.startDate).getTime(),
    );

    const timelineStart = parseDateOnly(sortedMesocycles[0].startDate);
    const timelineEnd = parseDateOnly(sortedMesocycles[sortedMesocycles.length - 1].endDate);
    const totalDays = dayDiffInclusive(timelineStart, timelineEnd);
    const totalWidth = totalDays * pxPerDay + axisInsetPx * 2;
    const today = new Date();
    const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

    const months: Array<{
      key: string;
      label: string;
      left: number;
      width: number;
    }> = [];

    let cursor = new Date(Date.UTC(timelineStart.getUTCFullYear(), timelineStart.getUTCMonth(), 1));
    while (cursor.getTime() <= timelineEnd.getTime()) {
      const monthStart = cursor.getTime() < timelineStart.getTime() ? timelineStart : cursor;
      const rawMonthEnd = endOfMonth(cursor);
      const monthEnd = rawMonthEnd.getTime() > timelineEnd.getTime() ? timelineEnd : rawMonthEnd;
      const offsetDays = dayDiffInclusive(timelineStart, monthStart) - 1;
      const monthDays = dayDiffInclusive(monthStart, monthEnd);

      months.push({
        key: `${cursor.getUTCFullYear()}-${cursor.getUTCMonth() + 1}`,
        label: new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(cursor),
        left: offsetDays * pxPerDay + axisInsetPx,
        width: monthDays * pxPerDay,
      });

      cursor = addMonths(cursor, 1);
    }

    const blocks = sortedMesocycles.map((mesocycle, index) => {
      const start = parseDateOnly(mesocycle.startDate);
      const end = parseDateOnly(mesocycle.endDate);
      const nextMesocycle = sortedMesocycles[index + 1];
      const nextStart = nextMesocycle ? parseDateOnly(nextMesocycle.startDate) : null;
      const leftDays = dayDiffInclusive(timelineStart, start) - 1;
      const durationDays = dayDiffInclusive(start, end);
      const isBackToBack = nextStart ? nextStart.getTime() - end.getTime() === oneDayMs : false;
      const visualWidth = Math.max(durationDays * pxPerDay - (isBackToBack ? adjacentGapPx : 0), 12);
      const isCompleted = end.getTime() < todayUtc.getTime();
      const isCurrent = start.getTime() <= todayUtc.getTime() && end.getTime() >= todayUtc.getTime();

      return {
        ...mesocycle,
        number: index + 1,
        left: leftDays * pxPerDay + axisInsetPx,
        width: visualWidth,
        durationDays,
        isCompleted,
        isCurrent,
      };
    });

    return {
      totalWidth,
      months,
      blocks,
    };
  }, [plan]);

  const microcycleGraphData = useMemo(() => {
    if (!plan || !currentMesocycle) return null;

    const points = currentMesocycle.microcycleIds
      .map((microcycleId, index) => {
        const microcycle = plan.microcyclesById[microcycleId];
        if (!microcycle) return null;

        const volume = typeof microcycle.target_volume_hours === 'number' ? microcycle.target_volume_hours : 0;
        const averageIntensity = normalizeIntensity(microcycle.average_intensity);

        return {
          id: microcycle.id,
          label: `M${index + 1}`,
          week: microcycle.week_number,
          volume,
          averageIntensity,
          averageIntensityRaw: microcycle.average_intensity,
        };
      })
      .filter(
        (
          entry,
        ): entry is {
          id: string;
          label: string;
          week: number;
          volume: number;
          averageIntensity: number;
          averageIntensityRaw: number | null;
        } => Boolean(entry),
      );

    if (points.length === 0) return null;

    const volumeValues = points.map((point) => point.volume);
    const intensityValues = points.map((point) => point.averageIntensity);
    const maxVolume = Math.max(...volumeValues, 1);
    const minVolume = Math.min(...volumeValues);
    const avgVolume = volumeValues.reduce((sum, value) => sum + value, 0) / volumeValues.length;
    const maxIntensity = Math.max(...intensityValues, 0);
    const minIntensity = Math.min(...intensityValues);
    const avgIntensity = intensityValues.reduce((sum, value) => sum + value, 0) / intensityValues.length;
    const chartWidth = Math.max(360, points.length * 90);
    const leftPad = 48;
    const rightPad = 52;
    const xStep = (chartWidth - leftPad - rightPad) / points.length;
    const yBase = 158;
    const chartHeight = 120;

    const plotPoints = points.map((point, index) => {
      const x = leftPad + index * xStep + xStep * 0.38;
      const yVolume = yBase - (point.volume / maxVolume) * chartHeight;
      const yAverageIntensity = yBase - point.averageIntensity * chartHeight;

      return {
        ...point,
        x,
        yVolume,
        yAverageIntensity,
      };
    });

    const volumeSplinePath = buildMonotoneSplinePath(
      plotPoints.map((point) => ({
        x: point.x,
        y: point.yVolume,
      })),
    );

    const averageIntensitySplinePath = buildMonotoneSplinePath(
      plotPoints.map((point) => ({
        x: point.x,
        y: point.yAverageIntensity,
      })),
    );

    return {
      points: plotPoints,
      maxVolume,
      minVolume,
      avgVolume,
      maxIntensity,
      minIntensity,
      avgIntensity,
      chartWidth,
      leftPad,
      rightPad,
      xStep,
      yBase,
      chartHeight,
      volumeSplinePath,
      averageIntensitySplinePath,
    };
  }, [plan, currentMesocycle]);

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
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col">
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
            className="mt-3 cursor-grab select-none overflow-x-auto pb-2 active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="relative" style={{ width: `${timelineData?.totalWidth || 0}px`, minHeight: '220px' }}>
              {timelineData && (
                <>
                  <div className="absolute left-0 right-0 top-0 h-12 border-b border-slate-200/60">
                    {timelineData.months.map((month) => (
                      <div
                        key={month.key}
                        className="absolute top-0 h-12 border-r border-slate-200/50"
                        style={{ left: `${month.left}px`, width: `${month.width}px` }}
                      >
                        <span className="absolute left-2 top-2 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.16em] text-slate-100/90">
                          {month.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="absolute left-0 right-0 top-16 h-40">
                    {timelineData.blocks.map((block) => {
                      const isSelected = block.id === currentMesocycle.id;

                      return (
                        <button
                          key={block.id}
                          type="button"
                          onClick={() => {
                            if (suppressTimelineClickRef.current) {
                              suppressTimelineClickRef.current = false;
                              return;
                            }
                            setSelectedMesocycleId(block.id);
                          }}
                          className={`absolute top-0 h-36 rounded-lg border p-3 text-left shadow transition ${
                            isSelected
                              ? 'z-20 border-[#9CC2AE] bg-[#5A747F] text-[#F4FBF7] ring-2 ring-[#A9D0BC]/80'
                              : block.isCompleted
                                ? 'z-10 border-[#7E95A3] bg-[#4A6070] text-[#F1F6FA]'
                                : block.isCurrent
                                  ? 'z-10 border-[#8DB0C6] bg-[#5E7F92] text-[#F4FAFD]'
                                  : 'z-10 border-[#7A95A6] bg-[linear-gradient(135deg,#6B848F,#566D78)] text-[#F2F8FB]'
                          }`}
                          style={{ left: `${block.left}px`, width: `${block.width}px` }}
                        >
                          <p className="text-[10px] font-black uppercase tracking-[0.16em]">
                            Mesocycle {block.number}
                          </p>
                          <p className="mt-1 truncate text-sm font-bold uppercase tracking-tight">{block.title}</p>
                          <p className="mt-2 text-[11px] font-semibold">
                            {formatShortDate(block.startDate)} - {formatShortDate(block.endDate)}
                          </p>
                          <p className="mt-1 text-[11px] font-semibold">
                            Duration: {block.durationDays} day{block.durationDays === 1 ? '' : 's'}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {microcycleGraphData && (
          <section className="mt-2 w-full rounded-[1.5rem] bg-[#c4ced6]/90 p-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-800">Microcycle Load Graph</h3>
            </div>

            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <svg
                  width="100%"
                  height={260}
                  viewBox={`0 0 ${microcycleGraphData.chartWidth} 260`}
                  className="block w-full"
                  role="img"
                  aria-label="Microcycle volume and average intensity chart"
                  onMouseLeave={() => setHoveredGraphIndex(null)}
                >
                <line
                  x1={microcycleGraphData.leftPad}
                  y1={microcycleGraphData.yBase - microcycleGraphData.chartHeight}
                  x2={microcycleGraphData.leftPad}
                  y2={microcycleGraphData.yBase}
                  stroke="#455A66"
                  strokeWidth="1.5"
                />

                <line
                  x1={microcycleGraphData.chartWidth - microcycleGraphData.rightPad}
                  y1={microcycleGraphData.yBase - microcycleGraphData.chartHeight}
                  x2={microcycleGraphData.chartWidth - microcycleGraphData.rightPad}
                  y2={microcycleGraphData.yBase}
                  stroke="#6C6454"
                  strokeWidth="1.5"
                />

                {[
                  { key: 'max', label: `Max ${microcycleGraphData.maxVolume.toFixed(1)}`, value: microcycleGraphData.maxVolume },
                  { key: 'avg', label: `Avg ${microcycleGraphData.avgVolume.toFixed(1)}`, value: microcycleGraphData.avgVolume },
                  { key: 'min', label: `Min ${microcycleGraphData.minVolume.toFixed(1)}`, value: microcycleGraphData.minVolume },
                ].map((tick) => {
                  const y =
                    microcycleGraphData.yBase -
                    (tick.value / Math.max(microcycleGraphData.maxVolume, 1)) * microcycleGraphData.chartHeight;

                  return (
                    <g key={`left-${tick.key}`}>
                      <line
                        x1={microcycleGraphData.leftPad - 5}
                        y1={y}
                        x2={microcycleGraphData.leftPad}
                        y2={y}
                        stroke="#455A66"
                        strokeWidth="1"
                      />
                      <text
                        x={microcycleGraphData.leftPad - 8}
                        y={y + 3}
                        textAnchor="end"
                        fontSize="9"
                        fontWeight="700"
                        fill="#2F4653"
                      >
                        {tick.label}
                      </text>
                    </g>
                  );
                })}

                {[
                  { key: 'max', label: `Max ${(microcycleGraphData.maxIntensity * 100).toFixed(0)}%`, value: microcycleGraphData.maxIntensity },
                  { key: 'avg', label: `Avg ${(microcycleGraphData.avgIntensity * 100).toFixed(0)}%`, value: microcycleGraphData.avgIntensity },
                  { key: 'min', label: `Min ${(microcycleGraphData.minIntensity * 100).toFixed(0)}%`, value: microcycleGraphData.minIntensity },
                ].map((tick) => {
                  const y = microcycleGraphData.yBase - tick.value * microcycleGraphData.chartHeight;

                  return (
                    <g key={`right-${tick.key}`}>
                      <line
                        x1={microcycleGraphData.chartWidth - microcycleGraphData.rightPad}
                        y1={y}
                        x2={microcycleGraphData.chartWidth - microcycleGraphData.rightPad + 5}
                        y2={y}
                        stroke="#6C6454"
                        strokeWidth="1"
                      />
                      <text
                        x={microcycleGraphData.chartWidth - microcycleGraphData.rightPad + 8}
                        y={y + 3}
                        textAnchor="start"
                        fontSize="9"
                        fontWeight="700"
                        fill="#6D5131"
                      >
                        {tick.label}
                      </text>
                    </g>
                  );
                })}

                {microcycleGraphData.points.map((point) => {
                  return (
                    <g key={point.id}>
                      <text
                        x={point.x}
                        y={188}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="800"
                        fill="#24313A"
                      >
                        {point.label}
                      </text>
                    </g>
                  );
                })}

                {microcycleGraphData.points.map((point, index) => (
                  <rect
                    key={`${point.id}-hover-zone`}
                    x={point.x - microcycleGraphData.xStep / 2}
                    y={18}
                    width={microcycleGraphData.xStep}
                    height={145}
                    fill="transparent"
                    style={{ cursor: 'crosshair' }}
                    onMouseEnter={() => setHoveredGraphIndex(index)}
                    onMouseMove={() => setHoveredGraphIndex(index)}
                  />
                ))}

                <path
                  d={microcycleGraphData.volumeSplinePath}
                  fill="none"
                  stroke="#2E4B59"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d={microcycleGraphData.averageIntensitySplinePath}
                  fill="none"
                  stroke="#E9A857"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="6 5"
                />

                {hoveredGraphIndex !== null && microcycleGraphData.points[hoveredGraphIndex] && (() => {
                  const hoveredPoint = microcycleGraphData.points[hoveredGraphIndex];
                  const tooltipWidth = 170;
                  const tooltipHeight = 52;
                  const tooltipY = 198;
                  const tooltipX = Math.max(
                    8,
                    Math.min(hoveredPoint.x - tooltipWidth / 2, microcycleGraphData.chartWidth - tooltipWidth - 8),
                  );
                  const volumeLabel = `${hoveredPoint.volume.toFixed(1)} h`;
                  const avgLabel = `${(hoveredPoint.averageIntensity * 100).toFixed(0)}%`;

                  return (
                    <g>
                      <line
                        x1={hoveredPoint.x}
                        y1={24}
                        x2={hoveredPoint.x}
                        y2={microcycleGraphData.yBase}
                        stroke="#344956"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                      />
                      <circle cx={hoveredPoint.x} cy={hoveredPoint.yVolume} r={4} fill="#2E4B59" />
                      <circle cx={hoveredPoint.x} cy={hoveredPoint.yAverageIntensity} r={4} fill="#E9A857" />
                      <rect
                        x={tooltipX}
                        y={tooltipY}
                        width={tooltipWidth}
                        height={tooltipHeight}
                        rx={8}
                        fill="#19232B"
                        fillOpacity="0.94"
                        stroke="#8AA2B3"
                        strokeWidth="1"
                      />
                      <text x={tooltipX + 10} y={tooltipY + 20} fontSize="11" fontWeight="700" fill="#E2EFF7">
                        {`Volume: ${volumeLabel}`}
                      </text>
                      <text x={tooltipX + 10} y={tooltipY + 36} fontSize="11" fontWeight="700" fill="#FFE1BA">
                        {`Avg Intensity: ${avgLabel}`}
                      </text>
                    </g>
                  );
                })()}
                </svg>
              </div>

              <div className="flex shrink-0 flex-row flex-wrap items-center justify-center gap-4 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700 lg:min-w-[170px] lg:flex-col lg:items-start lg:justify-start lg:gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-5 bg-[#2E4B59]" />Volume
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-5 bg-[#E9A857]" />Avg Intensity
                </span>
              </div>
            </div>
          </section>
        )}

        <section className="mt-6 w-full rounded-[2rem] bg-[#c4ced6] p-5">
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-slate-900">
            {currentMesocycle.title}
          </h2>

          <div className="mt-6 space-y-3">
            {currentMesocycle.microcycleIds.map((microcycleId, index) => {
              const microcycle = plan.microcyclesById[microcycleId];
              if (!microcycle) return null;

              const workoutCount = parseScheduledWorkouts(microcycle.scheduled_workouts).length;

              return (
                <div key={microcycle.id} className="grid grid-cols-[120px_minmax(0,1fr)] items-stretch gap-4">
                  <div className="flex h-[92px] flex-col justify-center text-xs font-black uppercase tracking-[0.16em] text-slate-600">
                    <p className="leading-none">{formatShortDate(microcycle.start_date)}</p>
                    <p className="mt-2 leading-none">{formatShortDate(microcycle.end_date)}</p>
                  </div>

                  <Link
                    href={`/plan/microcycle?microcycleId=${microcycle.id}`}
                    className="group flex h-[92px] min-w-0 flex-col justify-center rounded-[1.75rem] border border-slate-400/40 bg-white/75 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.12)] transition hover:-translate-y-0.5 hover:border-[#3E8A68]/50 hover:bg-white"
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
