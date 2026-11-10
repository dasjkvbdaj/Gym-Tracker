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
  History,
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
  // No search or workout filters are applied here.

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
        if (workout.workoutType === 'cardio') {
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

  // EDIT WEIGHT AND REPS

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
              weight:
                ex.weightType === 'none'
                  ? null
                  : Math.max(0, value),
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
          weight:
            unit === 'none'
              ? null
              : set.weight ?? 0,
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

      const previousSet = ex.sets[ex.sets.length - 1];

      const newSet: SetEntry = {
        id: generateId('set'),
        setNumber: ex.sets.length + 1,
        weight:
          ex.weightType === 'none'
            ? null
            : previousSet?.weight ?? 0,
        reps: previousSet?.reps ?? 10,
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

    const unit: WeightUnit = exercise.isBodyweight
      ? 'none'
      : exercise.defaultWeightUnit ||
        settings.preferredWeightUnit;

    const newEntry: ExerciseEntry = {
      id: generateId('ex_entry'),
      exerciseId: exercise.id,
      exerciseNameSnapshot: exercise.name,
      muscleGroup: exercise.muscleGroup,
      weightType: unit,

      sets: [1, 2, 3].map((number) => ({
        id: generateId('set'),
        setNumber: number,
        weight: unit === 'none' ? null : 0,
        reps: 10,
        completed: true,
      })),

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

    // Preserve the original session ID.
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

  // STYLES

  const panelClass = isDark
    ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
    : 'bg-white border-[hsl(40,10%,88%)] shadow-sm';

  const fieldClass = `w-full px-3 py-2 rounded-xl text-sm border ${
    isDark
      ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-white'
      : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,85%)] text-slate-900'
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
          <h1 className="text-2xl sm:text-3xl font-display font-bold">
            {lang === 'ar'
              ? 'تقويم التمارين'
              : 'Workout Calendar'}
          </h1>

          <p
            className={`text-sm mt-1 ${
              isDark ? 'text-gray-400' : 'text-slate-600'
            }`}
          >
            {lang === 'ar'
              ? 'اختر أي تاريخ لعرض جلساتك وتعديلها.'
              : 'Select any date to view and manage your recorded workouts.'}
          </p>
        </div>

        <button
          onClick={handleJumpToToday}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            isDark
              ? 'bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)] border border-[hsl(75,92%,56%)]/30'
              : 'bg-indigo-700 text-white'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />

          {lang === 'ar'
            ? 'العودة إلى اليوم'
            : 'Jump to Today'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* CALENDAR */}

        <div
          className={`lg:col-span-8 rounded-2xl border p-4 sm:p-6 space-y-5 ${panelClass}`}
        >

          {/* MONTH NAVIGATION */}

          <div className="flex flex-wrap items-center justify-between gap-3">

            <div className="flex items-center gap-2">

              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-xl border"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={viewMonth}
                onChange={(e) =>
                  setViewMonth(Number(e.target.value))
                }
                className={fieldClass}
                aria-label="Select Month"
              >
                {(lang === 'ar'
                  ? MONTH_NAMES_AR
                  : MONTH_NAMES_EN
                ).map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) =>
                  setViewYear(Number(e.target.value))
                }
                className={fieldClass}
                aria-label="Select Year"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <button
                onClick={handleNextMonth}
                className="p-2 rounded-xl border"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

            </div>

            <div className="flex gap-2 text-xs font-semibold">

              <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-700">
                {monthStats.strengthCount}{' '}
                {lang === 'ar' ? 'حديد' : 'Strength'}
              </span>

              <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-500">
                {monthStats.cardioCount}{' '}
                {lang === 'ar' ? 'كارديو' : 'Cardio'}
              </span>

            </div>
          </div>

          {/* WEEKDAYS */}

          <div className="grid grid-cols-7 gap-2 text-center">

            {ORDERED_WEEK_DAYS.map((day) => (
              <div
                key={day}
                className={`py-2 text-xs font-bold ${
                  isDark
                    ? 'text-gray-400'
                    : 'text-slate-500'
                }`}
              >
                {translateDayName(day, lang, true)}
              </div>
            ))}

          </div>

          {/* CALENDAR DAYS */}

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">

            {calendarCells.map((cell) => {
              const dayWorkouts =
                workoutsByDate.get(cell.dateStr) || [];

              const hasStrength = dayWorkouts.some(
                (workout) =>
                  workout.workoutType === 'strength'
              );

              const hasCardio = dayWorkouts.some(
                (workout) =>
                  workout.workoutType === 'cardio' ||
                  workout.muscleGroups.includes('Cardio')
              );

              const isRest =
                scheduledRestDays.has(cell.dayOfWeek);

              const isSelected =
                cell.dateStr === selectedCalendarDate;

              return (
                <button
                  key={cell.dateStr}
                  onClick={() =>
                    setSelectedCalendarDate(cell.dateStr)
                  }
                  className={`min-h-[65px] sm:min-h-[78px] p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between text-start ${
                    !cell.isCurrentMonth
                      ? 'opacity-40'
                      : ''
                  } ${
                    isSelected
                      ? isDark
                        ? 'bg-[hsl(75,92%,56%)]/15 border-[hsl(75,92%,56%)] ring-1 ring-[hsl(75,92%,56%)]'
                        : 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-300'
                      : dayWorkouts.length
                        ? isDark
                          ? 'bg-[hsl(240,5%,11%)] border-[hsl(75,92%,56%)]/30'
                          : 'bg-indigo-50/50 border-indigo-200'
                        : isDark
                          ? 'bg-[hsl(240,6%,4%)] border-[hsl(240,4%,16%)]'
                          : 'bg-slate-50 border-slate-200'
                  }`}
                >

                  <div className="flex justify-between items-center">

                    <span
                      className={`w-6 h-6 flex items-center justify-center rounded-lg text-sm font-bold ${
                        cell.isToday
                          ? 'bg-indigo-700 text-white'
                          : isDark
                            ? 'text-white'
                            : 'text-slate-900'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {isRest && !dayWorkouts.length && (
                      <Moon className="w-3 h-3 text-gray-500" />
                    )}

                  </div>

                  <div className="space-y-1">

                    {hasStrength && (
                      <div
                        className={`h-1.5 rounded-full ${
                          isDark
                            ? 'bg-[hsl(75,92%,56%)]'
                            : 'bg-indigo-600'
                        }`}
                      />
                    )}

                    {hasCardio && (
                      <div className="h-1.5 rounded-full bg-cyan-400" />
                    )}

                  </div>

                </button>
              );
            })}

          </div>

          {/* LEGEND */}

          <div
            className={`pt-3 border-t flex flex-wrap gap-4 text-xs ${
              isDark
                ? 'border-gray-800 text-gray-400'
                : 'border-slate-200 text-slate-600'
            }`}
          >

            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-600" />
              {lang === 'ar' ? 'حديد' : 'Strength'}
            </span>

            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400" />
              {lang === 'ar' ? 'كارديو' : 'Cardio'}
            </span>

            <span className="flex items-center gap-2">
              <Moon className="w-3.5 h-3.5" />
              {lang === 'ar'
                ? 'راحة مخططة'
                : 'Planned Rest'}
            </span>

          </div>

        </div>

        {/* SELECTED DATE DETAILS */}

        <div
          className={`lg:col-span-4 rounded-2xl border p-5 space-y-5 ${panelClass}`}
        >

          {/* DATE HEADER */}

          <div className="pb-4 border-b border-inherit">

            <span className="text-xs font-semibold uppercase text-indigo-500">
              {lang === 'ar'
                ? 'التاريخ المحدد'
                : 'Selected Date'}
            </span>

            <h2 className="text-lg font-bold mt-1">
              {formatFullDate(selectedCalendarDate, lang)}
            </h2>

            {selectedDaySchedule && (
              <p className="text-xs text-gray-400 mt-1">
                {lang === 'ar'
                  ? 'الخطة المرجعية:'
                  : 'Reference plan:'}{' '}
                <strong>
                  {selectedDaySchedule.title}
                </strong>
              </p>
            )}

          </div>

          {/* WORKOUT LIST - NO FILTERS */}

          {selectedDateWorkouts.length === 0 ? (

            <div className="py-8 text-center space-y-3">

              <History className="w-8 h-8 mx-auto opacity-40" />

              <p className="text-sm text-gray-400">
                {lang === 'ar'
                  ? 'لا توجد تمارين مسجلة في هذا التاريخ.'
                  : 'No workouts recorded on this date.'}
              </p>

            </div>

          ) : (

            <div className="space-y-3">

              {selectedDateWorkouts.map((workout) => {
                const expanded =
                  expandedWorkoutId === workout.id;

                return (
                  <div
                    key={workout.id}
                    className={`rounded-xl border p-3.5 space-y-3 ${
                      isDark
                        ? 'bg-[hsl(240,5%,11%)] border-gray-800'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >

                    {/* WORKOUT HEADER */}

                    <div className="flex items-start justify-between gap-2">

                      <div>

                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${
                            workout.workoutType === 'cardio'
                              ? 'bg-cyan-500/15 text-cyan-500'
                              : 'bg-indigo-500/15 text-indigo-500'
                          }`}
                        >
                          {workout.workoutType === 'cardio'
                            ? <Flame className="w-3 h-3" />
                            : <Dumbbell className="w-3 h-3" />}

                          {workout.workoutType === 'cardio'
                            ? lang === 'ar'
                              ? 'كارديو'
                              : 'Cardio'
                            : lang === 'ar'
                              ? 'حديد'
                              : 'Strength'}
                        </span>

                        <h3 className="font-bold text-sm mt-2">
                          {workout.title}
                        </h3>

                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">

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

                        </p>

                      </div>

                      <button
                        onClick={() =>
                          setExpandedWorkoutId(
                            expanded ? null : workout.id
                          )
                        }
                        className="text-xs text-indigo-500 font-semibold"
                      >
                        {expanded
                          ? lang === 'ar'
                            ? 'إخفاء'
                            : 'Hide'
                          : lang === 'ar'
                            ? 'التفاصيل'
                            : 'Details'}
                      </button>

                    </div>

                    {/* MUSCLE GROUPS */}

                    <div className="flex flex-wrap gap-1">

                      {workout.muscleGroups.map((muscle) => (
                        <span
                          key={muscle}
                          className="text-[10px] px-2 py-1 rounded bg-gray-500/10"
                        >
                          {translateMuscleGroup(muscle, lang)}
                        </span>
                      ))}

                    </div>

                    {/* EXERCISE DETAILS */}

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
                              {workout.cardioDetails.durationMinutes}{' '}
                              {lang === 'ar' ? 'دقيقة' : 'min'}

                              {workout.cardioDetails.distance != null
                                ? ` • ${workout.cardioDetails.distance} ${workout.cardioDetails.distanceUnit}`
                                : ''}
                            </p>

                          </div>
                        )}

                        {workout.exercises.map((ex) => (
                          <div
                            key={ex.id}
                            className="space-y-1.5"
                          >

                            <div className="font-bold text-xs">
                              {ex.exerciseNameSnapshot}
                            </div>

                            <div className="flex flex-wrap gap-1.5">

                              {ex.sets.map((set) => (
                                <span
                                  key={set.id}
                                  className="px-2 py-1 rounded bg-gray-500/10 text-[11px] font-mono-num"
                                >
                                  {lang === 'ar'
                                    ? `مجموعة ${set.setNumber}: `
                                    : `Set ${set.setNumber}: `}

                                  {formatSetPerformance(
                                    set.weight,
                                    ex.weightType,
                                    set.reps,
                                    lang
                                  )}
                                </span>
                              ))}

                            </div>

                            {ex.notes && (
                              <p className="text-xs text-gray-400 italic">
                                {ex.notes}
                              </p>
                            )}

                          </div>
                        ))}

                      </div>
                    )}

                    {/* EDIT / DELETE */}

                    <div className="flex gap-2 pt-2 border-t border-inherit">

                      <button
                        onClick={() => handleOpenEdit(workout)}
                        className="flex-1 py-2 rounded-lg bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />

                        {lang === 'ar'
                          ? 'تعديل'
                          : 'Edit'}
                      </button>

                      <button
                        onClick={() =>
                          setDeleteConfirmId(workout.id)
                        }
                        className="px-3 py-2 rounded-lg border border-red-500/30 text-red-500"
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
                  {lang === 'ar'
                    ? 'تعديل التمرين'
                    : 'Edit Workout'}
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
                <X className="w-5 h-5" />
              </button>

            </div>

            {/* EDITABLE CONTENT */}

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">

              {/* TITLE AND DATE */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                <div>

                  <label className="block text-xs font-semibold mb-1">
                    {lang === 'ar'
                      ? 'عنوان التمرين'
                      : 'Workout Title'}
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
                    {lang === 'ar'
                      ? 'تاريخ التمرين'
                      : 'Workout Date'}
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

              {editingWorkout.exercises.map((ex) => (
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
                        {ex.exerciseNameSnapshot}
                      </h4>

                      <span className="text-[11px] text-gray-400">
                        {translateMuscleGroup(
                          ex.muscleGroup,
                          lang
                        )}
                      </span>

                    </div>

                    <div className="flex items-center gap-1">

                      {(['kg', 'lbs', 'none'] as const).map((unit) => (
                        <button
                          key={unit}
                          type="button"
                          onClick={() =>
                            handleEditExerciseUnit(ex.id, unit)
                          }
                          className={`px-2 py-1 rounded text-[10px] font-bold border ${
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
                      ))}

                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveExercise(ex.id)
                        }
                        className="p-1.5 text-red-500"
                        title="Remove exercise"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                    </div>

                  </div>

                  {/* SET EDITING */}

                  <div className="space-y-2">

                    <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-gray-400">

                      <span className="col-span-2">
                        {lang === 'ar' ? 'مجموعة' : 'SET'}
                      </span>

                      <span className="col-span-4">
                        {ex.weightType === 'none'
                          ? lang === 'ar'
                            ? 'النوع'
                            : 'TYPE'
                          : lang === 'ar'
                            ? 'الوزن'
                            : 'WEIGHT'}
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
                                lang === 'ar'
                                  ? 'الوزن'
                                  : 'Weight'
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
                              lang === 'ar'
                                ? 'التكرارات'
                                : 'Reps'
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
                              className="text-red-500"
                              aria-label="Remove set"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}

                        </div>

                      </div>
                    ))}

                  </div>

                  {/* ADD SET */}

                  <button
                    type="button"
                    onClick={() => handleAddSet(ex.id)}
                    className="text-xs font-bold text-indigo-500 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />

                    {lang === 'ar'
                      ? 'إضافة مجموعة'
                      : 'Add Set'}
                  </button>

                </div>
              ))}

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
                  className="w-full py-3 rounded-xl border border-dashed border-indigo-500/50 text-indigo-500 font-bold text-sm flex items-center justify-center gap-2"
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
                            e.target.value as MuscleGroup | 'ALL'
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
                          <option
                            key={muscle}
                            value={muscle}
                          >
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

                      {/* EMPTY FILTER RESULT */}

                      {availableForgottenExercises.length === 0 && (
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
                className="px-4 py-2 rounded-xl border text-xs font-semibold"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>

              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold"
              >
                {lang === 'ar'
                  ? 'تحديث التمرين'
                  : 'Update Workout'}
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
                className="px-4 py-2 rounded-xl border text-xs"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>

              <button
                onClick={handleDeleteWorkout}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold"
              >
                {lang === 'ar'
                  ? 'حذف نهائي'
                  : 'Delete'}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};