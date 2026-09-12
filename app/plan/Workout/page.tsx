'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, ArrowRight, Bike, CheckCircle2, ChevronLeft, Clock3, Dumbbell, Gauge, Play, Route, Target, TrendingUp, Waves } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useWorkout } from '../../context/WorkoutContext';
import { supabase } from '../../supabase';

type SportType = 'RUN' | 'CYCLE' | 'SWIM';
type WorkoutMode = 'CARDIO' | 'STRENGTH';

type ScheduledWorkoutEntry = {
	dayNumber: number;
	workoutId: string;
	notes?: string;
};

type MicrocycleRow = {
	id: string;
	week_number: number;
	start_date: string;
	end_date: string;
	length_days: number | null;
	scheduled_workouts: unknown;
	is_recovery_week: boolean | null;
};

type WorkoutTemplateRow = {
	id: string;
	title: string;
	description: string | null;
	sport: SportType;
	target_duration_minutes: number;
	target_distance_km: number | null;
	target_rpe: number | null;
	workout_type: string | null;
	category: string | null;
	tags: string[] | null;
	estimated_tss: number | null;
};

interface WorkoutDetail {
	id: string;
	title: string;
	description: string | null;
	sport: SportType;
	targetDurationMinutes: number;
	targetDistanceKm: number | null;
	targetRpe: number | null;
	workoutType: string | null;
	category: string | null;
	tags: string[];
	estimatedTss: number | null;
	notes: string | null;
}

interface DayItem {
	key: string;
	date: Date;
	dayNumber: number;
	workout: WorkoutDetail | null;
}

interface MicrocycleView {
	id: string;
	weekNumber: number;
	startDate: string;
	endDate: string;
	isRecoveryWeek: boolean;
}

interface CardioLog {
	durationMinutes: number;
	distanceKm: number;
	avgPace: number;
	rpe: number;
	completedAt: string;
	notes?: string;
}

interface LoggedStrengthExercise {
	name: string;
	sets: Array<{ weight: number; reps: number }>;
}

interface LoggedStrengthWorkout {
	completedAt: string;
	exercises: LoggedStrengthExercise[];
	note?: string;
}

function toDateKey(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function getDaysInRange(startDate: string, endDate: string) {
	const days: Array<{ key: string; date: Date }> = [];
	const current = new Date(`${startDate}T00:00:00`);
	const end = new Date(`${endDate}T00:00:00`);

	while (current <= end) {
		days.push({
			key: toDateKey(current),
			date: new Date(current),
		});
		current.setDate(current.getDate() + 1);
	}

	return days;
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

			const entry: ScheduledWorkoutEntry = { dayNumber, workoutId };
			if (notes) entry.notes = notes;
			return entry;
		})
		.filter((entry): entry is ScheduledWorkoutEntry => Boolean(entry));
}

function formatDateRange(startDate: string, endDate: string): string {
	const start = new Date(`${startDate}T00:00:00`);
	const end = new Date(`${endDate}T00:00:00`);
	const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
	return `${fmt.format(start)} - ${fmt.format(end)}`;
}

function resolveWorkoutMode(workout: WorkoutDetail): WorkoutMode {
	const haystack = [
		workout.title,
		workout.description || '',
		workout.workoutType || '',
		workout.category || '',
		workout.tags.join(' '),
	].join(' ').toLowerCase();

	const strengthPattern = /(lift|strength|hypertrophy|resistance|barbell|dumbbell|squat|deadlift|bench|press|pull|row|gym)/;
	if (strengthPattern.test(haystack)) return 'STRENGTH';
	return 'CARDIO';
}

function getSportIcon(sport: SportType) {
	switch (sport) {
		case 'RUN':
			return <Activity size={18} className="text-slate-100" />;
		case 'SWIM':
			return <Waves size={18} className="text-slate-100" />;
		default:
			return <Bike size={18} className="text-slate-100" />;
	}
}

function getStoredWorkoutLogs(workoutId: string) {
	if (typeof window === 'undefined') return { cardio: null as CardioLog | null, strength: null as LoggedStrengthWorkout | null };

	try {
		const cardioRaw = window.localStorage.getItem(`healthapp_cardio_log_${workoutId}`);
		const strengthRaw = window.localStorage.getItem(`healthapp_strength_log_${workoutId}`);

		return {
			cardio: cardioRaw ? (JSON.parse(cardioRaw) as CardioLog) : null,
			strength: strengthRaw ? (JSON.parse(strengthRaw) as LoggedStrengthWorkout) : null,
		};
	} catch {
		return { cardio: null, strength: null };
	}
}

export default function WorkoutDetailPage() {
	const router = useRouter();
	const { session } = useWorkout();
	const [loading, setLoading] = useState(true);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [microcycle, setMicrocycle] = useState<MicrocycleView | null>(null);
	const [dayItems, setDayItems] = useState<DayItem[]>([]);
	const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
	const [cardioLog, setCardioLog] = useState<CardioLog | null>(null);
	const [strengthLog, setStrengthLog] = useState<LoggedStrengthWorkout | null>(null);

	useEffect(() => {
		async function fetchWorkoutDetail() {
			if (!supabase) {
				setErrorMsg('Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
				setLoading(false);
				return;
			}

			const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
			const requestedMicrocycleId = params?.get('microcycleId') || null;
			const requestedWorkoutId = params?.get('workoutId') || null;
			const requestedDay = params?.get('day') || null;

			let microcycleRow: MicrocycleRow | null = null;

			if (requestedMicrocycleId) {
				const { data, error } = await supabase
					.from('microcycles')
					.select('id, week_number, start_date, end_date, length_days, scheduled_workouts, is_recovery_week')
					.eq('id', requestedMicrocycleId)
					.maybeSingle();

				if (error) {
					setErrorMsg(`Failed to load microcycle: ${error.message}`);
					setLoading(false);
					return;
				}

				microcycleRow = (data as MicrocycleRow | null) || null;
			}

			if (!microcycleRow) {
				const { data, error } = await supabase
					.from('microcycles')
					.select('id, week_number, start_date, end_date, length_days, scheduled_workouts, is_recovery_week')
					.order('start_date', { ascending: true });

				if (error) {
					setErrorMsg(`Failed to load microcycles: ${error.message}`);
					setLoading(false);
					return;
				}

				const rows = (data as MicrocycleRow[]) || [];
				if (rows.length === 0) {
					setErrorMsg('No microcycles found.');
					setLoading(false);
					return;
				}

				const now = new Date();
				microcycleRow =
					rows.find((row) => {
						const start = new Date(`${row.start_date}T00:00:00`);
						const end = new Date(`${row.end_date}T23:59:59`);
						return now >= start && now <= end;
					}) || rows[0];
			}

			const scheduledEntries = parseScheduledWorkouts(microcycleRow.scheduled_workouts);
			const workoutIds = Array.from(new Set(scheduledEntries.map((entry) => entry.workoutId)));
			const templateById: Record<string, WorkoutTemplateRow> = {};

			if (workoutIds.length > 0) {
				const { data, error } = await supabase
					.from('planned_workouts')
					.select('id, title, description, sport, target_duration_minutes, target_distance_km, target_rpe, workout_type, category, tags, estimated_tss')
					.in('id', workoutIds);

				if (error) {
					setErrorMsg(`Failed to load workout templates: ${error.message}`);
					setLoading(false);
					return;
				}

				((data || []) as WorkoutTemplateRow[]).forEach((row) => {
					templateById[row.id] = row;
				});
			}

			const dayList = getDaysInRange(microcycleRow.start_date, microcycleRow.end_date);
			const mappedDays: DayItem[] = dayList.map((day, index) => {
				const dayNumber = index + 1;
				const scheduled = scheduledEntries.find((entry) => entry.dayNumber === dayNumber);
				const template = scheduled ? templateById[scheduled.workoutId] : null;

				return {
					key: day.key,
					date: day.date,
					dayNumber,
					workout: template
						? {
								id: template.id,
								title: template.title,
								description: template.description,
								sport: template.sport,
								targetDurationMinutes: template.target_duration_minutes,
								targetDistanceKm: template.target_distance_km,
								targetRpe: template.target_rpe,
								workoutType: template.workout_type,
								category: template.category,
								tags: template.tags || [],
								estimatedTss: template.estimated_tss,
								notes: scheduled?.notes || null,
							}
						: null,
				};
			});

			const todayKey = toDateKey(new Date());
			const fallbackDayKey =
				mappedDays.find((day) => day.key === requestedDay)?.key ||
				mappedDays.find((day) => (requestedWorkoutId ? day.workout?.id === requestedWorkoutId : false))?.key ||
				mappedDays.find((day) => day.key === todayKey)?.key ||
				mappedDays[0]?.key ||
				null;

			setMicrocycle({
				id: microcycleRow.id,
				weekNumber: microcycleRow.week_number,
				startDate: microcycleRow.start_date,
				endDate: microcycleRow.end_date,
				isRecoveryWeek: microcycleRow.is_recovery_week ?? false,
			});
			setDayItems(mappedDays);
			setSelectedDayKey(fallbackDayKey);
			setLoading(false);
		}

		fetchWorkoutDetail();
	}, []);

	const selectedDay = useMemo(() => {
		return dayItems.find((day) => day.key === selectedDayKey) || dayItems[0] || null;
	}, [dayItems, selectedDayKey]);

	const selectedWorkout = selectedDay?.workout || null;
	const selectedMode = selectedWorkout ? resolveWorkoutMode(selectedWorkout) : null;

	useEffect(() => {
		if (!microcycle || !selectedDay || typeof window === 'undefined') return;
		const params = new URLSearchParams();
		params.set('microcycleId', microcycle.id);
		params.set('day', selectedDay.key);
		if (selectedDay.workout?.id) params.set('workoutId', selectedDay.workout.id);
		window.history.replaceState(null, '', `/plan/Workout?${params.toString()}`);
	}, [microcycle, selectedDay]);

	useEffect(() => {
		if (!selectedWorkout) {
			setCardioLog(null);
			setStrengthLog(null);
			return;
		}

		const { cardio, strength } = getStoredWorkoutLogs(selectedWorkout.id);
		setCardioLog(cardio);
		setStrengthLog(strength);
	}, [selectedWorkout]);

	useEffect(() => {
		if (!selectedWorkout || !session || session.activePlan?.id !== selectedWorkout.id || !session.sessionExercises?.length) return;
		const plannedStrengthLog: LoggedStrengthWorkout = {
			completedAt: new Date().toISOString(),
			exercises: session.sessionExercises,
			note: 'Logged from current training session',
		};
		setStrengthLog(plannedStrengthLog);
	}, [selectedWorkout, session]);

	const markCardioComplete = () => {
		if (!selectedWorkout || !selectedMode || selectedMode !== 'CARDIO') return;

		const nextLog: CardioLog = {
			durationMinutes: Math.max(selectedWorkout.targetDurationMinutes, selectedWorkout.targetDurationMinutes - 5),
			distanceKm: Number((selectedWorkout.targetDistanceKm ?? 0) + 0.6),
			avgPace: Number((selectedWorkout.targetDistanceKm ? (selectedWorkout.targetDurationMinutes / (selectedWorkout.targetDistanceKm || 1)) : 5.5).toFixed(1)),
			rpe: Math.min(9, Math.max(6, (selectedWorkout.targetRpe ?? 7) + 1)),
			completedAt: new Date().toISOString(),
			notes: 'Completed from workout dashboard',
		};

		window.localStorage.setItem(`healthapp_cardio_log_${selectedWorkout.id}`, JSON.stringify(nextLog));
		setCardioLog(nextLog);
	};

	const handleExecuteWorkout = () => {
		if (!selectedWorkout) return;
		router.push(`/workout/train?workoutId=${encodeURIComponent(selectedWorkout.id)}&title=${encodeURIComponent(selectedWorkout.title)}`);
	};

	const totalLoggedSets = strengthLog?.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0) ?? 0;
	const totalLoggedVolume = strengthLog?.exercises.reduce(
		(sum, exercise) => sum + exercise.sets.reduce((exerciseTotal, set) => exerciseTotal + set.weight * set.reps, 0),
		0,
	) ?? 0;

	if (loading) {
		return (
			<div className="min-h-screen bg-[linear-gradient(to_bottom_right,#3b577e,#539974)] px-6 py-10 text-slate-300">
				<div className="mx-auto max-w-4xl animate-pulse rounded-3xl border border-slate-700/50 bg-slate-900/40 p-6">
					Loading workout detail...
				</div>
			</div>
		);
	}

	if (errorMsg || !microcycle || !selectedDay) {
		return (
			<div className="min-h-screen bg-[linear-gradient(to_bottom_right,#3b577e,#539974)] px-6 py-10 text-slate-300">
				<div className="mx-auto max-w-4xl rounded-3xl border border-red-800/50 bg-red-950/40 p-6">
					{errorMsg || 'Unable to load workout detail.'}
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[linear-gradient(to_bottom_right,#3b577e,#539974)] text-slate-100">
			<div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 pb-12 pt-8 sm:px-6">
				<header className="rounded-[2rem] bg-transparent p-5">
					<div className="flex items-center gap-4">
						<Link
							href={`/plan/microcycle?microcycleId=${microcycle.id}`}
							aria-label="Back to microcycle"
							className="inline-flex h-12 w-12 items-center justify-center rounded-full text-white transition hover:text-emerald-200"
						>
							<ChevronLeft size={28} />
						</Link>
						<div className="min-w-0 flex-1">
							<h1 className="text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">Workout Dashboard</h1>
							<p className="mt-2 text-sm font-medium text-slate-200/90 sm:text-base">
								Week {microcycle.weekNumber} · {formatDateRange(microcycle.startDate, microcycle.endDate)}
							</p>
						</div>
					</div>
				</header>

				<section className="mt-6 rounded-[2rem] border border-slate-300/40 bg-slate-900/20 p-4">
					<div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
						<div className="flex w-max gap-3">
							{dayItems.map((day) => {
								const isSelected = day.key === selectedDay.key;
								const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(day.date);
								return (
									<button
										key={day.key}
										type="button"
										onClick={() => setSelectedDayKey(day.key)}
										className={`min-w-[88px] rounded-2xl border px-3 py-3 text-center transition ${
											isSelected
												? 'border-emerald-200 bg-emerald-500/85 text-slate-950'
												: 'border-slate-300/50 bg-slate-900/30 text-slate-100 hover:border-emerald-200/70'
										}`}
									>
										<p className="text-[10px] font-black uppercase tracking-[0.2em]">{weekday}</p>
										<p className="mt-1 text-2xl font-black leading-none">{day.date.getDate()}</p>
										<p className={`mt-2 text-[10px] font-black uppercase tracking-[0.14em] ${isSelected ? 'text-slate-900' : 'text-slate-200'}`}>
											{day.workout ? 'Planned' : 'Rest'}
										</p>
									</button>
								);
							})}
						</div>
					</div>
				</section>

				<section className="mt-6 rounded-[2rem] bg-[#c4ced6] p-5 text-slate-900">
					<p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-600">
						{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(selectedDay.date)}
					</p>

					{!selectedWorkout && (
						<div className="mt-4 rounded-[1.5rem] border border-slate-400/40 bg-white/70 p-6">
							<h2 className="text-2xl font-black uppercase tracking-tight">Recovery / Rest Day</h2>
							<p className="mt-2 text-sm text-slate-700">No planned workout is scheduled for this day in the selected microcycle.</p>
						</div>
					)}

					{selectedWorkout && selectedMode === 'CARDIO' && (
						<div className="mt-4 rounded-[1.5rem] border border-[#5A747F]/40 bg-[linear-gradient(135deg,#5E7F92,#4A6070)] p-6 text-slate-100 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
							<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/20">{getSportIcon(selectedWorkout.sport)}</div>
									<div>
										<p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-200">Cardiovascular</p>
										<h2 className="text-2xl font-black uppercase tracking-tight">{selectedWorkout.title}</h2>
									</div>
								</div>
								{cardioLog ? (
									<div className="flex items-center gap-2 rounded-full bg-emerald-400/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100">
										<CheckCircle2 size={14} /> Completed
									</div>
								) : (
									<div className="flex items-center gap-2 rounded-full bg-slate-200/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
										<Target size={14} /> Planned
									</div>
								)}
							</div>

							<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
								<div className="rounded-xl bg-black/20 p-3"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-200">Duration</p><p className="mt-1 flex items-center gap-2 text-lg font-black"><Clock3 size={16} />{selectedWorkout.targetDurationMinutes} min</p></div>
								<div className="rounded-xl bg-black/20 p-3"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-200">Distance</p><p className="mt-1 flex items-center gap-2 text-lg font-black"><Route size={16} />{selectedWorkout.targetDistanceKm ?? 0} km</p></div>
								<div className="rounded-xl bg-black/20 p-3"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-200">RPE</p><p className="mt-1 flex items-center gap-2 text-lg font-black"><Gauge size={16} />{selectedWorkout.targetRpe ?? '-'}</p></div>
								<div className="rounded-xl bg-black/20 p-3"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-200">Type</p><p className="mt-1 text-lg font-black uppercase tracking-tight">{selectedWorkout.workoutType || 'General'}</p></div>
							</div>

							{cardioLog ? (
								<div className="mt-6 rounded-2xl bg-slate-950/20 p-4">
									<div className="flex items-center gap-2 text-emerald-100"><TrendingUp size={16} /> <span className="text-[10px] font-black uppercase tracking-[0.2em]">Completed vs planned</span></div>
									<div className="mt-4 grid gap-3 sm:grid-cols-2">
										<div className="rounded-xl bg-black/20 p-3">
											<p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-200">Planned</p>
											<ul className="mt-2 space-y-2 text-sm">
												<li>Duration: {selectedWorkout.targetDurationMinutes} min</li>
												<li>Distance: {selectedWorkout.targetDistanceKm ?? 0} km</li>
												<li>RPE: {selectedWorkout.targetRpe ?? '-'} </li>
											</ul>
										</div>
										<div className="rounded-xl bg-emerald-500/10 p-3">
											<p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100">Executed</p>
											<ul className="mt-2 space-y-2 text-sm">
												<li>Duration: {cardioLog.durationMinutes} min</li>
												<li>Distance: {cardioLog.distanceKm} km</li>
												<li>RPE: {cardioLog.rpe}</li>
											</ul>
										</div>
									</div>
								</div>
							) : (
								<div className="mt-6 rounded-2xl border border-dashed border-slate-300/60 bg-black/10 p-4">
									<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
										<div>
											<p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-200">Session status</p>
											<h3 className="mt-2 text-xl font-black uppercase tracking-tight">Planned and pending completion</h3>
										</div>
										<button
											type="button"
											onClick={markCardioComplete}
											className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-slate-800"
										>
											<CheckCircle2 size={16} /> Log completion
										</button>
									</div>
								</div>
							)}

							{(selectedWorkout.description || selectedWorkout.notes) && (
								<div className="mt-4 rounded-xl bg-black/20 p-4 text-sm leading-relaxed text-slate-100">
									{selectedWorkout.description && <p>{selectedWorkout.description}</p>}
									{selectedWorkout.notes && <p className="mt-2 font-semibold text-emerald-100">Coach note: {selectedWorkout.notes}</p>}
								</div>
							)}
						</div>
					)}

					{selectedWorkout && selectedMode === 'STRENGTH' && (
						<div className="mt-4 rounded-[1.5rem] border border-[#9B7A54]/45 bg-[linear-gradient(135deg,#8F6B49,#6E523A)] p-6 text-amber-50 shadow-[0_16px_40px_rgba(0,0,0,0.2)]">
							<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/20"><Dumbbell size={18} className="text-amber-100" /></div>
									<div>
										<p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-100/90">Weight Lifting</p>
										<h2 className="text-2xl font-black uppercase tracking-tight">{selectedWorkout.title}</h2>
									</div>
								</div>
								{strengthLog ? (
									<div className="flex items-center gap-2 rounded-full bg-emerald-400/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-50">
										<CheckCircle2 size={14} /> Logged
									</div>
								) : (
									<div className="flex items-center gap-2 rounded-full bg-amber-900/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-amber-100">
										<Play size={14} /> Not started
									</div>
								)}
							</div>

							<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
								<div className="rounded-xl bg-black/20 p-3"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-100/90">Session</p><p className="mt-1 text-lg font-black uppercase tracking-tight">{selectedWorkout.workoutType || 'Strength'}</p></div>
								<div className="rounded-xl bg-black/20 p-3"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-100/90">Duration</p><p className="mt-1 text-lg font-black">{selectedWorkout.targetDurationMinutes} min</p></div>
								<div className="rounded-xl bg-black/20 p-3"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-100/90">RPE Target</p><p className="mt-1 text-lg font-black">{selectedWorkout.targetRpe ?? '-'}</p></div>
								<div className="rounded-xl bg-black/20 p-3"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-100/90">Estimated TSS</p><p className="mt-1 text-lg font-black">{selectedWorkout.estimatedTss ?? '-'}</p></div>
							</div>

							<div className="mt-4 flex flex-wrap gap-2">
								{(selectedWorkout.tags.length > 0 ? selectedWorkout.tags : ['strength']).map((tag) => (
									<span key={tag} className="rounded-full bg-black/25 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]">{tag}</span>
								))}
							</div>

							{strengthLog ? (
								<div className="mt-6 rounded-2xl bg-slate-950/20 p-4">
									<div className="flex items-center gap-2 text-emerald-100"><TrendingUp size={16} /> <span className="text-[10px] font-black uppercase tracking-[0.2em]">Plan vs executed</span></div>
									<div className="mt-4 grid gap-3 lg:grid-cols-2">
										<div className="rounded-xl bg-black/20 p-3">
											<p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-100/90">Planned session</p>
											<ul className="mt-2 space-y-2 text-sm">
												<li>Target duration: {selectedWorkout.targetDurationMinutes} min</li>
												<li>Target RPE: {selectedWorkout.targetRpe ?? '-'} </li>
												<li>Session type: {selectedWorkout.workoutType || 'Strength'}</li>
											</ul>
										</div>
										<div className="rounded-xl bg-emerald-500/10 p-3">
											<p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100">Executed</p>
											<ul className="mt-2 space-y-2 text-sm">
												<li>Sets logged: {totalLoggedSets}</li>
												<li>Total volume: {totalLoggedVolume} lb·reps</li>
												<li>Exercises: {strengthLog.exercises.length}</li>
											</ul>
										</div>
									</div>
									<div className="mt-4 space-y-3">
										{strengthLog.exercises.map((exercise) => (
											<div key={exercise.name} className="rounded-xl bg-black/15 p-3">
												<div className="flex items-center justify-between gap-3">
													<p className="font-black uppercase tracking-tight">{exercise.name}</p>
													<span className="text-[10px] uppercase tracking-[0.2em] text-amber-100/70">{exercise.sets.length} sets</span>
												</div>
												<div className="mt-2 flex flex-wrap gap-2">
													{exercise.sets.map((set, index) => (
														<span key={`${exercise.name}-${index}`} className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">
															{set.weight} × {set.reps}
														</span>
													))}
												</div>
											</div>
										))}
									</div>
								</div>
							) : (
								<div className="mt-6 rounded-2xl border border-dashed border-amber-200/70 bg-black/10 p-4">
									<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
										<div>
											<p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-100/90">Session state</p>
											<h3 className="mt-2 text-xl font-black uppercase tracking-tight">Planned but not executed</h3>
										</div>
										<button
											type="button"
											onClick={handleExecuteWorkout}
											className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-slate-800"
										>
											Execute workout <ArrowRight size={16} />
										</button>
									</div>
								</div>
							)}

							{(selectedWorkout.description || selectedWorkout.notes) && (
								<div className="mt-4 rounded-xl bg-black/20 p-4 text-sm leading-relaxed text-amber-50">
									{selectedWorkout.description && <p>{selectedWorkout.description}</p>}
									{selectedWorkout.notes && <p className="mt-2 font-semibold text-amber-100">Coach note: {selectedWorkout.notes}</p>}
								</div>
							)}
						</div>
					)}
				</section>
			</div>
		</div>
	);
}
