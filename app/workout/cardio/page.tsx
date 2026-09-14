'use client';

import { JSX, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
	DndContext,
	DragEndEvent,
	DragOverlay,
	DragStartEvent,
	PointerSensor,
	closestCenter,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	SortableContext,
	arrayMove,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
	Activity,
	Bike,
	Check,
	ChevronDown,
	Copy,
	Flame,
	GripVertical,
	Loader2,
	Plus,
	Repeat,
	Save,
	Trash2,
	Waves,
	Wind,
	Zap,
} from 'lucide-react';
import { supabase } from '../../supabase';

// ---------- Types ----------

type SportType = 'RUN' | 'CYCLE' | 'SWIM';
type IntensityMode = 'WATTS' | 'FTP_PERCENT';
type SegmentType = 'WARMUP' | 'STEADY' | 'INTERVAL' | 'FREE' | 'COOLDOWN';

interface WorkoutSegment {
	id: string;
	type: SegmentType;
	label: string;
	durationSec: number; // work duration for INTERVAL, total duration otherwise
	intensityValue: number; // ignored for FREE
	rampMinWatts?: number; // WARMUP and COOLDOWN only
	rampMaxWatts?: number; // WARMUP and COOLDOWN only
	rampStepWatts?: number; // WARMUP and COOLDOWN only
	repeats?: number; // INTERVAL only
	restDurationSec?: number; // INTERVAL only
	restIntensityValue?: number; // INTERVAL only
}

interface SavedWorkoutRow {
	id: string;
	title: string;
	description: string | null;
	sport: SportType;
	target_duration_minutes: number;
	estimated_tss: number | null;
	structure: WorkoutSegment[] | null;
	intensity_mode: IntensityMode | null;
	ftp_used_watts: number | null;
	created_at: string;
}

// ---------- Constants ----------

const SPORT_OPTIONS: { value: SportType; label: string; icon: JSX.Element }[] = [
	{ value: 'CYCLE', label: 'Cycling', icon: <Bike size={18} /> },
	{ value: 'RUN', label: 'Running', icon: <Activity size={18} /> },
	{ value: 'SWIM', label: 'Swimming', icon: <Waves size={18} /> },
];

const SEGMENT_META: Record<SegmentType, { label: string; description: string; color: string; icon: JSX.Element }> = {
	WARMUP: { label: 'Warm-up', description: 'Easy steady effort to open the session', color: 'sky', icon: <Wind size={16} /> },
	STEADY: { label: 'Zone / Steady', description: 'Sustained effort held at one intensity', color: 'emerald', icon: <Activity size={16} /> },
	INTERVAL: { label: 'Interval Set', description: 'Repeated work / rest efforts', color: 'amber', icon: <Repeat size={16} /> },
	FREE: { label: 'Free Ride / Run', description: 'Open, unstructured effort', color: 'violet', icon: <Zap size={16} /> },
	COOLDOWN: { label: 'Cool-down', description: 'Easy effort to close the session', color: 'slate', icon: <Wind size={16} /> },
};

const PALETTE_ORDER: SegmentType[] = ['WARMUP', 'STEADY', 'INTERVAL', 'FREE', 'COOLDOWN'];

const DEFAULT_FTP = 200;
const FREE_RIDE_ASSUMED_PCT = 65; // used only to approximate TSS for unstructured blocks
const MIN_RAMP_STEP_WATTS = 5;

// ---------- Helpers ----------

function uid() {
	return `seg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function defaultSegment(type: SegmentType, mode: IntensityMode, ftp: number): WorkoutSegment {
	const pctToValue = (pct: number) => (mode === 'FTP_PERCENT' ? pct : Math.round((ftp || DEFAULT_FTP) * (pct / 100)));

	switch (type) {
		case 'WARMUP':
			return {
				id: uid(),
				type,
				label: SEGMENT_META.WARMUP.label,
				durationSec: 600,
				intensityValue: pctToValue(55),
				rampMinWatts: Math.round((ftp || DEFAULT_FTP) * 0.5),
				rampMaxWatts: Math.round((ftp || DEFAULT_FTP) * 0.75),
				rampStepWatts: MIN_RAMP_STEP_WATTS,
			};
		case 'STEADY':
			return { id: uid(), type, label: SEGMENT_META.STEADY.label, durationSec: 1200, intensityValue: pctToValue(75) };
		case 'INTERVAL':
			return {
				id: uid(),
				type,
				label: SEGMENT_META.INTERVAL.label,
				repeats: 4,
				durationSec: 180,
				intensityValue: pctToValue(105),
				restDurationSec: 120,
				restIntensityValue: pctToValue(50),
			};
		case 'FREE':
			return { id: uid(), type, label: SEGMENT_META.FREE.label, durationSec: 1800, intensityValue: 0 };
		case 'COOLDOWN':
			return {
				id: uid(),
				type,
				label: SEGMENT_META.COOLDOWN.label,
				durationSec: 300,
				intensityValue: pctToValue(50),
				rampMinWatts: Math.round((ftp || DEFAULT_FTP) * 0.5),
				rampMaxWatts: Math.round((ftp || DEFAULT_FTP) * 0.75),
				rampStepWatts: MIN_RAMP_STEP_WATTS,
			};
	}
}

function toFtpPercent(value: number, mode: IntensityMode, ftp: number): number {
	if (mode === 'FTP_PERCENT') return value;
	if (!ftp) return 0;
	return (value / ftp) * 100;
}

function segmentTotalSeconds(seg: WorkoutSegment): number {
	if (seg.type === 'INTERVAL') {
		const repeats = seg.repeats ?? 1;
		return repeats * ((seg.durationSec || 0) + (seg.restDurationSec || 0));
	}
	return seg.durationSec || 0;
}

function formatDuration(totalSec: number): string {
	const hours = Math.floor(totalSec / 3600);
	const minutes = Math.round((totalSec % 3600) / 60);
	if (hours > 0) return `${hours}h ${minutes}m`;
	return `${minutes}m`;
}

function zoneColor(pct: number): string {
	if (pct <= 0) return 'bg-violet-300';
	if (pct < 60) return 'bg-slate-300';
	if (pct < 76) return 'bg-sky-400';
	if (pct < 91) return 'bg-emerald-400';
	if (pct < 106) return 'bg-amber-400';
	return 'bg-rose-500';
}

interface ChartBlock {
	key: string;
	durationSec: number;
	pct: number;
	isFree: boolean;
}

function buildChartBlocks(segments: WorkoutSegment[], mode: IntensityMode, ftp: number): ChartBlock[] {
	const blocks: ChartBlock[] = [];
	segments.forEach((seg) => {
		if (seg.type === 'WARMUP' || seg.type === 'COOLDOWN') {
			blocks.push(...buildRampBlocks(seg, ftp));
		} else if (seg.type === 'INTERVAL') {
			const repeats = seg.repeats ?? 1;
			for (let i = 0; i < repeats; i++) {
				blocks.push({ key: `${seg.id}-work-${i}`, durationSec: seg.durationSec, pct: toFtpPercent(seg.intensityValue, mode, ftp), isFree: false });
				if (seg.restDurationSec) {
					blocks.push({ key: `${seg.id}-rest-${i}`, durationSec: seg.restDurationSec, pct: toFtpPercent(seg.restIntensityValue || 0, mode, ftp), isFree: false });
				}
			}
		} else if (seg.type === 'FREE') {
			blocks.push({ key: seg.id, durationSec: seg.durationSec, pct: FREE_RIDE_ASSUMED_PCT, isFree: true });
		} else {
			blocks.push({ key: seg.id, durationSec: seg.durationSec, pct: toFtpPercent(seg.intensityValue, mode, ftp), isFree: false });
		}
	});
	return blocks;
}

function computeTotals(segments: WorkoutSegment[], mode: IntensityMode, ftp: number) {
	const blocks = buildChartBlocks(segments, mode, ftp);
	const totalSec = blocks.reduce((sum, b) => sum + b.durationSec, 0);
	if (totalSec === 0) return { totalSec: 0, avgPct: 0, tss: 0 };

	let weightedPct = 0;
	let squaredWeighted = 0;
	blocks.forEach((b) => {
		weightedPct += b.durationSec * b.pct;
		squaredWeighted += b.durationSec * (b.pct / 100) ** 2;
	});
	const avgPct = weightedPct / totalSec;
	const tss = (squaredWeighted / 3600) * 100;
	return { totalSec, avgPct, tss };
}

function minutesToSeconds(min: number): number {
	return Math.max(0, Math.round(min * 60));
}
function secondsToMinutes(sec: number): number {
	return Math.round((sec / 60) * 100) / 100;
}

function getRampWatts(segment: WorkoutSegment, ftp: number) {
	const baseFtp = ftp || DEFAULT_FTP;
	const minWatts = Math.max(0, segment.rampMinWatts ?? Math.round(baseFtp * 0.5));
	const maxWatts = Math.max(minWatts, segment.rampMaxWatts ?? Math.round(baseFtp * 0.75));
	const stepWatts = Math.max(MIN_RAMP_STEP_WATTS, segment.rampStepWatts ?? MIN_RAMP_STEP_WATTS);
	return { minWatts, maxWatts, stepWatts };
}

function buildRampBlocks(segment: WorkoutSegment, ftp: number): ChartBlock[] {
	const { minWatts, maxWatts, stepWatts } = getRampWatts(segment, ftp);
	const values: number[] = [];
	for (let watts = minWatts; watts < maxWatts; watts += stepWatts) values.push(watts);
	values.push(maxWatts);
	if (segment.type === 'COOLDOWN') values.reverse();

	const durationSec = segment.durationSec / values.length;
	return values.map((watts, index) => ({
		key: `${segment.id}-ramp-${index}`,
		durationSec,
		pct: toFtpPercent(watts, 'WATTS', ftp),
		isFree: false,
	}));
}

// ---------- Draggable palette item ----------

function PaletteCard({ type }: { type: SegmentType }) {
	const meta = SEGMENT_META[type];
	const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
		id: `palette-${type}`,
		data: { fromPalette: true, segmentType: type },
	});

	return (
		<div
			ref={setNodeRef}
			{...listeners}
			{...attributes}
			style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }}
			className={`cursor-grab active:cursor-grabbing select-none rounded-[1.5rem] border border-slate-300/50 bg-white/75 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.12)] transition hover:border-emerald-300 hover:bg-white ${
				isDragging ? 'opacity-40 z-50' : ''
			}`}
		>
				<div className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-slate-900">
				<span className={`text-${meta.color}-500`}>{meta.icon}</span>
				{meta.label}
			</div>
			<p className="mt-1 text-xs leading-snug text-slate-600">{meta.description}</p>
		</div>
	);
}

// ---------- Droppable canvas wrapper ----------

function Canvas({ children, isEmpty }: { children: React.ReactNode; isEmpty: boolean }) {
	const { setNodeRef, isOver } = useDroppable({ id: 'canvas' });
	return (
		<div
			ref={setNodeRef}
			className={`min-h-[220px] space-y-3 rounded-[1.75rem] border-2 border-dashed p-4 transition-colors ${
				isOver ? 'border-emerald-500 bg-emerald-50/60' : 'border-slate-400/60 bg-slate-900/10'
			}`}
		>
			{isEmpty && (
				<div className="flex h-40 flex-col items-center justify-center text-center text-slate-600">
					<Plus size={22} className="mb-2" />
					<p className="text-sm font-semibold">Drag a block here to start building</p>
					<p className="text-xs">Warm-up, Zone, Intervals, Free effort, Cool-down</p>
				</div>
			)}
			{children}
		</div>
	);
}

// ---------- Segment card (sortable + editable) ----------

function SegmentCard({
	segment,
	mode,
	ftp,
	onChange,
	onRemove,
	onDuplicate,
}: {
	segment: WorkoutSegment;
	mode: IntensityMode;
	ftp: number;
	onChange: (next: WorkoutSegment) => void;
	onRemove: () => void;
	onDuplicate: () => void;
}) {
	const [expanded, setExpanded] = useState(true);
	const meta = SEGMENT_META[segment.type];
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: segment.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const unitLabel = mode === 'FTP_PERCENT' ? '% FTP' : 'W';
	const totalSec = segmentTotalSeconds(segment);

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`rounded-[1.75rem] border border-slate-300/60 bg-white/85 shadow-[0_14px_40px_rgba(0,0,0,0.12)] ${isDragging ? 'opacity-50' : ''}`}
		>
			<div className="flex items-center gap-2 p-3">
				<button
					{...attributes}
					{...listeners}
					type="button"
					aria-label="Reorder block"
					className="cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing"
				>
					<GripVertical size={18} />
				</button>
				<span className={`text-${meta.color}-500`}>{meta.icon}</span>
				<input
					value={segment.label}
					onChange={(e) => onChange({ ...segment, label: e.target.value })}
					className="flex-1 min-w-0 rounded-lg border border-transparent px-2 py-1 text-sm font-bold text-slate-700 hover:border-slate-200 focus:border-blue-300 focus:outline-none"
					aria-label="Block name"
				/>
				<span className="hidden sm:inline text-xs font-semibold text-slate-400 whitespace-nowrap">
					{formatDuration(totalSec)}
				</span>
				<button
					type="button"
					onClick={onDuplicate}
					aria-label="Duplicate block"
					className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
				>
					<Copy size={16} />
				</button>
				<button
					type="button"
					onClick={onRemove}
					aria-label="Remove block"
					className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
				>
					<Trash2 size={16} />
				</button>
				<button
					type="button"
					onClick={() => setExpanded((v) => !v)}
					aria-label={expanded ? 'Collapse block' : 'Expand block'}
					className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
				>
					<ChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
				</button>
			</div>

			{expanded && (
				<div className="grid grid-cols-2 gap-3 border-t border-slate-300/40 p-4 sm:grid-cols-4">
					{segment.type === 'INTERVAL' ? (
						<>
							<Field label="Repeats">
								<input
									type="number"
									min={1}
									value={segment.repeats ?? 1}
									onChange={(e) => onChange({ ...segment, repeats: Math.max(1, Number(e.target.value)) })}
									className="w-full rounded-xl border border-slate-300/70 bg-white/80 px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50"
								/>
							</Field>
							<Field label="Work (min)">
								<input
									type="number"
									min={0}
									step={0.25}
									value={secondsToMinutes(segment.durationSec)}
									onChange={(e) => onChange({ ...segment, durationSec: minutesToSeconds(Number(e.target.value)) })}
									className="w-full rounded-xl border border-slate-300/70 bg-white/80 px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50"
								/>
							</Field>
							<Field label={`Work (${unitLabel})`}>
								<input
									type="number"
									min={0}
									value={segment.intensityValue}
									onChange={(e) => onChange({ ...segment, intensityValue: Number(e.target.value) })}
									className="w-full rounded-xl border border-slate-300/70 bg-white/80 px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50"
								/>
							</Field>
							<Field label="Rest (min)">
								<input
									type="number"
									min={0}
									step={0.25}
									value={secondsToMinutes(segment.restDurationSec || 0)}
									onChange={(e) => onChange({ ...segment, restDurationSec: minutesToSeconds(Number(e.target.value)) })}
									className="w-full rounded-xl border border-slate-300/70 bg-white/80 px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50"
								/>
							</Field>
							<Field label={`Rest (${unitLabel})`}>
								<input
									type="number"
									min={0}
									value={segment.restIntensityValue || 0}
									onChange={(e) => onChange({ ...segment, restIntensityValue: Number(e.target.value) })}
									className="w-full rounded-xl border border-slate-300/70 bg-white/80 px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50"
								/>
							</Field>
						</>
					) : segment.type === 'FREE' ? (
						<Field label="Duration (min)">
							<input
								type="number"
								min={0}
								step={0.5}
								value={secondsToMinutes(segment.durationSec)}
								onChange={(e) => onChange({ ...segment, durationSec: minutesToSeconds(Number(e.target.value)) })}
								className="w-full rounded-xl border border-slate-300/70 bg-white/80 px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50"
							/>
						</Field>
					) : segment.type === 'WARMUP' || segment.type === 'COOLDOWN' ? (
						<>
							<Field label="Duration (min)">
								<input
									type="number"
									min={0}
									step={0.25}
									value={secondsToMinutes(segment.durationSec)}
									onChange={(e) => onChange({ ...segment, durationSec: minutesToSeconds(Number(e.target.value)) })}
									className="w-full rounded-xl border border-slate-300/70 bg-white/80 px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50"
								/>
							</Field>
							<Field label="Minimum (W)">
								<input
									type="number"
									min={0}
									step={5}
									value={getRampWatts(segment, ftp).minWatts}
									onChange={(e) => {
										const value = Math.max(0, Number(e.target.value));
										onChange({ ...segment, rampMinWatts: Math.min(value, getRampWatts(segment, ftp).maxWatts) });
									}}
									className="w-full rounded-xl border border-slate-300/70 bg-white/80 px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50"
								/>
							</Field>
							<Field label="Maximum (W)">
								<input
									type="number"
									min={0}
									step={5}
									value={getRampWatts(segment, ftp).maxWatts}
									onChange={(e) => {
										const value = Math.max(0, Number(e.target.value));
										onChange({ ...segment, rampMaxWatts: Math.max(value, getRampWatts(segment, ftp).minWatts) });
									}}
									className="w-full rounded-xl border border-slate-300/70 bg-white/80 px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50"
								/>
							</Field>
							<Field label="Step (W)">
								<input
									type="number"
									min={MIN_RAMP_STEP_WATTS}
									step={5}
									value={getRampWatts(segment, ftp).stepWatts}
									onChange={(e) => onChange({ ...segment, rampStepWatts: Math.max(MIN_RAMP_STEP_WATTS, Number(e.target.value)) })}
									className="w-full rounded-xl border border-slate-300/70 bg-white/80 px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50"
								/>
							</Field>
							<p className="col-span-2 self-center text-xs text-slate-400 sm:col-span-4">
								{segment.type === 'WARMUP' ? 'Ascending ramp' : 'Descending ramp'} from minimum to maximum watts.
							</p>
						</>
					) : (
						<>
							<Field label="Duration (min)">
								<input
									type="number"
									min={0}
									step={0.25}
									value={secondsToMinutes(segment.durationSec)}
									onChange={(e) => onChange({ ...segment, durationSec: minutesToSeconds(Number(e.target.value)) })}
									className="w-full rounded-xl border border-slate-300/70 bg-white/80 px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50"
								/>
							</Field>
							<Field label={`Intensity (${unitLabel})`}>
								<input
									type="number"
									min={0}
									value={segment.intensityValue}
									onChange={(e) => onChange({ ...segment, intensityValue: Number(e.target.value) })}
									className="w-full rounded-xl border border-slate-300/70 bg-white/80 px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50"
								/>
							</Field>
						</>
					)}
					{segment.type === 'FREE' && (
						<p className="col-span-2 self-center text-xs text-slate-400 sm:col-span-3">
							Open effort — no fixed target. Estimated at ~{FREE_RIDE_ASSUMED_PCT}% FTP for load estimates only.
						</p>
					)}
				</div>
			)}
		</div>
	);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<label className="flex flex-col gap-1">
			<span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
			{children}
		</label>
	);
}

// ---------- Workout timeline chart ----------

function WorkoutChart({ segments, mode, ftp }: { segments: WorkoutSegment[]; mode: IntensityMode; ftp: number }) {
	const blocks = buildChartBlocks(segments, mode, ftp);
	const totalSec = blocks.reduce((s, b) => s + b.durationSec, 0);
	const maxPct = Math.max(120, ...blocks.map((b) => b.pct));

	if (totalSec === 0) {
		return <div className="flex h-28 items-center justify-center text-sm text-slate-400">Add blocks to preview the workout profile</div>;
	}

	return (
		<div className="flex h-28 items-end gap-[1px] overflow-hidden rounded-lg bg-slate-50 p-2">
			{blocks.map((b) => {
				const widthPct = (b.durationSec / totalSec) * 100;
				const heightPct = Math.min(100, (Math.max(b.pct, 8) / maxPct) * 100);
				return (
					<div
						key={b.key}
						title={`${Math.round(b.pct)}% FTP · ${formatDuration(b.durationSec)}`}
						style={{ width: `${widthPct}%`, height: `${heightPct}%` }}
						className={`${zoneColor(b.isFree ? 0 : b.pct)} rounded-t-sm`}
					/>
				);
			})}
		</div>
	);
}

// ---------- Main page ----------

export default function CardioBuilderPage() {
	const [sport, setSport] = useState<SportType>('CYCLE');
	const [mode, setMode] = useState<IntensityMode>('FTP_PERCENT');
	const [ftp, setFtp] = useState<number>(DEFAULT_FTP);
	const [ftpDraft, setFtpDraft] = useState<string>(String(DEFAULT_FTP));
	const [ftpSaving, setFtpSaving] = useState(false);
	const [settingsId, setSettingsId] = useState<string | null>(null);

	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [segments, setSegments] = useState<WorkoutSegment[]>([]);
	const [activeDragType, setActiveDragType] = useState<SegmentType | null>(null);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [saveOk, setSaveOk] = useState(false);

	const [savedWorkouts, setSavedWorkouts] = useState<SavedWorkoutRow[]>([]);
	const [loadingSaved, setLoadingSaved] = useState(false);

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

	// Load FTP + preferred mode (Supabase first, localStorage fallback)
	useEffect(() => {
		let cancelled = false;
		async function loadSettings() {
			const localFtp = Number(window.localStorage.getItem('healthapp_ftp_watts') || '');
			const localMode = window.localStorage.getItem('healthapp_intensity_mode') as IntensityMode | null;
			if (localFtp) {
				setFtp(localFtp);
				setFtpDraft(String(localFtp));
			}
			if (localMode === 'WATTS' || localMode === 'FTP_PERCENT') setMode(localMode);

			if (!supabase) return;
			const { data, error } = await supabase.from('user_settings').select('*').limit(1).maybeSingle();
			if (cancelled || error || !data) return;
			setSettingsId(data.id);
			if (data.ftp_watts) {
				setFtp(data.ftp_watts);
				setFtpDraft(String(data.ftp_watts));
			}
			if (data.preferred_intensity_mode) setMode(data.preferred_intensity_mode);
		}
		loadSettings();
		return () => {
			cancelled = true;
		};
	}, []);

	async function saveFtp() {
		const parsed = Number(ftpDraft);
		if (!parsed || parsed <= 0) return;
		setFtp(parsed);
		window.localStorage.setItem('healthapp_ftp_watts', String(parsed));
		window.localStorage.setItem('healthapp_intensity_mode', mode);
		if (!supabase) return;

		setFtpSaving(true);
		try {
			if (settingsId) {
				await supabase
					.from('user_settings')
					.update({ ftp_watts: parsed, preferred_intensity_mode: mode, updated_at: new Date().toISOString() })
					.eq('id', settingsId);
			} else {
				const { data } = await supabase
					.from('user_settings')
					.insert([{ ftp_watts: parsed, preferred_intensity_mode: mode }])
					.select()
					.single();
				if (data) setSettingsId(data.id);
			}
		} finally {
			setFtpSaving(false);
		}
	}

	function toggleMode(next: IntensityMode) {
		if (next === mode) return;
		// Convert existing segment values so the displayed numbers stay meaningful.
		setSegments((prev) =>
			prev.map((seg) => {
				const converted: WorkoutSegment = { ...seg };
				if (seg.type !== 'FREE') {
					converted.intensityValue = convertValue(seg.intensityValue, mode, next, ftp);
				}
				if (seg.type === 'INTERVAL') {
					converted.restIntensityValue = convertValue(seg.restIntensityValue || 0, mode, next, ftp);
				}
				return converted;
			})
		);
		setMode(next);
		window.localStorage.setItem('healthapp_intensity_mode', next);
	}

	function convertValue(value: number, from: IntensityMode, to: IntensityMode, ftpWatts: number): number {
		if (from === to) return value;
		if (to === 'FTP_PERCENT') return ftpWatts ? Math.round((value / ftpWatts) * 100) : 0;
		return Math.round((ftpWatts || DEFAULT_FTP) * (value / 100));
	}

	function addSegment(type: SegmentType, insertBeforeId?: string, insertAfter = false) {
		setSegments((prev) => {
			const nextSegment = defaultSegment(type, mode, ftp);
			if (!insertBeforeId) return [...prev, nextSegment];

			const insertIndex = prev.findIndex((segment) => segment.id === insertBeforeId);
			if (insertIndex === -1) return [...prev, nextSegment];
			const targetIndex = insertAfter ? insertIndex + 1 : insertIndex;

			return [...prev.slice(0, targetIndex), nextSegment, ...prev.slice(targetIndex)];
		});
	}

	function updateSegment(id: string, next: WorkoutSegment) {
		setSegments((prev) => prev.map((s) => (s.id === id ? next : s)));
	}

	function removeSegment(id: string) {
		setSegments((prev) => prev.filter((s) => s.id !== id));
	}

	function duplicateSegment(id: string) {
		setSegments((prev) => {
			const idx = prev.findIndex((s) => s.id === id);
			if (idx === -1) return prev;
			const copy = { ...prev[idx], id: uid() };
			return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
		});
	}

	function handleDragStart(event: DragStartEvent) {
		const data = event.active.data.current;
		if (data?.fromPalette) setActiveDragType(data.segmentType as SegmentType);
	}

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		setActiveDragType(null);
		if (!over) return;

		const activeData = active.data.current;
		if (activeData?.fromPalette) {
			const droppedOnCanvas = over.id === 'canvas';
			const droppedOnSequenceBlock = segments.some((segment) => segment.id === over.id);
			if (droppedOnCanvas || droppedOnSequenceBlock) {
				const activeRect = active.rect.current.translated;
				const activeCenter = activeRect ? activeRect.top + activeRect.height / 2 : over.rect.top;
				const overCenter = over.rect.top + over.rect.height / 2;
				const insertAfter = !droppedOnCanvas && activeCenter > overCenter;
				addSegment(activeData.segmentType as SegmentType, droppedOnCanvas ? undefined : String(over.id), insertAfter);
			}
			return;
		}

		if (active.id !== over.id) {
			setSegments((prev) => {
				const oldIndex = prev.findIndex((s) => s.id === active.id);
				const newIndex = prev.findIndex((s) => s.id === over.id);
				if (oldIndex === -1 || newIndex === -1) return prev;
				return arrayMove(prev, oldIndex, newIndex);
			});
		}
	}

	const totals = useMemo(() => computeTotals(segments, mode, ftp), [segments, mode, ftp]);

	const suggestedTags = useMemo(() => {
		const tags = new Set<string>();
		segments.forEach((s) => {
			if (s.type === 'INTERVAL') tags.add('intervals');
			if (s.type === 'STEADY') tags.add('zone');
			if (s.type === 'FREE') tags.add('free_ride');
		});
		return Array.from(tags);
	}, [segments]);

	async function fetchSavedWorkouts() {
		if (!supabase) return;
		setLoadingSaved(true);
		const { data, error } = await supabase
			.from('planned_workouts')
			.select('*')
			.eq('category', 'Custom Builder')
			.order('created_at', { ascending: false });
		if (!error && data) setSavedWorkouts(data as SavedWorkoutRow[]);
		setLoadingSaved(false);
	}

	useEffect(() => {
		fetchSavedWorkouts();
	}, []);

	async function handleSave() {
		setSaveError(null);
		setSaveOk(false);
		if (!title.trim()) {
			setSaveError('Give the workout a title first.');
			return;
		}
		if (segments.length === 0) {
			setSaveError('Add at least one block before saving.');
			return;
		}
		if (!supabase) {
			setSaveError('Supabase is not configured, so this workout cannot be saved yet.');
			return;
		}

		setSaving(true);
		const payload = {
			title: title.trim(),
			description: description.trim() || null,
			sport,
			target_duration_minutes: Math.max(1, Math.round(totals.totalSec / 60)),
			estimated_tss: Math.round(totals.tss),
			workout_type: 'Custom Structured',
			category: 'Custom Builder',
			tags: suggestedTags,
			structure: segments,
			intensity_mode: mode,
			ftp_used_watts: ftp,
		};

		const { error } = await supabase.from('planned_workouts').insert([payload]);
		setSaving(false);
		if (error) {
			setSaveError(error.message);
			return;
		}
		setSaveOk(true);
		setTitle('');
		setDescription('');
		setSegments([]);
		fetchSavedWorkouts();
		setTimeout(() => setSaveOk(false), 3000);
	}

	async function deleteSaved(id: string) {
		if (!supabase || !confirm('Delete this custom workout?')) return;
		const { error } = await supabase.from('planned_workouts').delete().eq('id', id);
		if (!error) fetchSavedWorkouts();
	}

	function loadSaved(row: SavedWorkoutRow) {
		setTitle(row.title);
		setDescription(row.description || '');
		setSport(row.sport);
		setSegments(row.structure || []);
		if (row.intensity_mode) setMode(row.intensity_mode);
		if (row.ftp_used_watts) setFtp(row.ftp_used_watts);
	}

	return (
		<div className="min-h-screen bg-[linear-gradient(to_bottom_right,#3b577e,#539974)] text-slate-100">
			<div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-40 pt-8 sm:px-6">
				<div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[2rem] border border-slate-300/40 bg-transparent p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
				<div>
					<p className="text-[11px] font-black uppercase tracking-[0.32em] text-white">Workout Builder</p>
					<h1 className="mt-2 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">Build a Cardio Workout</h1>
					<p className="mt-1 text-sm text-slate-200">Drag blocks together, tune the numbers, save it to your library.</p>
				</div>
				<Link
					href="/workout/library"
					className="rounded-full border border-white/60 bg-transparent px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:border-emerald-300 hover:text-emerald-200"
				>
					Back to Library
				</Link>
			</div>

			{/* Activity + FTP bar */}
			<div className="mb-6 flex flex-wrap items-center gap-4 rounded-[2rem] border border-slate-300/40 bg-transparent p-5">
				<div className="flex items-center gap-2">
					{SPORT_OPTIONS.map((opt) => (
						<button
							key={opt.value}
							type="button"
							onClick={() => setSport(opt.value)}
							className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide transition ${
									sport === opt.value ? 'bg-emerald-500 text-slate-950 shadow' : 'bg-slate-900/20 text-white hover:bg-slate-900/30'
							}`}
						>
							{opt.icon}
							{opt.label}
						</button>
					))}
				</div>

				<div className="h-8 w-px bg-white/30" />

				<div className="flex items-center gap-1 rounded-xl bg-slate-900/20 p-1">
					<button
						type="button"
						onClick={() => toggleMode('FTP_PERCENT')}
						className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
							mode === 'FTP_PERCENT' ? 'bg-emerald-400 text-slate-950 shadow' : 'text-slate-200'
						}`}
					>
						% FTP
					</button>
					<button
						type="button"
						onClick={() => toggleMode('WATTS')}
						className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
							mode === 'WATTS' ? 'bg-emerald-400 text-slate-950 shadow' : 'text-slate-200'
						}`}
					>
						Watts
					</button>
				</div>

				<div className="flex items-center gap-2">
					<label className="text-xs font-bold uppercase tracking-wide text-slate-400">FTP</label>
					<input
						type="number"
						min={0}
						value={ftpDraft}
						onChange={(e) => setFtpDraft(e.target.value)}
						onBlur={saveFtp}
						className="w-24 rounded-xl border border-white/50 bg-white/80 px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-200/50"
					/>
					<span className="text-xs font-semibold text-slate-200">watts</span>
					{ftpSaving && <Loader2 size={14} className="animate-spin text-emerald-200" />}
				</div>
			</div>

			<DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
				<div className="space-y-6 rounded-[2rem] bg-[#c4ced6] p-5 text-slate-900 sm:p-6">
					{/* Palette */}
					<div>
						<p className="mb-2 text-[11px] font-black uppercase tracking-[0.28em] text-slate-600">Blocks</p>
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
							{PALETTE_ORDER.map((type) => (
								<PaletteCard key={type} type={type} />
							))}
						</div>
					</div>

					{/* Canvas + chart + save */}
					<div className="space-y-6">
						<div>
							<p className="mb-2 text-[11px] font-black uppercase tracking-[0.28em] text-slate-600">Timeline</p>
							<WorkoutChart segments={segments} mode={mode} ftp={ftp} />
							<div className="mt-3 flex flex-wrap gap-4 text-xs font-black uppercase tracking-wide text-slate-700">
								<span>Duration: {formatDuration(totals.totalSec)}</span>
								<span>Avg Intensity: {Math.round(totals.avgPct)}% FTP</span>
								<span className="flex items-center gap-1"><Flame size={14} className="text-orange-400" /> Est. TSS: {Math.round(totals.tss)}</span>
							</div>
						</div>

						<div>
							<p className="mb-2 text-[11px] font-black uppercase tracking-[0.28em] text-slate-600">Sequence</p>
							<SortableContext items={segments.map((s) => s.id)} strategy={verticalListSortingStrategy}>
								<Canvas isEmpty={segments.length === 0}>
									{segments.map((seg) => (
										<SegmentCard
											key={seg.id}
											segment={seg}
											mode={mode}
											ftp={ftp}
											onChange={(next) => updateSegment(seg.id, next)}
											onRemove={() => removeSegment(seg.id)}
											onDuplicate={() => duplicateSegment(seg.id)}
										/>
									))}
								</Canvas>
							</SortableContext>
						</div>

						{/* Save form */}
						<div className="rounded-[1.75rem] border border-slate-300/50 bg-white/75 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.12)]">
							<p className="mb-3 text-[11px] font-black uppercase tracking-[0.28em] text-slate-600">Save to Library</p>
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<input
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									placeholder="Workout title (e.g. Sweet Spot 3x12)"
									className="rounded-xl border border-slate-300/70 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50 sm:col-span-2"
								/>
								<textarea
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									placeholder="Notes / execution instructions (optional)"
									rows={2}
									className="rounded-xl border border-slate-300/70 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/50 sm:col-span-2"
								/>
							</div>
							<div className="mt-3 flex items-center justify-between">
								<div className="text-xs font-semibold text-rose-500">{saveError}</div>
								<button
									type="button"
									onClick={handleSave}
									disabled={saving}
									className="flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-950 shadow transition hover:bg-emerald-400 disabled:opacity-50"
								>
									{saving ? <Loader2 size={16} className="animate-spin" /> : saveOk ? <Check size={16} /> : <Save size={16} />}
									{saveOk ? 'Saved' : 'Save Workout'}
								</button>
							</div>
						</div>
					</div>
				</div>

				<DragOverlay>
					{activeDragType && (
						<div className="rounded-2xl border border-blue-300 bg-white p-3 shadow-lg">
							<div className="flex items-center gap-2 font-bold text-sm text-slate-700">
								{SEGMENT_META[activeDragType].icon}
								{SEGMENT_META[activeDragType].label}
							</div>
						</div>
					)}
				</DragOverlay>
			</DndContext>

			{/* Saved custom workouts */}
			<div className="mt-6 rounded-[2rem] bg-[#c4ced6] p-5 text-slate-900 sm:p-6">
				<p className="mb-3 text-[11px] font-black uppercase tracking-[0.28em] text-slate-600">Your Custom Workouts</p>
				{loadingSaved ? (
					<div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" /> Loading…</div>
				) : savedWorkouts.length === 0 ? (
					<p className="text-sm text-slate-400">No custom workouts saved yet.</p>
				) : (
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						{savedWorkouts.map((row) => (
							<div key={row.id} className="rounded-[1.75rem] border border-slate-300/50 bg-white/75 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.12)]">
								<div className="flex items-start justify-between gap-2">
									<div>
										<p className="font-bold text-slate-700">{row.title}</p>
										<p className="text-xs text-slate-400">
											{row.sport} · {row.target_duration_minutes}m · ~{row.estimated_tss ?? 0} TSS
										</p>
									</div>
									<button
										type="button"
										onClick={() => deleteSaved(row.id)}
										aria-label="Delete workout"
										className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
									>
										<Trash2 size={16} />
									</button>
								</div>
								<button
									type="button"
									onClick={() => loadSaved(row)}
										className="mt-3 w-full rounded-full border border-slate-400/60 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-700 transition hover:border-emerald-500 hover:text-emerald-700"
								>
									Load into Builder
								</button>
							</div>
						))}
					</div>
				)}
			</div>
			</div>
			</div>
	);
}
