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
  ClipboardList,
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

// RELATIVE DATE LABEL
const getRelativeDateLabel = (
  dateString: string,
  lang: string
): string => {
  const [year, month, day] = dateString.split('-').map(Number);

  if (!year || !month || !day) {
    return dateString;
  }

  const selectedDate = new Date(year, month - 1, day);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  selectedDate.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (today.getTime() - selectedDate.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const isArabic = lang === 'ar';

  if (diffDays === 0) {
    return isArabic ? 'اليوم' : 'Today';
  }

  if (diffDays === 1) {
    return isArabic ? 'أمس' : 'Yesterday';
  }

  if (diffDays === -1) {
    return isArabic ? 'غداً' : 'Tomorrow';
  }

  if (diffDays > 1) {
    if (diffDays < 7) {
      return isArabic ? `منذ ${diffDays} أيام` : `${diffDays} days ago`;
    }
    if (diffDays < 14) return isArabic ? 'منذ أسبوع' : '1 week ago';
    if (diffDays < 21) return isArabic ? 'منذ أسبوعين' : '2 weeks ago';
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return isArabic ? `منذ ${weeks} أسابيع` : `${weeks} weeks ago`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return isArabic
        ? `منذ ${months} ${months === 1 ? 'شهر' : 'أشهر'}`
        : `${months} ${months === 1 ? 'month' : 'months'} ago`;
    }
    const years = Math.floor(diffDays / 365);
    return isArabic
      ? `منذ ${years} ${years === 1 ? 'سنة' : 'سنوات'}`
      : `${years} ${years === 1 ? 'year' : 'years'} ago`;
  }

  const daysUntil = Math.abs(diffDays);

  return isArabic ? `بعد ${daysUntil} أيام` : `In ${daysUntil} days`;
};

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

  // استخراج عضلات اليوم المحدد واختيار أول عضلة افتراضياً تلقائياً
  const selectedDateMetaForFilter = getDateMetadata(selectedCalendarDate);
  const currentDayScheduleForFilter = weeklySchedule.find(
    (d) => d.day === selectedDateMetaForFilter.dayOfWeek
  );
  const allowedMuscles = currentDayScheduleForFilter?.targetMuscles || currentDayScheduleForFilter?.muscleGroups || [];
  const defaultMuscle = allowedMuscles.length > 0 ? allowedMuscles[0] : 'Back';

  const [forgottenMuscleFilter, setForgottenMuscleFilter] =
    useState<MuscleGroup>(defaultMuscle as MuscleGroup);

  const [expandedWorkoutId, setExpandedWorkoutId] =
    useState<string | null>(null);

  // خريطة لربط معرف التمرين باسمه الحالي المحدث من مكتبة التمارين
  const exerciseNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const ex of exercises) {
      map.set(ex.id, ex.name);
    }
    return map;
  }, [exercises]);

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

  const selectedDateWorkouts = useMemo(
    () => workoutsByDate.get(selectedCalendarDate) || [],
    [workoutsByDate, selectedCalendarDate]
  );

  const selectedDateMeta = useMemo(
    () => getDateMetadata(selectedCalendarDate),
    [selectedCalendarDate]
  );

  const selectedDateRelativeLabel = useMemo(
    () => getRelativeDateLabel(selectedCalendarDate, lang),
    [selectedCalendarDate, lang]
  );

  const selectedDaySchedule = useMemo(
    () =>
      weeklySchedule.find(
        (d) => d.day === selectedDateMeta.dayOfWeek
      ),
    [weeklySchedule, selectedDateMeta]
  );

  // التحقق هل التاريخ المحدد هو في المستقبل فقط (من غداً وطالع)
  const isFutureDate = useMemo(() => {
    const todayStr = toLocalDateString(new Date());
    return selectedCalendarDate > todayStr;
  }, [selectedCalendarDate]);

  // فتح نافذة التخطيط اليومي المخطط (Put a Plan / Plan Day)
  const handleOpenPlanDay = () => {
    if (!selectedDaySchedule || selectedDaySchedule.workoutType === 'rest') {
      return;
    }

    const targetMuscles = selectedDaySchedule.targetMuscles || selectedDaySchedule.muscleGroups || [];
    const defaultMuscleGroups = targetMuscles.length > 0 ? targetMuscles : ['Back' as MuscleGroup];

    setForgottenMuscleFilter(defaultMuscleGroups[0]);

    const newSession: WorkoutSession = {
      id: generateId('workout'),
      title: selectedDaySchedule.title || (lang === 'ar' ? 'تمرين مخطط' : 'Scheduled Workout'),
      workoutType: selectedDaySchedule.workoutType || 'strength',
      muscleGroups: defaultMuscleGroups,
      startTimestamp: Date.now(),
      finishTimestamp: null,
      exercises: [],
      actualDate: selectedCalendarDate,
      year: Number(selectedCalendarDate.split('-')[0]),
      month: Number(selectedCalendarDate.split('-')[1]),
      day: Number(selectedCalendarDate.split('-')[2]),
    };

    setEditingWorkout(newSession);
    setIsAddForgottenOpen(false);
  };

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
    return { strengthCount, cardioCount, total: strengthCount + cardioCount };
  }, [completedWorkouts, viewYear, viewMonth]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => currentYear - 6 + i);
  }, []);

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

  const handleOpenEdit = (session: WorkoutSession) => {
    const targetMuscles = selectedDaySchedule?.targetMuscles || selectedDaySchedule?.muscleGroups || [];
    if (targetMuscles.length > 0) {
      setForgottenMuscleFilter(targetMuscles[0]);
    }
    setEditingWorkout(
      JSON.parse(JSON.stringify(session)) as WorkoutSession
    );
    setIsAddForgottenOpen(false);
  };

  const handleCloseEdit = () => {
    setEditingWorkout(null);
    setIsAddForgottenOpen(false);
  };

  // إضافة تمرين بدون مجموعات أو أوزان (اسم التمرين فقط) وبسرعة عبر زر Add
  const handleAddForgottenExercise = (exerciseId: string) => {
    if (!editingWorkout || !exerciseId) return;

    const exercise = exercises.find((item) => item.id === exerciseId);
    if (!exercise) return;
    const alreadyExists = editingWorkout.exercises.some(
      (ex) => ex.exerciseId === exerciseId
    );
    if (alreadyExists) return;

    const unit: WeightUnit = 'none';
    const newEntry: ExerciseEntry = {
      id: generateId('ex_entry'),
      exerciseId: exercise.id,
      exerciseNameSnapshot: exercise.name,
      muscleGroup: exercise.muscleGroup,
      weightType: unit,
      sets: [],
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

    const remaining = editingWorkout.exercises.filter(
      (ex) => ex.id !== entryId
    );
    const groups = Array.from(new Set(remaining.map((ex) => ex.muscleGroup)));
    setEditingWorkout({
      ...editingWorkout,
      exercises: remaining,
      muscleGroups: groups,
    });
  };

  const handleSaveWorkout = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingWorkout) return;
    await saveHistoricalWorkout(editingWorkout);
    setEditingWorkout(null);
    setIsAddForgottenOpen(false);
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

  // عضلات اليوم المحدد في الجدول الأسبوعي (بدون خيار الكل)
  const allowedMuscleGroupsForDay = useMemo(() => {
    if (selectedDaySchedule) {
      return selectedDaySchedule.targetMuscles || selectedDaySchedule.muscleGroups || [];
    }
    return [];
  }, [selectedDaySchedule]);

  const availableForgottenExercises = editingWorkout
    ? exercises.filter((exercise) => {
        const notAlreadyAdded = !editingWorkout.exercises.some(
          (existing) => existing.exerciseId === exercise.id
        );
        const matchesMuscle = exercise.muscleGroup === forgottenMuscleFilter;
        return notAlreadyAdded && matchesMuscle;
      })
    : [];

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">
            {lang === 'ar' ? 'تقويم التمارين الشهري' : 'Workout Activity Calendar'}
          </h1>
          <p
            className={`text-sm mt-1 ${
              isDark ? 'text-gray-400' : 'text-slate-600'
            }`}
          >
            {lang === 'ar'
              ? 'يعرض التمارين المسجلة فعلياً حسب التاريخ. اضغط على أي يوم لعرض التفاصيل أو إضافة/تخطيط تمرين.'
              : 'Displays actual recorded workout dates. Select any date to inspect sessions or plan a workout.'}
          </p>
        </div>
        <button
          onClick={handleJumpToToday}
          className={`self-start sm:self-auto px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
            isDark
              ? 'bg-[hsl(75,92%,56%)]/15 hover:bg-[hsl(75,92%,56%)]/25 text-[hsl(75,92%,56%)] border-[hsl(75,92%,56%)]/30'
              : 'bg-indigo-700 hover:bg-indigo-800 text-white border-indigo-700 shadow-sm'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? 'الانتقال إلى اليوم' : 'Jump to Today'}</span>
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
                  onChange={(e) => setViewMonth(Number(e.target.value))}
                  aria-label="Select Month"
                  className={`px-3 py-2 rounded-xl font-display font-bold text-sm sm:text-base border focus:outline-none focus:border-[hsl(75,92%,56%)] ${
                    isDark
                      ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-white'
                      : 'bg-[hsl(40,20%,97.5%)] border-[hsl(40,10%,85%)] text-[hsl(240,10%,9%)]'
                  }`}
                >
                  {(lang === 'ar' ? MONTH_NAMES_AR : MONTH_NAMES_EN).map(
                    (mName, idx) => (
                      <option key={mName} value={idx + 1}>
                        {mName}
                      </option>
                    )
                  )}
                </select>
                <select
                  value={viewYear}
                  onChange={(e) => setViewYear(Number(e.target.value))}
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
              const dayWorkouts = workoutsByDate.get(cell.dateStr) || [];
              const hasStrength = dayWorkouts.some(
                (w) =>
                  w.workoutType === 'strength' &&
                  !w.muscleGroups.includes('Cardio')
              );
              const hasCardio = dayWorkouts.some(
                (w) =>
                  w.workoutType === 'cardio' ||
                  w.muscleGroups.includes('Cardio')
              );
              const isScheduledRest = scheduledRestDays.has(cell.dayOfWeek);
              const isSelected = cell.dateStr === selectedCalendarDate;

              return (
                <button
                  key={cell.dateStr}
                  onClick={() => setSelectedCalendarDate(cell.dateStr)}
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
                    {isScheduledRest && dayWorkouts.length === 0 && (
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
              isDark ? 'border-[hsl(240,4%,16%)] text-gray-400' : 'border-[hsl(40,10%,88%)] text-slate-600'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`w-3 h-3 rounded-full ${
                  isDark ? 'bg-[hsl(75,92%,56%)]' : 'bg-indigo-600'
                }`}
              />
              <span>
                {lang === 'ar' ? 'تمرين حديد مسجل' : 'Strength Training Recorded'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-cyan-400" />
              <span>
                {lang === 'ar' ? 'جلسة كارديو مسجلة' : 'Cardio Session Recorded'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-gray-500" />
              <span>
                {lang === 'ar' ? 'يوم راحة مخطط' : 'Planned Rest Day'}
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
              <span
                className={`inline-flex items-center mt-2 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                  isDark
                    ? 'bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)] border-[hsl(75,92%,56%)]/30'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}
              >
                {selectedDateRelativeLabel}
              </span>
              {selectedDaySchedule && (
                <div className="mt-3 space-y-2">
                  <p
                    className={`text-xs ${
                      isDark ? 'text-gray-400' : 'text-slate-500'
                    }`}
                  >
                    {lang === 'ar' ? 'الخطة المرجعية لهذا اليوم:' : 'Reference plan:'}{' '}
                    <strong>{selectedDaySchedule.title}</strong>
                  </p>

                  {/* زر تخطيط التمرين (Put a Plan) يظهر حصراً في الأيام المستقبلية */}
                  {isFutureDate && selectedDaySchedule.workoutType !== 'rest' && (
                    <button
                      onClick={handleOpenPlanDay}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                        isDark
                          ? 'bg-[hsl(75,92%,56%)]/20 hover:bg-[hsl(75,92%,56%)]/30 text-[hsl(75,92%,56%)] border border-[hsl(75,92%,56%)]/40'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                      }`}
                    >
                      <ClipboardList className="w-4 h-4" />
                      <span>
                        {lang === 'ar' ? 'ضع خطة لهذا اليوم (Put a Plan)' : 'Put a Plan'}
                      </span>
                    </button>
                  )}
                </div>
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
                    ? 'يمكنك إضافة تمرين أو وضع خطة لهذا التاريخ.'
                    : 'You can record or plan a session on this date.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {selectedDateWorkouts.map((workout) => {
                  const expanded = expandedWorkoutId === workout.id;
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
                              workout.workoutType === 'cardio' ||
                              workout.muscleGroups.includes('Cardio')
                                ? isDark
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                  : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                                : isDark
                                ? 'bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)]'
                                : 'bg-indigo-100 text-indigo-700'
                            }`}
                          >
                            {workout.workoutType === 'cardio' ||
                            workout.muscleGroups.includes('Cardio') ? (
                              <Flame className="w-3 h-3 text-cyan-400" />
                            ) : (
                              <Dumbbell className="w-3 h-3" />
                            )}
                            <span>
                              {workout.workoutType === 'cardio' ||
                              workout.muscleGroups.includes('Cardio')
                                ? lang === 'ar'
                                  ? 'كارديو'
                                  : 'Cardio'
                                : 'Strength'}
                            </span>
                          </span>
                          <h3 className="font-display font-bold text-sm mt-1">
                            {workout.title}
                          </h3>
                        </div>
                        <button
                          onClick={() =>
                            setExpandedWorkoutId(expanded ? null : workout.id)
                          }
                          className="text-xs text-[hsl(75,92%,56%)] font-semibold cursor-pointer"
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

                      {/* TIME ONLY */}
                      <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-400 font-mono-num gap-2">
                        <div className="flex items-center gap-1">
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
                          {workout.exercises.map((ex) => {
                            const displayName =
                              exerciseNameMap.get(ex.exerciseId) ||
                              ex.exerciseNameSnapshot;
                            const isCardio = isCardioExercise(
                              displayName,
                              ex.muscleGroup
                            );
                            return (
                              <div key={ex.id} className="space-y-1.5">
                                <div
                                  className={`font-semibold text-xs flex items-center justify-between ${
                                    isCardio
                                      ? isDark
                                        ? 'text-cyan-400'
                                        : 'text-cyan-700 font-bold'
                                      : isDark
                                      ? 'text-[hsl(75,92%,56%)]'
                                      : 'text-indigo-700'
                                  }`}
                                >
                                  <span>{displayName}</span>
                                  {isCardio && ex.caloriesBurned ? (
                                    <span className="text-cyan-400 font-mono-num text-[11px] flex items-center gap-1">
                                      <Flame className="w-3 h-3" />{' '}
                                      {ex.caloriesBurned} kcal
                                    </span>
                                  ) : null}
                                </div>
                                <div className="flex flex-wrap gap-1.5 font-mono-num text-[11px]">
                                  {isCardio ? (
                                    <span
                                      className={`px-2 py-1 rounded flex items-center gap-1.5 text-xs font-semibold ${
                                        isDark
                                          ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                                          : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                                      }`}
                                    >
                                      <Clock className="w-3.5 h-3.5 text-cyan-500" />
                                      <span>
                                        {ex.sets[0]?.reps || 30}{' '}
                                        {lang === 'ar' ? 'دقائق' : 'minutes'}
                                      </span>
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
                          <Edit3 className="w-3.5 h-3.5" />{' '}
                          {lang === 'ar' ? 'تعديل' : 'Edit'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(workout.id)}
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

      {/* EDIT / PLAN WORKOUT MODAL */}
      {editingWorkout && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
          <form
            onSubmit={handleSaveWorkout}
            className={`w-full max-w-2xl rounded-2xl border p-4 sm:p-6 space-y-4 max-h-[90vh] flex flex-col ${
              isDark
                ? 'bg-[hsl(240,5%,7.5%)] border-gray-700 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-inherit pb-3 shrink-0">
              <div>
                <h3 className="font-bold text-lg">
                  {lang === 'ar' ? 'تعديل / تخطيط التمرين' : 'Edit / Plan Workout'}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {formatFullDate(editingWorkout.actualDate, lang)}
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

              {/* EXERCISES: عرض اسم التمرين فقط بدون أوزان ومجموعات */}
              {editingWorkout.exercises.map((ex) => {
                const displayName =
                  exerciseNameMap.get(ex.exerciseId) ||
                  ex.exerciseNameSnapshot;
                return (
                  <div
                    key={ex.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                      isDark
                        ? 'bg-[hsl(240,5%,11%)] border-gray-800'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-sm flex items-center gap-1.5">
                        <span>{displayName}</span>
                      </h4>
                      <span className="text-[11px] text-gray-400">
                        {translateMuscleGroup(ex.muscleGroup, lang)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveExercise(ex.id)}
                      className="p-1.5 text-red-500 cursor-pointer hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remove exercise"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}

              {/* ADD EXERCISE: تصفية العضلات وعرض التمارين كنص مع زر Add مباشر (add add add) بدون قائمة select طويلة */}
              <div className="p-4 rounded-xl border border-indigo-500/30 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold">
                    {lang === 'ar'
                      ? 'تصفية حسب عضلة اليوم'
                      : 'Filter by Day Muscle Group'}
                  </label>
                  <select
                    value={forgottenMuscleFilter}
                    onChange={(e) =>
                      setForgottenMuscleFilter(
                        e.target.value as MuscleGroup
                      )
                    }
                    className={fieldClass}
                  >
                    {allowedMuscleGroupsForDay.map((muscle) => (
                      <option key={muscle} value={muscle}>
                        {translateMuscleGroup(muscle, lang)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold">
                    {lang === 'ar' ? 'التمارين المتاحة (اضغط إضافة):' : 'Available Exercises:'}
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {availableForgottenExercises.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2 text-center">
                        {lang === 'ar'
                          ? 'تمت إضافة جميع تمارين هذه العضلة أو لا توجد تمارين متاحة.'
                          : 'No available exercises in this muscle group.'}
                      </p>
                    ) : (
                      availableForgottenExercises.map((exercise) => (
                        <div
                          key={exercise.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border ${
                            isDark
                              ? 'bg-[hsl(240,5%,10%)] border-gray-800'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <span className="text-xs font-semibold">
                            {exercise.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddForgottenExercise(exercise.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                              isDark
                                ? 'bg-[hsl(75,92%,56%)]/20 hover:bg-[hsl(75,92%,56%)]/30 text-[hsl(75,92%,56%)] border border-[hsl(75,92%,56%)]/40'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{lang === 'ar' ? 'إضافة' : 'Add'}</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="pt-3 border-t border-inherit flex justify-end gap-2 shrink-0">
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
                {lang === 'ar' ? 'حفظ الخطة / التمرين' : 'Save Plan / Workout'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] bg-black/75 flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-5 rounded-2xl border space-y-4 ${panelClass}`}>
            <h3 className="font-bold text-red-500">
              {lang === 'ar' ? 'حذف جلسة التمرين؟' : 'Delete Workout Session?'}
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
