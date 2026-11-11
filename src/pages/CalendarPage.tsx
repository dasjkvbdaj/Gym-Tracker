import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  Moon,
  Plus,
  Edit3,
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
  formatFullDate,
  formatTimeFromTimestamp,
  getDateMetadata,
  getMonthCalendarGrid,
  ORDERED_WEEK_DAYS,
  toLocalDateString,
} from '../utils/dateUtils';

import {
  translateDayName,
  translateMuscleGroup,
  MUSCLE_GROUPS,
} from '../utils/i18n';

import { formatSetPerformance } from '../utils/unitConversion';

const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_NAMES_AR = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

// دالة مساعدة للتحقق مما إذا كان التمرين كارديو
const isCardioExercise = (exerciseName: string, muscleGroup: string) => {
  const name = exerciseName.toLowerCase();
  return (
    muscleGroup === 'Cardio' ||
    name.includes('cardio') ||
    name.includes('treadmill') ||
    name.includes('elliptical') ||
    name.includes('bike') ||
    name.includes('stair') ||
    name.includes('rowing') ||
    name.includes('running')
  );
};

export const CalendarPage: React.FC = () => {
  const {
    completedWorkouts,
    weeklySchedule,
    exercises,
    settings,
    selectedCalendarDate,
    setSelectedCalendarDate,
    saveHistoricalWorkout,
    deleteWorkout,
  } = useGym();

  const lang = settings.language;
  const isDark = settings.theme === 'dark';

  const now = new Date();

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);

  const [editingWorkout, setEditingWorkout] =
    useState<WorkoutSession | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] =
    useState<string | null>(null);

  const [isAddForgottenOpen, setIsAddForgottenOpen] =
    useState(false);

  // Muscle filter is ONLY for Add Forgotten Workout.
  const [forgottenMuscleFilter, setForgottenMuscleFilter] =
    useState<MuscleGroup | 'ALL'>('ALL');

  const [expandedWorkoutId, setExpandedWorkoutId] =
    useState<string | null>(null);

  // CALENDAR DATA

  const calendarCells = useMemo(
    () => getMonthCalendarGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const workoutsByDate = useMemo(() => {
    const map = new Map<string, typeof completedWorkouts>();

    for (const workout of completedWorkouts) {
      const existing = map.get(workout.actualDate) || [];
      existing.push(workout);
      map.set(workout.actualDate, existing);
    }
    return map;
  }, [completedWorkouts]);

  const scheduledRestDays = useMemo(
    () =>
      new Set(
        weeklySchedule
          .filter((d) => d.workoutType === 'rest')
          .map((d) => d.day)
      ),
    [weeklySchedule]
  );

  // ALL WORKOUTS FOR THE SELECTED DATE.
  const selectedDateWorkouts = useMemo(
    () => workoutsByDate.get(selectedCalendarDate) || [],
    [workoutsByDate, selectedCalendarDate]
  );

  const selectedDateMeta = useMemo(
    () => getDateMetadata(selectedCalendarDate),
    [selectedCalendarDate]
  );

  const selectedDaySchedule = useMemo(
    () =>
      weeklySchedule.find(
        (d) => d.day === selectedDateMeta.dayOfWeek
      ),
    [weeklySchedule, selectedDateMeta]
  );

  // MONTH STATISTICS

  const monthStats = useMemo(() => {
    let strengthCount = 0;
    let cardioCount = 0;

    for (const workout of completedWorkouts) {
      if (
        workout.year === viewYear &&
        workout.month === viewMonth
      ) {
        if (
          workout.workoutType === 'cardio' ||
          workout.muscleGroups.includes('Cardio')
        ) {
          cardioCount++;
        } else {
          strengthCount++;
        }
      }
    }
    return {
      strengthCount,
      cardioCount,
      total: strengthCount + cardioCount,
    };
  }, [completedWorkouts, viewYear, viewMonth]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();

    return Array.from(
      { length: 11 },
      (_, i) => currentYear - 6 + i
    );
  }, []);

  // MONTH NAVIGATION

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((year) => year - 1);
    } else {
      setViewMonth((month) => month - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((year) => year + 1);
    } else {
      setViewMonth((month) => month + 1);
    }
  };

  const handleJumpToToday = () => {
    const today = new Date();

    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth() + 1);
    setSelectedCalendarDate(toLocalDateString(today));
  };

  // EDIT WORKOUT

  const handleOpenEdit = (session: WorkoutSession) => {
    setEditingWorkout(
      JSON.parse(JSON.stringify(session)) as WorkoutSession
    );

    setIsAddForgottenOpen(false);
    setForgottenMuscleFilter('ALL');
  };

  const handleCloseEdit = () => {
    setEditingWorkout(null);
    setIsAddForgottenOpen(false);
    setForgottenMuscleFilter('ALL');
  };

  // EDIT WEIGHT AND REPS / CARDIO MINUTES

  const handleEditSetChange = (
    entryId: string,
    setId: string,
    field: 'weight' | 'reps',
    value: number
  ) => {
    if (!editingWorkout) return;

    const updatedExercises = editingWorkout.exercises.map((ex) => {
      if (ex.id !== entryId) return ex;
      return {
        ...ex,
        sets: ex.sets.map((set) => {
          if (set.id !== setId) return set;
          if (field === 'weight') {
            return {
              ...set,
              weight: ex.weightType === 'none' ? null : Math.max(0, value),
            };
          }
          return {
            ...set,
            reps: Math.max(0, Math.round(value)),
          };
        }),
      };
    });
    setEditingWorkout({
      ...editingWorkout,
      exercises: updatedExercises,
    });
  };

  // CHANGE WEIGHT UNIT

  const handleEditExerciseUnit = (
    entryId: string,
    unit: WeightUnit
  ) => {
    if (!editingWorkout) return;

    const updatedExercises = editingWorkout.exercises.map((ex) => {
      if (ex.id !== entryId) return ex;
      return {
        ...ex,
        weightType: unit,
        sets: ex.sets.map((set) => ({
          ...set,
          weight: unit === 'none' ? null : set.weight ?? 0,
        })),
      };
    });
    setEditingWorkout({
      ...editingWorkout,
      exercises: updatedExercises,
    });
  };

  // ADD SET

  const handleAddSet = (entryId: string) => {
    if (!editingWorkout) return;

    const updatedExercises = editingWorkout.exercises.map((ex) => {
      if (ex.id !== entryId) return ex;
      const isCardio = isCardioExercise(ex.exerciseNameSnapshot, ex.muscleGroup);
      const previousSet = ex.sets[ex.sets.length - 1];
      const newSet: SetEntry = {
        id: generateId('set'),
        setNumber: ex.sets.length + 1,
        weight: isCardio || ex.weightType === 'none' ? null : previousSet?.weight ?? 0,
        reps: isCardio ? 30 : previousSet?.reps ?? 10,
        completed: true,
      };
      return {
        ...ex,
        sets: [...ex.sets, newSet],
      };
    });
    setEditingWorkout({
      ...editingWorkout,
      exercises: updatedExercises,
    });
  };

  // REMOVE SET

  const handleRemoveSet = (
    entryId: string,
    setId: string
  ) => {
    if (!editingWorkout) return;

    const updatedExercises = editingWorkout.exercises.map((ex) => {
      if (ex.id !== entryId) return ex;
      return {
        ...ex,
        sets: ex.sets
          .filter((set) => set.id !== setId)
          .map((set, index) => ({
            ...set,
            setNumber: index + 1,
          })),
      };
    });
    setEditingWorkout({
      ...editingWorkout,
      exercises: updatedExercises,
    });
  };

  // ADD FORGOTTEN EXERCISE

  const handleAddForgottenExercise = (exerciseId: string) => {
    if (!editingWorkout || !exerciseId) return;

    const exercise = exercises.find(
      (item) => item.id === exerciseId
    );
    if (!exercise) return;
    const alreadyExists = editingWorkout.exercises.some(
      (ex) => ex.exerciseId === exerciseId
    );
    if (alreadyExists) return;

    const isCardio = isCardioExercise(exercise.name, exercise.muscleGroup);
    const unit: WeightUnit = exercise.isBodyweight || isCardio
      ? 'none'
      : exercise.defaultWeightUnit || settings.preferredWeightUnit;

    const newEntry: ExerciseEntry = {
      id: generateId('ex_entry'),
      exerciseId: exercise.id,
      exerciseNameSnapshot: exercise.name,
      muscleGroup: exercise.muscleGroup,
      weightType: unit,
      sets: [
        {
          id: generateId('set'),
          setNumber: 1,
          weight: null,
          reps: isCardio ? 30 : 10,
          completed: true,
        },
      ],
      notes: '',
    };
    const groups = editingWorkout.muscleGroups.includes(
      exercise.muscleGroup
    )
      ? editingWorkout.muscleGroups
      : [
          ...editingWorkout.muscleGroups,
          exercise.muscleGroup,
        ];
    setEditingWorkout({
      ...editingWorkout,
      muscleGroups: groups,
      exercises: [
        ...editingWorkout.exercises,
        newEntry,
      ],
    });
  };

  // REMOVE EXERCISE

  const handleRemoveExercise = (entryId: string) => {
    if (!editingWorkout) return;

    const remaining = editingWorkout.exercises.filter(
      (ex) => ex.id !== entryId
    );
    const groups = Array.from(
      new Set(
        remaining.map((ex) => ex.muscleGroup)
      )
    );
    setEditingWorkout({
      ...editingWorkout,
      exercises: remaining,
      muscleGroups: groups,
    });
  };

  // SAVE / UPDATE

  const handleSaveWorkout = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!editingWorkout) return;
    await saveHistoricalWorkout(editingWorkout);
    setEditingWorkout(null);
    setIsAddForgottenOpen(false);
    setForgottenMuscleFilter('ALL');
  };

  // DELETE

  const handleDeleteWorkout = async () => {
    if (!deleteConfirmId) return;

    await deleteWorkout(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  // STYLES (Restored exact colors from old version)

  const panelClass = isDark
    ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
    : 'bg-white border-[hsl(40,10%,88%)] shadow-xs';

  const fieldClass = `w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:border-[hsl(75,92%,56%)] ${
    isDark
      ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-white'
      : 'bg-[hsl(40,20%,97.5%)] border-[hsl(40,10%,85%)] text-[hsl(240,10%,9%)]'
  }`;

  // FILTERED EXERCISES FOR ADD FORGOTTEN WORKOUT

  const availableForgottenExercises = editingWorkout
    ? exercises.filter((exercise) => {
        const notAlreadyAdded =
          !editingWorkout.exercises.some(
            (existing) =>
              existing.exerciseId === exercise.id
          );

        const matchesMuscle =
          forgottenMuscleFilter === 'ALL' ||
          exercise.muscleGroup === forgottenMuscleFilter;
        return notAlreadyAdded && matchesMuscle;
      })
    : [];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
            {lang === 'ar' ? 'تقويم التمارين الشهري' : 'Workout Activity Calendar'}
          </h1>
          <p
            className={`text-sm mt-1 ${
              isDark ? 'text-gray-400' : 'text-slate-600'
            }`}
          >
            {lang === 'ar'
              ? 'يعرض التمارين المسجلة فعلياً حسب التاريخ. اضغط على أي يوم لعرض التفاصيل أو إضافة تمرين.'
              : 'Displays actual recorded workout dates. Select any date to inspect sessions or log a workout.'}
          </p>
        </div>
        {/* JUMP TO TODAY */}
        <button
          onClick={handleJumpToToday}
          className={`self-start sm:self-auto px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
            isDark
              ? 'bg-[hsl(75,92%,56%)]/15 hover:bg-[hsl(75,92%,56%)]/25 text-[hsl(75,92%,56%)] border-[hsl(75,92%,56%)]/30'
              : 'bg-indigo-700 hover:bg-indigo-800 text-white border-indigo-700 shadow-sm'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>
            {lang === 'ar' ? 'الانتقال إلى اليوم' : 'Jump to Today'}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: CALENDAR */}
        <div
          className={`lg:col-span-8 rounded-2xl border p-4 sm:p-6 space-y-5 ${panelClass}`}
        >
          {/* MONTH NAVIGATION */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300 hover:border-gray-500'
                    : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,88%)] text-slate-700 hover:bg-[hsl(40,15%,91%)]'
                }`}
                aria-label="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <select
                  value={viewMonth}
                  onChange={(e) =>
                    setViewMonth(Number(e.target.value))
                  }
                  aria-label="Select Month"
                  className={`px-3 py-2 rounded-xl font-display font-bold text-sm sm:text-base border focus:outline-none focus:border-[hsl(75,92%,56%)] ${
                    isDark
                      ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-white'
                      : 'bg-[hsl(40,20%,97.5%)] border-[hsl(40,10%,85%)] text-[hsl(240,10%,9%)]'
                  }`}
                >
                  {(lang === 'ar'
                    ? MONTH_NAMES_AR
                    : MONTH_NAMES_EN
                  ).map((mName, idx) => (
                    <option key={mName} value={idx + 1}>
                      {mName}
                    </option>
                  ))}
                </select>
                <select
                  value={viewYear}
                  onChange={(e) =>
                    setViewYear(Number(e.target.value))
                  }
                  aria-label="Select Year"
                  className={`px-3 py-2 rounded-xl font-mono-num font-bold text-sm sm:text-base border focus:outline-none focus:border-[hsl(75,92%,56%)] ${
                    isDark
                      ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-white'
                      : 'bg-[hsl(40,20%,97.5%)] border-[hsl(40,10%,85%)] text-[hsl(240,10%,9%)]'
                  }`}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleNextMonth}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300 hover:border-gray-500'
                    : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,88%)] text-slate-700 hover:bg-[hsl(40,15%,91%)]'
                }`}
                aria-label="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {/* MONTH STATISTICS */}
            <div className="flex items-center gap-2 text-xs font-mono-num">
              <span
                className={`px-2.5 py-1 rounded-lg border font-semibold ${
                  isDark
                    ? 'bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)] border-[hsl(75,92%,56%)]/30'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}
              >
                {monthStats.strengthCount}{' '}
                {lang === 'ar' ? 'حديد' : 'Strength'}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                {monthStats.cardioCount}{' '}
                {lang === 'ar' ? 'كارديو' : 'Cardio'}
              </span>
            </div>
          </div>

          {/* WEEKDAYS */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
            {ORDERED_WEEK_DAYS.map((dayName) => (
              <div
                key={dayName}
                className={`py-1.5 text-[11px] sm:text-xs font-display font-bold uppercase ${
                  isDark ? 'text-gray-400' : 'text-slate-500'
                }`}
              >
                {translateDayName(dayName, lang, true)}
              </div>
            ))}
          </div>

          {/* CALENDAR GRID */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarCells.map((cell) => {
              const dayWorkouts =
                workoutsByDate.get(cell.dateStr) || [];
              const hasStrength = dayWorkouts.some(
                (w) => w.workoutType === 'strength' && !w.muscleGroups.includes('Cardio')
              );
              const hasCardio = dayWorkouts.some(
                (w) =>
                  w.workoutType === 'cardio' ||
                  w.muscleGroups.includes('Cardio')
              );
              const isScheduledRest = scheduledRestDays.has(
                cell.dayOfWeek
              );
              const isSelected =
                cell.dateStr === selectedCalendarDate;
              return (
                <button
                  key={cell.dateStr}
                  onClick={() =>
                    setSelectedCalendarDate(cell.dateStr)
                  }
                  className={`min-h-[64px] sm:min-h-[78px] p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between text-start transition-all cursor-pointer relative ${
                    !cell.isCurrentMonth ? 'opacity-40' : ''
                  } ${
                    isSelected
                      ? isDark
                        ? 'bg-[hsl(75,92%,56%)]/15 border-[hsl(75,92%,56%)] ring-1 ring-[hsl(75,92%,56%)]/50'
                        : 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-300'
                      : dayWorkouts.length > 0
                      ? isDark
                        ? 'bg-[hsl(240,5%,11%)] border-[hsl(75,92%,56%)]/30 hover:border-[hsl(75,92%,56%)]/60'
                        : 'bg-indigo-50/50 border-indigo-200 hover:border-indigo-400'
                      : isDark
                      ? 'bg-[hsl(240,6%,4%)] border-[hsl(240,4%,16%)] hover:border-gray-700'
                      : 'bg-[hsl(40,20%,97.5%)] border-[hsl(40,10%,88%)] hover:border-[hsl(40,10%,78%)]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`font-mono-num text-xs sm:text-sm font-bold w-6 h-6 rounded-lg flex items-center justify-center ${
                        cell.isToday
                          ? isDark
                            ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,6%,4%)]'
                            : 'bg-indigo-700 text-white'
                          : isSelected
                          ? isDark
                            ? 'text-[hsl(75,92%,56%)]'
                            : 'text-indigo-700'
                          : isDark
                          ? 'text-gray-200'
                          : 'text-[hsl(240,10%,9%)]'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {isScheduledRest &&
                      dayWorkouts.length === 0 && (
                        <span title="Scheduled Rest Day">
                          <Moon className="w-3 h-3 text-gray-500 opacity-60" />
                        </span>
                      )}
                  </div>
                  {/* ACTIVITY INDICATORS */}
                  <div className="space-y-1 mt-1 w-full">
                    {hasStrength && (
                      <div
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold truncate ${
                          isDark
                            ? 'bg-[hsl(75,92%,56%)]/20 text-[hsl(75,92%,56%)] border-[hsl(75,92%,56%)]/30'
                            : 'bg-indigo-100 text-indigo-700 border-indigo-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isDark
                              ? 'bg-[hsl(75,92%,56%)]'
                              : 'bg-indigo-600'
                          }`}
                        />
                        <span className="hidden sm:inline truncate">
                          {lang === 'ar' ? 'حديد' : 'Strength'}
                        </span>
                      </div>
                    )}
                    {hasCardio && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-semibold truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                        <span className="hidden sm:inline truncate">
                          {lang === 'ar' ? 'كارديو' : 'Cardio'}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* LEGEND */}
          <div
            className={`pt-3 border-t flex flex-wrap items-center gap-4 text-xs ${
              isDark
                ? 'border-[hsl(240,4%,16%)] text-gray-400'
                : 'border-[hsl(40,10%,88%)] text-slate-600'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`w-3 h-3 rounded-full ${
                  isDark
                    ? 'bg-[hsl(75,92%,56%)]'
                    : 'bg-indigo-600'
                }`}
              />
              <span>
                {lang === 'ar'
                  ? 'تمرين حديد مسجل'
                  : 'Strength Training Recorded'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-cyan-400" />
              <span>
                {lang === 'ar'
                  ? 'جلسة كارديو مسجلة'
                  : 'Cardio Session Recorded'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-gray-500" />
              <span>
                {lang === 'ar'
                  ? 'يوم راحة مخطط'
                  : 'Planned Rest Day'}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT: SELECTED DATE DETAILS */}
        <div
          className={`lg:col-span-4 rounded-2xl border p-5 flex flex-col justify-between gap-5 ${panelClass}`}
        >
          <div className="space-y-4">
            {/* SELECTED DATE */}
            <div className="pb-4 border-b border-inherit">
              <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(75,92%,56%)]">
                {lang === 'ar' ? 'التاريخ المحدد' : 'Selected Date'}
              </span>
              <h2 className="text-lg font-display font-bold mt-0.5">
                {formatFullDate(selectedCalendarDate, lang)}
              </h2>
              {selectedDaySchedule && (
                <p
                  className={`text-xs mt-1 ${
                    isDark ? 'text-gray-400' : 'text-slate-500'
                  }`}
                >
                  {lang === 'ar'
                    ? 'الخطة المرجعية لهذا اليوم:'
                    : 'Reference plan:'}{' '}
                  <strong>{selectedDaySchedule.title}</strong>
                </p>
              )}
            </div>

            {/* SELECTED DATE WORKOUTS */}
            {selectedDateWorkouts.length === 0 ? (
              <div
                className={`py-8 px-4 rounded-xl border border-dashed text-center space-y-2 ${
                  isDark
                    ? 'border-[hsl(240,4%,19%)] text-gray-400'
                    : 'border-[hsl(40,10%,82%)] text-slate-500'
                }`}
              >
                <CalendarIcon className="w-6 h-6 mx-auto opacity-40" />
                <p className="text-xs font-medium">
                  {lang === 'ar'
                    ? 'لا توجد تمارين مسجلة في هذا التاريخ.'
                    : 'No workouts recorded on this date.'}
                </p>
                <p className="text-[11px] opacity-75">
                  {lang === 'ar'
                    ? 'يمكنك إضافة تمرين لهذا التاريخ حتى لو كان يوم راحة مجدول.'
                    : 'You can record a strength or cardio session on any date, including scheduled rest days.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {selectedDateWorkouts.map((workout) => {
                  const expanded =
                    expandedWorkoutId === workout.id;
                  return (
                    <div
                      key={workout.id}
                      className={`p-3.5 rounded-xl border space-y-2.5 ${
                        isDark
                          ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)]'
                          : 'bg-[hsl(40,20%,97.5%)] border-[hsl(40,10%,88%)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded ${
                              workout.workoutType === 'cardio' || workout.muscleGroups.includes('Cardio')
                                ? 'bg-cyan-500/15 text-cyan-400'
                                : isDark
                                ? 'bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)]'
                                : 'bg-indigo-100 text-indigo-700'
                            }`}
                          >
                            {workout.workoutType === 'cardio' || workout.muscleGroups.includes('Cardio') ? (
                              <Flame className="w-3 h-3" />
                            ) : (
                              <Dumbbell className="w-3 h-3" />
                            )}
                            <span>
                              {workout.workoutType === 'cardio' || workout.muscleGroups.includes('Cardio')
                                ? 'Cardio'
                                : 'Strength'}
                            </span>
                          </span>
                          <h3 className="font-display font-bold text-sm mt-1">
                            {workout.title}
                          </h3>
                        </div>
                        <button
                          onClick={() =>
                            setExpandedWorkoutId(
                              expanded ? null : workout.id
                            )
                          }
                          className="text-xs text-[hsl(75,92%,56%)] font-semibold cursor-pointer"
                        >
                          {expanded
                            ? lang === 'ar' ? 'إخفاء' : 'Hide'
                            : lang === 'ar' ? 'التفاصيل' : 'Details'}
                        </button>
                      </div>

                      {/* TIME */}
                      <div className="text-[11px] text-gray-400 font-mono-num flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeFromTimestamp(
                          workout.startTimestamp,
                          lang
                        )}
                        {workout.finishTimestamp
                          ? ` – ${formatTimeFromTimestamp(
                              workout.finishTimestamp,
                              lang
                            )}`
                          : ''}
                      </div>

                      {/* MUSCLE GROUPS */}
                      {workout.muscleGroups.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {workout.muscleGroups.map((mg) => (
                            <span
                              key={mg}
                              className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                isDark
                                  ? 'bg-[hsl(240,6%,4%)] text-gray-300'
                                  : 'bg-white text-slate-700'
                              }`}
                            >
                              {translateMuscleGroup(mg, lang)}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* EXERCISE SUMMARY / DETAILS */}
                      {expanded && (
                        <div className="space-y-3 pt-2 border-t border-inherit">
                          {workout.cardioDetails && (
                            <div className="text-xs space-y-1">
                              <strong>
                                {lang === 'ar'
                                  ? 'نشاط الكارديو'
                                  : 'Cardio Activity'}
                              </strong>
                              <p>
                                {workout.cardioDetails.activityType}
                              </p>
                              <p>
                                {
                                  workout.cardioDetails
                                    .durationMinutes
                                }{' '}
                                {lang === 'ar' ? 'دقيقة' : 'min'}
                                {workout.cardioDetails.distance !=
                                  null
                                  ? ` • ${workout.cardioDetails.distance} ${workout.cardioDetails.distanceUnit}`
                                  : ''}
                              </p>
                            </div>
                          )}
                          {workout.exercises.map((ex) => {
                            const isCardio = isCardioExercise(ex.exerciseNameSnapshot, ex.muscleGroup);
                            return (
                              <div
                                key={ex.id}
                                className="space-y-1.5"
                              >
                                <div
                                  className={`font-semibold text-xs ${
                                    isCardio
                                      ? 'text-cyan-400'
                                      : isDark
                                      ? 'text-[hsl(75,92%,56%)]'
                                      : 'text-indigo-700'
                                  }`}
                                >
                                  {ex.exerciseNameSnapshot}
                                </div>
                                <div className="flex flex-wrap gap-1.5 font-mono-num text-[11px]">
                                  {isCardio ? (
                                    <span
                                      className={`px-2 py-0.5 rounded text-cyan-400 border border-cyan-500/30 bg-cyan-500/10`}
                                    >
                                      ⏱️ {ex.sets[0]?.reps || 30} {lang === 'ar' ? 'دقيقة' : 'minutes'}
                                    </span>
                                  ) : (
                                    ex.sets.map((s) => (
                                      <span
                                        key={s.id}
                                        className={`px-1.5 py-0.5 rounded ${
                                          isDark
                                            ? 'bg-[hsl(240,6%,4%)]'
                                            : 'bg-white'
                                        }`}
                                      >
                                        {formatSetPerformance(
                                          s.weight,
                                          ex.weightType,
                                          s.reps,
                                          lang
                                        )}
                                      </span>
                                    ))
                                  )}
                                </div>
                                {ex.notes && (
                                  <p className="text-xs text-gray-400 italic">
                                    {ex.notes}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* EDIT / DELETE */}
                      <div className="flex gap-2 pt-2 border-t border-inherit">
                        <button
                          onClick={() => handleOpenEdit(workout)}
                          className="flex-1 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          {lang === 'ar' ? 'تعديل' : 'Edit'}
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirmId(workout.id)
                          }
                          className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 cursor-pointer"
                          aria-label="Delete workout"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* EDIT WORKOUT MODAL */}
      {editingWorkout && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <form
            onSubmit={handleSaveWorkout}
            className={`w-full max-w-3xl rounded-2xl border p-5 space-y-4 max-h-[92vh] flex flex-col ${
              isDark
                ? 'bg-[hsl(240,5%,7.5%)] border-gray-700 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-inherit pb-3">
              <div>
                <h3 className="font-bold text-lg">
                  {lang === 'ar' ? 'تعديل التمرين' : 'Edit Workout'}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {formatFullDate(
                    editingWorkout.actualDate,
                    lang
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseEdit}
                aria-label="Close edit modal"
              >
                <X className="w-5 h-5 cursor-pointer" />
              </button>
            </div>

            {/* EDITABLE CONTENT */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* TITLE AND DATE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {lang === 'ar' ? 'عنوان التمرين' : 'Workout Title'}
                  </label>
                  <input
                    required
                    value={editingWorkout.title}
                    onChange={(e) =>
                      setEditingWorkout({
                        ...editingWorkout,
                        title: e.target.value,
                      })
                    }
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {lang === 'ar' ? 'تاريخ التمرين' : 'Workout Date'}
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
                    className={fieldClass}
                  />
                </div>
              </div>

              {/* EXERCISES */}
              {editingWorkout.exercises.map((ex) => {
                const isCardio = isCardioExercise(ex.exerciseNameSnapshot, ex.muscleGroup);

                return (
                  <div
                    key={ex.id}
                    className={`p-3.5 rounded-xl border space-y-3 ${
                      isDark
                        ? 'bg-[hsl(240,5%,11%)] border-gray-800'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm">
                          {ex.exerciseNameSnapshot} {isCardio && '🏃‍♂️'}
                        </h4>
                        <span className="text-[11px] text-gray-400">
                          {translateMuscleGroup(
                            ex.muscleGroup,
                            lang
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {!isCardio && (
                          (['kg', 'lbs', 'none'] as const).map(
                            (unit) => (
                              <button
                                key={unit}
                                type="button"
                                onClick={() =>
                                  handleEditExerciseUnit(ex.id, unit)
                                }
                                className={`px-2 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                                  ex.weightType === unit
                                    ? 'bg-indigo-700 text-white border-indigo-700'
                                    : 'border-gray-500/30'
                                }`}
                              >
                                {unit === 'none'
                                  ? lang === 'ar'
                                    ? 'وزن الجسم'
                                    : 'Bodyweight'
                                  : unit.toUpperCase()}
                              </button>
                            )
                          )
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveExercise(ex.id)
                          }
                          className="p-1.5 text-red-500 cursor-pointer"
                          title="Remove exercise"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* CARDIO DURATION OR SET EDITING */}
                    {isCardio ? (
                      <div className="space-y-2 pt-2">
                        {ex.sets.map((set) => (
                          <div
                            key={set.id}
                            className={`p-3 rounded-xl border flex items-center gap-3 ${
                              isDark
                                ? 'bg-[hsl(240,5%,15%)] border-gray-700'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                            <div className="flex-1 flex items-center gap-2">
                              <label className="text-xs font-semibold text-gray-300">
                                {lang === 'ar' ? 'المدة بالدقائق:' : 'Duration (Mins):'}
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={set.reps || 30}
                                onChange={(e) =>
                                  handleEditSetChange(
                                    ex.id,
                                    set.id,
                                    'reps',
                                    Number(e.target.value)
                                  )
                                }
                                className={`w-28 px-3 py-1.5 rounded-xl font-mono-num text-sm font-bold border ${fieldClass}`}
                              />
                              <span className="text-xs text-cyan-400 font-bold">
                                {lang === 'ar' ? 'دقيقة' : 'mins'}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              {[15, 30, 45, 60].map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() =>
                                    handleEditSetChange(ex.id, set.id, 'reps', m)
                                  }
                                  className={`px-2 py-1 rounded text-xs font-mono-num border cursor-pointer ${
                                    set.reps === m
                                      ? 'bg-cyan-500 text-slate-950 border-cyan-500'
                                      : 'border-gray-700 text-gray-300'
                                  }`}
                                >
                                  {m}m
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-gray-400">
                          <span className="col-span-2">
                            {lang === 'ar' ? 'مجموعة' : 'SET'}
                          </span>
                          <span className="col-span-4">
                            {ex.weightType === 'none'
                              ? lang === 'ar' ? 'النوع' : 'TYPE'
                              : lang === 'ar' ? 'الوزن' : 'WEIGHT'}
                          </span>
                          <span className="col-span-4">
                            {lang === 'ar' ? 'التكرارات' : 'REPS'}
                          </span>
                          <span className="col-span-2" />
                        </div>
                        {ex.sets.map((set) => (
                          <div
                            key={set.id}
                            className="grid grid-cols-12 gap-2 items-center"
                          >
                            <span className="col-span-2 text-xs font-mono-num">
                              #{set.setNumber}
                            </span>
                            <div className="col-span-4">
                              {ex.weightType === 'none' ? (
                                <span className="text-xs text-purple-400">
                                  {lang === 'ar'
                                    ? 'وزن الجسم'
                                    : 'Bodyweight'}
                                </span>
                              ) : (
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={set.weight ?? 0}
                                  onChange={(e) =>
                                    handleEditSetChange(
                                      ex.id,
                                      set.id,
                                      'weight',
                                      Number(e.target.value)
                                    )
                                  }
                                  className={fieldClass}
                                  placeholder={
                                    lang === 'ar' ? 'الوزن' : 'Weight'
                                  }
                                />
                              )}
                            </div>
                            <div className="col-span-4">
                              <input
                                type="number"
                                min="0"
                                value={set.reps}
                                onChange={(e) =>
                                  handleEditSetChange(
                                    ex.id,
                                    set.id,
                                    'reps',
                                    Number(e.target.value)
                                  )
                                }
                                className={fieldClass}
                                placeholder={
                                  lang === 'ar' ? 'التكرارات' : 'Reps'
                                }
                              />
                            </div>
                            <div className="col-span-2 text-center">
                              {ex.sets.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveSet(ex.id, set.id)
                                  }
                                  className="text-red-500 cursor-pointer"
                                  aria-label="Remove set"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        {/* ADD SET */}
                        <button
                          type="button"
                          onClick={() => handleAddSet(ex.id)}
                          className="text-xs font-bold text-indigo-500 flex items-center gap-1 cursor-pointer pt-1"
                        >
                          <Plus className="w-4 h-4" />
                          {lang === 'ar' ? 'إضافة مجموعة' : 'Add Set'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ADD FORGOTTEN EXERCISE */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddForgottenOpen(
                      !isAddForgottenOpen
                    );
                    setForgottenMuscleFilter('ALL');
                  }}
                  className="w-full py-3 rounded-xl border border-dashed border-indigo-500/50 text-indigo-500 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  {lang === 'ar'
                    ? 'إضافة تمرين منسي'
                    : 'Add Forgotten Workout'}
                </button>
                {isAddForgottenOpen && (
                  <div className="p-3 rounded-xl border border-indigo-500/30 space-y-3">
                    <p className="text-xs text-gray-400">
                      {lang === 'ar'
                        ? 'اختر المجموعة العضلية أولاً، ثم اختر التمرين الذي تريد إضافته.'
                        : 'Select a muscle group first, then choose the exercise you want to add.'}
                    </p>
                    {/* MUSCLE GROUP FILTER */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold">
                        {lang === 'ar'
                          ? 'تصفية حسب العضلة'
                          : 'Filter by Muscle Group'}
                      </label>
                      <select
                        value={forgottenMuscleFilter}
                        onChange={(e) =>
                          setForgottenMuscleFilter(
                            e.target.value as
                              | MuscleGroup
                              | 'ALL'
                          )
                        }
                        className={fieldClass}
                      >
                        <option value="ALL">
                          {lang === 'ar'
                            ? 'جميع العضلات'
                            : 'All Muscle Groups'}
                        </option>
                        {MUSCLE_GROUPS.map((muscle) => (
                          <option key={muscle} value={muscle}>
                            {translateMuscleGroup(
                              muscle,
                              lang
                            )}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* EXERCISE SELECT */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold">
                        {lang === 'ar'
                          ? 'اختر التمرين'
                          : 'Select Exercise'}
                      </label>
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          const exerciseId = e.target.value;
                          if (exerciseId) {
                            handleAddForgottenExercise(
                              exerciseId
                            );
                            e.target.value = '';
                          }
                        }}
                        className={fieldClass}
                      >
                        <option value="">
                          {lang === 'ar'
                            ? 'اختر تمريناً...'
                            : 'Select exercise...'}
                        </option>
                        {availableForgottenExercises.map(
                          (exercise) => (
                            <option
                              key={exercise.id}
                              value={exercise.id}
                            >
                              {exercise.name}
                            </option>
                          )
                        )}
                      </select>
                      {availableForgottenExercises.length ===
                        0 && (
                        <p className="text-xs text-gray-400 pt-1">
                          {lang === 'ar'
                            ? 'لا توجد تمارين متاحة ضمن هذه المجموعة.'
                            : 'No available exercises in this muscle group.'}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="pt-3 border-t border-inherit flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseEdit}
                className="px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold cursor-pointer"
              >
                {lang === 'ar' ? 'تحديث التمرين' : 'Update Workout'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] bg-black/75 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md p-5 rounded-2xl border space-y-4 ${panelClass}`}
          >
            <h3 className="font-bold text-red-500">
              {lang === 'ar'
                ? 'حذف جلسة التمرين؟'
                : 'Delete Workout Session?'}
            </h3>
            <p className="text-sm text-gray-400">
              {lang === 'ar'
                ? 'هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to permanently delete this workout?'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border text-xs cursor-pointer"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleDeleteWorkout}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
              >
                {lang === 'ar' ? 'حذف نهائي' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
