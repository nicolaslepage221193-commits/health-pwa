'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  Bike,
  Calendar,
  ChevronRight,
  Dumbbell,
  Flame,
  Heart,
  Plus,
  Waves,
} from 'lucide-react';

type Sport = 'Run' | 'Cycle' | 'Swim';
type SessionStatus = 'PLANNED' | 'COMPLETED' | 'SKIPPED';
type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

interface MicrocycleMeta {
  weekRangeLabel: string;
  plannedHours: number;
  actualHours: number;
  runSummary: string;
  cycleSummary: string;
  swimSummary: string;
}

interface WeekDay {
  key: DayKey;
  label: string;
  shortLabel: string;
  dateLabel: string;
}

interface PlannedSession {
  id: string;
  dayKey: DayKey;
  sport: Sport;
  title: string;
  targetMetrics: string;
  status: SessionStatus;
  stravaSynced?: boolean;
}

const MICRO_META: MicrocycleMeta = {
  weekRangeLabel: 'Oct 18 - Oct 24',
  plannedHours: 8,
  actualHours: 3.2,
  runSummary: '3 sessions | 32 km',
  cycleSummary: '1 session | 45 km',
  swimSummary: '1 session | 1500m',
};

const WEEK_DAYS: WeekDay[] = [
  { key: 'mon', label: 'Monday', shortLabel: 'Mon', dateLabel: '18' },
  { key: 'tue', label: 'Tuesday', shortLabel: 'Tue', dateLabel: '19' },
  { key: 'wed', label: 'Wednesday', shortLabel: 'Wed', dateLabel: '20' },
  { key: 'thu', label: 'Thursday', shortLabel: 'Thu', dateLabel: '21' },
  { key: 'fri', label: 'Friday', shortLabel: 'Fri', dateLabel: '22' },
  { key: 'sat', label: 'Saturday', shortLabel: 'Sat', dateLabel: '23' },
  { key: 'sun', label: 'Sunday', shortLabel: 'Sun', dateLabel: '24' },
];

const PLANNED_SESSIONS: PlannedSession[] = [
  {
    id: 's1',
    dayKey: 'mon',
    sport: 'Run',
    title: 'Interval Run',
    targetMetrics: '60m | 4:30/km pace',
    status: 'COMPLETED',
    stravaSynced: true,
  },
  {
    id: 's2',
    dayKey: 'tue',
    sport: 'Swim',
    title: 'Technique + Recovery Swim',
    targetMetrics: '45m | 1500m total',
    status: 'PLANNED',
  },
  {
    id: 's3',
    dayKey: 'wed',
    sport: 'Cycle',
    title: 'Threshold Cycle',
    targetMetrics: '75m | Zone 4 blocks',
    status: 'PLANNED',
  },
  {
    id: 's4',
    dayKey: 'thu',
    sport: 'Run',
    title: 'Easy Aerobic Run',
    targetMetrics: '40m | Zone 2',
    status: 'SKIPPED',
  },
  {
    id: 's5',
    dayKey: 'fri',
    sport: 'Run',
    title: 'Tempo Run',
    targetMetrics: '55m | 4:45/km pace',
    status: 'PLANNED',
  },
  {
    id: 's6',
    dayKey: 'sat',
    sport: 'Cycle',
    title: 'Long Endurance Ride',
    targetMetrics: '120m | 45 km target',
    status: 'COMPLETED',
    stravaSynced: true,
  },
  {
    id: 's7',
    dayKey: 'sun',
    sport: 'Swim',
    title: 'Open Water Simulation',
    targetMetrics: '50m | 1800m controlled effort',
    status: 'PLANNED',
  },
];

const SPORT_STYLES: Record<
  Sport,
  {
    icon: React.ComponentType<{ className?: string; size?: number }>;
    iconColor: string;
    badgeClass: string;
  }
> = {
  Run: {
    icon: Activity,
    iconColor: 'text-cyan-300',
    badgeClass: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/40',
  },
  Cycle: {
    icon: Bike,
    iconColor: 'text-blue-300',
    badgeClass: 'bg-blue-500/15 text-blue-200 border-blue-400/40',
  },
  Swim: {
    icon: Waves,
    iconColor: 'text-teal-300',
    badgeClass: 'bg-teal-500/15 text-teal-200 border-teal-400/40',
  },
};

function getInitialDayKey(): DayKey {
  const day = new Date().getDay();
  const lookup: Record<number, DayKey> = {
    0: 'sun',
    1: 'mon',
    2: 'tue',
    3: 'wed',
    4: 'thu',
    5: 'fri',
    6: 'sat',
  };

  return lookup[day] ?? 'mon';
}

function WeeklyHeader({
  meta,
  weekDays,
  selectedDay,
  onSelectDay,
}: {
  meta: MicrocycleMeta;
  weekDays: WeekDay[];
  selectedDay: DayKey;
  onSelectDay: (day: DayKey) => void;
}) {
  const progress = Math.min(100, Math.round((meta.actualHours / meta.plannedHours) * 100));

  return (
    <header className="rounded-3xl border border-zinc-700/70 bg-zinc-900/80 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-400">Healthcore</p>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-zinc-100 sm:text-3xl">
            <Heart className="text-rose-400" size={22} />
            Cardio Training
          </h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-zinc-300">
            <Calendar size={14} className="text-zinc-400" />
            {meta.weekRangeLabel}
          </p>
        </div>

        <button className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/40 bg-cyan-500/15 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25">
          <Plus size={16} />
          Add Session
        </button>
      </div>

      <div className="mt-5 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          {weekDays.map((day) => {
            const isActive = selectedDay === day.key;
            return (
              <button
                key={day.key}
                onClick={() => onSelectDay(day.key)}
                className={[
                  'rounded-2xl border px-4 py-2 text-left transition',
                  isActive
                    ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-100'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500',
                ].join(' ')}
              >
                <p className="text-xs font-medium uppercase tracking-[0.2em]">{day.shortLabel}</p>
                <p className="text-lg font-semibold">{day.dateLabel}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-zinc-700 bg-zinc-900/90 p-3">
        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-zinc-400">
          <span className="inline-flex items-center gap-2">
            <Flame size={13} className="text-amber-300" /> Weekly Progress
          </span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-zinc-300">
          {meta.actualHours} hrs of {meta.plannedHours} hrs planned
        </p>
      </div>
    </header>
  );
}

function OverviewCards({ meta }: { meta: MicrocycleMeta }) {
  const cardItems = [
    { sport: 'Run' as const, summary: meta.runSummary, icon: Activity },
    { sport: 'Cycle' as const, summary: meta.cycleSummary, icon: Bike },
    { sport: 'Swim' as const, summary: meta.swimSummary, icon: Waves },
  ];

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cardItems.map((item) => {
        const Icon = item.icon;
        const style = SPORT_STYLES[item.sport];
        return (
          <article key={item.sport} className="rounded-2xl border border-zinc-700 bg-zinc-900/80 p-4">
            <div className="flex items-center justify-between">
              <div className={`inline-flex items-center gap-2 rounded-xl border px-2 py-1 text-xs font-medium ${style.badgeClass}`}>
                <Icon size={14} />
                {item.sport}
              </div>
              <ChevronRight size={16} className="text-zinc-500" />
            </div>
            <p className="mt-3 text-sm text-zinc-300">{item.summary}</p>
          </article>
        );
      })}
    </section>
  );
}

function SessionStatusBadge({ status, stravaSynced }: { status: SessionStatus; stravaSynced?: boolean }) {
  if (status === 'COMPLETED') {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
          Completed
        </span>
        {stravaSynced ? (
          <span className="rounded-full border border-amber-400/40 bg-amber-500/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-200">
            Strava Sync
          </span>
        ) : null}
      </div>
    );
  }

  if (status === 'SKIPPED') {
    return (
      <span className="rounded-full border border-zinc-500/50 bg-zinc-700/30 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-200">
        Skipped
      </span>
    );
  }

  return (
    <span className="rounded-full border border-cyan-400/40 bg-cyan-500/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-200">
      Planned
    </span>
  );
}

function SessionCard({ session, highlighted }: { session: PlannedSession; highlighted: boolean }) {
  const sportStyle = SPORT_STYLES[session.sport];
  const SportIcon = sportStyle.icon;

  return (
    <article
      className={[
        'rounded-2xl border p-4 transition',
        highlighted
          ? 'border-cyan-400/60 bg-gradient-to-br from-cyan-500/15 to-zinc-900 shadow-[0_10px_40px_rgba(6,182,212,0.2)]'
          : 'border-zinc-700 bg-zinc-900/80',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`inline-flex items-center gap-2 rounded-xl border px-2 py-1 text-xs font-medium ${sportStyle.badgeClass}`}>
          <SportIcon size={14} className={sportStyle.iconColor} />
          {session.sport}
        </div>
        <SessionStatusBadge status={session.status} stravaSynced={session.stravaSynced} />
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-zinc-100">{session.title}</h4>
          <p className="mt-1 text-sm text-zinc-300">{session.targetMetrics}</p>
        </div>
        <ChevronRight size={18} className="mt-1 text-zinc-500" />
      </div>
    </article>
  );
}

function MicrocycleFeed({
  weekDays,
  sessions,
  selectedDay,
}: {
  weekDays: WeekDay[];
  sessions: PlannedSession[];
  selectedDay: DayKey;
}) {
  const grouped = useMemo(
    () =>
      weekDays.map((day) => ({
        day,
        sessions: sessions.filter((session) => session.dayKey === day.key),
      })),
    [weekDays, sessions]
  );

  return (
    <section className="space-y-3">
      {grouped.map(({ day, sessions: daySessions }) => {
        const isCurrentDay = day.key === selectedDay;
        return (
          <div key={day.key} className="rounded-2xl border border-zinc-700 bg-zinc-900/75 p-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className={[
                'text-sm font-semibold uppercase tracking-[0.18em]',
                isCurrentDay ? 'text-cyan-200' : 'text-zinc-400',
              ].join(' ')}>
                {day.label}
              </h3>
              <span className="text-xs text-zinc-500">{day.dateLabel}</span>
            </div>

            <div className="space-y-2">
              {daySessions.length > 0 ? (
                daySessions.map((session) => (
                  <SessionCard key={session.id} session={session} highlighted={isCurrentDay} />
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-zinc-700 px-3 py-4 text-sm text-zinc-500">
                  Rest day.
                </p>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}

export default function CardioTrainingDashboard() {
  const [selectedDay, setSelectedDay] = useState<DayKey>(getInitialDayKey());

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-slate-950 to-zinc-900 px-4 py-6 text-zinc-100 sm:px-6">
      <div className="mx-auto w-full max-w-md space-y-4 pb-28 sm:max-w-2xl lg:max-w-3xl">
        <WeeklyHeader
          meta={MICRO_META}
          weekDays={WEEK_DAYS}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />

        <OverviewCards meta={MICRO_META} />

        <div className="rounded-3xl border border-zinc-700/70 bg-zinc-900/70 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300">Weekly Microcycle</h2>
            <Dumbbell size={16} className="text-zinc-500" />
          </div>
          <MicrocycleFeed weekDays={WEEK_DAYS} sessions={PLANNED_SESSIONS} selectedDay={selectedDay} />
        </div>
      </div>

      <button className="fixed bottom-5 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-cyan-400/50 bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_14px_40px_rgba(6,182,212,0.45)] transition hover:bg-cyan-400 sm:hidden">
        <Plus size={16} />
        Add Session
      </button>
    </main>
  );
}
