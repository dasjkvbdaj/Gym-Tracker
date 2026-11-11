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
  Timer,
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

const getRelativeDateLabel = (dateString: string, lang: string): string => {
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return dateString;

  const selectedDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  selectedDate.setHours(0, 0, 0, 0);

  const diffDays = Math.round((today.getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24));
  const isArabic = lang === 'ar';

  if (diffDays === 0) return isArabic ? 'اليوم' : 'Today';
  if (diffDays === 1) return isArabic ? 'أمس' : 'Yesterday';
  if (diffDays === -1) return isArabic ? 'غداً' : 'Tomorrow';
  if (diffDays > 1) {
    if (diffDays < 7) return isArabic ? `منذ ${diffDays} أيام` : `${diffDays} days ago`;
    return isArabic ? `منذ أسابيع` : `${Math.floor(diffDays / 7)} weeks ago`;
  }
  return isArabic ? `بعد ${Math.abs(diffDays)} أيام` : `In ${Math.abs(diffDays)} days`;
};

const isCardioExercise = (exerciseName: string, muscleGroup: string) => {
  const name = exerciseName.toLowerCase();
  return (
    muscleGroup === 'Cardio' ||
    name.includes('cardio') ||
    name.includes('treadmill') ||
    name.includes('elliptical') ||
    name.includes('bike') ||
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

  const calendarCells = useMemo(() => getMonthCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth]);

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

  const selectedDateMeta = useMemo(() => getDateMetadata(selectedCalendarDate), [selectedCalendarDate]);
  const selectedDateRelativeLabel = useMemo(() => getRelativeDateLabel(selectedCalendarDate, lang), [selectedCalendarDate, lang]);
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
  };

  const handleCloseEdit = () => {
    setEditingWorkout(null);
    setIsAddForgottenOpen(false);
  };

  const handleEditSetChange = (entryId: string, setId: string, field: 'weight' | 'reps', value: number) => {
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

  const handleEditCaloriesChange = (entryId: string, calories: number) => {
    if (!editingWorkout) return;
    const updatedExercises = editingWorkout.exercises.map((ex) => {
      if (ex.id !== entryId) return ex;
      return { ...ex, caloriesBurned: Math.max(0, calories) };
    });
    setEditingWorkout({ ...editingWorkout, exercises: updatedExercises });
  };

  const handleSaveWorkout = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingWorkout) return;
    await saveHistoricalWorkout(editingWorkout);
    setEditingWorkout(null);
  };

  const handleDeleteWorkout = async () => {
    if (!deleteConfirmId) return;
    await deleteWorkout(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  const panelClass = isDark
    ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
    : 'bg-white border-[hsl(40,10%,88%)] shadow-xs';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold">
            {lang === 'ar' ? 'تقويم التمارين الشهري' : 'Workout Activity Calendar'}
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
            {lang === 'ar'
              ? 'يعرض التمارين المسجلة فعلياً مع تفاصيل الأوقات، المدد، والسعرات الحرارية.'
              : 'Displays recorded workouts with exact set durations, rest times, and calorie breakdowns.'}
          </p>
        </div>

        <button
          onClick={handleJumpToToday}
          className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
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
        {/* LEFT: CALENDAR GRID */}
        <div className={`lg:col-span-8 rounded-2xl border p-4 sm:p-6 space-y-5 ${panelClass}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className={`p-2 rounded-xl border cursor-pointer ${
                  isDark ? 'bg-[hsl(240,5%,11%)] border-gray-800 text-gray-300' : 'bg-gray-100 border-gray-200 text-slate-700'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className={`px-3 py-2 rounded-xl font-bold text-sm border ${
                  isDark ? 'bg-[hsl(240,5%,11%)] border-gray-800 text-white' : 'bg-white border-gray-200 text-slate-900'
                }`}
              >
                {(lang === 'ar' ? MONTH_NAMES_AR : MONTH_NAMES_EN).map((mName, idx) => (
                  <option key={mName} value={idx + 1}>{mName}</option>
                ))}
              </select>
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className={`px-3 py-2 rounded-xl font-bold text-sm border ${
                  isDark ? 'bg-[hsl(240,5%,11%)] border-gray-800 text-white' : 'bg-white border-gray-200 text-slate-900'
                }`}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                onClick={handleNextMonth}
                className={`p-2 rounded-xl border cursor-pointer ${
                  isDark ? 'bg-[hsl(240,5%,11%)] border-gray-800 text-gray-300' : 'bg-gray-100 border-gray-200 text-slate-700'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono-num">
              <span className="px-2.5 py-1 rounded-lg border bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)] border-[hsl(75,92%,56%)]/30">
                {monthStats.strengthCount} {lang === 'ar' ? 'حديد' : 'Strength'}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                {monthStats.cardioCount} {lang === 'ar' ? 'كارديو' : 'Cardio'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
            {ORDERED_WEEK_DAYS.map((dayName) => (
              <div key={dayName} className={`py-1.5 text-xs font-bold uppercase ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
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
                  className={`min-h-[70px] p-2 rounded-xl border flex flex-col justify-between text-start cursor-pointer transition-all ${
                    !cell.isCurrentMonth ? 'opacity-40' : ''
                  } ${
                    isSelected
                      ? isDark
                        ? 'bg-[hsl(75,92%,56%)]/15 border-[hsl(75,92%,56%)]'
                        : 'bg-indigo-50 border-indigo-500'
                      : dayWorkouts.length > 0
                      ? isDark
                        ? 'bg-[hsl(240,5%,11%)] border-[hsl(75,92%,56%)]/30'
                        : 'bg-indigo-50/50 border-indigo-200'
                      : isDark
                      ? 'bg-[hsl(240,6%,4%)] border-gray-800'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <span className={`font-mono-num text-xs font-bold w-6 h-6 rounded-lg flex items-center justify-center ${
                    cell.isToday ? 'bg-[hsl(75,92%,56%)] text-slate-950' : ''
                  }`}>
                    {cell.dayNumber}
                  </span>
                  <div className="space-y-0.5 w-full">
                    {hasStrength && (
                      <div className="text-[9px] font-bold px-1 rounded bg-[hsl(75,92%,56%)]/20 text-[hsl(75,92%,56%)] truncate">
                        Strength
                      </div>
                    )}
                    {hasCardio && (
                      <div className="text-[9px] font-bold px-1 rounded bg-cyan-500/20 text-cyan-400 truncate">
                        Cardio
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
              <span className="inline-flex items-center mt-2 px-2.5 py-1 rounded-lg text-xs font-bold border bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)] border-[hsl(75,92%,56%)]/30">
                {selectedDateRelativeLabel}
              </span>
            </div>

            {selectedDateWorkouts.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 border border-dashed rounded-xl border-gray-700">
                {lang === 'ar' ? 'لا توجد تمارين مسجلة في هذا التاريخ.' : 'No workouts recorded on this date.'}
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {selectedDateWorkouts.map((workout) => {
                  const expanded = expandedWorkoutId === workout.id;
                  
                  // Calculate total calories burned across all exercises and sets in this session
                  const totalSessionCalories = workout.exercises.reduce(
                    (acc, ex) =>
                      acc +
                      (ex.caloriesBurned ||
                        ex.sets.reduce((sAcc, s) => sAcc + (s.caloriesBurned || 0), 0)),
                    0
                  );

                  return (
                    <div
                      key={workout.id}
                      className={`p-3.5 rounded-xl border space-y-2.5 ${
                        isDark ? 'bg-[hsl(240,5%,11%)] border-gray-800' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-sm">{workout.title}</h3>
                        </div>
                        <button
                          onClick={() => setExpandedWorkoutId(expanded ? null : workout.id)}
                          className="text-xs text-[hsl(75,92%,56%)] font-semibold cursor-pointer"
                        >
                          {expanded ? (lang === 'ar' ? 'إخفاء' : 'Hide') : (lang === 'ar' ? 'التفاصيل' : 'Details')}
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-400 font-mono-num">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTimeFromTimestamp(workout.startTimestamp, lang)}
                        </span>
                        {totalSessionCalories > 0 && (
                          <span className="flex items-center gap-1 text-orange-400 font-bold">
                            <Flame className="w-3.5 h-3.5" />
                            {Math.round(totalSessionCalories)} kcal
                          </span>
                        )}
                      </div>

                      {/* EXPANDED DETAILED VIEW WITH SET DURATION, REST & CALORIES */}
                      {expanded && (
                        <div className="space-y-3 pt-3 border-t border-inherit">
                          {workout.exercises.map((ex) => (
                            <div key={ex.id} className="space-y-1">
                              <div className="font-bold text-xs text-[hsl(75,92%,56%)] flex justify-between">
                                <span>{ex.exerciseNameSnapshot}</span>
                                {ex.caloriesBurned ? (
                                  <span className="text-orange-400">🔥 {ex.caloriesBurned} kcal</span>
                                ) : null}
                              </div>
                              <div className="space-y-1">
                                {ex.sets.map((s) => (
                                  <div
                                    key={s.id}
                                    className="flex items-center justify-between text-[11px] font-mono-num bg-black/20 px-2 py-1 rounded"
                                  >
                                    <span>Set #{s.setNumber}: {s.weight ?? 'BW'}kg × {s.reps} reps</span>
                                    <div className="flex items-center gap-2 text-gray-400">
                                      {s.startedAt && s.completedAt && (
                                        <span>⏱️ {Math.round((s.completedAt - s.startedAt) / 1000)}s</span>
                                      )}
                                      {s.restDurationSeconds !== null && s.restDurationSeconds !== undefined && (
                                        <span className="text-blue-400">Rest: {s.restDurationSeconds}s</span>
                                      )}
                                      {s.caloriesBurned ? (
                                        <span className="text-orange-400">{s.caloriesBurned} kcal</span>
                                      ) : null}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2 border-t border-inherit">
                        <button
                          onClick={() => handleOpenEdit(workout)}
                          className="flex-1 py-1.5 rounded-lg bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> {lang === 'ar' ? 'تعديل' : 'Edit'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(workout.id)}
                          className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-500 cursor-pointer"
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

      {/* EDIT MODAL */}
      {editingWorkout && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 overflow-y-auto">
          <form
            onSubmit={handleSaveWorkout}
            className={`w-full max-w-2xl rounded-2xl border p-5 space-y-4 max-h-[90vh] flex flex-col ${
              isDark ? 'bg-[hsl(240,5%,7.5%)] border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-inherit pb-3">
              <h3 className="font-bold text-lg">{lang === 'ar' ? 'تعديل التمرين' : 'Edit Workout'}</h3>
              <button type="button" onClick={handleCloseEdit}><X className="w-5 h-5 cursor-pointer" /></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div>
                <label className="block text-xs font-semibold mb-1">{lang === 'ar' ? 'عنوان التمرين' : 'Workout Title'}</label>
                <input
                  required
                  value={editingWorkout.title}
                  onChange={(e) => setEditingWorkout({ ...editingWorkout, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm border bg-black/20"
                />
              </div>

              {editingWorkout.exercises.map((ex) => (
                <div key={ex.id} className="p-3.5 rounded-xl border space-y-2 bg-black/10">
                  <h4 className="font-bold text-sm">{ex.exerciseNameSnapshot}</h4>
                  {ex.sets.map((set) => (
                    <div key={set.id} className="grid grid-cols-12 gap-2 items-center text-xs">
                      <span className="col-span-2">#{set.setNumber}</span>
                      <input
                        type="number"
                        value={set.weight ?? 0}
                        onChange={(e) => handleEditSetChange(ex.id, set.id, 'weight', Number(e.target.value))}
                        className="col-span-4 px-2 py-1 rounded border bg-black/20"
                      />
                      <input
                        type="number"
                        value={set.reps}
                        onChange={(e) => handleEditSetChange(ex.id, set.id, 'reps', Number(e.target.value))}
                        className="col-span-4 px-2 py-1 rounded border bg-black/20"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-inherit flex justify-end gap-2">
              <button type="button" onClick={handleCloseEdit} className="px-4 py-2 rounded-xl border text-xs cursor-pointer">
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-700 text-white text-xs font-bold cursor-pointer">
                {lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] bg-black/75 flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-5 rounded-2xl border space-y-4 ${panelClass}`}>
            <h3 className="font-bold text-red-500">{lang === 'ar' ? 'حذف التمرين؟' : 'Delete Workout?'}</h3>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 rounded-xl border text-xs cursor-pointer">
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={handleDeleteWorkout} className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold cursor-pointer">
                {lang === 'ar' ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
