import Link from 'next/link';
import { Activity, Bike, ChevronLeft, Plus, Waves } from 'lucide-react';

type SportType = 'Run' | 'Swim' | 'Cycle' | 'Rest';

interface DailyWorkout {
  id: string;
  date: number;
  dayOfWeek: string;
  sportType: SportType;
  workoutName: string;
  targetMetrics: string;
  isRestDay: boolean;
}

interface Microcycle {
  id: string;
  title: string;
  dateRange: string;
  days: DailyWorkout[];
}

interface MesocycleBlock {
  id: string;
  name: string;
  durationWeeks: number;
  isCurrent: boolean;
}

interface MacrocyclePlan {
  id: string;
  title: string;
  mesocycles: MesocycleBlock[];
}

const macrocyclePlan: MacrocyclePlan = {
  id: 'spring-marathon-plan',
  title: 'SPRING MARATHON PLAN',
  mesocycles: [
    { id: 'base-1', name: 'BASE 1', durationWeeks: 4, isCurrent: true },
    { id: 'build-1', name: 'BUILD 1', durationWeeks: 4, isCurrent: false },
    { id: 'build-2', name: 'BUILD 2', durationWeeks: 4, isCurrent: false },
    { id: 'peak', name: 'PEAK', durationWeeks: 2, isCurrent: false },
    { id: 'taper', name: 'TAPER', durationWeeks: 2, isCurrent: false },
  ],
};

const currentMicrocycle: Microcycle = {
  id: 'microcycle-3',
  title: 'MICROCYCLE 3: BASE 1',
  dateRange: 'Nov 8-14',
  days: [
    {
      id: 'mon',
      date: 8,
      dayOfWeek: 'Mon',
      sportType: 'Run',
      workoutName: 'Easy',
      targetMetrics: '60m (4:30/km pace)',
      isRestDay: false,
    },
    {
      id: 'tue',
      date: 9,
      dayOfWeek: 'Tue',
      sportType: 'Swim',
      workoutName: 'Drills',
      targetMetrics: '45m (12 x 50m drills)',
      isRestDay: false,
    },
    {
      id: 'wed',
      date: 10,
      dayOfWeek: 'Wed',
      sportType: 'Cycle',
      workoutName: 'Tempo',
      targetMetrics: '120m (220W)',
      isRestDay: false,
    },
    {
      id: 'thu',
      date: 11,
      dayOfWeek: 'Thu',
      sportType: 'Run',
      workoutName: 'Steady State',
      targetMetrics: '75m at marathon effort',
      isRestDay: false,
    },
    {
      id: 'fri',
      date: 12,
      dayOfWeek: 'Fri',
      sportType: 'Rest',
      workoutName: 'REST',
      targetMetrics: 'Mobility + full recovery',
      isRestDay: true,
    },
    {
      id: 'sat',
      date: 13,
      dayOfWeek: 'Sat',
      sportType: 'Cycle',
      workoutName: 'Aerobic Endurance',
      targetMetrics: '150m (Zone 2 steady)',
      isRestDay: false,
    },
    {
      id: 'sun',
      date: 14,
      dayOfWeek: 'Sun',
      sportType: 'Run',
      workoutName: 'Long Run',
      targetMetrics: '24km relaxed negative split',
      isRestDay: false,
    },
  ],
};

function getWorkoutStyles(sportType: SportType) {
  switch (sportType) {
    case 'Run':
      return {
        cardClass: 'bg-[#2B4C6F]/85 border-[#40688f]/70',
        icon: <Activity size={18} className="text-slate-100" />,
        label: 'RUN',
      };
    case 'Swim':
      return {
        cardClass: 'bg-[#1F5A73]/85 border-[#317590]/70',
        icon: <Waves size={18} className="text-slate-100" />,
        label: 'SWIM',
      };
    case 'Cycle':
      return {
        cardClass: 'bg-[#2E6B4B]/85 border-[#478b66]/70',
        icon: <Bike size={18} className="text-slate-100" />,
        label: 'CYCLE',
      };
    default:
      return {
        cardClass: 'bg-slate-700/60 border-slate-600/70',
        icon: <Plus size={18} className="text-slate-300" />,
        label: 'REST',
      };
  }
}

export default function MicrocyclePage() {
  const activeMesocycleIndex = macrocyclePlan.mesocycles.findIndex((block) => block.isCurrent);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#1A232A_0%,#10171D_100%)] text-slate-100">
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
                <div key={block.id} className="flex min-w-[110px] flex-1 items-center">
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
                      {block.name} ({block.durationWeeks} wks)
                    </p>
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
              {currentMicrocycle.title}
            </h1>
            <p className="mt-1 text-sm text-slate-400">{currentMicrocycle.dateRange}</p>
          </div>

          <div className="space-y-4">
            {currentMicrocycle.days.map((day) => {
              const styles = getWorkoutStyles(day.sportType);

              return (
                <article key={day.id} className="flex items-stretch gap-3">
                  <div className="flex w-16 flex-shrink-0 flex-col items-center justify-center rounded-[1.5rem] border border-slate-700/50 bg-slate-900/30 px-2 py-4 text-center">
                    <span className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">
                      {day.dayOfWeek}
                    </span>
                    <span className="mt-2 text-3xl font-black tracking-tight text-white">{day.date}</span>
                  </div>

                  <div
                    className={`flex-1 rounded-[1.75rem] border p-4 shadow-[0_14px_40px_rgba(0,0,0,0.18)] ${styles.cardClass}`}
                  >
                    {day.isRestDay ? (
                      <div className="flex min-h-[92px] flex-col justify-center">
                        <p className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-300">
                          {styles.label}
                        </p>
                        <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">
                          REST
                        </h2>
                      </div>
                    ) : (
                      <div className="flex min-h-[92px] flex-col justify-between gap-4 sm:flex-row sm:items-start">
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black/15">
                              {styles.icon}
                            </div>
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-200/90">
                                {styles.label}
                              </p>
                              <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-white">
                                {day.workoutName}
                              </h2>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-left sm:min-w-[180px] sm:text-right">
                          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-300">
                            Target
                          </p>
                          <p className="mt-2 text-sm font-semibold text-white">{day.targetMetrics}</p>
                        </div>
                      </div>
                    )}
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
            {macrocyclePlan.mesocycles.map((block) => (
              <span
                key={`${block.id}-pager`}
                className={`h-2.5 w-2.5 rounded-full ${block.isCurrent ? 'bg-emerald-400' : 'bg-slate-600'}`}
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
