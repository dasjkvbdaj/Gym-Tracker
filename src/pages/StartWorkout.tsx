import React, { useMemo, useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  History,
  Play,
  Plus,
  Search,
  Trash2,
  X,
  Timer,
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

  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);
  const [pickerMuscleFilter, setPickerMuscleFilter] = useState<MuscleGroup | 'ALL'>('ALL');
  const [pickerSearch, setPickerSearch] = useState('');
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  const [showQuickCreateEx, setShowQuickCreateEx] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExMuscle, setNewExMuscle] = useState('Cardio');

  // Live Rest Timer State across the active workout
  const [elapsedRestSeconds, setElapsedRestSeconds] = useState<number>(0);

  useEffect(() => {
    if (!activeWorkout) return;

    let latestCompletedAt: number | null = null;
    let isAnySetInProgress = false;

    activeWorkout.exercises.forEach((ex) => {
      ex.sets.forEach((set) => {
        if (set.startedAt && !set.completed) {
          isAnySetInProgress = true;
        }
        if (set.completed && set.completedAt) {
          if (!latestCompletedAt || set.completedAt > latestCompletedAt) {
            latestCompletedAt = set.completedAt;
          }
        }
      });
    });

    if (isAnySetInProgress || !latestCompletedAt) {
      setElapsedRestSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - latestCompletedAt!) / 1000);
      setElapsedRestSeconds(Math.max(0, diff));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeWorkout]);

  const isCardioExercise = (entry: ExerciseEntry) => {
    return (
      entry.muscleGroup === 'Cardio' ||
      entry.exerciseNameSnapshot.toLowerCase().includes('cardio') ||
      entry.exerciseNameSnapshot.toLowerCase().includes('treadmill') ||
      entry.exerciseNameSnapshot.toLowerCase().includes('elliptical') ||
      entry.exerciseNameSnapshot.toLowerCase().includes('bike') ||
      entry.exerciseNameSnapshot.toLowerCase().includes('stair') ||
      entry.exerciseNameSnapshot.toLowerCase().includes('rowing') ||
      entry.exerciseNameSnapshot.toLowerCase().includes('running')
    );
  };

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

    const isCardio = isCardioExercise({
      id: '',
      exerciseId: libEx.id,
      exerciseNameSnapshot: libEx.name,
      muscleGroup: libEx.muscleGroup,
      weightType: initialUnit,
      sets: [],
      notes: '',
    });

    const defaultFirstWeight = isCardio
      ? null
      : initialUnit === 'none'
      ? null
      : lastPerf && lastPerf.bestSet && lastPerf.bestSet.weight !== null
      ? lastPerf.bestSet.weight
      : 0;

    const defaultFirstReps = isCardio ? 30 : lastPerf && lastPerf.bestSet ? lastPerf.bestSet.reps : 10;

    const newEntry: ExerciseEntry = {
      id: generateId('ex_entry'),
      exerciseId: libEx.id,
      exerciseNameSnapshot: libEx.name,
      muscleGroup: libEx.muscleGroup,
      weightType: isCardio ? 'none' : initialUnit,
      sets: [
        {
          id: generateId('set'),
          setNumber: 1,
          weight: defaultFirstWeight,
          reps: defaultFirstReps,
          completed: false,
          startedAt: null,
          completedAt: null,
          restDurationSeconds: null,
        },
      ],
      caloriesBurned: isCardio ? 0 : 0,
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
      lang === 'ar' ? `تمت إضافة "${libEx.name}" للتمرين` : `Added "${libEx.name}" to workout`,
      'success'
    );
  };

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

  const handleRemoveExerciseEntry = async (entryId: string) => {
    if (!activeWorkout) return;
    await updateActiveWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.filter((e) => e.id !== entryId),
    });
  };

  const handleExerciseUnitChange = async (entryId: string, newUnit: WeightUnit) => {
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
    await updateActiveWorkout({ ...activeWorkout, exercises: updatedExercises });
  };

  const handleUpdateCalories = async (entryId: string, calories: number) => {
    if (!activeWorkout) return;
    const updatedExercises = activeWorkout.exercises.map((entry) => {
      if (entry.id !== entryId) return entry;
      return { ...entry, caloriesBurned: Math.max(0, calories) };
    });
    await updateActiveWorkout({ ...activeWorkout, exercises: updatedExercises });
  };

  // START SET TIMING HANDLER
  const handleStartSet = async (entryId: string, setId: string) => {
    if (!activeWorkout) return;
    const now = Date.now();

    // Find previous completed set across the whole workout to calculate rest accurately: Next Set Started At - Previous Set Completed At
    let lastCompletedAt: number | null = null;
    activeWorkout.exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.completed && s.completedAt) {
          lastCompletedAt = s.completedAt;
        }
      });
    });

    const updatedExercises = activeWorkout.exercises.map((entry) => {
      if (entry.id !== entryId) return entry;
      const updatedSets = entry.sets.map((s) => {
        if (s.id !== setId) return s;

        const startedAt = s.startedAt || now;
        let restDurationSeconds = s.restDurationSeconds;

        if (!s.startedAt && lastCompletedAt) {
          restDurationSeconds = Math.max(0, Math.round((now - lastCompletedAt) / 1000));
        }

        return {
          ...s,
          startedAt,
          completed: false,
          restDurationSeconds,
        };
      });
      return { ...entry, sets: updatedSets };
    });

    await updateActiveWorkout({ ...activeWorkout, exercises: updatedExercises });
  };

  // COMPLETE SET TIMING HANDLER
  const handleCompleteSet = async (entryId: string, setId: string) => {
    if (!activeWorkout) return;
    const now = Date.now();

    const updatedExercises = activeWorkout.exercises.map((entry) => {
      if (entry.id !== entryId) return entry;
      const updatedSets = entry.sets.map((s) => {
        if (s.id !== setId) return s;
        const startedAt = s.startedAt || now;
        const completedAt = now;

        // Estimate set calorie burn based on lifting time and 115kg user body weight (approx 6.5 kcal/min for active lifting)
        const setDurationMinutes = (completedAt - startedAt) / 60000;
        const setCalories = Math.round(setDurationMinutes * 6.5 * 10) / 10;

        return {
          ...s,
          completed: true,
          startedAt,
          completedAt,
          caloriesBurned: setCalories,
        };
      });

      // Aggregate total calories for this exercise
      const totalExCalories = updatedSets.reduce((sum, s) => sum + (s.caloriesBurned || 0), 0);

      return { ...entry, sets: updatedSets, caloriesBurned: totalExCalories };
    });

    await updateActiveWorkout({ ...activeWorkout, exercises: updatedExercises });
  };

  const handleAddSet = async (entryId: string) => {
    if (!activeWorkout) return;

    const updatedExercises = activeWorkout.exercises.map((entry) => {
      if (entry.id !== entryId) return entry;
      const prevSet = entry.sets[entry.sets.length - 1];
      const nextSetNumber = entry.sets.length + 1;
      const newSet: SetEntry = {
        id: generateId('set'),
        setNumber: nextSetNumber,
        weight: entry.weightType === 'none' ? null : prevSet && prevSet.weight !== null ? prevSet.weight : 0,
        reps: prevSet ? prevSet.reps : 10,
        completed: false,
        startedAt: null,
        completedAt: null,
        restDurationSeconds: null,
      };
      return { ...entry, sets: [...entry.sets, newSet] };
    });
    await updateActiveWorkout({ ...activeWorkout, exercises: updatedExercises });
  };

  const handleRemoveSet = async (entryId: string, setId: string) => {
    if (!activeWorkout) return;

    const updatedExercises = activeWorkout.exercises.map((entry) => {
      if (entry.id !== entryId) return entry;
      const filtered = entry.sets.filter((s) => s.id !== setId);
      const renumbered = filtered.map((s, idx) => ({ ...s, setNumber: idx + 1 }));
      const totalExCalories = renumbered.reduce((sum, s) => sum + (s.caloriesBurned || 0), 0);
      return { ...entry, sets: renumbered, caloriesBurned: totalExCalories };
    });
    await updateActiveWorkout({ ...activeWorkout, exercises: updatedExercises });
  };

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
          const safeWeight = entry.weightType === 'none' ? null : value === null ? 0 : Math.max(0, Number(value));
          return { ...s, weight: safeWeight };
        }
        if (field === 'reps') {
          const safeReps = Math.max(0, Math.round(Number(value || 0)));
          return { ...s, reps: safeReps };
        }
        if (field === 'completed') {
          const isComp = Boolean(value);
          return {
            ...s,
            completed: isComp,
            startedAt: isComp ? s.startedAt || Date.now() : s.startedAt,
            completedAt: isComp ? s.completedAt || Date.now() : null,
          };
        }
        return s;
      });
      return { ...entry, sets: updatedSets };
    });
    await updateActiveWorkout({ ...activeWorkout, exercises: updatedExercises });
  };

  const handleFinishSession = async () => {
    if (!activeWorkout) return;

    if (activeWorkout.exercises.length === 0) {
      showToast(
        lang === 'ar'
          ? 'يرجى إضافة تمرين واحد على الأقل قبل إنهاء الجلسة.'
          : 'Please add at least one exercise before finishing the workout.',
        'error'
      );
      return;
    }
    await finishActiveWorkout();
    setCurrentSection('calendar');
  };

  const filteredLibraryExercises = useMemo(() => {
    return exercises.filter((ex) => {
      if (pickerMuscleFilter !== 'ALL' && ex.muscleGroup !== pickerMuscleFilter) {
        return false;
      }
      if (pickerSearch.trim() && !ex.name.toLowerCase().includes(pickerSearch.trim().toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [exercises, pickerMuscleFilter, pickerSearch]);

  if (!activeWorkout) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold">
            {lang === 'ar' ? 'بدء وتسجيل تمرين جديد' : 'Start a New Workout'}
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
            {lang === 'ar'
              ? 'اختر خطة جاهزة من جدولك الأسبوعي. يتم تسجيل التاريخ والوقت الفعليين لجهازك تلقائياً.'
              : 'Choose a workout from your weekly schedule. Your local date and time are recorded automatically.'}
          </p>
        </div>

        <div
          className={`p-4 sm:p-5 rounded-2xl border ${
            isDark
              ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
              : 'bg-[hsl(0,0%,100%)] border-[hsl(40,10%,88%)] shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-2">
            <CalendarIcon className="w-4 h-4" />
            <span>{lang === 'ar' ? 'التاريخ المحلي اليوم' : 'Automatic Local Date'}</span>
          </div>
          <div className="font-display font-bold text-base sm:text-lg">
            {formatFullDate(todayStr, lang)}
          </div>
        </div>

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
                        isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
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
                  {dayPlan.workoutType !== 'strength' && (
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                      {dayPlan.workoutType === 'rest'
                        ? lang === 'ar'
                          ? 'يوم راحة مخطط'
                          : 'Scheduled rest day'
                        : lang === 'ar'
                        ? 'تمرين كارديو مخصص'
                        : 'Custom Cardio Session'}
                    </span>
                  )}
                  <button
                    onClick={() =>
                      startNewWorkout({
                        workoutType: dayPlan.workoutType === 'cardio' ? 'cardio' : 'strength',
                        title: dayPlan.workoutType === 'rest' ? 'Bonus Session' : dayPlan.title,
                        muscleGroups: dayPlan.muscleGroups.length > 0 ? dayPlan.muscleGroups : ['Cardio'],
                        exerciseIds: dayPlan.assignedExerciseIds,
                        actualDate: todayStr,
                      })
                    }
                    className={`px-4 py-2 rounded-xl font-display font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      isDark
                        ? 'bg-[hsl(75,92%,56%)] hover:bg-[hsl(75,92%,50%)] text-[hsl(240,10%,9%)]'
                        : 'bg-[hsl(76,78%,42%)] hover:bg-[hsl(76,78%,37%)] text-white'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{lang === 'ar' ? 'بدء التمرين' : 'Start Workout'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const totalCompletedSets = activeWorkout.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
    0
  );

  const totalSessionCalories = activeWorkout.exercises.reduce(
    (sum, ex) =>
      sum + (ex.caloriesBurned || ex.sets.reduce((sSum, s) => sSum + (s.caloriesBurned || 0), 0)),
    0
  );

  return (
    <div className="space-y-6">
      {/* LIVE REST TIMER BANNER */}
      <div className="bg-gradient-to-r from-[hsl(75,92%,56%)]/2og to-cyan-500/20 border border-[hsl(75,92%,56%)]/40 p-4 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[hsl(75,92%,56%)]/20 text-[hsl(75,92%,56%)] flex items-center justify-center font-bold">
            <Timer className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-400">
              {lang === 'ar' ? 'مؤقت الراحة الحالي (Rest Timer)' : 'Current Rest Period'}
            </div>
            <div className="text-xl font-mono-num font-bold">
              {Math.floor(elapsedRestSeconds / 60)}m {elapsedRestSeconds % 60}s
            </div>
          </div>
        </div>
        {totalSessionCalories > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/30 font-mono-num font-bold text-xs">
            <Flame className="w-4 h-4" />
            <span>
              {Math.round(totalSessionCalories)} {lang === 'ar' ? 'سعرة حرارية' : 'kcal'}
            </span>
          </div>
        )}
      </div>

      <div
        className={`rounded-2xl p-4 sm:p-5 border shadow-lg ${
          isDark
            ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(75,92%,56%)]/40'
            : 'bg-[hsl(0,0%,100%)] border-[hsl(76,78%,42%)]/50 shadow-sm'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-inherit">
          <div className="space-y-2">
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
                    isDark ? 'bg-[hsl(75,92%,56%)]' : 'bg-[hsl(76,78%,42%)]'
                  }`}
                />
                {lang === 'ar' ? 'جلسة نشطة (حفظ تلقائي)' : 'LIVE SESSION • AUTOSAVED'}
              </span>
              <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                {lang === 'ar' ? 'البدء:' : 'Started:'}{' '}
                {formatTimeFromTimestamp(activeWorkout.startTimestamp, lang)} (
                {activeWorkout.timezone})
              </span>
            </div>

            <input
              type="text"
              value={activeWorkout.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              aria-label="Workout Title"
              className={`w-full max-w-xl font-display font-bold text-xl sm:text-2xl bg-transparent border-b border-transparent focus:border-[hsl(75,92%,56%)] focus:outline-none pb-0.5 ${
                isDark ? 'text-white' : 'text-[hsl(240,10%,9%)]'
              }`}
            />

            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
              <div
                className={`flex items-center gap-1.5 font-medium ${
                  isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
                }`}
              >
                <CalendarIcon className="w-4 h-4" />
                <span>{formatFullDate(activeWorkout.actualDate, lang)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <label
                  htmlFor="active-workout-date"
                  className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}
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
              <span>{lang === 'ar' ? 'إنهاء وحفظ التمرين' : 'Finish Workout'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {activeWorkout.exercises.map((entry) => {
          const isCardio = isCardioExercise(entry);
          const lastPerf = getLastPerformanceForExercise(entry.exerciseId, completedWorkouts);

          return (
            <div
              key={entry.id}
              className={`rounded-2xl border p-4 sm:p-5 space-y-4 transition-all ${
                isDark
                  ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
                  : 'bg-[hsl(0,0%,100%)] border-[hsl(40,10%,88%)] shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-inherit">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-display font-bold text-base sm:text-lg">
                      {entry.exerciseNameSnapshot}
                    </h3>
                  </div>
                  {lastPerf && lastPerf.bestSet && (
                    <div className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                      <History className="w-3.5 h-3.5 text-[hsl(75,92%,56%)]" />
                      <span>
                        {lang === 'ar' ? 'آخر أداء مسجل' : 'Last recorded'}:
                      </span>
                      <strong className={`font-mono-num ${isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'}`}>
                        {isCardio
                          ? `${lastPerf.bestSet.reps} ${lang === 'ar' ? 'دقيقة' : 'mins'}`
                          : formatSetPerformance(
                              lastPerf.bestSet.weight,
                              lastPerf.weightType,
                              lastPerf.bestSet.reps,
                              lang
                            )}
                      </strong>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2">
                  {!isCardio && (
                    <div
                      className={`inline-flex rounded-xl p-1 border ${
                        isDark ? 'bg-[hsl(240,6%,4%)] border-[hsl(240,4%,19%)]' : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,88%)]'
                      }`}
                    >
                      {(['kg', 'lbs', 'none'] as const).map((u) => {
                        const isSelected = entry.weightType === u;
                        return (
                          <button
                            key={u}
                            type="button"
                            onClick={() => handleExerciseUnitChange(entry.id, u)}
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
                            {u === 'none' ? (lang === 'ar' ? 'وزن الجسم' : 'Bodyweight') : u.toUpperCase()}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveExerciseEntry(entry.id)}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      isDark ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isCardio ? (
                <div className="space-y-3 py-2">
                  {entry.sets.map((setItem) => (
                    <div
                      key={setItem.id}
                      className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                        isDark ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)]' : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,88%)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                        <label className="text-xs font-semibold whitespace-nowrap">
                          {lang === 'ar' ? 'المدة (دقائق):' : 'Duration (Mins):'}
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          value={setItem.reps || 30}
                          onChange={(e) =>
                            handleUpdateSet(
                              entry.id,
                              setItem.id,
                              'reps',
                              e.target.value === '' ? 0 : Number(e.target.value)
                            )
                          }
                          className={`w-24 px-3 py-1.5 rounded-xl font-mono-num text-sm font-bold border focus:outline-none focus:border-cyan-500 ${
                            isDark ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)] text-white' : 'bg-white border-[hsl(40,10%,85%)] text-slate-900'
                          }`}
                        />
                      </div>

                      <div className="flex items-center gap-2 flex-1">
                        <Flame className="w-4 h-4 text-orange-400 shrink-0" />
                        <label className="text-xs font-semibold whitespace-nowrap text-orange-500">
                          {lang === 'ar' ? 'السعرات الحرارية:' : 'Calories Burned:'}
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={entry.caloriesBurned ?? ''}
                          onChange={(e) =>
                            handleUpdateCalories(
                              entry.id,
                              e.target.value === '' ? 0 : Number(e.target.value)
                            )
                          }
                          className={`w-28 px-3 py-1.5 rounded-xl font-mono-num text-sm font-bold border focus:outline-none focus:border-orange-500 ${
                            isDark ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)] text-orange-300' : 'bg-white border-orange-200 text-orange-900'
                          }`}
                        />
                        <span className="text-xs font-semibold text-orange-400">kcal</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className={`grid grid-cols-12 gap-2 px-2 text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                    <div className="col-span-1 text-center">{lang === 'ar' ? 'مجموعة' : 'Set'}</div>
                    <div className="col-span-3">{lang === 'ar' ? 'الوزن' : 'Weight'}</div>
                    <div className="col-span-3">{lang === 'ar' ? 'العدات' : 'Reps'}</div>
                    <div className="col-span-5 text-center">{lang === 'ar' ? 'التوقيت والإجراء' : 'Timing & Action'}</div>
                  </div>

                  {entry.sets.map((setItem) => {
                    const isInProgress = setItem.startedAt && !setItem.completed;

                    return (
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
                        <div className="col-span-1 flex justify-center">
                          <span
                            className={`w-7 h-7 rounded-lg font-mono-num text-xs font-bold flex items-center justify-center ${
                              isDark ? 'bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)]' : 'bg-[hsl(76,78%,42%)]/15 text-[hsl(76,78%,42%)]'
                            }`}
                          >
                            {setItem.setNumber}
                          </span>
                        </div>

                        <div className="col-span-3">
                          {entry.weightType === 'none' ? (
                            <div className="text-xs font-semibold text-[hsl(75,92%,56%)]">
                              {lang === 'ar' ? 'وزن الجسم' : 'Bodyweight'}
                            </div>
                          ) : (
                            <input
                              type="number"
                              inputMode="decimal"
                              step="any"
                              min={0}
                              value={setItem.weight ?? ''}
                              onChange={(e) =>
                                handleUpdateSet(entry.id, setItem.id, 'weight', e.target.value === '' ? 0 : Number(e.target.value))
                              }
                              className={`w-full h-10 px-2 rounded-xl font-mono-num text-sm font-bold border ${
                                isDark ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)] text-white' : 'bg-white border-[hsl(40,10%,85%)] text-slate-900'
                              }`}
                            />
                          )}
                        </div>

                        <div className="col-span-3">
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={setItem.reps}
                            onChange={(e) =>
                              handleUpdateSet(entry.id, setItem.id, 'reps', e.target.value === '' ? 0 : Number(e.target.value))
                            }
                            className={`w-full h-10 px-2 rounded-xl font-mono-num text-sm font-bold border ${
                              isDark ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)] text-white' : 'bg-white border-[hsl(40,10%,85%)] text-slate-900'
                            }`}
                          />
                        </div>

                        {/* START SET / COMPLETE SET TIMING BUTTONS */}
                        <div className="col-span-5 flex items-center justify-end gap-1.5">
                          {!setItem.completed ? (
                            <div className="flex items-center gap-1">
                              {!setItem.startedAt ? (
                                <button
                                  type="button"
                                  onClick={() => handleStartSet(entry.id, setItem.id)}
                                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-xs"
                                >
                                  {lang === 'ar' ? 'ابدأ المجموعة' : 'Start Set'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleCompleteSet(entry.id, setItem.id)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer animate-pulse shadow-xs"
                                >
                                  {lang === 'ar' ? 'إتمام المجموعة' : 'Complete Set'}
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col text-[10px] font-mono-num text-gray-400 text-right">
                              <span>
                                {lang === 'ar' ? 'المدة:' : 'Duration:'}{' '}
                                {setItem.startedAt && setItem.completedAt
                                  ? `${Math.round((setItem.completedAt - setItem.startedAt) / 1000)}s`
                                  : '-'}
                              </span>
                              {setItem.restDurationSeconds !== null && setItem.restDurationSeconds !== undefined && (
                                <span className="text-blue-400">
                                  {lang === 'ar' ? 'الراحة:' : 'Rest:'} {setItem.restDurationSeconds}s
                                </span>
                              )}
                              {setItem.caloriesBurned ? (
                                <span className="text-orange-400">
                                  🔥 {setItem.caloriesBurned} kcal
                                </span>
                              ) : null}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveSet(entry.id, setItem.id)}
                            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleAddSet(entry.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center gap-1 cursor-pointer ${
                        isDark ? 'bg-[hsl(240,5%,11%)] border-[hsl(75,92%,56%)]/40 text-[hsl(75,92%,56%)]' : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'إضافة مجموعة' : 'Add Set'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

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
          <span>{lang === 'ar' ? 'إضافة تمرين للجلسة الحالية' : 'Add Exercise to Workout'}</span>
        </button>
      </div>

      {/* EXERCISE PICKER MODAL */}
      {isAddExerciseOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-xl rounded-2xl border p-5 space-y-4 max-h-[88vh] flex flex-col ${
              isDark ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,19%)]' : 'bg-white border-[hsl(40,10%,88%)]'
            }`}
          >
            <div className="flex items-center justify-between border-b border-inherit pb-3">
              <h3 className="font-bold text-base">{lang === 'ar' ? 'اختر تمريناً' : 'Select Exercise'}</h3>
              <button onClick={() => setIsAddExerciseOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-gray-400" />
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder={lang === 'ar' ? 'بحث...' : 'Search...'}
                  className={`w-full ps-9 pe-3 py-2 rounded-xl text-sm border focus:outline-none ${
                    isDark ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-white' : 'bg-gray-50 border-gray-200 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredLibraryExercises.map((ex) => (
                <div
                  key={ex.id}
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    isDark ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)]' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div>
                    <div className="font-bold text-sm">{ex.name}</div>
                    <div className="text-xs text-[hsl(75,92%,56%)]">{translateMuscleGroup(ex.muscleGroup, lang)}</div>
                  </div>
                  <button
                    onClick={() => handleAddExerciseToSession(ex.id)}
                    className="px-3 py-1.5 rounded-xl bg-[hsl(75,92%,56%)] text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    {lang === 'ar' ? 'إضافة' : 'Add'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {isCancelConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border p-5 space-y-4 ${isDark ? 'bg-[hsl(240,5%,7.5%)] border-gray-700' : 'bg-white border-gray-200'}`}>
            <h3 className="font-bold text-red-500">{lang === 'ar' ? 'إلغاء التمرين؟' : 'Cancel Workout?'}</h3>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsCancelConfirmOpen(false)} className="px-4 py-2 rounded-xl border text-xs cursor-pointer">
                {lang === 'ar' ? 'تراجع' : 'Back'}
              </button>
              <button
                onClick={async () => {
                  setIsCancelConfirmOpen(false);
                  await cancelActiveWorkout();
                }}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold text-xs cursor-pointer"
              >
                {lang === 'ar' ? 'إلغاء التمرين' : 'Discard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
