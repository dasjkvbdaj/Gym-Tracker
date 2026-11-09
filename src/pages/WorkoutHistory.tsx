import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  Edit3,
  Flame,
  History as HistoryIcon,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useGym } from '../context/GymContext';
import { generateId } from '../database/db';
import {
  ExerciseEntry,
  MuscleGroup,
  SetEntry,
  WeightUnit,
  WorkoutSession,
} from '../types/workout';
import {
  formatDurationMinutes,
  formatFullDate,
  formatTimeFromTimestamp,
  toLocalDateString,
} from '../utils/dateUtils';
import {
  MUSCLE_GROUPS,
  translateMuscleGroup,
} from '../utils/i18n';
import { formatSetPerformance } from '../utils/unitConversion';

export const WorkoutHistory: React.FC = () => {
  const {
    completedWorkouts,
    exercises,
    settings,
    saveHistoricalWorkout,
    deleteWorkout,
    openStartWorkoutForDate,
  } = useGym();

  const lang = settings.language;
  const isDark = settings.theme === 'dark';

  const [filterType, setFilterType] = useState<'ALL' | 'strength' | 'cardio'>('ALL');
  const [filterMuscle, setFilterMuscle] = useState<MuscleGroup | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(
    completedWorkouts[0]?.id || null
  );

  // Edit Historical Workout Modal State
  const [editingWorkout, setEditingWorkout] = useState<WorkoutSession | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Add Forgotten Workout Date Picker Modal
  const [isAddPastModalOpen, setIsAddPastModalOpen] = useState(false);
  const [pastDate, setPastDate] = useState<string>(() => toLocalDateString(new Date()));
  const [pastType, setPastType] = useState<'strength' | 'cardio'>('strength');

  const filteredWorkouts = useMemo(() => {
    return completedWorkouts.filter((w) => {
      if (filterType !== 'ALL' && w.workoutType !== filterType) return false;
      if (filterMuscle !== 'ALL' && !w.muscleGroups.includes(filterMuscle)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const titleMatch = w.title.toLowerCase().includes(q);
        const dateMatch = w.actualDate.includes(q);
        const exMatch = (w.exercises || []).some((e) =>
          e.exerciseNameSnapshot.toLowerCase().includes(q)
        );
        if (!titleMatch && !dateMatch && !exMatch) return false;
      }
      return true;
    });
  }, [completedWorkouts, filterType, filterMuscle, searchQuery]);

  // --- EDIT MODAL HANDLERS ---
  const handleEditSetChange = (
    entryId: string,
    setId: string,
    field: 'weight' | 'reps',
    val: number
  ) => {
    if (!editingWorkout) return;
    const updatedEx = editingWorkout.exercises.map((ex) => {
      if (ex.id !== entryId) return ex;
      const updatedSets = ex.sets.map((s) => {
        if (s.id !== setId) return s;
        if (field === 'weight') {
          return {
            ...s,
            weight: ex.weightType === 'none' ? null : Math.max(0, val),
          };
        }
        return { ...s, reps: Math.max(0, Math.round(val)) };
      });
      return { ...ex, sets: updatedSets };
    });
    setEditingWorkout({ ...editingWorkout, exercises: updatedEx });
  };

  const handleEditExerciseUnit = (entryId: string, newUnit: WeightUnit) => {
    if (!editingWorkout) return;
    const updatedEx = editingWorkout.exercises.map((ex) => {
      if (ex.id !== entryId) return ex;
      const sets = ex.sets.map((s) => ({
        ...s,
        weight: newUnit === 'none' ? null : s.weight ?? 0,
      }));
      return { ...ex, weightType: newUnit, sets };
    });
    setEditingWorkout({ ...editingWorkout, exercises: updatedEx });
  };

  const handleEditAddSet = (entryId: string) => {
    if (!editingWorkout) return;
    const updatedEx = editingWorkout.exercises.map((ex) => {
      if (ex.id !== entryId) return ex;
      const prevSet = ex.sets[ex.sets.length - 1];
      const nextSet: SetEntry = {
        id: generateId('set'),
        setNumber: ex.sets.length + 1,
        weight: ex.weightType === 'none' ? null : prevSet?.weight ?? 0,
        reps: prevSet?.reps ?? 10,
        completed: true,
      };
      return { ...ex, sets: [...ex.sets, nextSet] };
    });
    setEditingWorkout({ ...editingWorkout, exercises: updatedEx });
  };

  const handleEditRemoveSet = (entryId: string, setId: string) => {
    if (!editingWorkout) return;
    const updatedEx = editingWorkout.exercises.map((ex) => {
      if (ex.id !== entryId) return ex;
      const remaining = ex.sets
        .filter((s) => s.id !== setId)
        .map((s, idx) => ({ ...s, setNumber: idx + 1 }));
      return { ...ex, sets: remaining };
    });
    setEditingWorkout({ ...editingWorkout, exercises: updatedEx });
  };

  const handleEditAddExercise = (exerciseId: string) => {
    if (!editingWorkout || !exerciseId) return;
    const libEx = exercises.find((e) => e.id === exerciseId);
    if (!libEx) return;
    const unit: WeightUnit = libEx.isBodyweight
      ? 'none'
      : libEx.defaultWeightUnit || settings.preferredWeightUnit;

    const newEntry: ExerciseEntry = {
      id: generateId('ex_entry'),
      exerciseId: libEx.id,
      exerciseNameSnapshot: libEx.name,
      muscleGroup: libEx.muscleGroup,
      weightType: unit,
      sets: [1, 2, 3].map((setNum) => ({
        id: generateId('set'),
        setNumber: setNum,
        weight: unit === 'none' ? null : 0,
        reps: 10,
        completed: true,
      })),
      notes: '',
    };

    const updatedGroups = editingWorkout.muscleGroups.includes(libEx.muscleGroup)
      ? editingWorkout.muscleGroups
      : [...editingWorkout.muscleGroups, libEx.muscleGroup];

    setEditingWorkout({
      ...editingWorkout,
      muscleGroups: updatedGroups,
      exercises: [...editingWorkout.exercises, newEntry],
    });
  };

  const handleEditRemoveExercise = (entryId: string) => {
    if (!editingWorkout) return;
    setEditingWorkout({
      ...editingWorkout,
      exercises: editingWorkout.exercises.filter((e) => e.id !== entryId),
    });
  };

  const handleSaveEditedWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkout) return;
    await saveHistoricalWorkout(editingWorkout);
    setEditingWorkout(null);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
            {lang === 'ar' ? 'سجل التمارين الكامل' : 'Workout History'}
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
            {lang === 'ar'
              ? 'جميع جلساتك المكتملة مرتبة من الأحدث للأقدم مع حفظ الوحدات الأصلية لكل تمرين.'
              : 'All completed sessions in reverse chronological order with original weight units preserved.'}
          </p>
        </div>

        <button
          onClick={() => setIsAddPastModalOpen(true)}
          className={`self-start sm:self-auto px-4 py-2.5 rounded-xl ${
            isDark
              ? 'bg-[hsl(75,92%,56%)] hover:bg-[hsl(75,92%,62%)] text-[hsl(240,10%,9%)] shadow-[hsl(75,92%,56%)]/20'
              : 'bg-[hsl(76,78%,42%)] hover:bg-[hsl(76,78%,36%)] text-white shadow-[hsl(76,78%,42%)]/20'
          } font-display font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all cursor-pointer`}
        >
          <Plus className="w-4 h-4" />
          <span>
            {lang === 'ar' ? 'تسجيل تمرين سابق / منسي' : 'Add Past / Forgotten Workout'}
          </span>
        </button>
      </div>

      {/* FILTERS & SEARCH BAR */}
      <div
        className={`p-4 rounded-2xl border space-y-3.5 ${
          isDark
            ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
            : 'bg-white border-[hsl(40,10%,88%)] shadow-2xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                lang === 'ar'
                  ? 'ابحث بالتاريخ أو اسم التمرين أو العضلة...'
                  : 'Search by workout title, exercise name, or date (YYYY-MM-DD)...'
              }
              className={`w-full ps-10 pe-4 py-2 rounded-xl text-sm border focus:outline-none ${
                isDark
                  ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-[hsl(0,0%,97%)] focus:border-[hsl(75,92%,56%)]'
                  : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,88%)] text-[hsl(240,10%,9%)] focus:border-[hsl(76,78%,42%)]'
              }`}
            />
          </div>

          <div className="flex items-center gap-1.5">
            {(['ALL', 'strength', 'cardio'] as const).map((tOpt) => (
              <button
                key={tOpt}
                onClick={() => setFilterType(tOpt)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  filterType === tOpt
                    ? isDark
                      ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)] border-[hsl(75,92%,56%)]'
                      : 'bg-[hsl(76,78%,42%)] text-white border-[hsl(76,78%,42%)]'
                    : isDark
                    ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300'
                    : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,88%)] text-slate-700'
                }`}
              >
                {tOpt === 'ALL'
                  ? lang === 'ar'
                    ? 'الكل'
                    : 'All Types'
                  : tOpt === 'strength'
                  ? lang === 'ar'
                    ? 'حديد'
                    : 'Strength'
                  : lang === 'ar'
                  ? 'كارديو'
                  : 'Cardio'}
              </button>
            ))}
          </div>
        </div>

        {/* Muscle Group Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterMuscle('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${
              filterMuscle === 'ALL'
                ? isDark
                  ? 'bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)] border border-[hsl(75,92%,56%)]/40'
                  : 'bg-[hsl(76,78%,42%)]/10 text-[hsl(76,78%,42%)] border border-[hsl(76,78%,42%)]/30'
                : isDark
                ? 'bg-[hsl(240,5%,11%)] text-gray-400'
                : 'bg-[hsl(40,15%,94%)] text-slate-600'
            }`}
          >
            {lang === 'ar' ? 'جميع العضلات' : 'All Muscle Groups'}
          </button>
          {MUSCLE_GROUPS.map((mg) => (
            <button
              key={mg}
              onClick={() => setFilterMuscle(mg)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${
                filterMuscle === mg
                  ? isDark
                    ? 'bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)] border border-[hsl(75,92%,56%)]/40'
                    : 'bg-[hsl(76,78%,42%)]/10 text-[hsl(76,78%,42%)] border border-[hsl(76,78%,42%)]/30'
                  : isDark
                  ? 'bg-[hsl(240,5%,11%)] text-gray-400'
                  : 'bg-[hsl(40,15%,94%)] text-slate-600'
              }`}
            >
              {translateMuscleGroup(mg, lang)}
            </button>
          ))}
        </div>
      </div>

      {/* WORKOUT SESSIONS LIST */}
      {filteredWorkouts.length === 0 ? (
        <div
          className={`p-12 rounded-2xl border border-dashed text-center space-y-3 ${
            isDark
              ? 'border-[hsl(240,4%,19%)] text-gray-400'
              : 'border-[hsl(40,10%,85%)] text-slate-500'
          }`}
        >
          <HistoryIcon className="w-8 h-8 mx-auto opacity-40" />
          <div className="space-y-1">
            <h3 className="font-display font-bold text-base">
              {lang === 'ar'
                ? 'لا توجد جلسات تمرين مسجلة'
                : 'No Recorded Workout Sessions Found'}
            </h3>
            <p className="text-xs max-w-md mx-auto">
              {lang === 'ar'
                ? 'ابدأ تمريناً جديداً أو أضف تمريناً سابقاً ليظهر في سجل التمارين الخاص بك.'
                : 'Complete a workout session or add a past workout to build your training history.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredWorkouts.map((session) => {
            const isExpanded = expandedSessionId === session.id;
            const totalSets = (session.exercises || []).reduce(
              (acc, ex) => acc + (ex.sets ? ex.sets.length : 0),
              0
            );

            return (
              <div
                key={session.id}
                className={`rounded-2xl border overflow-hidden transition-all ${
                  isDark
                    ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
                    : 'bg-white border-[hsl(40,10%,88%)] shadow-2xs'
                }`}
              >
                {/* Session Summary Header Row */}
                <div
                  onClick={() =>
                    setExpandedSessionId(isExpanded ? null : session.id)
                  }
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-colors ${
                    isDark
                      ? 'hover:bg-[hsl(240,5%,11%)]/50'
                      : 'hover:bg-[hsl(40,15%,95%)]'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold ${
                          session.workoutType === 'cardio'
                            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                            : isDark
                            ? 'bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)] border border-[hsl(75,92%,56%)]/30'
                            : 'bg-[hsl(76,78%,42%)]/10 text-[hsl(76,78%,42%)] border border-[hsl(76,78%,42%)]/30'
                        }`}
                      >
                        {session.workoutType === 'cardio' ? (
                          <Flame className="w-3.5 h-3.5" />
                        ) : (
                          <Dumbbell className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {session.workoutType === 'cardio'
                            ? lang === 'ar'
                              ? 'كارديو'
                              : 'Cardio'
                            : lang === 'ar'
                            ? 'تمرين حديد'
                            : 'Strength'}
                        </span>
                      </span>

                      <span className={`text-xs font-semibold flex items-center gap-1 ${
                        isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
                      }`}>
                        <CalendarIcon className="w-3.5 h-3.5" />
                        <span>{formatFullDate(session.actualDate, lang)}</span>
                      </span>
                    </div>

                    <h2 className="text-lg font-display font-bold">
                      {session.title}
                    </h2>

                    {/* Metadata Line: Start Time, Finish Time, Duration, Exercises, Sets */}
                    <div
                      className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${
                        isDark ? 'text-gray-400' : 'text-slate-500'
                      }`}
                    >
                      <span className="flex items-center gap-1 font-mono-num">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {formatTimeFromTimestamp(session.startTimestamp, lang)}
                          {session.finishTimestamp
                            ? ` – ${formatTimeFromTimestamp(
                                session.finishTimestamp,
                                lang
                              )}`
                            : ''}
                        </span>
                      </span>

                      {session.durationMinutes && (
                        <span>
                          {lang === 'ar' ? 'المدة:' : 'Duration:'}{' '}
                          <strong className="font-mono-num">
                            {formatDurationMinutes(session.durationMinutes, lang)}
                          </strong>
                        </span>
                      )}

                      {session.workoutType === 'strength' && (
                        <span>
                          <strong className="font-mono-num">
                            {session.exercises.length}
                          </strong>{' '}
                          {lang === 'ar' ? 'تمارين' : 'exercises'} •{' '}
                          <strong className="font-mono-num">{totalSets}</strong>{' '}
                          {lang === 'ar' ? 'مجموعات مكتملة' : 'completed sets'}
                        </span>
                      )}
                    </div>

                    {/* Muscle group pills */}
                    {session.muscleGroups.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {session.muscleGroups.map((mg) => (
                          <span
                            key={mg}
                            className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${
                              isDark
                                ? 'bg-[hsl(240,5%,11%)] text-gray-300 border border-[hsl(240,4%,19%)]'
                                : 'bg-[hsl(40,15%,94%)] text-slate-700'
                            }`}
                          >
                            {translateMuscleGroup(mg, lang)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Actions & Expand Icon */}
                  <div
                    className="flex items-center gap-2 self-end sm:self-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() =>
                        setEditingWorkout(JSON.parse(JSON.stringify(session)))
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isDark
                          ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-200 hover:border-[hsl(75,92%,56%)]/40'
                          : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,88%)] text-slate-700 hover:bg-[hsl(40,15%,95%)]'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'تعديل' : 'Edit'}</span>
                    </button>

                    <button
                      onClick={() => setDeleteConfirmId(session.id)}
                      className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                        isDark
                          ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-400 hover:text-red-400 hover:border-red-500/30'
                          : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,88%)] text-slate-500 hover:text-red-600'
                      }`}
                      title="Delete Session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() =>
                        setExpandedSessionId(isExpanded ? null : session.id)
                      }
                      className="p-2 rounded-xl text-gray-400"
                      aria-label="Toggle session details"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* EXPANDED SESSION DETAILS */}
                {isExpanded && (
                  <div
                    className={`p-4 sm:p-5 border-t space-y-4 ${
                      isDark
                        ? 'bg-[hsl(240,6%,4%)] border-[hsl(240,4%,16%)]'
                        : 'bg-[hsl(40,20%,97.5%)] border-[hsl(40,10%,88%)]'
                    }`}
                  >
                    {/* Cardio Details if applicable */}
                    {session.cardioDetails && (
                      <div
                        className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                          isDark
                            ? 'bg-[hsl(240,5%,7.5%)] border-cyan-500/30'
                            : 'bg-white border-cyan-200'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-semibold text-cyan-400">
                            {lang === 'ar' ? 'تفاصيل الكارديو' : 'Cardio Activity'}
                          </div>
                          <div className="font-display font-bold text-sm mt-0.5">
                            {session.cardioDetails.activityType}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-mono-num">
                          <span>
                            {lang === 'ar' ? 'المدة:' : 'Duration:'}{' '}
                            <strong>{session.cardioDetails.durationMinutes} min</strong>
                          </span>
                          {session.cardioDetails.distance !== null &&
                            session.cardioDetails.distance !== undefined && (
                              <span>
                                {lang === 'ar' ? 'المسافة:' : 'Distance:'}{' '}
                                <strong>
                                  {session.cardioDetails.distance}{' '}
                                  {session.cardioDetails.distanceUnit}
                                </strong>
                              </span>
                            )}
                        </div>
                      </div>
                    )}

                    {/* Exercises & Sets in Original Units */}
                    {session.exercises.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {session.exercises.map((ex, idx) => (
                          <div
                            key={ex.id}
                            className={`p-4 rounded-xl border space-y-2.5 ${
                              isDark
                                ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
                                : 'bg-white border-[hsl(40,10%,88%)]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-md font-mono-num text-xs font-bold flex items-center justify-center ${
                                  isDark
                                    ? 'bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)]'
                                    : 'bg-[hsl(76,78%,42%)]/10 text-[hsl(76,78%,42%)]'
                                }`}>
                                  {idx + 1}
                                </span>
                                <h4 className="font-display font-bold text-sm">
                                  {ex.exerciseNameSnapshot}
                                </h4>
                              </div>
                              <span
                                className={`font-mono-num text-[11px] font-bold uppercase px-2 py-0.5 rounded border ${
                                  ex.weightType === 'none'
                                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                                    : isDark
                                    ? 'bg-[hsl(75,92%,56%)]/10 text-[hsl(75,92%,56%)] border-[hsl(75,92%,56%)]/30'
                                    : 'bg-[hsl(76,78%,42%)]/10 text-[hsl(76,78%,42%)] border-[hsl(76,78%,42%)]/30'
                                }`}
                              >
                                {ex.weightType === 'none'
                                  ? lang === 'ar'
                                    ? 'وزن الجسم'
                                    : 'Bodyweight'
                                  : ex.weightType}
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              {ex.sets.map((s) => (
                                <div
                                  key={s.id}
                                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-mono-num ${
                                    isDark ? 'bg-[hsl(240,5%,11%)]' : 'bg-[hsl(40,15%,95%)]'
                                  }`}
                                >
                                  <span className="text-gray-400">
                                    {lang === 'ar'
                                      ? `المجموعة ${s.setNumber}`
                                      : `Set ${s.setNumber}`}
                                  </span>
                                  <span className="font-bold">
                                    {formatSetPerformance(
                                      s.weight,
                                      ex.weightType,
                                      s.reps,
                                      lang
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {ex.notes && (
                              <p
                                className={`text-xs italic pt-1 ${
                                  isDark ? 'text-gray-400' : 'text-slate-500'
                                }`}
                              >
                                “{ex.notes}”
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Session Notes */}
                    {session.notes && (
                      <div
                        className={`p-3.5 rounded-xl border text-xs ${
                          isDark
                            ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)] text-gray-300'
                            : 'bg-white border-[hsl(40,10%,88%)] text-slate-700'
                        }`}
                      >
                        <strong className={`block mb-1 ${
                          isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
                        }`}>
                          {lang === 'ar' ? 'ملاحظات الجلسة:' : 'Session Notes:'}
                        </strong>
                        {session.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: EDIT HISTORICAL WORKOUT SESSION */}
      {editingWorkout && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEditedWorkout}
            className={`w-full max-w-3xl rounded-2xl border p-5 sm:p-6 space-y-4 max-h-[90vh] flex flex-col ${
              isDark
                ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)]'
                : 'bg-white border-[hsl(40,10%,88%)]'
            }`}
          >
            <div className="flex items-center justify-between border-b border-inherit pb-3">
              <div>
                <h3 className="font-display font-bold text-lg">
                  {lang === 'ar'
                    ? 'تعديل بيانات التمرين المسجل'
                    : 'Edit Historical Workout Session'}
                </h3>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  {formatFullDate(editingWorkout.actualDate, lang)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingWorkout(null)}
                className="p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {lang === 'ar' ? 'عنوان التمرين' : 'Workout Title'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editingWorkout.title}
                    onChange={(e) =>
                      setEditingWorkout({ ...editingWorkout, title: e.target.value })
                    }
                    className={`w-full px-3 py-2 rounded-xl text-sm border ${
                      isDark
                        ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-white'
                        : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,85%)] text-[hsl(240,10%,9%)]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {lang === 'ar' ? 'تاريخ التمرين الفعلي' : 'Workout Date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={editingWorkout.actualDate}
                    onChange={(e) =>
                      setEditingWorkout({
                        ...editingWorkout,
                        actualDate: e.target.value,
                      })
                    }
                    className={`w-full px-3 py-2 rounded-xl text-sm font-mono-num border ${
                      isDark
                        ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-white'
                        : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,85%)] text-[hsl(240,10%,9%)]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {lang === 'ar' ? 'المدة (بالدقائق)' : 'Duration (Minutes)'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editingWorkout.durationMinutes ?? 45}
                    onChange={(e) =>
                      setEditingWorkout({
                        ...editingWorkout,
                        durationMinutes: Math.max(1, Number(e.target.value || 1)),
                      })
                    }
                    className={`w-full px-3 py-2 rounded-xl text-sm font-mono-num border ${
                      isDark
                        ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-white'
                        : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,85%)] text-[hsl(240,10%,9%)]'
                    }`}
                  />
                </div>
              </div>

              {/* Exercises inside Edit Modal */}
              <div className="space-y-3">
                {editingWorkout.exercises.map((ex) => (
                  <div
                    key={ex.id}
                    className={`p-3.5 rounded-xl border space-y-2.5 ${
                      isDark
                        ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)]'
                        : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,88%)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-bold text-sm">
                        {ex.exerciseNameSnapshot}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {(
                          [
                            { id: 'kg', label: 'KG' },
                            { id: 'lbs', label: 'LB' },
                            {
                              id: 'none',
                              label: lang === 'ar' ? 'وزن الجسم' : 'Bodyweight',
                            },
                          ] as const
                        ).map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => handleEditExerciseUnit(ex.id, u.id)}
                            className={`px-2.5 py-1 rounded text-xs font-mono-num font-bold border cursor-pointer ${
                              ex.weightType === u.id
                                ? isDark
                                  ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)] border-[hsl(75,92%,56%)]'
                                  : 'bg-[hsl(76,78%,42%)] text-white border-[hsl(76,78%,42%)]'
                                : isDark
                                ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)] text-gray-300'
                                : 'bg-white border-[hsl(40,10%,85%)] text-slate-700'
                            }`}
                          >
                            {u.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleEditRemoveExercise(ex.id)}
                          className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {ex.sets.map((s) => (
                        <div key={s.id} className="grid grid-cols-12 gap-2 items-center">
                          <span className="col-span-2 text-xs font-mono-num text-gray-400">
                            #{s.setNumber}
                          </span>
                          <div className="col-span-4">
                            {ex.weightType === 'none' ? (
                              <span className="text-xs text-purple-400 font-semibold">
                                Bodyweight
                              </span>
                            ) : (
                              <input
                                type="number"
                                step="any"
                                min={0}
                                value={s.weight ?? 0}
                                onChange={(e) =>
                                  handleEditSetChange(
                                    ex.id,
                                    s.id,
                                    'weight',
                                    Number(e.target.value)
                                  )
                                }
                                className={`w-full px-2.5 py-1.5 rounded-lg font-mono-num text-xs border ${
                                  isDark
                                    ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)] text-white'
                                    : 'bg-white border-[hsl(40,10%,85%)] text-[hsl(240,10%,9%)]'
                                }`}
                              />
                            )}
                          </div>
                          <div className="col-span-4">
                            <input
                              type="number"
                              min={0}
                              value={s.reps}
                              onChange={(e) =>
                                handleEditSetChange(
                                  ex.id,
                                  s.id,
                                  'reps',
                                  Number(e.target.value)
                                )
                              }
                              className={`w-full px-2.5 py-1.5 rounded-lg font-mono-num text-xs border ${
                                isDark
                                  ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)] text-white'
                                  : 'bg-white border-[hsl(40,10%,85%)] text-[hsl(240,10%,9%)]'
                              }`}
                            />
                          </div>
                          <div className="col-span-2 text-end">
                            {ex.sets.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleEditRemoveSet(ex.id, s.id)}
                                className="p-1 text-gray-400 hover:text-red-400"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleEditAddSet(ex.id)}
                      className={`text-xs font-semibold hover:underline flex items-center gap-1 ${
                        isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'إضافة مجموعة' : 'Add Set'}</span>
                    </button>
                  </div>
                ))}

                {/* Add Exercise dropdown inside Edit Modal */}
                <div className="flex items-center gap-2">
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleEditAddExercise(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      isDark
                        ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-200'
                        : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,85%)] text-slate-800'
                    }`}
                  >
                    <option value="">
                      {lang === 'ar'
                        ? '+ إضافة تمرين آخر لهذه الجلسة...'
                        : '+ Add another exercise to this session...'}
                    </option>
                    {exercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name} ({ex.muscleGroup})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  {lang === 'ar' ? 'ملاحظات الجلسة' : 'Session Notes'}
                </label>
                <textarea
                  rows={2}
                  value={editingWorkout.notes}
                  onChange={(e) =>
                    setEditingWorkout({ ...editingWorkout, notes: e.target.value })
                  }
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${
                    isDark
                      ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-white'
                      : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,85%)] text-[hsl(240,10%,9%)]'
                  }`}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-inherit flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingWorkout(null)}
                className={`px-4 py-2 rounded-xl text-xs font-medium border cursor-pointer ${
                  isDark
                    ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300'
                    : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,85%)] text-slate-700'
                }`}
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className={`px-5 py-2 rounded-xl font-display font-bold text-xs cursor-pointer ${
                  isDark
                    ? 'bg-[hsl(75,92%,56%)] hover:bg-[hsl(75,92%,62%)] text-[hsl(240,10%,9%)]'
                    : 'bg-[hsl(76,78%,42%)] hover:bg-[hsl(76,78%,36%)] text-white'
                }`}
              >
                {lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ADD PAST / FORGOTTEN WORKOUT */}
      {isAddPastModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-2xl border p-5 space-y-4 ${
              isDark
                ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)]'
                : 'bg-white border-[hsl(40,10%,88%)]'
            }`}
          >
            <div className="flex items-center justify-between border-b border-inherit pb-3">
              <h3 className="font-display font-bold text-base">
                {lang === 'ar'
                  ? 'تسجيل تمرين لتاريخ سابق'
                  : 'Log a Past / Forgotten Workout'}
              </h3>
              <button
                onClick={() => setIsAddPastModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">
                {lang === 'ar' ? 'اختر تاريخ التمرين' : 'Select Workout Date'}
              </label>
              <input
                type="date"
                value={pastDate}
                onChange={(e) => setPastDate(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono-num border ${
                  isDark
                    ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-white'
                    : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,85%)] text-[hsl(240,10%,9%)]'
                }`}
              />
              <p className={`text-xs mt-1.5 ${
                isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
              }`}>
                {formatFullDate(pastDate, lang)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">
                {lang === 'ar' ? 'نوع التمرين' : 'Workout Type'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPastType('strength')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border cursor-pointer ${
                    pastType === 'strength'
                      ? isDark
                        ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)] border-[hsl(75,92%,56%)]'
                        : 'bg-[hsl(76,78%,42%)] text-white border-[hsl(76,78%,42%)]'
                      : isDark
                      ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300'
                      : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,85%)] text-slate-700'
                  }`}
                >
                  {lang === 'ar' ? 'تمرين حديد' : 'Strength Training'}
                </button>
                <button
                  type="button"
                  onClick={() => setPastType('cardio')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border cursor-pointer ${
                    pastType === 'cardio'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-500'
                      : isDark
                      ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300'
                      : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,85%)] text-slate-700'
                  }`}
                >
                  {lang === 'ar' ? 'جلسة كارديو' : 'Cardio Session'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAddPastModalOpen(false)}
                className={`px-4 py-2 rounded-xl text-xs font-medium border cursor-pointer ${
                  isDark
                    ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300'
                    : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,85%)] text-slate-700'
                }`}
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  setIsAddPastModalOpen(false);
                  await openStartWorkoutForDate(pastDate, pastType);
                }}
                className={`px-4 py-2 rounded-xl font-bold text-xs cursor-pointer ${
                  isDark
                    ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)]'
                    : 'bg-[hsl(76,78%,42%)] text-white'
                }`}
              >
                {lang === 'ar' ? 'المتابعة لتسجيل التمارين' : 'Open Workout Logger'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE WORKOUT CONFIRMATION */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-2xl border p-5 space-y-4 ${
              isDark
                ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)]'
                : 'bg-white border-[hsl(40,10%,88%)]'
            }`}
          >
            <h3 className="font-display font-bold text-base text-red-400">
              {lang === 'ar' ? 'حذف الجلسة من السجل؟' : 'Delete Workout Session?'}
            </h3>
            <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
              {lang === 'ar'
                ? 'هل أنت متأكد من رغبتك في حذف هذا التمرين نهائياً؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to permanently delete this recorded workout session?'}
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className={`px-4 py-2 rounded-xl text-xs font-medium border cursor-pointer ${
                  isDark
                    ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300'
                    : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,88%)] text-slate-700'
                }`}
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  await deleteWorkout(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-semibold text-xs cursor-pointer"
              >
                {lang === 'ar' ? 'حذف نهائي' : 'Delete Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};