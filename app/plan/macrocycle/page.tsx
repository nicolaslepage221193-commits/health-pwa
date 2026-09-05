import Link from 'next/link';
import { ArrowLeft, Flag, Target, TimerReset } from 'lucide-react';

const phases = [
  {
    label: 'Foundation',
    duration: 'Q1',
    detail: 'Establish movement quality, repeatable habits, and baseline capacity before pushing load aggressively.',
  },
  {
    label: 'Development',
    duration: 'Q2',
    detail: 'Drive strength, muscle gain, and tolerable workload progression through sustained build blocks.',
  },
  {
    label: 'Peak',
    duration: 'Q3',
    detail: 'Convert accumulated work into higher performance with more specific sessions and tighter fatigue control.',
  },
  {
    label: 'Reset',
    duration: 'Q4',
    detail: 'Unload, assess outcomes, repair weak links, and prepare the next yearly build.',
  },
];

export default function MacrocyclePage() {
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
            Annual direction for the full training year.
          </h1>
          <p className="mt-5 max-w-3xl text-sm font-medium text-slate-600 md:text-base">
            A macrocycle is the highest-level plan. It defines the main performance target, sets the annual rhythm, and allocates when to build, peak, recover, and restart.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <Target className="text-blue-600" size={24} />
            <h2 className="mt-4 text-2xl font-black uppercase tracking-tight text-slate-900">Primary Goal</h2>
            <p className="mt-3 text-sm text-slate-600">
              Choose one annual outcome such as a meet, race, body composition phase, or return-to-performance timeline.
            </p>
          </article>
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <TimerReset className="text-orange-500" size={24} />
            <h2 className="mt-4 text-2xl font-black uppercase tracking-tight text-slate-900">Recovery Windows</h2>
            <p className="mt-3 text-sm text-slate-600">
              Plan recovery before you need it. Annual progress comes from intelligent resets, not constant intensity.
            </p>
          </article>
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <Flag className="text-emerald-600" size={24} />
            <h2 className="mt-4 text-2xl font-black uppercase tracking-tight text-slate-900">Checkpoints</h2>
            <p className="mt-3 text-sm text-slate-600">
              Insert review points every block so the next phase reflects actual adaptation rather than assumptions.
            </p>
          </article>
        </section>

        <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Sample Year</p>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-slate-900">Macrocycle Outline</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {phases.map((phase) => (
              <article key={phase.label} className="rounded-[2rem] border border-slate-100 bg-slate-50 p-6">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">{phase.duration}</div>
                <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-slate-900">{phase.label}</h3>
                <p className="mt-3 text-sm text-slate-600">{phase.detail}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
