'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import { Bug, MessageSquare, Sparkles, AlertTriangle, Send, Edit2, Trash2, X } from 'lucide-react';

type EntryType = '' | 'Bug' | 'Comment' | 'Feature';
type EntrySeverity = '' | 'Low' | 'Medium' | 'High' | 'Critical';
type EntryStatus = '' | 'Open' | 'In Progress' | 'Resolved';

type FeedbackEntry = {
  id: string;
  title: string;
  description: string;
  type: EntryType;
  severity: EntrySeverity;
  status: EntryStatus;
  author: string;
  page_context: string;
  created_at: string;
};

type StorageMode = 'supabase' | 'local';

const LOCAL_KEY = 'healthapp_feedback_entries';

const APP_PAGES = [
  { label: 'Train', value: '/workout/train' },
  { label: 'Library', value: '/workout/library' },
  { label: 'History', value: '/history' },
  { label: 'Calendar', value: '/calendar' },
  { label: 'Comments', value: '/comments' },
];

const defaultForm = {
  title: '',
  description: '',
  type: '' as EntryType,
  severity: '' as EntrySeverity,
  status: '' as EntryStatus,
  author: '',
  page_context: '',
};

export default function CommentsPage() {
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<StorageMode>('supabase');
  const [editingEntry, setEditingEntry] = useState<FeedbackEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [entries],
  );

  useEffect(() => {
    fetchEntries();
  }, []);

  function loadLocalEntries() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      const parsed = raw ? (JSON.parse(raw) as FeedbackEntry[]) : [];
      setEntries(Array.isArray(parsed) ? parsed : []);
    } catch {
      setEntries([]);
    }
  }

  function saveLocalEntries(nextEntries: FeedbackEntry[]) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(nextEntries));
    setEntries(nextEntries);
  }

  async function fetchEntries() {
    setLoading(true);
    setError(null);

    if (!supabase) {
      setStorageMode('local');
      loadLocalEntries();
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from('feedback_entries')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      // Fall back to local storage if table is not available yet.
      setStorageMode('local');
      loadLocalEntries();
      setError('Supabase table feedback_entries not found. Using local storage fallback.');
      setLoading(false);
      return;
    }

    setStorageMode('supabase');
    setEntries((data || []) as FeedbackEntry[]);
    setLoading(false);
  }

  async function submitEntry(e: React.FormEvent) {
    e.preventDefault();

    if (!form.title.trim() || !form.description.trim() || !form.author.trim()) {
      setError('Title, description, and author are required.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload: FeedbackEntry = {
      id: crypto.randomUUID(),
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type,
      severity: form.severity,
      status: form.status,
      author: form.author.trim(),
      page_context: form.page_context.trim() || 'unknown',
      created_at: new Date().toISOString(),
    };

    if (storageMode === 'supabase' && supabase) {
      const { error: insertError } = await supabase.from('feedback_entries').insert([
        {
          title: payload.title,
          description: payload.description,
          type: payload.type,
          severity: payload.severity,
          status: payload.status,
          author: payload.author,
          page_context: payload.page_context,
        },
      ]);

      if (insertError) {
        setSaving(false);
        setError(insertError.message);
        return;
      }

      await fetchEntries();
    } else {
      saveLocalEntries([payload, ...entries]);
    }

    setForm((prev) => ({
      ...defaultForm,
      author: prev.author,
    }));
    setSaving(false);
  }

  async function saveEdit() {
    if (!editingEntry) return;
    setSaving(true);
    setError(null);

    if (storageMode === 'supabase' && supabase) {
      const { error: updateError } = await supabase
        .from('feedback_entries')
        .update({
          title: editingEntry.title,
          description: editingEntry.description,
          type: editingEntry.type,
          severity: editingEntry.severity,
          status: editingEntry.status,
          author: editingEntry.author,
          page_context: editingEntry.page_context,
        })
        .eq('id', editingEntry.id);

      if (updateError) {
        setSaving(false);
        setError(updateError.message);
        return;
      }
      await fetchEntries();
    } else {
      saveLocalEntries(entries.map((e) => (e.id === editingEntry.id ? editingEntry : e)));
    }

    setEditingEntry(null);
    setSaving(false);
  }

  async function deleteEntry(id: string) {
    setDeletingId(id);
    setError(null);

    if (storageMode === 'supabase' && supabase) {
      const { error: deleteError } = await supabase.from('feedback_entries').delete().eq('id', id);
      if (deleteError) {
        setDeletingId(null);
        setError(deleteError.message);
        return;
      }
      await fetchEntries();
    } else {
      saveLocalEntries(entries.filter((e) => e.id !== id));
    }

    setDeletingId(null);
  }

  const typeIcon = (type: EntryType) => {
    if (type === 'Bug') return <Bug size={14} />;
    if (type === 'Feature') return <Sparkles size={14} />;
    return <MessageSquare size={14} />;
  };

  const severityColor = (severity: EntrySeverity) => {
    if (severity === 'Critical') return 'bg-red-100 text-red-700 border-red-200';
    if (severity === 'High') return 'bg-orange-100 text-orange-700 border-orange-200';
    if (severity === 'Medium') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 pb-24">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight italic uppercase">Comments</h1>
        <p className="text-slate-500 font-bold text-[11px] uppercase tracking-[0.2em] mt-2">
          Bug Reports & Product Feedback
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm font-bold text-orange-700 flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-8 mb-8">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4">New Entry</h2>

        <form onSubmit={submitEntry} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Title"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 font-bold text-slate-900"
            />
            <input
              value={form.author}
              onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))}
              placeholder="Author"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 font-bold text-slate-900"
            />
          </div>

          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the bug, comment, or idea..."
            rows={4}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 font-bold resize-y text-slate-900"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as EntryType }))}
              className="rounded-xl border border-slate-200 px-3 py-3 font-bold text-slate-900"
            >
              <option value="" disabled>Type</option>
              <option value="Bug">Bug</option>
              <option value="Comment">Comment</option>
              <option value="Feature">Feature</option>
            </select>

            <select
              value={form.severity}
              onChange={(e) => setForm((prev) => ({ ...prev, severity: e.target.value as EntrySeverity }))}
              className="rounded-xl border border-slate-200 px-3 py-3 font-bold text-slate-900"
            >
              <option value="" disabled>Severity</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>

            <select
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as EntryStatus }))}
              className="rounded-xl border border-slate-200 px-3 py-3 font-bold text-slate-900"
            >
              <option value="" disabled>Status</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>

            <select
              value={form.page_context}
              onChange={(e) => setForm((prev) => ({ ...prev, page_context: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-3 font-bold text-slate-900"
            >
              <option value="" disabled>Page</option>
              {APP_PAGES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white font-black uppercase tracking-wider text-xs hover:bg-blue-600 transition-colors disabled:opacity-60"
          >
            <Send size={14} />
            {saving ? 'Saving...' : 'Submit Entry'}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        {loading ? (
          <div className="py-20 text-center text-slate-400 font-black uppercase tracking-widest text-xs">Loading entries...</div>
        ) : sortedEntries.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No comments yet</p>
          </div>
        ) : (
          sortedEntries.map((entry) => (
            <article key={entry.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 border border-blue-200">
                  {typeIcon(entry.type)}
                  {entry.type}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${severityColor(entry.severity)}`}>
                  {entry.severity}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 border border-emerald-200">
                  {entry.status.replace('_', ' ')}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={() => setEditingEntry(entry)}
                    title="Edit entry"
                    aria-label="Edit entry"
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    disabled={deletingId === entry.id}
                    title="Delete entry"
                    aria-label="Delete entry"
                    className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-black text-slate-900 tracking-tight">{entry.title}</h3>
              <p className="text-sm font-bold text-slate-600 mt-2 whitespace-pre-wrap">{entry.description}</p>

              <div className="mt-4 text-[11px] font-black uppercase tracking-wider text-slate-400 flex flex-wrap gap-3">
                <span>Author: {entry.author}</span>
                <span>Page: {entry.page_context || 'n/a'}</span>
                <span>{new Date(entry.created_at).toLocaleString()}</span>
              </div>
            </article>
          ))
        )}
      </section>

      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Edit Entry</h2>
              <button onClick={() => setEditingEntry(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                value={editingEntry.title}
                onChange={(e) => setEditingEntry((prev) => prev && ({ ...prev, title: e.target.value }))}
                placeholder="Title"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 font-bold text-slate-900"
              />
              <input
                value={editingEntry.author}
                onChange={(e) => setEditingEntry((prev) => prev && ({ ...prev, author: e.target.value }))}
                placeholder="Author"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 font-bold text-slate-900"
              />
            </div>

            <textarea
              value={editingEntry.description}
              onChange={(e) => setEditingEntry((prev) => prev && ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 font-bold text-slate-900 resize-y"
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <select
                value={editingEntry.type}
                onChange={(e) => setEditingEntry((prev) => prev && ({ ...prev, type: e.target.value as EntryType }))}
                className="rounded-xl border border-slate-200 px-3 py-3 font-bold text-slate-900"
              >
                <option value="Bug">Bug</option>
                <option value="Comment">Comment</option>
                <option value="Feature">Feature</option>
              </select>

              <select
                value={editingEntry.severity}
                onChange={(e) => setEditingEntry((prev) => prev && ({ ...prev, severity: e.target.value as EntrySeverity }))}
                className="rounded-xl border border-slate-200 px-3 py-3 font-bold text-slate-900"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>

              <select
                value={editingEntry.status}
                onChange={(e) => setEditingEntry((prev) => prev && ({ ...prev, status: e.target.value as EntryStatus }))}
                className="rounded-xl border border-slate-200 px-3 py-3 font-bold text-slate-900"
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>

              <select
                value={editingEntry.page_context}
                onChange={(e) => setEditingEntry((prev) => prev && ({ ...prev, page_context: e.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-3 font-bold text-slate-900"
              >
                {APP_PAGES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={saveEdit}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white font-black uppercase tracking-wider text-xs hover:bg-blue-600 transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditingEntry(null)}
                className="px-5 py-3 rounded-xl border border-slate-200 font-black uppercase tracking-wider text-xs text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
