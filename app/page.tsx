'use client';

import Link from 'next/link';
import { ArrowRight, Activity, Calendar, Library, Zap, Trophy } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* --- HERO SECTION --- */}
      <section className="max-w-4xl mx-auto px-6 pt-10 pb-16">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-[px] bg-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600">Performance Tracking</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-slate-900 italic uppercase tracking-tighter leading-[0.85]">
            Relentless <br /> 
            <span className="text-blue-600">Consistency.</span>
          </h1>
          <p className="max-w-md text-slate-400 font-bold text-sm uppercase tracking-widest leading-relaxed pt-4">
            A minimalist engine for tracking high-volume output and routine management.
          </p>
        </div>

        {/* --- MAIN CALL TO ACTION --- */}
        <div className="mt-12 flex flex-col sm:flex-row gap-4">
          <Link href="/workout/train" className="group bg-slate-900 text-white px-8 py-6 rounded-[2rem] flex items-center justify-between gap-12 hover:bg-blue-600 transition-all shadow-2xl">
            <span className="font-black italic uppercase tracking-widest">Start Training</span>
            <ArrowRight className="group-hover:translate-x-2 transition-transform" />
          </Link>
          
          <Link href="/workout/library" className="group bg-slate-50 text-slate-900 px-8 py-6 rounded-[2rem] flex items-center justify-between gap-12 border border-slate-100 hover:border-slate-300 transition-all">
            <span className="font-black italic uppercase tracking-widest">Manage Plans</span>
            <Library size={20} className="text-slate-300" />
          </Link>
        </div>
      </section>

      {/* --- QUICK STATS / INFO PLACEHOLDER --- */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Calendar Quick Link */}
          <Link href="/calendar" className="p-8 bg-white border border-slate-100 rounded-[2.5rem] hover:shadow-xl transition-all group">
            <Calendar className="text-blue-600 mb-6" size={32} />
            <h3 className="font-black italic uppercase text-xl text-slate-900">History</h3>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2">View past performance</p>
          </Link>

          {/* Placeholder Card 1 */}
          <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-transparent">
            <Zap className="text-orange-500 mb-6" size={32} />
            <h3 className="font-black italic uppercase text-xl text-slate-900">Intensity</h3>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2">Coming Soon: Volume Metrics</p>
          </div>

          {/* Placeholder Card 2 */}
          <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-transparent">
            <Trophy className="text-yellow-500 mb-6" size={32} />
            <h3 className="font-black italic uppercase text-xl text-slate-900">Milestones</h3>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2">Coming Soon: PR Tracking</p>
          </div>

        </div>
      </section>

      {/* --- FOOTER DECOR --- */}
      <footer className="max-w-4xl mx-auto px-6 py-20 opacity-20">
        <div className="border-t border-slate-200 pt-8">
          <p className="text-[10px] font-black uppercase tracking-[1em] text-slate-400 text-center">Engine v1.0 // 2026</p>
        </div>
      </footer>
    </div>
  );
}