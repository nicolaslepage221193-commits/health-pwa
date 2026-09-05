import Link from 'next/link';
import { ArrowLeft, ArrowRight, CalendarDays, Repeat2 } from 'lucide-react';

const weekTemplate = [
  {
    day: 'Monday',
    focus: 'Primary lower-body strength and trunk work',
  },
  {
    day: 'Tuesday',
    focus: 'Aerobic base and mobility reset',
  },
  {
    day: 'Wednesday',
    focus: 'Primary upper-body strength and accessory density',
  },
  {
    day: 'Thursday',
    focus: 'Low-intensity conditioning and technical drilling',
  },
  {
    day: 'Friday',
    focus: 'Power work and secondary lower-body exposure',
  },
  {
    day: 'Saturday',
    focus: 'Long session, sport practice, or hypertrophy support',
  },
  {
    day: 'Sunday',
    focus: 'Full recovery, walking, and readiness review',
  },
];

export default function MicrocyclePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ecfdf5_0,_#ffffff_50%,_#f8fafc_100%)] px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-5xl space-y-8">
        <Link
          href="/plan"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-slate-500 transition hover:text-emerald-600"
        >
          <ArrowLeft size={16} />
          Back To Plan
        </Link>

        <header className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm md:p-12">
          <div className="flex items-center gap-3 text-emerald-600">
            <Repeat2 size={20} />
            <span className="text-[11px] font-black uppercase tracking-[0.35em]">Microcycle</span>
          </div>
          <h1 className="mt-5 text-4xl font-black uppercase tracking-tight text-slate-900 md:text-6xl md:leading-[0.9]">
            Weekly sequencing that turns the block into actual work.
          </h1>
          <p className="mt-5 max-w-3xl text-sm font-medium text-slate-600 md:text-base">
            The microcycle is the practical unit of execution. It distributes stress across the week so hard sessions land with purpose and easier days preserve adaptation instead of wasting time.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <CalendarDays className="text-emerald-600" size={24} />
            <h2 className="mt-4 text-2xl font-black uppercase tracking-tight text-slate-900">Session Order</h2>
            <p className="mt-3 text-sm text-slate-600">
              Hard days should support each other, not collide. Weekly order matters as much as session quality.
            </p>
          </article>
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <ArrowRight className="text-blue-600" size={24} />
            <h2 className="mt-4 text-2xl font-black uppercase tracking-tight text-slate-900">Stress Flow</h2>
            <p className="mt-3 text-sm text-slate-600">
              Alternate stressors intelligently across strength, conditioning, skill work, and low-intensity recovery.
            </p>
          </article>
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <Repeat2 className="text-orange-500" size={24} />
            <h2 className="mt-4 text-2xl font-black uppercase tracking-tight text-slate-900">Repeatability</h2>
            <p className="mt-3 text-sm text-slate-600">
              A strong microcycle is sustainable enough to repeat with slight progression rather than needing constant reinvention.
            </p>
          </article>
        </section>

        <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Sample Week</p>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-slate-900">Microcycle Template</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {weekTemplate.map((entry) => (
              <article key={entry.day} className="rounded-[2rem] border border-slate-100 bg-slate-50 p-6">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">{entry.day}</div>
                <p className="mt-3 text-sm font-medium text-slate-700">{entry.focus}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
