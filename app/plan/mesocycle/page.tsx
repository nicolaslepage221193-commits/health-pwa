import Link from 'next/link';
import { ArrowLeft, Gauge, Layers3, Waves } from 'lucide-react';

const blocks = [
  {
    name: 'Hypertrophy Block',
    span: '4-6 weeks',
    emphasis: 'High volume, moderate intensity, exercise variety, and local muscular endurance.',
  },
  {
    name: 'Strength Block',
    span: '4-6 weeks',
    emphasis: 'Lower reps, heavier loading, fewer main lifts, and clearer recovery constraints.',
  },
  {
    name: 'Power Block',
    span: '3-4 weeks',
    emphasis: 'Explosive work, fast intent, reduced fatigue, and more specific output targets.',
  },
  {
    name: 'Deload Block',
    span: '1 week',
    emphasis: 'Drop fatigue while preserving motor patterns and readiness for the next block.',
  },
];

export default function MesocyclePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fff7ed_0,_#ffffff_48%,_#f8fafc_100%)] px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-5xl space-y-8">
        <Link
          href="/plan"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-slate-500 transition hover:text-orange-500"
        >
          <ArrowLeft size={16} />
          Back To Plan
        </Link>

        <header className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm md:p-12">
          <div className="flex items-center gap-3 text-orange-500">
            <Layers3 size={20} />
            <span className="text-[11px] font-black uppercase tracking-[0.35em]">Mesocycle</span>
          </div>
          <h1 className="mt-5 text-4xl font-black uppercase tracking-tight text-slate-900 md:text-6xl md:leading-[0.9]">
            Training blocks with a single dominant adaptation target.
          </h1>
          <p className="mt-5 max-w-3xl text-sm font-medium text-slate-600 md:text-base">
            A mesocycle usually spans several weeks and organizes overload around one main theme. It is long enough to create change and short enough to pivot when the response is poor.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <Gauge className="text-orange-500" size={24} />
            <h2 className="mt-4 text-2xl font-black uppercase tracking-tight text-slate-900">Load Strategy</h2>
            <p className="mt-3 text-sm text-slate-600">
              Decide whether the block progresses mainly through volume, intensity, density, or technical specificity.
            </p>
          </article>
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <Waves className="text-blue-600" size={24} />
            <h2 className="mt-4 text-2xl font-black uppercase tracking-tight text-slate-900">Fatigue Wave</h2>
            <p className="mt-3 text-sm text-slate-600">
              Most mesocycles rise, peak, then unload. The block should have a deliberate fatigue shape instead of random hard weeks.
            </p>
          </article>
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <Layers3 className="text-emerald-600" size={24} />
            <h2 className="mt-4 text-2xl font-black uppercase tracking-tight text-slate-900">Exercise Selection</h2>
            <p className="mt-3 text-sm text-slate-600">
              Exercise choices support the block objective. Keep them stable long enough to measure actual progress.
            </p>
          </article>
        </section>

        <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Sample Blocks</p>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-slate-900">Mesocycle Examples</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {blocks.map((block) => (
              <article key={block.name} className="rounded-[2rem] border border-slate-100 bg-slate-50 p-6">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">{block.span}</div>
                <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-slate-900">{block.name}</h3>
                <p className="mt-3 text-sm text-slate-600">{block.emphasis}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
