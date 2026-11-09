
import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  Flame,
  History,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useGym } from '../context/GymContext';
import { generateId } from '../database/db';
import { getLastPerformanceForExercise } from '../services/progressService';
import {
  ExerciseEntry,
  MuscleGroup,
  SetEntry,
  WeightUnit,
} from '../types/workout';
import {
  formatFullDate,
  formatShortDate,
  formatTimeFromTimestamp,
  getDateMetadata,
  toLocalDateString,
} from '../utils/dateUtils';
import {
  MUSCLE_GROUPS,
  translateDayName,
  translateMuscleGroup,
} from '../utils/i18n';
import { formatSetPerformance } from '../utils/unitConversion';

const CARDIO_ACTIVITIES = [
  'Treadmill Run / Incline Walk',
  'Stationary Cycling Bike',
  'Elliptical Cross-Trainer',
  'Stair Climber / StairMaster',
  'Outdoor Running / Jogging',
  'Rowing Machine',
  'Jump Rope',
  'Brisk Walking',
];

export const StartWorkout: React.FC = () => {
  const {
    activeWorkout,
    completedWorkouts,
    exercises,
    weeklySchedule,
    settings,
    startNewWorkout,
    updateActiveWorkout,
    finishActiveWorkout,
    cancelActiveWorkout,
    addExercise,
    setCurrentSection,
    showToast,
  } = useGym();

  const lang = settings.language;
  const isDark = settings.theme === 'dark';
  const todayStr = toLocalDateString(new Date());
  const todayMeta = getDateMetadata(todayStr);

  // Active workout UI modals & states
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);
  const [pickerMuscleFilter, setPickerMuscleFilter] = useState<MuscleGroup | 'ALL'>('ALL');
  const [pickerSearch, setPickerSearch] = useState('');
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  // Quick inline custom exercise creation inside Add Exercise modal
  const [showQuickCreateEx, setShowQuickCreateEx] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExMuscle, setNewExMuscle] = useState<MuscleGroup>('Back');

  // --- ACTIVE WORKOUT HANDLERS ---

  const handleDateChange = async (newDateStr: string) => {
    if (!activeWorkout || !newDateStr) return;
    await updateActiveWorkout({
      ...activeWorkout,
      actualDate: newDateStr,
    });
  };

  const handleTitleChange = async (newTitle: string) => {
    if (!activeWorkout) return;
    await updateActiveWorkout({
      ...activeWorkout,
      title: newTitle,
    });
  };

  const handleToggleWorkoutMuscleGroup = async (mg: MuscleGroup) => {
    if (!activeWorkout) return;
    const exists = activeWorkout.muscleGroups.includes(mg);
    const updatedGroups = exists
      ? activeWorkout.muscleGroups.filter((m) => m !== mg)
      : [...activeWorkout.muscleGroups, mg];

    await updateActiveWorkout({
      ...activeWorkout,
      muscleGroups: updatedGroups.length > 0 ? updatedGroups : [mg],
    });
  };

  // Add an exercise from library to active workout
  const handleAddExerciseToSession = async (exerciseId: string) => {
    if (!activeWorkout) return;
    const libEx = exercises.find((e) => e.id === exerciseId);
    if (!libEx) return;

    const lastPerf = getLastPerformanceForExercise(libEx.id, completedWorkouts);

    const initialUnit: WeightUnit = libEx.isBodyweight
      ? 'none'
      : lastPerf
      ? lastPerf.weightType
      : libEx.defaultWeightUnit || settings.preferredWeightUnit;

    const defaultFirstWeight =
      initialUnit === 'none'
        ? null
        : lastPerf && lastPerf.bestSet && lastPerf.bestSet.weight !== null
        ? lastPerf.bestSet.weight
        : 0;

    const defaultFirstReps =
      lastPerf && lastPerf.bestSet ? lastPerf.bestSet.reps : 10;

    const newEntry: ExerciseEntry = {
      id: generateId('ex_entry'),
      exerciseId: libEx.id,
      exerciseNameSnapshot: libEx.name,
      muscleGroup: libEx.muscleGroup,
      weightType: initialUnit,
      sets: [1, 2, 3].map((setNum) => ({
        id: generateId('set'),
        setNumber: setNum,
        weight: defaultFirstWeight,
        reps: defaultFirstReps,
        completed: false,
      })),
      notes: '',
    };

    const updatedGroups = activeWorkout.muscleGroups.includes(libEx.muscleGroup)
      ? activeWorkout.muscleGroups
      : [...activeWorkout.muscleGroups, libEx.muscleGroup];

    await updateActiveWorkout({
      ...activeWorkout,
      muscleGroups: updatedGroups,
      exercises: [...activeWorkout.exercises, newEntry],
    });

    showToast(
      lang === 'ar'
        ? `تمت إضافة "${libEx.name}" للتمرين`
        : `Added "${libEx.name}" to workout`,
      'success'
    );
  };

  // Create custom exercise & immediately add to active workout
  const handleQuickCreateAndAddExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExName.trim()) return;

    const created = await addExercise({
      name: newExName.trim(),
      muscleGroup: newExMuscle,
    });

    await handleAddExerciseToSession(created.id);
    setNewExName('');
    setShowQuickCreateEx(false);
  };

  // Remove exercise card from active workout
  const handleRemoveExerciseEntry = async (entryId: string) => {
    if (!activeWorkout) return;

    await updateActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.filter((e) => e.id !== entryId),
    });
  };

  // Change weight unit for a specific exercise card independently
  const handleExerciseUnitChange = async (
    entryId: string,
    newUnit: WeightUnit
  ) => {
    if (!activeWorkout) return;

    const updatedExercises = activeWorkout.exercises.map((entry) => {
      if (entry.id !== entryId) return entry;

      const updatedSets = entry.sets.map((s) => ({
        ...s,
        weight: newUnit === 'none' ? null : s.weight ?? 0,
      }));

      return {
        ...entry,
        weightType: newUnit,
        sets: updatedSets,
      };
    });

    await updateActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises,
    });
  };

  // Add a set to an exercise card
  const handleAddSet = async (entryId: string) => {
    if (!activeWorkout) return;

    const updatedExercises = activeWorkout.exercises.map((entry) => {
      if (entry.id !== entryId) return entry;

      const prevSet = entry.sets[entry.sets.length - 1];
      const nextSetNumber = entry.sets.length + 1;

      const newSet: SetEntry = {
        id: generateId('set'),
        setNumber: nextSetNumber,
        weight:
          entry.weightType === 'none'
            ? null
            : prevSet && prevSet.weight !== null
            ? prevSet.weight
            : 0,
        reps: prevSet ? prevSet.reps : 10,
        completed: false,
      };

      return {
        ...entry,
        sets: [...entry.sets, newSet],
      };
    });

    await updateActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises,
    });
  };

  // Remove a set and maintain automatic set numbering
  const handleRemoveSet = async (entryId: string, setId: string) => {
    if (!activeWorkout) return;

    const updatedExercises = activeWorkout.exercises.map((entry) => {
      if (entry.id !== entryId) return entry;

      const filtered = entry.sets.filter((s) => s.id !== setId);
      const renumbered = filtered.map((s, idx) => ({
        ...s,
        setNumber: idx + 1,
      }));

      return {
        ...entry,
        sets: renumbered,
      };
    });

    await updateActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises,
    });
  };

  // Update a set's weight, reps, or completed status
  const handleUpdateSet = async (
    entryId: string,
    setId: string,
    field: 'weight' | 'reps' | 'completed',
    value: number | boolean | null
  ) => {
    if (!activeWorkout) return;

    const updatedExercises = activeWorkout.exercises.map((entry) => {
      if (entry.id !== entryId) return entry;

      const updatedSets = entry.sets.map((s) => {
        if (s.id !== setId) return s;

        if (field === 'weight') {
          const safeWeight =
            entry.weightType === 'none'
              ? null
              : value === null
              ? 0
              : Math.max(0, Number(value));

          return { ...s, weight: safeWeight };
        }

        if (field === 'reps') {
          const safeReps = Math.max(0, Math.round(Number(value || 0)));
          return { ...s, reps: safeReps };
        }

        if (field === 'completed') {
          return { ...s, completed: Boolean(value) };
        }

        return s;
      });

      return { ...entry, sets: updatedSets };
    });

    await updateActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises,
    });
  };

  // Update Cardio details
  const handleUpdateCardio = async (
    partial: Partial<NonNullable<typeof activeWorkout>['cardioDetails']>
  ) => {
    if (!activeWorkout) return;

    const currentCardio = activeWorkout.cardioDetails || {
      activityType: 'Treadmill Run / Incline Walk',
      durationMinutes: 60,
      distance: null,
      distanceUnit: 'km' as const,
      notes: '',
    };

    const merged = { ...currentCardio, ...partial };

    await updateActiveWorkout({
      ...activeWorkout,
      durationMinutes: merged.durationMinutes,
      cardioDetails: merged,
    });
  };

  // Finish Workout handler
  const handleFinishSession = async () => {
    if (!activeWorkout) return;

    if (
      activeWorkout.workoutType === 'strength' &&
      activeWorkout.exercises.length === 0
    ) {
      showToast(
        lang === 'ar'
          ? 'يرجى إضافة تمرين واحد على الأقل قبل إنهاء الجلسة.'
          : 'Please add at least one exercise before finishing the workout.',
        'error'
      );
      return;
    }

    await finishActiveWorkout();
    setCurrentSection('history');
  };

  // Filtered library exercises for the Add Exercise modal
  const filteredLibraryExercises = useMemo(() => {
    return exercises.filter((ex) => {
      if (
        pickerMuscleFilter !== 'ALL' &&
        ex.muscleGroup !== pickerMuscleFilter
      ) {
        return false;
      }

      if (
        pickerSearch.trim() &&
        !ex.name.toLowerCase().includes(pickerSearch.trim().toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [exercises, pickerMuscleFilter, pickerSearch]);

  // ============================================================================
  // RENDER 1: PRE-WORKOUT SETUP SCREEN
  // ONLY WEEKLY SCHEDULE IS AVAILABLE
  // ============================================================================
  if (!activeWorkout) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
            {lang === 'ar' ? 'بدء وتسجيل تمرين جديد' : 'Start a New Workout'}
          </h1>

          <p
            className={`text-sm mt-1 ${
              isDark ? 'text-gray-400' : 'text-slate-600'
            }`}
          >
            {lang === 'ar'
              ? 'اختر خطة جاهزة من جدولك الأسبوعي. يتم تسجيل التاريخ والوقت الفعليين لجهازك تلقائياً.'
              : 'Choose a workout from your weekly schedule. Your local date and time are recorded automatically.'}
          </p>
        </div>

        {/* AUTOMATIC LOCAL DATE — NO DATE PICKER OR TIMEZONE */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border ${
            isDark
              ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
              : 'bg-[hsl(0,0%,100%)] border-[hsl(40,10%,88%)] shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-2">
            <CalendarIcon className="w-4 h-4" />
            <span>
              {lang === 'ar' ? 'التاريخ المحلي اليوم' : 'Automatic Local Date'}
            </span>
          </div>

          <div className="font-display font-bold text-base sm:text-lg">
            {formatFullDate(todayStr, lang)}
          </div>
        </div>

        {/* WEEKLY SCHEDULE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {weeklySchedule.map((dayPlan) => {
            const isTodayPlan = dayPlan.day === todayMeta.dayOfWeek;

            return (
              <div
                key={dayPlan.day}
                className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-all ${
                  isTodayPlan
                    ? isDark
                      ? 'bg-[hsl(75,92%,56%)]/10 border-[hsl(75,92%,56%)]/50 ring-1 ring-[hsl(75,92%,56%)]/30'
                      : 'bg-[hsl(76,78%,42%)]/10 border-[hsl(76,78%,42%)]/50'
                    : isDark
                    ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
                    : 'bg-[hsl(0,0%,100%)] border-[hsl(40,10%,88%)] shadow-2xs'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-display font-bold uppercase tracking-wider ${
                        isDark
                          ? 'text-[hsl(75,92%,56%)]'
                          : 'text-[hsl(76,78%,42%)]'
                      }`}
                    >
                      {translateDayName(dayPlan.day, lang)}
                    </span>

                    {isTodayPlan && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isDark
                            ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)]'
                            : 'bg-[hsl(76,78%,42%)] text-white'
                        }`}
                      >
                        {lang === 'ar' ? 'خطة اليوم المقترحة' : 'Suggested Today'}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-display font-bold">
                    {dayPlan.title}
                  </h3>

                  {dayPlan.muscleGroups.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {dayPlan.muscleGroups.map((mg) => (
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

                <div className="flex items-center justify-between pt-2 border-t border-inherit">
                  <span
                    className={`text-xs ${
                      isDark ? 'text-gray-400' : 'text-slate-500'
                    }`}
                  >
                    {dayPlan.workoutType === 'rest'
                      ? lang === 'ar'
                        ? 'يوم راحة مخطط'
                        : 'Scheduled rest day'
                      : dayPlan.workoutType === 'cardio'
                      ? lang === 'ar'
                        ? 'كارديو — ساعة واحدة'
                        : '60 min Cardio'
                      : `${dayPlan.assignedExerciseIds.length} ${
                          lang === 'ar' ? 'تمارين مجهزة' : 'preloaded exercises'
                        }`}
                  </span>

                  <button
                    onClick={() =>
                      startNewWorkout({
                        workoutType:
                          dayPlan.workoutType === 'cardio'
                            ? 'cardio'
                            : 'strength',
                        title:
                          dayPlan.workoutType === 'rest'
                            ? 'Bonus Strength Session'
                            : dayPlan.title,
                        muscleGroups:
                          dayPlan.muscleGroups.length > 0
                            ? dayPlan.muscleGroups
                            : ['Back'],
                        exerciseIds: dayPlan.assignedExerciseIds,
                        actualDate: todayStr,
                      })
                    }
                    className={`px-4 py-2 rounded-xl font-display font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      dayPlan.workoutType === 'cardio'
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                        : isDark
                        ? 'bg-[hsl(75,92%,56%)] hover:bg-[hsl(75,92%,50%)] text-[hsl(240,10%,9%)]'
                        : 'bg-[hsl(76,78%,42%)] hover:bg-[hsl(76,78%,37%)] text-white'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>
                      {lang === 'ar' ? 'بدء التمرين' : 'Start Workout'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER 2: ACTIVE WORKOUT RECORDING WORKSPACE
  // ============================================================================

  const totalCompletedSets = activeWorkout.exercises.reduce(
    (sum, ex) => sum + ex.sets.length,
    0
  );

  return (
    <div className="space-y-6">
      {/* STICKY ACTIVE WORKOUT HEADER */}
      <div
        className={`rounded-2xl p-4 sm:p-5 border shadow-lg ${
          isDark
            ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(75,92%,56%)]/40'
            : 'bg-[hsl(0,0%,100%)] border-[hsl(76,78%,42%)]/50 shadow-sm'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Workout Title, Live Date/Time & Manual Date Picker */}
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                  isDark
                    ? 'bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)] border-[hsl(75,92%,56%)]/30'
                    : 'bg-[hsl(76,78%,42%)]/10 text-[hsl(76,78%,42%)] border-[hsl(76,78%,42%)]/30'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full animate-ping ${
                    isDark
                      ? 'bg-[hsl(75,92%,56%)]'
                      : 'bg-[hsl(76,78%,42%)]'
                  }`}
                />
                <span>
                  {lang === 'ar'
                    ? 'جلسة نشطة (حفظ تلقائي)'
                    : 'LIVE SESSION • AUTOSAVED'}
                </span>
              </span>

              <span
                className={`text-xs ${
                  isDark ? 'text-gray-400' : 'text-slate-500'
                }`}
              >
                {lang === 'ar' ? 'البدء:' : 'Started:'}{' '}
                {formatTimeFromTimestamp(activeWorkout.startTimestamp, lang)} (
                {activeWorkout.timezone})
              </span>
            </div>

            {/* Editable Workout Title */}
            <input
              type="text"
              value={activeWorkout.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              aria-label="Workout Title"
              className={`w-full max-w-xl font-display font-bold text-xl sm:text-2xl bg-transparent border-b border-transparent focus:border-[hsl(75,92%,56%)] focus:outline-none pb-0.5 ${
                isDark ? 'text-white' : 'text-[hsl(240,10%,9%)]'
              }`}
            />

            {/* Full Date Display + Manual Date Picker */}
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
              <div
                className={`flex items-center gap-1.5 font-medium ${
                  isDark
                    ? 'text-[hsl(75,92%,56%)]'
                    : 'text-[hsl(76,78%,42%)]'
                }`}
              >
                <CalendarIcon className="w-4 h-4" />
                <span>{formatFullDate(activeWorkout.actualDate, lang)}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <label
                  htmlFor="active-workout-date"
                  className={`text-xs ${
                    isDark ? 'text-gray-400' : 'text-slate-500'
                  }`}
                >
                  {lang === 'ar' ? 'تغيير التاريخ:' : 'Change Date:'}
                </label>

                <input
                  id="active-workout-date"
                  type="date"
                  value={activeWorkout.actualDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono-num border focus:outline-none focus:border-[hsl(75,92%,56%)] ${
                    isDark
                      ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-200'
                      : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,85%)] text-slate-800'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Finish & Cancel Controls */}
          <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
            <button
              onClick={() => setIsCancelConfirmOpen(true)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-[hsl(240,5%,11%)] border-red-500/30 text-red-400 hover:bg-red-500/10'
                  : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
              }`}
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              onClick={handleFinishSession}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                isDark
                  ? 'bg-[hsl(75,92%,56%)] hover:bg-[hsl(75,92%,50%)] text-[hsl(240,10%,9%)] shadow-[hsl(75,92%,56%)]/20'
                  : 'bg-[hsl(76,78%,42%)] hover:bg-[hsl(76,78%,37%)] text-white shadow-[hsl(76,78%,42%)]/20'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {lang === 'ar' ? 'إنهاء وحفظ التمرين' : 'Finish Workout'}
              </span>
            </button>
          </div>
        </div>

        {/* Muscle Group Pills Selector */}
        <div className="mt-4 pt-3 border-t border-inherit flex flex-wrap items-center gap-1.5">
          <span
            className={`text-xs me-1 ${
              isDark ? 'text-gray-400' : 'text-slate-500'
            }`}
          >
            {lang === 'ar' ? 'العضلات:' : 'Muscle Groups:'}
          </span>

          {MUSCLE_GROUPS.map((mg) => {
            const selected = activeWorkout.muscleGroups.includes(mg);

            return (
              <button
                key={mg}
                type="button"
                onClick={() => handleToggleWorkoutMuscleGroup(mg)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  selected
                    ? isDark
                      ? 'bg-[hsl(75,92%,56%)]/20 border-[hsl(75,92%,56%)] text-[hsl(75,92%,56%)] font-semibold'
                      : 'bg-[hsl(76,78%,42%)]/10 border-[hsl(76,78%,42%)] text-[hsl(76,78%,42%)] font-semibold'
                    : isDark
                    ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-400 hover:text-gray-200'
                    : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,88%)] text-slate-600'
                }`}
              >
                {translateMuscleGroup(mg, lang)}
              </button>
            );
          })}
        </div>
      </div>

      {/* CARDIO TRACKING PANEL */}
      {(activeWorkout.workoutType === 'cardio' ||
        activeWorkout.muscleGroups.includes('Cardio')) && (
        <div
          className={`rounded-2xl p-5 border space-y-4 ${
            isDark
              ? 'bg-[hsl(240,5%,7.5%)] border-cyan-500/40'
              : 'bg-[hsl(0,0%,100%)] border-cyan-300 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2.5 text-cyan-400">
            <Flame className="w-5 h-5" />
            <h2 className="font-display font-bold text-base">
              {lang === 'ar' ? 'بيانات جلسة الكارديو' : 'Cardio Session Details'}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Cardio Activity Type */}
            <div>
              <label className="block text-xs font-semibold mb-1.5">
                {lang === 'ar' ? 'نوع نشاط الكارديو' : 'Cardio Activity Type'}
              </label>

              <select
                value={
                  activeWorkout.cardioDetails?.activityType ||
                  CARDIO_ACTIVITIES[0]
                }
                onChange={(e) =>
                  handleUpdateCardio({ activityType: e.target.value })
                }
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-cyan-500 ${
                  isDark
                    ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-100'
                    : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,85%)] text-slate-900'
                }`}
              >
                {CARDIO_ACTIVITIES.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold mb-1.5">
                {lang === 'ar' ? 'المدة الزمنية (بالدقائق)' : 'Duration (Minutes)'}
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={activeWorkout.cardioDetails?.durationMinutes ?? 60}
                  onChange={(e) =>
                    handleUpdateCardio({
                      durationMinutes: Math.max(1, Number(e.target.value || 0)),
                    })
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl font-mono-num text-sm font-bold border focus:outline-none focus:border-cyan-500 ${
                    isDark
                      ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-100'
                      : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,85%)] text-slate-900'
                  }`}
                />

                <div className="flex gap-1 shrink-0">
                  {[30, 45, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleUpdateCardio({ durationMinutes: m })}
                      className={`px-2 py-2 rounded-lg text-xs font-mono-num font-semibold border cursor-pointer ${
                        activeWorkout.cardioDetails?.durationMinutes === m
                          ? 'bg-cyan-500 text-slate-950 border-cyan-500'
                          : isDark
                          ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300'
                          : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,85%)] text-slate-700'
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Optional Distance */}
            <div>
              <label className="block text-xs font-semibold mb-1.5">
                {lang === 'ar' ? 'المسافة (اختياري)' : 'Distance (Optional)'}
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={0}
                  placeholder="e.g., 5.0"
                  value={
                    activeWorkout.cardioDetails?.distance === null ||
                    activeWorkout.cardioDetails?.distance === undefined
                      ? ''
                      : activeWorkout.cardioDetails.distance
                  }
                  onChange={(e) =>
                    handleUpdateCardio({
                      distance:
                        e.target.value === ''
                          ? null
                          : Math.max(0, Number(e.target.value)),
                    })
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl font-mono-num text-sm border focus:outline-none focus:border-cyan-500 ${
                    isDark
                      ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-100'
                      : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,85%)] text-slate-900'
                  }`}
                />

                <select
                  value={activeWorkout.cardioDetails?.distanceUnit || 'km'}
                  onChange={(e) =>
                    handleUpdateCardio({
                      distanceUnit: e.target.value as 'km' | 'mi',
                    })
                  }
                  className={`px-3 py-2.5 rounded-xl font-mono-num text-xs font-bold border ${
                    isDark
                      ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-200'
                      : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,85%)] text-slate-800'
                  }`}
                >
                  <option value="km">km</option>
                  <option value="mi">mi</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INDIVIDUAL EXERCISE CARDS */}
      <div className="space-y-6">
        {(() => {
          const groups = new Map<MuscleGroup, ExerciseEntry[]>();

          for (const entry of activeWorkout.exercises) {
            if (!groups.has(entry.muscleGroup)) {
              groups.set(entry.muscleGroup, []);
            }
            groups.get(entry.muscleGroup)!.push(entry);
          }

          const groupEntries = [...groups.entries()];

          return groupEntries.map(([muscleGroup, groupExercises], groupIdx) => (
            <div key={muscleGroup}>
              {groupIdx > 0 && (
                <hr
                  className={`mb-6 ${
                    isDark
                      ? 'border-[hsl(240,4%,19%)]'
                      : 'border-[hsl(40,10%,88%)]'
                  }`}
                />
              )}

              <div className="flex items-center gap-3 mb-4">
                <h2
                  className={`text-xs font-bold uppercase tracking-widest ${
                    isDark ? 'text-gray-400' : 'text-slate-500'
                  }`}
                >
                  {translateMuscleGroup(muscleGroup, lang)}
                </h2>

                <div
                  className={`flex-1 h-px ${
                    isDark
                      ? 'bg-[hsl(240,4%,19%)]/50'
                      : 'bg-[hsl(40,10%,88%)]'
                  }`}
                />
              </div>

              <div className="space-y-4">
                {groupExercises.map((entry) => {
                  const lastPerf = getLastPerformanceForExercise(
                    entry.exerciseId,
                    completedWorkouts
                  );

                  return (
                    <div
                      key={entry.id}
                      className={`rounded-2xl border p-4 sm:p-5 space-y-4 transition-all ${
                        isDark
                          ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
                          : 'bg-[hsl(0,0%,100%)] border-[hsl(40,10%,88%)] shadow-xs'
                      }`}
                    >
                      {/* Exercise Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-inherit">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <h3 className="font-display font-bold text-base sm:text-lg">
                              {entry.exerciseNameSnapshot}
                            </h3>
                          </div>

                          {/* Last Session Performance */}
                          {lastPerf && lastPerf.bestSet && (
                            <div
                              className={`flex items-center gap-1.5 text-xs ${
                                isDark ? 'text-gray-400' : 'text-slate-500'
                              }`}
                            >
                              <History className="w-3.5 h-3.5 text-[hsl(75,92%,56%)]" />

                              <span>
                                {lang === 'ar' ? 'آخر أداء مسجل' : 'Last recorded'} (
                                {formatShortDate(lastPerf.actualDate, lang)}):
                              </span>

                              <strong
                                className={`font-mono-num ${
                                  isDark
                                    ? 'text-[hsl(75,92%,56%)]'
                                    : 'text-[hsl(76,78%,42%)]'
                                }`}
                              >
                                {formatSetPerformance(
                                  lastPerf.bestSet.weight,
                                  lastPerf.weightType,
                                  lastPerf.bestSet.reps,
                                  lang
                                )}
                              </strong>
                            </div>
                          )}
                        </div>

                        {/* Unit Selector + Remove Button */}
                        <div className="flex items-center justify-between sm:justify-end gap-2">
                          <div
                            className={`inline-flex rounded-xl p-1 border ${
                              isDark
                                ? 'bg-[hsl(240,6%,4%)] border-[hsl(240,4%,19%)]'
                                : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,88%)]'
                            }`}
                            role="group"
                            aria-label="Weight unit selector"
                          >
                            {(
                              [
                                { id: 'kg', label: 'KG' },
                                { id: 'lbs', label: 'LB' },
                                {
                                  id: 'none',
                                  label: lang === 'ar' ? 'وزن الجسم' : 'Bodyweight',
                                },
                              ] as const
                            ).map((u) => {
                              const isSelected = entry.weightType === u.id;

                              return (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() =>
                                    handleExerciseUnitChange(entry.id, u.id)
                                  }
                                  className={`px-3 py-1.5 rounded-lg text-xs font-mono-num font-bold transition-all cursor-pointer ${
                                    isSelected
                                      ? isDark
                                        ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)] shadow-xs'
                                        : 'bg-[hsl(76,78%,42%)] text-white shadow-xs'
                                      : isDark
                                      ? 'text-gray-400 hover:text-gray-200'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  {u.label}
                                </button>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveExerciseEntry(entry.id)}
                            className={`p-2 rounded-xl transition-colors cursor-pointer ${
                              isDark
                                ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10'
                                : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title="Remove exercise from workout"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* SETS TABLE */}
                      <div className="space-y-2">
                        <div
                          className={`grid grid-cols-12 gap-2 px-2 text-[11px] font-semibold uppercase tracking-wider ${
                            isDark ? 'text-gray-400' : 'text-slate-500'
                          }`}
                        >
                          <div className="col-span-2 sm:col-span-1 text-center">
                            {lang === 'ar' ? 'مجموعة' : 'Set'}
                          </div>

                          <div className="col-span-4 sm:col-span-5">
                            {entry.weightType === 'none'
                              ? lang === 'ar'
                                ? 'الوزن (وزن الجسم)'
                                : 'Weight (Bodyweight)'
                              : `${lang === 'ar' ? 'الوزن' : 'Weight'} (${
                                  entry.weightType === 'lbs' ? 'LB' : 'KG'
                                })`}
                          </div>

                          <div className="col-span-4 sm:col-span-4">
                            {lang === 'ar' ? 'العدات (Reps)' : 'Repetitions (Reps)'}
                          </div>

                          <div className="col-span-2 text-end">
                            {lang === 'ar' ? 'إجراء' : 'Action'}
                          </div>
                        </div>

                        {/* Empty Sets State */}
                        {entry.sets.length === 0 && (
                          <div
                            className={`p-4 rounded-xl border border-dashed text-center text-xs ${
                              isDark
                                ? 'border-[hsl(240,4%,19%)] text-gray-400'
                                : 'border-[hsl(40,10%,85%)] text-slate-500'
                            }`}
                          >
                            {lang === 'ar'
                              ? 'تم حذف جميع المجموعات. اضغط على "+ إضافة مجموعة" لإضافة مجموعة جديدة.'
                              : 'No sets remaining. Click "+ Add Set" to add one.'}
                          </div>
                        )}

                        {/* Individual Set Rows */}
                        {entry.sets.map((setItem) => (
                          <div
                            key={setItem.id}
                            className={`grid grid-cols-12 gap-2 items-center p-2 rounded-xl border transition-colors ${
                              setItem.completed
                                ? isDark
                                  ? 'bg-[hsl(75,92%,56%)]/10 border-[hsl(75,92%,56%)]/30'
                                  : 'bg-[hsl(76,78%,42%)]/10 border-[hsl(76,78%,42%)]/30'
                                : isDark
                                ? 'bg-[hsl(240,5%,11%)]/80 border-[hsl(240,4%,19%)]'
                                : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,88%)]'
                            }`}
                          >
                            {/* Set Number */}
                            <div className="col-span-2 sm:col-span-1 flex justify-center">
                              <span
                                className={`w-7 h-7 rounded-lg font-mono-num text-xs font-bold flex items-center justify-center ${
                                  isDark
                                    ? 'bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)]'
                                    : 'bg-[hsl(76,78%,42%)]/15 text-[hsl(76,78%,42%)]'
                                }`}
                              >
                                {setItem.setNumber}
                              </span>
                            </div>

                            {/* Weight Input */}
                            <div className="col-span-4 sm:col-span-5">
                              {entry.weightType === 'none' ? (
                                <div
                                  className={`h-11 px-3 rounded-xl border flex items-center justify-center text-xs font-semibold ${
                                    isDark
                                      ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)] text-[hsl(75,92%,56%)]'
                                      : 'bg-[hsl(0,0%,100%)] border-[hsl(40,10%,88%)] text-[hsl(76,78%,42%)]'
                                  }`}
                                >
                                  {lang === 'ar'
                                    ? 'وزن الجسم (Bodyweight)'
                                    : 'Bodyweight'}
                                </div>
                              ) : (
                                <div className="relative">
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    step="any"
                                    min={0}
                                    aria-label={`Set ${setItem.setNumber} weight in ${entry.weightType}`}
                                    value={
                                      setItem.weight === null ||
                                      setItem.weight === undefined
                                        ? ''
                                        : setItem.weight
                                    }
                                    onChange={(e) =>
                                      handleUpdateSet(
                                        entry.id,
                                        setItem.id,
                                        'weight',
                                        e.target.value === ''
                                          ? 0
                                          : Number(e.target.value)
                                      )
                                    }
                                    onFocus={(e) => e.target.select()}
                                    className={`w-full h-11 px-3 pe-10 rounded-xl font-mono-num text-base font-bold border focus:outline-none focus:border-[hsl(75,92%,56%)] ${
                                      isDark
                                        ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)] text-white'
                                        : 'bg-[hsl(0,0%,100%)] border-[hsl(40,10%,85%)] text-[hsl(240,10%,9%)]'
                                    }`}
                                  />

                                  <span
                                    className={`absolute top-1/2 -translate-y-1/2 end-3 text-xs font-mono-num font-semibold pointer-events-none uppercase ${
                                      isDark ? 'text-gray-400' : 'text-slate-400'
                                    }`}
                                  >
                                    {entry.weightType === 'lbs' ? 'lb' : 'kg'}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Repetitions Input */}
                            <div className="col-span-4 sm:col-span-4">
                              <div className="relative">
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  aria-label={`Set ${setItem.setNumber} repetitions`}
                                  value={setItem.reps}
                                  onChange={(e) =>
                                    handleUpdateSet(
                                      entry.id,
                                      setItem.id,
                                      'reps',
                                      e.target.value === ''
                                        ? 0
                                        : Number(e.target.value)
                                    )
                                  }
                                  onFocus={(e) => e.target.select()}
                                  className={`w-full h-11 px-3 pe-12 rounded-xl font-mono-num text-base font-bold border focus:outline-none focus:border-[hsl(75,92%,56%)] ${
                                    isDark
                                      ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)] text-white'
                                      : 'bg-[hsl(0,0%,100%)] border-[hsl(40,10%,85%)] text-[hsl(240,10%,9%)]'
                                  }`}
                                />

                                <span
                                  className={`absolute top-1/2 -translate-y-1/2 end-3 text-xs font-mono-num pointer-events-none ${
                                    isDark ? 'text-gray-400' : 'text-slate-400'
                                  }`}
                                >
                                  {lang === 'ar' ? 'عدات' : 'reps'}
                                </span>
                              </div>
                            </div>

                            {/* Complete & Delete Set */}
                            <div className="col-span-2 flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateSet(
                                    entry.id,
                                    setItem.id,
                                    'completed',
                                    !setItem.completed
                                  )
                                }
                                className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                                  setItem.completed
                                    ? isDark
                                      ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)] border-[hsl(75,92%,56%)]'
                                      : 'bg-[hsl(76,78%,42%)] text-white border-[hsl(76,78%,42%)]'
                                    : isDark
                                    ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)] text-gray-400 hover:text-[hsl(75,92%,56%)]'
                                    : 'bg-[hsl(0,0%,100%)] border-[hsl(40,10%,85%)] text-slate-400 hover:text-[hsl(76,78%,42%)]'
                                }`}
                                title="Mark set complete"
                              >
                                <Check className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveSet(entry.id, setItem.id)
                                }
                                className={`w-8 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                                  isDark
                                    ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10'
                                    : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                }`}
                                title={
                                  lang === 'ar' ? 'حذف المجموعة' : 'Delete set'
                                }
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add Set */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => handleAddSet(entry.id)}
                          className={`py-2.5 px-4 rounded-xl text-xs font-display font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isDark
                              ? 'bg-[hsl(240,5%,11%)] border-[hsl(75,92%,56%)]/40 text-[hsl(75,92%,56%)] hover:bg-[hsl(75,92%,56%)] hover:text-[hsl(240,10%,9%)]'
                              : 'bg-[hsl(76,78%,42%)]/10 border-[hsl(76,78%,42%)]/40 text-[hsl(76,78%,42%)] hover:bg-[hsl(76,78%,42%)] hover:text-white'
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                          <span>
                            {lang === 'ar'
                              ? 'إضافة مجموعة (+ Set)'
                              : 'Add Set'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ));
        })()}

        {/* ADD EXERCISE BUTTON */}
        <button
          type="button"
          onClick={() => {
            setPickerMuscleFilter(activeWorkout.muscleGroups[0] || 'ALL');
            setIsAddExerciseOpen(true);
          }}
          className={`w-full py-4 px-5 rounded-2xl border-2 border-dashed font-display font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isDark
              ? 'border-[hsl(75,92%,56%)]/40 bg-[hsl(75,92%,56%)]/5 hover:bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)]'
              : 'border-[hsl(76,78%,42%)]/40 bg-[hsl(76,78%,42%)]/5 hover:bg-[hsl(76,78%,42%)]/10 text-[hsl(76,78%,42%)]'
          }`}
        >
          <Plus className="w-5 h-5" />
          <span>
            {lang === 'ar'
              ? 'إضافة تمرين للجلسة الحالية'
              : 'Add Exercise to Workout'}
          </span>
        </button>
      </div>

      {/* BOTTOM FINISH BAR */}
      <div
        className={`rounded-2xl p-5 border ${
          isDark
            ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
            : 'bg-[hsl(0,0%,100%)] border-[hsl(40,10%,88%)] shadow-xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div
            className={`text-xs ${
              isDark ? 'text-gray-400' : 'text-slate-500'
            }`}
          >
            <span>
              {activeWorkout.exercises.length}{' '}
              {lang === 'ar' ? 'تمارين' : 'exercises'} • {totalCompletedSets}{' '}
              {lang === 'ar' ? 'مجموعات' : 'sets'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleFinishSession}
            className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
              isDark
                ? 'bg-[hsl(75,92%,56%)] hover:bg-[hsl(75,92%,50%)] text-[hsl(240,10%,9%)] shadow-[hsl(75,92%,56%)]/20'
                : 'bg-[hsl(76,78%,42%)] hover:bg-[hsl(76,78%,37%)] text-white shadow-[hsl(76,78%,42%)]/20'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>
              {lang === 'ar'
                ? 'إنهاء التمرين وحفظه في السجل'
                : 'Finish & Save Completed Workout'}
            </span>
          </button>
        </div>
      </div>

      {/* ADD EXERCISE MODAL */}
      {isAddExerciseOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-xl rounded-2xl border p-5 space-y-4 max-h-[88vh] flex flex-col ${
              isDark
                ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)]'
                : 'bg-[hsl(0,0%,100%)] border-[hsl(40,10%,88%)]'
            }`}
          >
            <div className="flex items-center justify-between border-b border-inherit pb-3">
              <div>
                <h3 className="font-display font-bold text-base">
                  {lang === 'ar'
                    ? 'اختر تمريناً لإضافته'
                    : 'Select Exercise to Add'}
                </h3>

                <p
                  className={`text-xs ${
                    isDark ? 'text-gray-400' : 'text-slate-500'
                  }`}
                >
                  {lang === 'ar'
                    ? 'اختر من المكتبة أو أنشئ تمريناً مخصصاً جديداً فوراً'
                    : 'Choose from your library or create a new custom exercise'}
                </p>
              </div>

              <button
                onClick={() => setIsAddExerciseOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search + Quick Create */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-gray-400" />

                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder={
                    lang === 'ar' ? 'بحث عن تمرين...' : 'Search exercise...'
                  }
                  className={`w-full ps-9 pe-3 py-2 rounded-xl text-xs sm:text-sm border focus:outline-none focus:border-[hsl(75,92%,56%)] ${
                    isDark
                      ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-100'
                      : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,85%)] text-slate-900'
                  }`}
                />
              </div>

              <button
                type="button"
                onClick={() => setShowQuickCreateEx(!showQuickCreateEx)}
                className="px-3 py-2 rounded-xl bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)] border border-[hsl(75,92%,56%)]/30 text-xs font-semibold shrink-0 cursor-pointer"
              >
                {showQuickCreateEx
                  ? lang === 'ar'
                    ? 'إخفاء الإنشاء'
                    : 'Hide New'
                  : lang === 'ar'
                  ? '+ تمرين جديد'
                  : '+ New Custom'}
              </button>
            </div>

            {/* Quick Create Exercise Form */}
            {showQuickCreateEx && (
              <form
                onSubmit={handleQuickCreateAndAddExercise}
                className={`p-3.5 rounded-xl border space-y-3 ${
                  isDark
                    ? 'bg-[hsl(240,5%,11%)] border-[hsl(75,92%,56%)]/40'
                    : 'bg-[hsl(76,78%,42%)]/5 border-[hsl(76,78%,42%)]/30'
                }`}
              >
                <div
                  className={`text-xs font-bold ${
                    isDark
                      ? 'text-[hsl(75,92%,56%)]'
                      : 'text-[hsl(76,78%,42%)]'
                  }`}
                >
                  {lang === 'ar'
                    ? 'إنشاء تمرين جديد وإضافته فوراً'
                    : 'Create & Add Custom Exercise'}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    value={newExName}
                    onChange={(e) => setNewExName(e.target.value)}
                    placeholder={
                      lang === 'ar' ? 'اسم التمرين...' : 'Exercise Name...'
                    }
                    className={`sm:col-span-2 px-3 py-2 rounded-lg text-xs border ${
                      isDark
                        ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)] text-white'
                        : 'bg-[hsl(0,0%,100%)] border-[hsl(40,10%,85%)] text-[hsl(240,10%,9%)]'
                    }`}
                  />

                  <select
                    value={newExMuscle}
                    onChange={(e) =>
                      setNewExMuscle(e.target.value as MuscleGroup)
                    }
                    className={`px-2.5 py-2 rounded-lg text-xs border ${
                      isDark
                        ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)] text-white'
                        : 'bg-[hsl(0,0%,100%)] border-[hsl(40,10%,85%)] text-[hsl(240,10%,9%)]'
                    }`}
                  >
                    {MUSCLE_GROUPS.map((mg) => (
                      <option key={mg} value={mg}>
                        {translateMuscleGroup(mg, lang)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="submit"
                    className={`px-4 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
                      isDark
                        ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)]'
                        : 'bg-[hsl(76,78%,42%)] text-white'
                    }`}
                  >
                    {lang === 'ar' ? 'حفظ وإضافة' : 'Create & Add'}
                  </button>
                </div>
              </form>
            )}

            {/* Muscle Group Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setPickerMuscleFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${
                  pickerMuscleFilter === 'ALL'
                    ? isDark
                      ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)]'
                      : 'bg-[hsl(76,78%,42%)] text-white'
                    : isDark
                    ? 'bg-[hsl(240,5%,11%)] text-gray-300'
                    : 'bg-[hsl(40,15%,94%)] text-slate-700'
                }`}
              >
                {lang === 'ar' ? 'الكل' : 'All'}
              </button>

              {MUSCLE_GROUPS.map((mg) => (
                <button
                  key={mg}
                  onClick={() => setPickerMuscleFilter(mg)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${
                    pickerMuscleFilter === mg
                      ? isDark
                        ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)]'
                        : 'bg-[hsl(76,78%,42%)] text-white'
                      : isDark
                      ? 'bg-[hsl(240,5%,11%)] text-gray-300'
                      : 'bg-[hsl(40,15%,94%)] text-slate-700'
                  }`}
                >
                  {translateMuscleGroup(mg, lang)}
                </button>
              ))}
            </div>

            {/* Exercise List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredLibraryExercises.map((ex) => {
                const alreadyInSession = activeWorkout.exercises.some(
                  (e) => e.exerciseId === ex.id
                );

                return (
                  <div
                    key={ex.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                      isDark
                        ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)]'
                        : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,88%)]'
                    }`}
                  >
                    <div>
                      <div className="font-display font-semibold text-sm">
                        {ex.name}
                      </div>

                      <div
                        className={`text-xs ${
                          isDark
                            ? 'text-[hsl(75,92%,56%)]'
                            : 'text-[hsl(76,78%,42%)]'
                        }`}
                      >
                        {translateMuscleGroup(ex.muscleGroup, lang)} •{' '}
                        <span className="font-mono-num uppercase text-gray-400">
                          {ex.defaultWeightUnit === 'none'
                            ? 'Bodyweight'
                            : ex.defaultWeightUnit}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddExerciseToSession(ex.id)}
                      className={`px-3.5 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1 cursor-pointer ${
                        alreadyInSession
                          ? isDark
                            ? 'bg-[hsl(240,4%,16%)] text-[hsl(75,92%,56%)] border border-[hsl(75,92%,56%)]/30'
                            : 'bg-[hsl(76,78%,42%)]/10 text-[hsl(76,78%,42%)] border border-[hsl(76,78%,42%)]/20'
                          : isDark
                          ? 'bg-[hsl(75,92%,56%)] hover:bg-[hsl(75,92%,50%)] text-[hsl(240,10%,9%)]'
                          : 'bg-[hsl(76,78%,42%)] hover:bg-[hsl(76,78%,37%)] text-white'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />

                      <span>
                        {alreadyInSession
                          ? lang === 'ar'
                            ? 'إضافة مرة أخرى'
                            : 'Add Again'
                          : lang === 'ar'
                          ? 'إضافة'
                          : 'Add'}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-inherit flex justify-end">
              <button
                onClick={() => setIsAddExerciseOpen(false)}
                className={`px-5 py-2 rounded-xl font-bold text-xs cursor-pointer ${
                  isDark
                    ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)]'
                    : 'bg-[hsl(76,78%,42%)] text-white'
                }`}
              >
                {lang === 'ar' ? 'إغلاق' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL WORKOUT CONFIRMATION MODAL */}
      {isCancelConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-2xl border p-5 space-y-4 ${
              isDark
                ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)]'
                : 'bg-[hsl(0,0%,100%)] border-[hsl(40,10%,88%)]'
            }`}
          >
            <h3 className="font-display font-bold text-base text-red-400">
              {lang === 'ar'
                ? 'هل أنت متأكد من إلغاء التمرين الحالي؟'
                : 'Cancel Active Workout?'}
            </h3>

            <p
              className={`text-xs sm:text-sm ${
                isDark ? 'text-gray-300' : 'text-slate-600'
              }`}
            >
              {lang === 'ar'
                ? 'سيتم حذف هذه الجلسة غير المكتملة ولن يتم حفظها في سجل التمارين.'
                : 'This unfinished workout session will be discarded and will not be saved to your workout history.'}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setIsCancelConfirmOpen(false)}
                className={`px-4 py-2 rounded-xl text-xs font-medium border cursor-pointer ${
                  isDark
                    ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300'
                    : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,88%)] text-slate-700'
                }`}
              >
                {lang === 'ar' ? 'العودة للتمرين' : 'Keep Training'}
              </button>

              <button
                onClick={async () => {
                  setIsCancelConfirmOpen(false);
                  await cancelActiveWorkout();
                }}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-semibold text-xs cursor-pointer"
              >
                {lang === 'ar' ? 'نعم، إلغاء التمرين' : 'Discard Workout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
