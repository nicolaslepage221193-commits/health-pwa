import { ArrowRight, CalendarRange, Flag, Layers3 } from 'lucide-react';

const mesocycles = [
  {
    name: 'Accumulation',
    duration: 'Weeks 1-8',
    focus: 'Build work capacity, tissue tolerance, and movement efficiency.',
    microcycles: [
      'Week 1: Intro volume and movement standards',
      'Week 2: Volume build with controlled intensity',
      'Week 3: Volume peak and accessory density',
      'Week 4: Deload and restore',
      'Week 5: Reload volume with improved execution',
      'Week 6: Add intensity to primary lifts',
      'Week 7: Highest total workload block',
      'Week 8: Deload and review',
    ],
  },
  {
    name: 'Intensification',
    duration: 'Weeks 9-16',
    focus: 'Shift from base volume into heavier loading and event-specific strength.',
    microcycles: [
      'Week 9: Reintroduction to heavy work',
      'Week 10: Progressive overload on main lifts',
      'Week 11: Top-set exposure and reduced accessory work',
      'Week 12: Deload and technique reset',
      'Week 13: Strength emphasis with lower rep ranges',
      'Week 14: Force production and speed contrast',
      'Week 15: Overreach week',
      'Week 16: Deload and testing prep',
    ],
  },
  {
    name: 'Realisation',
    duration: 'Weeks 17-24',
    focus: 'Convert strength into performance and peak key sessions.',
    microcycles: [
      'Week 17: Specific performance block starts',
      'Week 18: Maintain strength while trimming fatigue',
      'Week 19: Competition-pace sessions',
      'Week 20: Mini deload',
      'Week 21: Peak exposure',
      'Week 22: Performance simulation',
      'Week 23: Taper',
      'Week 24: Test or compete',
    ],
  },
  {
    name: 'Regeneration',
    duration: 'Weeks 25-52',
    focus: 'Recover, rebuild weak links, and repeat with adjusted priorities.',
    microcycles: [
      'Weeks 25-28: Active recovery and movement variability',
      'Weeks 29-36: Rebuild hypertrophy and aerobic base',
      'Weeks 37-44: Secondary performance target block',
      'Weeks 45-48: Deload, testing, and reflection',
      'Weeks 49-52: Reset and next macrocycle planning',
    ],
  },
];

export default function PlanPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe_0,_#f8fafc_38%,_#ffffff_100%)] px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white/90 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur md:p-12">
          <div className="mb-6 flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.35em] text-blue-600">
            <CalendarRange size={18} />
            Annual Periodisation
          </div>
          <div className="grid gap-8 md:grid-cols-[1.6fr_1fr] md:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-black uppercase tracking-tight text-slate-900 md:text-6xl md:leading-[0.9]">
                Plan the year through macro, meso, and micro cycles.
              </h1>
              <p className="mt-5 max-w-2xl text-sm font-bold uppercase tracking-[0.18em] text-slate-400 md:text-base md:tracking-[0.24em]">
                A sample structure for managing long-term progression, staged overload, and recovery without losing sight of the weekly work.
              </p>
            </div>
            <div className="rounded-[2rem] bg-slate-950 p-6 text-white">
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-sky-300">Macrocycle Snapshot</div>
              <div className="mt-4 text-3xl font-black uppercase tracking-tight">52 Weeks</div>
              <p className="mt-3 text-sm text-slate-300">
                One annual macrocycle split into four mesocycles with microcycle-based weekly sequencing.
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3 text-blue-600">
              <Flag size={20} />
              <span className="text-xs font-black uppercase tracking-[0.3em]">Macrocycle</span>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Annual Objective</h2>
            <p className="mt-3 text-sm text-slate-600">
              The macrocycle sets the outcome for the full year: build capacity, raise strength, peak at the right time, and leave room for recovery.
            </p>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3 text-orange-500">
              <Layers3 size={20} />
              <span className="text-xs font-black uppercase tracking-[0.3em]">Mesocycle</span>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Training Blocks</h2>
            <p className="mt-3 text-sm text-slate-600">
              Mesocycles break the year into blocks with a single dominant objective, such as accumulation, intensification, or peaking.
            </p>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3 text-emerald-600">
              <ArrowRight size={20} />
              <span className="text-xs font-black uppercase tracking-[0.3em]">Microcycle</span>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Weekly Execution</h2>
            <p className="mt-3 text-sm text-slate-600">
              Microcycles turn the block objective into weekly prescriptions for volume, intensity, skill practice, and fatigue management.
            </p>
          </article>
        </section>

        <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Sample Structure</p>
              <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-slate-900 md:text-4xl">
                Annual Periodisation Map
              </h2>
            </div>
            <p className="max-w-xl text-sm text-slate-500">
              This sample keeps the macrocycle fixed while each mesocycle shifts the weekly emphasis. Deloads are placed often enough to preserve momentum instead of forcing long resets.
            </p>
          </div>

          <div className="grid gap-6">
            {mesocycles.map((mesocycle) => (
              <article
                key={mesocycle.name}
                className="rounded-[2rem] border border-slate-100 bg-slate-50 p-6"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-600">
                      {mesocycle.duration}
                    </p>
                    <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-slate-900">
                      {mesocycle.name}
                    </h3>
                    <p className="mt-3 max-w-2xl text-sm text-slate-600">{mesocycle.focus}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                    Meso Block
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {mesocycle.microcycles.map((microcycle) => (
                    <div
                      key={microcycle}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-700"
                    >
                      {microcycle}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
