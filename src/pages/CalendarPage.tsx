import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
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
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_NAMES_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
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

  const [editingWorkout, setEditingWorkout] = useState<WorkoutSession | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isAddForgottenOpen, setIsAddForgottenOpen] = useState(false);
  const [forgottenMuscleFilter, setForgottenMuscleFilter] = useState<MuscleGroup | 'ALL'>('ALL');
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);

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
    () => new Set(weeklySchedule.filter((d) => d.workoutType === 'rest').map((d) => d.day)),
    [weeklySchedule]
  );

  const selectedDateWorkouts = useMemo(
    () => workoutsByDate.get(selectedCalendarDate) || [],
    [workoutsByDate, selectedCalendarDate]
  );

  const selectedDateMeta = useMemo(
    () => getDateMetadata(selectedCalendarDate),
    [selectedCalendarDate]
  );

  const selectedDaySchedule = useMemo(
    () => weeklySchedule.find((d) => d.day === selectedDateMeta.dayOfWeek),
    [weeklySchedule, selectedDateMeta]
  );

  const monthStats = useMemo(() => {
    let strengthCount = 0;
    let cardioCount = 0;
    for (const workout of completedWorkouts) {
      if (workout.year === viewYear && workout.month === viewMonth) {
        if (workout.workoutType === 'cardio' || workout.muscleGroups.includes('Cardio')) {
          cardioCount++;
        } else {
          strengthCount++;
        }
      }
    }
    return { strengthCount, cardioCount, total: strengthCount + cardioCount };
  }, [completedWorkouts, viewYear, viewMonth]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => currentYear - 6 + i);
  }, []);

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const today = new Date();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth() + 1);
    setSelectedCalendarDate(toLocalDateString(today));
  };

  const handleOpenEdit = (session: WorkoutSession) => {
    setEditingWorkout(JSON.parse(JSON.stringify(session)) as WorkoutSession);
    setIsAddForgottenOpen(false);
    setForgottenMuscleFilter('ALL');
  };

  const handleCloseEdit = () => {
    setEditingWorkout(null);
    setIsAddForgottenOpen(false);
    setForgottenMuscleFilter('ALL');
  };

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
            return { ...set, weight: ex.weightType === 'none' ? null : Math.max(0, value) };
          }
          return { ...set, reps: Math.max(0, Math.round(value)) };
        }),
      };
    });
    setEditingWorkout({ ...editingWorkout, exercises: updatedExercises });
  };

  const handleEditExerciseUnit = (entryId: string, unit: WeightUnit) => {
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
    setEditingWorkout({ ...editingWorkout, exercises: updatedExercises });
  };

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
      return { ...ex, sets: [...ex.sets, newSet] };
    });
    setEditingWorkout({ ...editingWorkout, exercises: updatedExercises });
  };

  const handleRemoveSet = (entryId: string, setId: string) => {
    if (!editingWorkout) return;
    const updatedExercises = editingWorkout.exercises.map((ex) => {
      if (ex.id !== entryId) return ex;
      return {
        ...ex,
        sets: ex.sets
          .filter((set) => set.id !== setId)
          .map((set, index) => ({ ...set, setNumber: index + 1 })),
      };
    });
    setEditingWorkout({ ...editingWorkout, exercises: updatedExercises });
  };

  const handleAddForgottenExercise = (exerciseId: string) => {
    if (!editingWorkout || !exerciseId) return;
    const exercise = exercises.find((item) => item.id === exerciseId);
    if (!exercise) return;
    const alreadyExists = editingWorkout.exercises.some((ex) => ex.exerciseId === exerciseId);
    if (alreadyExists) return;

    const isCardio = isCardioExercise(exercise.name, exercise.muscleGroup);
    const unit: WeightUnit = exercise.isBodyweight || isCardio ? 'none' : exercise.defaultWeightUnit || settings.preferredWeightUnit;

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

    const groups = editingWorkout.muscleGroups.includes(exercise.muscleGroup)
      ? editingWorkout.muscleGroups
      : [...editingWorkout.muscleGroups, exercise.muscleGroup];

    setEditingWorkout({
      ...editingWorkout,
      muscleGroups: groups,
      exercises: [...editingWorkout.exercises, newEntry],
    });
  };

  const handleRemoveExercise = (entryId: string) => {
    if (!editingWorkout) return;
    const remaining = editingWorkout.exercises.filter((ex) => ex.id !== entryId);
    const groups = Array.from(new Set(remaining.map((ex) => ex.muscleGroup)));
    setEditingWorkout({ ...editingWorkout, exercises: remaining, muscleGroups: groups });
  };

  const handleSaveWorkout = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingWorkout) return;
    await saveHistoricalWorkout(editingWorkout);
    setEditingWorkout(null);
    setIsAddForgottenOpen(false);
    setForgottenMuscleFilter('ALL');
  };

  const handleDeleteWorkout = async () => {
    if (!deleteConfirmId) return;
    await deleteWorkout(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  const panelClass = isDark
    ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
    : 'bg-white border-[hsl(40,10%,88%)] shadow-xs';

  const fieldClass = `w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:border-[hsl(75,92%,56%)] ${
    isDark
      ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-white'
      : 'bg-[hsl(40,20%,97.5%)] border-[hsl(40,10%,85%)] text-[hsl(240,10%,9%)]'
  }`;

  const availableForgottenExercises = editingWorkout
    ? exercises.filter((exercise) => {
        const notAlreadyAdded = !editingWorkout.exercises.some(
          (existing) => existing.exerciseId === exercise.id
        );
        const matchesMuscle =
          forgottenMuscleFilter === 'ALL' || exercise.muscleGroup === forgottenMuscleFilter;
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
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
            {lang === 'ar'
              ? 'يعرض التمارين المسجلة فعلياً حسب التاريخ. اضغط على أي يوم لعرض التفاصيل أو تعديل الكارديو.'
              : 'Displays actual recorded workout dates.'}
          </p>
        </div>
        <button
          onClick={handleJumpToToday}
          className={`self-start sm:self-auto px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
            isDark
              ? 'bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)] border-[hsl(75,92%,56%)]/30'
              : 'bg-indigo-700 text-white border-indigo-700'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? 'الانتقال إلى اليوم' : 'Jump to Today'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: CALENDAR */}
        <div className={`lg:col-span-8 rounded-2xl border p-4 sm:p-6 space-y-5 ${panelClass}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className={`p-2 rounded-xl border cursor-pointer ${
                  isDark ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300' : 'bg-gray-100 text-slate-700'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <select
                  value={viewMonth}
                  onChange={(e) => setViewMonth(Number(e.target.value))}
                  className={fieldClass}
                >
                  {(lang === 'ar' ? MONTH_NAMES_AR : MONTH_NAMES_EN).map((mName, idx) => (
                    <option key={mName} value={idx + 1}>{mName}</option>
                  ))}
                </select>
                <select
                  value={viewYear}
                  onChange={(e) => setViewYear(Number(e.target.value))}
                  className={fieldClass}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleNextMonth}
                className={`p-2 rounded-xl border cursor-pointer ${
                  isDark ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300' : 'bg-gray-100 text-slate-700'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono-num">
              <span className="px-2.5 py-1 rounded-lg border font-semibold bg-indigo-50 text-indigo-700 border-indigo-200">
                {monthStats.strengthCount} {lang === 'ar' ? 'حديد' : 'Strength'}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                {monthStats.cardioCount} {lang === 'ar' ? 'كارديو' : 'Cardio'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
            {ORDERED_WEEK_DAYS.map((dayName) => (
              <div key={dayName} className="py-1.5 text-[11px] font-bold uppercase text-gray-400">
                {translateDayName(dayName, lang, true)}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarCells.map((cell) => {
              const dayWorkouts = workoutsByDate.get(cell.dateStr) || [];
              const hasStrength = dayWorkouts.some((w) => w.workoutType === 'strength' && !w.muscleGroups.includes('Cardio'));
              const hasCardio = dayWorkouts.some((w) => w.workoutType === 'cardio' || w.muscleGroups.includes('Cardio'));
              const isSelected = cell.dateStr === selectedCalendarDate;

              return (
                <button
                  key={cell.dateStr}
                  onClick={() => setSelectedCalendarDate(cell.dateStr)}
                  className={`min-h-[64px] p-1.5 rounded-xl border flex flex-col justify-between text-start transition-all cursor-pointer ${
                    !cell.isCurrentMonth ? 'opacity-40' : ''
                  } ${
                    isSelected ? 'border-indigo-500 ring-1 ring-indigo-300' : 'border-gray-700'
                  }`}
                >
                  <span className="font-mono-num text-xs font-bold w-6 h-6 rounded-lg flex items-center justify-center">
                    {cell.dayNumber}
                  </span>
                  <div className="space-y-1 mt-1 w-full">
                    {hasStrength && (
                      <div className="flex items-center gap-1 px-1 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        <span>{lang === 'ar' ? 'حديد' : 'Strength'}</span>
                      </div>
                    )}
                    {hasCardio && (
                      <div className="flex items-center gap-1 px-1 rounded bg-cyan-500/20 text-cyan-400 text-[10px] font-semibold truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        <span>{lang === 'ar' ? 'كارديو' : 'Cardio'}</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: SELECTED DATE DETAILS */}
        <div className={`lg:col-span-4 rounded-2xl border p-5 flex flex-col justify-between gap-5 ${panelClass}`}>
          <div className="space-y-4">
            <div className="pb-4 border-b border-inherit">
              <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(75,92%,56%)]">
                {lang === 'ar' ? 'التاريخ المحدد' : 'Selected Date'}
              </span>
              <h2 className="text-lg font-display font-bold mt-0.5">
                {formatFullDate(selectedCalendarDate, lang)}
              </h2>
            </div>

            {selectedDateWorkouts.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                {lang === 'ar' ? 'لا توجد تمارين مسجلة في هذا التاريخ.' : 'No workouts recorded.'}
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {selectedDateWorkouts.map((workout) => (
                  <div key={workout.id} className="p-3.5 rounded-xl border border-gray-700 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400">
                          {workout.title}
                        </span>
                      </div>
                      <button
                        onClick={() => handleOpenEdit(workout)}
                        className="py-1 px-3 rounded-lg bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        {lang === 'ar' ? 'تعديل' : 'Edit'}
                      </button>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-gray-800">
                      {workout.exercises.map((ex) => {
                        const isCardio = isCardioExercise(ex.exerciseNameSnapshot, ex.muscleGroup);
                        return (
                          <div key={ex.id} className="text-xs space-y-1">
                            <div className="font-semibold text-cyan-400">
                              <span>{ex.exerciseNameSnapshot}</span>
                            </div>
                            <div className="text-gray-300 font-mono-num">
                              {isCardio ? (
                                <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                                  ⏱️ {ex.sets[0]?.reps || 30} {lang === 'ar' ? 'دقيقة' : 'minutes'}
                                </span>
                              ) : (
                                ex.sets.map((s) => (
                                  <span key={s.id} className="me-2 px-1.5 py-0.5 rounded bg-gray-800">
                                    {formatSetPerformance(s.weight, ex.weightType, s.reps, lang)}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
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
            className={`w-full max-w-2xl rounded-2xl border p-5 space-y-4 max-h-[92vh] flex flex-col ${
              isDark ? 'bg-[hsl(240,5%,7.5%)] border-gray-700 text-white' : 'bg-white text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="font-bold text-lg">{lang === 'ar' ? 'تعديل التمرين' : 'Edit Workout'}</h3>
              <button type="button" onClick={handleCloseEdit}>
                <X className="w-5 h-5 cursor-pointer" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {lang === 'ar' ? 'عنوان التمرين' : 'Workout Title'}
                </label>
                <input
                  required
                  value={editingWorkout.title}
                  onChange={(e) => setEditingWorkout({ ...editingWorkout, title: e.target.value })}
                  className={fieldClass}
                />
              </div>

              {editingWorkout.exercises.map((ex) => {
                const isCardio = isCardioExercise(ex.exerciseNameSnapshot, ex.muscleGroup);

                return (
                  <div key={ex.id} className="p-3.5 rounded-xl border border-gray-800 bg-[hsl(240,5%,11%)] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-[hsl(75,92%,56%)]">
                          {ex.exerciseNameSnapshot} {isCardio && '🏃‍♂️ (Cardio)'}
                        </h4>
                        <span className="text-[11px] text-gray-400">
                          {translateMuscleGroup(ex.muscleGroup, lang)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(ex.id)}
                        className="p-1.5 text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {isCardio ? (
                      <div className="space-y-2 pt-2">
                        {ex.sets.map((set) => (
                          <div key={set.id} className="flex items-center gap-3 bg-[hsl(240,5%,15%)] p-3 rounded-xl border border-gray-700">
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
                                  handleEditSetChange(ex.id, set.id, 'reps', Number(e.target.value))
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
                                  onClick={() => handleEditSetChange(ex.id, set.id, 'reps', m)}
                                  className={`px-2 py-1 rounded text-xs font-mono-num border cursor-pointer ${
                                    set.reps === m ? 'bg-cyan-500 text-slate-950 border-cyan-500' : 'border-gray-700 text-gray-300'
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
                        {ex.sets.map((set) => (
                          <div key={set.id} className="grid grid-cols-12 gap-2 items-center">
                            <span className="col-span-2 text-xs font-mono-num">#{set.setNumber}</span>
                            <div className="col-span-4">
                              <input
                                type="number"
                                value={set.weight ?? 0}
                                onChange={(e) => handleEditSetChange(ex.id, set.id, 'weight', Number(e.target.value))}
                                className={fieldClass}
                              />
                            </div>
                            <div className="col-span-4">
                              <input
                                type="number"
                                value={set.reps}
                                onChange={(e) => handleEditSetChange(ex.id, set.id, 'reps', Number(e.target.value))}
                                className={fieldClass}
                              />
                            </div>
                            <div className="col-span-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveSet(ex.id, set.id)}
                                className="text-red-400 cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleAddSet(ex.id)}
                          className="text-xs font-bold text-indigo-400 flex items-center gap-1 cursor-pointer pt-1"
                        >
                          <Plus className="w-4 h-4" />
                          {lang === 'ar' ? 'إضافة مجموعة' : 'Add Set'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-gray-800 flex justify-end gap-2">
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
    </div>
  );
};
