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
  Copy,
  Check,
} from 'lucide-react';

import { useGym } from '../context/GymContext';
import { generateId } from '../database/db';

import {
  Exercise,
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

const getRelativeDateLabel = (
  dateString: string,
  lang: string
): string => {
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return dateString;

  const selectedDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  selectedDate.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (today.getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24)
  );
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
    name.includes('stair')
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
    showToast,
  } = useGym();

  const lang = settings.language;
  const isDark = settings.theme === 'dark';

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);

  const [editingWorkout, setEditingWorkout] = useState<WorkoutSession | null>(null);
  const [isPlanningMode, setIsPlanningMode] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedWorkoutId, setCopiedWorkoutId] = useState<string | null>(null);

  // دالة الحساب الذكي الآمنة (تمنع الشاشة البيضاء تماماً وتدعم الـ Rotating والـ Fixed)
  const getSmartScheduleForDate = (dateStr: string) => {
    const existing = workoutsByDate.get(dateStr);
    if (existing && existing.length > 0) {
      return {
        title: existing[0].title,
        muscleGroups: existing[0].muscleGroups,
        workoutType: existing[0].workoutType,
      };
    }

    const mode = settings.scheduleMode || 'fixed';
    const rotatingDays = settings.rotatingDays || [
      { id: '1', title: 'Day 1', isRest: false, muscleGroups: ['Back', 'Shoulders', 'Biceps'] },
      { id: '2', title: 'Day 2', isRest: false, muscleGroups: ['Chest', 'Shoulders', 'Triceps'] },
      { id: '3', title: 'Day 3', isRest: true, muscleGroups: [] },
      { id: '4', title: 'Day 4', isRest: false, muscleGroups: ['Legs'] },
    ];

    if (mode === 'rotating' && rotatingDays.length > 0) {
      // حساب موقع اليوم في الدورة بناءً على فرق الأيام عن أول تمرين أو الترتيب التسلسلي
      const sortedWorkouts = [...completedWorkouts]
        .filter((w) => w.actualDate < dateStr && (w.status as string) !== 'planned')
        .sort((a, b) => b.actualDate.localeCompare(a.actualDate));

      if (sortedWorkouts.length > 0) {
        const lastWorkout = sortedWorkouts[0];
        // البحث عن مؤشر آخر تمرين في الـ rotatingDays وتحديد اليوم الذي يليه
        const lastIdx = rotatingDays.findIndex((d) => d.title.toLowerCase().includes(lastWorkout.title.toLowerCase().split(' ')[0]));
        const nextIdx = lastIdx >= 0 ? (lastIdx + 1) % rotatingDays.length : 0;
        const targetDay = rotatingDays[nextIdx];

        return {
          title: targetDay.title,
          muscleGroups: targetDay.muscleGroups,
          workoutType: targetDay.isRest ? 'rest' : 'strength',
        };
      } else {
        // الافتراضي لو أول مرة
        return {
          title: rotatingDays[0].title,
          muscleGroups: rotatingDays[0].muscleGroups,
          workoutType: rotatingDays[0].isRest ? 'rest' : 'strength',
        };
      }
    }

    // الوضع الثابت (Fixed)
    const meta = getDateMetadata(dateStr);
    const daySched = weeklySchedule.find((d) => d.day === meta.dayOfWeek);
    return {
      title: daySched?.title || (lang === 'ar' ? 'تمرين' : 'Workout'),
      muscleGroups: daySched?.muscleGroups || ['Back' as MuscleGroup],
      workoutType: daySched?.workoutType || 'strength',
    };
  };

  const smartSchedule = getSmartScheduleForDate(selectedCalendarDate);
  const allowedMuscles = smartSchedule.muscleGroups || [];
  const defaultMuscle = allowedMuscles.length > 0 ? allowedMuscles[0] : ('Back' as MuscleGroup);

  const [forgottenMuscleFilter, setForgottenMuscleFilter] = useState<MuscleGroup>(defaultMuscle);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);

  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>();
    for (const ex of exercises) map.set(ex.id, ex);
    return map;
  }, [exercises]);

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

  const selectedDateWorkouts = useMemo(() => workoutsByDate.get(selectedCalendarDate) || [], [workoutsByDate, selectedCalendarDate]);
  const selectedDateMeta = useMemo(() => getDateMetadata(selectedCalendarDate), [selectedCalendarDate]);
  const selectedDateRelativeLabel = useMemo(() => getRelativeDateLabel(selectedCalendarDate, lang), [selectedCalendarDate, lang]);

  const isTodayOrFutureDate = useMemo(() => {
    const todayStr = toLocalDateString(new Date());
    return selectedCalendarDate >= todayStr;
  }, [selectedCalendarDate]);

  const handleCopyWorkoutDetails = (workout: WorkoutSession, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let text = `🏋️‍♂️ ${workout.title}\n📅 Date: ${formatFullDate(workout.actualDate, lang)}\n`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedWorkoutId(workout.id);
      showToast(lang === 'ar' ? 'تم نسخ التفاصيل!' : 'Copied!', 'success');
      setTimeout(() => setCopiedWorkoutId(null), 2500);
    });
  };

  const handleOpenPlanDay = () => {
    if (!smartSchedule || smartSchedule.workoutType === 'rest') return;
    setIsPlanningMode(true);
    const newSession: WorkoutSession = {
      id: generateId('workout'),
      title: smartSchedule.title || 'Workout',
      workoutType: 'strength',
      muscleGroups: allowedMuscles,
      startTimestamp: Date.now(),
      finishTimestamp: null,
      status: 'planned',
      exercises: [],
      actualDate: selectedCalendarDate,
      year: Number(selectedCalendarDate.split('-')[0]),
      month: Number(selectedCalendarDate.split('-')[1]),
      dayOfMonth: Number(selectedCalendarDate.split('-')[2]),
      dayOfWeek: selectedDateMeta.dayOfWeek,
      durationMinutes: null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      notes: '',
    };
    setEditingWorkout(newSession);
  };

  const monthStats = useMemo(() => {
    let strengthCount = 0, cardioCount = 0;
    for (const workout of completedWorkouts) {
      if (workout.year === viewYear && workout.month === viewMonth && (workout.status as string) !== 'planned') {
        if (workout.workoutType === 'cardio') cardioCount++;
        else strengthCount++;
      }
    }
    return { strengthCount, cardioCount };
  }, [completedWorkouts, viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1); }
    else { setViewMonth((m) => m - 1); }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear((y) => y + 1); }
    else { setViewMonth((m) => m + 1); }
  };

  const handleJumpToToday = () => {
    const today = new Date();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth() + 1);
    setSelectedCalendarDate(toLocalDateString(today));
  };

  const handleOpenEdit = (session: WorkoutSession) => {
    const todayStr = toLocalDateString(new Date());
    const isPlan = (session.status as string) === 'planned' || session.actualDate > todayStr;
    setIsPlanningMode(isPlan);
    setEditingWorkout(JSON.parse(JSON.stringify(session)));
  };

  const handleCloseEdit = () => { setEditingWorkout(null); setIsPlanningMode(false); };

  const handleSaveWorkout = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingWorkout) return;
    await saveHistoricalWorkout({ ...editingWorkout, status: isPlanningMode ? 'planned' : 'completed' });
    setEditingWorkout(null);
    setIsPlanningMode(false);
  };

  const handleDeleteWorkout = async () => {
    if (!deleteConfirmId) return;
    await deleteWorkout(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  const panelClass = isDark ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]' : 'bg-white border-[hsl(40,10%,88%)] shadow-xs';
  const fieldClass = `w-full px-3 py-2 rounded-xl text-sm border focus:outline-none ${isDark ? 'bg-[hsl(240,5%,11%)] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-black'}`;

  const availableForgottenExercises = editingWorkout
    ? exercises.filter((ex) => !editingWorkout.exercises.some((e) => e.exerciseId === ex.id) && ex.muscleGroup === forgottenMuscleFilter)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold">
            {lang === 'ar' ? 'تقويم التمارين الشهري' : 'Workout Activity Calendar'}
          </h1>
        </div>
        <button
          onClick={handleJumpToToday}
          className="px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer bg-indigo-700 text-white"
        >
          <CalendarIcon className="w-4 h-4" />
          <span>{lang === 'ar' ? 'الانتقال إلى اليوم' : 'Jump to Today'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`lg:col-span-8 rounded-2xl border p-4 sm:p-6 space-y-5 ${panelClass}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={handlePrevMonth} className="p-2 rounded-xl border cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
              <span className="font-bold text-sm">{viewMonth} / {viewYear}</span>
              <button onClick={handleNextMonth} className="p-2 rounded-xl border cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center">
            {ORDERED_WEEK_DAYS.map((dayName) => (
              <div key={dayName} className="py-1.5 text-xs font-bold uppercase text-gray-400">
                {translateDayName(dayName, lang, true)}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarCells.map((cell) => {
              const dayWorkouts = workoutsByDate.get(cell.dateStr) || [];
              const isSelected = cell.dateStr === selectedCalendarDate;
              return (
                <button
                  key={cell.dateStr}
                  onClick={() => setSelectedCalendarDate(cell.dateStr)}
                  className={`min-h-[64px] p-2 rounded-xl border flex flex-col justify-between cursor-pointer ${
                    isSelected ? 'border-indigo-500 bg-indigo-50/20' : 'border-gray-800'
                  }`}
                >
                  <span className="font-bold text-xs">{cell.dayNumber}</span>
                  {dayWorkouts.length > 0 && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className={`lg:col-span-4 rounded-2xl border p-5 flex flex-col justify-between gap-5 ${panelClass}`}>
          <div>
            <h2 className="text-lg font-bold">{formatFullDate(selectedCalendarDate, lang)}</h2>
            <p className="text-xs text-gray-400 mt-1">
              {lang === 'ar' ? 'الخطة المقترحة:' : 'Suggested:'} <strong>{smartSchedule.title}</strong>
            </p>
            {isTodayOrFutureDate && selectedDateWorkouts.length === 0 && smartSchedule.workoutType !== 'rest' && (
              <button
                onClick={handleOpenPlanDay}
                className="w-full mt-3 py-2 px-3 rounded-xl text-xs font-bold bg-indigo-600 text-white flex items-center justify-center gap-2 cursor-pointer"
              >
                <ClipboardList className="w-4 h-4" />
                <span>{lang === 'ar' ? 'ضع خطة لهذا اليوم' : 'Put a Plan'}</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {selectedDateWorkouts.map((workout) => (
              <div key={workout.id} className="p-3 rounded-xl border border-gray-700 space-y-2">
                <h3 className="font-bold text-sm">{workout.title}</h3>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenEdit(workout)} className="px-3 py-1 bg-indigo-700 text-white text-xs rounded">Edit</button>
                  <button onClick={() => setDeleteConfirmId(workout.id)} className="px-3 py-1 bg-red-600 text-white text-xs rounded">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {editingWorkout && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3">
          <form onSubmit={handleSaveWorkout} className={`w-full max-w-lg p-5 rounded-2xl border space-y-4 ${panelClass}`}>
            <h3 className="font-bold text-lg">{lang === 'ar' ? 'تعديل الخطة' : 'Edit Workout'}</h3>
            <input
              value={editingWorkout.title}
              onChange={(e) => setEditingWorkout({ ...editingWorkout, title: e.target.value })}
              className={fieldClass}
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={handleCloseEdit} className="px-4 py-2 border rounded text-xs">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-indigo-700 text-white text-xs rounded">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
