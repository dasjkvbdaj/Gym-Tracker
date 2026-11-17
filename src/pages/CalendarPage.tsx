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
import { generateId, db } from '../database/db';
import { useLiveQuery } from 'dexie-react-hooks';

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
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
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
    return isArabic ? `منذ ${Math.floor(diffDays / 7)} أسابيع` : `${Math.floor(diffDays / 7)} weeks ago`;
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
    showToast,
  } = useGym();

  const lang = settings.language;
  const isDark = settings.theme === 'dark';
  const isArabic = lang === 'ar';

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);

  const [editingWorkout, setEditingWorkout] = useState<WorkoutSession | null>(null);
  const [isPlanningMode, setIsPlanningMode] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedWorkoutId, setCopiedWorkoutId] = useState<string | null>(null);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);

  // @ts-ignore
  const activeSplitId = settings.activeSplitId || 'default';
  // @ts-ignore
  const currentSplitType = settings.activeSplitType || 'fixed';
  const savedSplits = useLiveQuery(() => db.workoutSplits.toArray(), [], []) || [];
  const activeSplitData = savedSplits.find(s => s.id === activeSplitId);

  // حساب التسلسل الصحيح بناءً على آخر تمرين مسجل (Sequential Rotation Logic)
  const currentDayScheduleForFilter = useMemo(() => {
    if (currentSplitType === 'rotation' && activeSplitData?.daysData && Array.isArray(activeSplitData.daysData)) {
      const rotDays = activeSplitData.daysData.filter((d: any) => !d.isRest);
      if (rotDays.length === 0) return { muscleGroups: ['Chest' as MuscleGroup], title: 'Rest' };

      // ترتيب كل التمارين المسجلة تصاعدياً حسب التاريخ
      const sortedWorkouts = [...completedWorkouts]
        .filter(w => (w.status as string) !== 'planned')
        .sort((a, b) => a.actualDate.localeCompare(b.actualDate));

      if (sortedWorkouts.length > 0) {
        // نجد آخر تمرين تم تسجيله قبل التاريخ المحدد أو فيه
        const pastOrCurrentWorkouts = sortedWorkouts.filter(w => w.actualDate <= selectedCalendarDate);
        
        if (pastOrCurrentWorkouts.length > 0) {
          // حساب الفارق بالأيام بين التاريخ المحدد وآخر تمرين تم إنجازه
          const lastRecorded = pastOrCurrentWorkouts[pastOrCurrentWorkouts.length - 1];
          const diffTime = new Date(selectedCalendarDate).getTime() - new Date(lastRecorded.actualDate).getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

          // نحدد أي يوم في الـ Rotation كان آخر تمرين
          const lastGroupStr = JSON.stringify(lastRecorded.muscleGroups);
          const lastRotIndex = rotDays.findIndex((rd: any) => JSON.stringify(rd.muscleGroups) === lastGroupStr);

          if (lastRotIndex !== -1) {
            const targetRotIndex = (lastRotIndex + diffDays) % rotDays.length;
            const finalIndex = targetRotIndex < 0 ? targetRotIndex + rotDays.length : targetRotIndex;
            return {
              muscleGroups: rotDays[finalIndex].muscleGroups || ['Chest'],
              title: rotDays[finalIndex].title || `Day ${finalIndex + 1}`
            };
          }
        }
      }

      // إذا لم يكن هناك أي تمرين مسجل بعد، نبدأ من اليوم الأول ونوزع حسب فارق الأيام عن اليوم
      const dayOfYear = Math.floor((new Date(selectedCalendarDate).getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
      const fallbackIndex = Math.abs(dayOfYear) % rotDays.length;
      return {
        muscleGroups: rotDays[fallbackIndex].muscleGroups || ['Chest'],
        title: rotDays[fallbackIndex].title || `Day ${fallbackIndex + 1}`
      };
    }

    const selectedDateMetaForFilter = getDateMetadata(selectedCalendarDate);
    return weeklySchedule.find((d) => d.day === selectedDateMetaForFilter.dayOfWeek);
  }, [currentSplitType, activeSplitData, completedWorkouts, selectedCalendarDate, weeklySchedule]);

  const allowedMuscles = currentDayScheduleForFilter?.muscleGroups || [];
  const defaultMuscle = allowedMuscles.length > 0 ? allowedMuscles[0] : ('Back' as MuscleGroup);

  const [forgottenMuscleFilter, setForgottenMuscleFilter] = useState(defaultMuscle);

  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>();
    for (const ex of exercises) {
      map.set(ex.id, ex);
    }
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

  const scheduledRestDays = useMemo(
    () => new Set(weeklySchedule.filter((d) => d.workoutType === 'rest').map((d) => d.day)),
    [weeklySchedule]
  );

  const selectedDateWorkouts = useMemo(() => workoutsByDate.get(selectedCalendarDate) || [], [workoutsByDate, selectedCalendarDate]);
  const selectedDateMeta = useMemo(() => getDateMetadata(selectedCalendarDate), [selectedCalendarDate]);
  const selectedDateRelativeLabel = useMemo(() => getRelativeDateLabel(selectedCalendarDate, lang), [selectedCalendarDate, lang]);
  const selectedDaySchedule = currentDayScheduleForFilter;

  const isTodayOrFutureDate = useMemo(() => {
    const todayStr = toLocalDateString(new Date());
    return selectedCalendarDate >= todayStr;
  }, [selectedCalendarDate]);

  const hasWorkoutsOrPlansOnSelectedDate = useMemo(() => {
    return selectedDateWorkouts.length > 0;
  }, [selectedDateWorkouts]);

  const handleCopyWorkoutDetails = (workout: WorkoutSession, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isPlan = (workout.status as string) === 'planned';
    let text = `🏋️‍♂️ ${workout.title}\n`;
    text += `📅 Date: ${formatFullDate(workout.actualDate, lang)}\n`;
    text += `📌 Status: ${isPlan ? (isArabic ? 'خطة' : 'Planned') : (isArabic ? 'مكتمل' : 'Completed')}\n`;
    if (!isPlan && workout.startTimestamp) {
      text += `⏰ Time: ${formatTimeFromTimestamp(workout.startTimestamp, lang)}`;
      if (workout.finishTimestamp) text += ` – ${formatTimeFromTimestamp(workout.finishTimestamp, lang)}`;
      text += '\n';
    }
    if (workout.muscleGroups && workout.muscleGroups.length > 0) {
      text += `💪 Target Muscles: ${workout.muscleGroups.map(mg => translateMuscleGroup(mg, lang)).join(', ')}\n`;
    }
    navigator.clipboard.writeText(text).then(() => {
      setCopiedWorkoutId(workout.id);
      showToast(isArabic ? 'تم نسخ تفاصيل التمرين بنجاح!' : 'Workout details copied!', 'success');
      setTimeout(() => setCopiedWorkoutId(null), 2500);
    });
  };

  const handleOpenPlanDay = () => {
    if (!selectedDaySchedule) return;
    const targetMuscles = selectedDaySchedule.muscleGroups || [];
    const defaultMuscleGroups = targetMuscles.length > 0 ? targetMuscles : ['Back' as MuscleGroup];
    setForgottenMuscleFilter(defaultMuscleGroups[0]);
    setIsPlanningMode(true);
    
    const newSession: WorkoutSession = {
      id: generateId('workout'),
      title: (selectedDaySchedule as any).title || (isArabic ? 'تمرين مخطط' : 'Scheduled Workout'),
      workoutType: 'strength',
      muscleGroups: defaultMuscleGroups,
      startTimestamp: Date.now(),
      finishTimestamp: null,
      status: 'planned' as WorkoutSession['status'],
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
    let strengthCount = 0;
    let cardioCount = 0;
    for (const workout of completedWorkouts) {
      if (workout.year === viewYear && workout.month === viewMonth && (workout.status as string) !== 'planned') {
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
    const targetMuscles = session.muscleGroups || allowedMuscles;
    if (targetMuscles.length > 0) setForgottenMuscleFilter(targetMuscles[0]);
    const todayStr = toLocalDateString(new Date());
    const isPlan = (session.status as string) === 'planned' || session.actualDate > todayStr;

    setIsPlanningMode(isPlan);
    setEditingWorkout(JSON.parse(JSON.stringify(session)) as WorkoutSession);
  };

  const handleCloseEdit = () => {
    setEditingWorkout(null);
    setIsPlanningMode(false);
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

  const handleEditExerciseUnit = (entryId: string, unit: WeightUnit) => {
    if (!editingWorkout) return;
    const updatedExercises = editingWorkout.exercises.map((ex) => {
      if (ex.id !== entryId) return ex;
      return {
        ...ex,
        weightType: unit,
        sets: ex.sets.map((set) => ({ ...set, weight: unit === 'none' ? null : set.weight ?? 0 })),
      };
    });
    setEditingWorkout({ ...editingWorkout, exercises: updatedExercises });
  };

  const handleAddSet = (entryId: string) => {
    if (!editingWorkout) return;
    const updatedExercises = editingWorkout.exercises.map((ex) => {
      if (ex.id !== entryId) return ex;
      const exObj = exerciseMap.get(ex.exerciseId);
      const currentName = exObj?.name || ex.exerciseNameSnapshot;
      const isCardio = isCardioExercise(currentName, ex.muscleGroup);
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
        sets: ex.sets.filter((set) => set.id !== setId).map((set, index) => ({ ...set, setNumber: index + 1 })),
      };
    });
    setEditingWorkout({ ...editingWorkout, exercises: updatedExercises });
  };

  const handleAddForgottenExercise = (exerciseId: string) => {
    if (!editingWorkout || !exerciseId) return;
    const exercise = exercises.find((item) => item.id === exerciseId);
    if (!exercise) return;
    if (editingWorkout.exercises.some((ex) => ex.exerciseId === exerciseId)) return;

    const isCardio = isCardioExercise(exercise.name, exercise.muscleGroup);
    const unit: WeightUnit = exercise.isBodyweight || isCardio ? 'none' : exercise.defaultWeightUnit || settings.preferredWeightUnit;
    const newEntry: ExerciseEntry = {
      id: generateId('ex_entry'),
      exerciseId: exercise.id,
      exerciseNameSnapshot: exercise.name,
      muscleGroup: exercise.muscleGroup,
      targetMuscleSnapshot: exercise.targetMuscle || '',
      weightType: unit,
      sets: isPlanningMode ? [] : [{ id: generateId('set'), setNumber: 1, weight: null, reps: isCardio ? 30 : 10, completed: true }],
      caloriesBurned: isCardio ? 0 : undefined,
      notes: '',
    };
    const groups = editingWorkout.muscleGroups.includes(exercise.muscleGroup) ? editingWorkout.muscleGroups : [...editingWorkout.muscleGroups, exercise.muscleGroup];
    setEditingWorkout({ ...editingWorkout, muscleGroups: groups, exercises: [...editingWorkout.exercises, newEntry] });
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
    const sessionToSave: WorkoutSession = {
      ...editingWorkout,
      status: (isPlanningMode ? 'planned' : 'completed') as WorkoutSession['status'],
    };
    await saveHistoricalWorkout(sessionToSave);
    setEditingWorkout(null);
    setIsPlanningMode(false);
  };

  const handleDeleteWorkout = async () => {
    if (!deleteConfirmId) return;
    await deleteWorkout(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  const panelClass = isDark ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]' : 'bg-white border-[hsl(40,10%,88%)] shadow-xs';
  const fieldClass = `w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:border-[hsl(75,92%,56%)] ${
    isDark ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-white' : 'bg-[hsl(40,20%,97.5%)] border-[hsl(40,10%,85%)] text-[hsl(240,10%,9%)]'
  }`;

  const availableForgottenExercises = editingWorkout
    ? exercises.filter((exercise) => {
        const notAlreadyAdded = !editingWorkout.exercises.some((existing) => existing.exerciseId === exercise.id);
        const matchesMuscle = exercise.muscleGroup === forgottenMuscleFilter;
        return notAlreadyAdded && matchesMuscle;
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold">
            {lang === 'ar' ? 'تقويم التمارين الشهري' : 'Workout Activity Calendar'}
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
            {lang === 'ar' ? 'يعرض التمارين المسجلة فعلياً والعضلات المستهدفة حسب التاريخ.' : 'Displays actual recorded workouts and target muscles by date.'}
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
          <CalendarIcon className="w-4 h-4" />
          <span>{lang === 'ar' ? 'الانتقال إلى اليوم' : 'Jump to Today'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`lg:col-span-8 rounded-2xl border p-4 sm:p-6 space-y-5 ${panelClass}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isDark ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300' : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,88%)] text-slate-700'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <select
                  value={viewMonth}
                  onChange={(e) => setViewMonth(Number(e.target.value))}
                  className={`px-3 py-2 rounded-xl font-display font-bold text-sm sm:text-base border focus:outline-none ${
                    isDark ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-white' : 'bg-[hsl(40,20%,97.5%)] border-[hsl(40,10%,85%)] text-[hsl(240,10%,9%)]'
                  }`}
                >
                  {(lang === 'ar' ? MONTH_NAMES_AR : MONTH_NAMES_EN).map((mName, idx) => (
                    <option key={mName} value={idx + 1}>{mName}</option>
                  ))}
                </select>
                <select
                  value={viewYear}
                  onChange={(e) => setViewYear(Number(e.target.value))}
                  className={`px-3 py-2 rounded-xl font-mono-num font-bold text-sm sm:text-base border focus:outline-none ${
                    isDark ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-white' : 'bg-[hsl(40,20%,97.5%)] border-[hsl(40,10%,85%)] text-[hsl(240,10%,9%)]'
                  }`}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleNextMonth}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isDark ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300' : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,88%)] text-slate-700'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono-num">
              <span className={`px-2.5 py-1 rounded-lg border font-semibold ${
                isDark ? 'bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)] border-[hsl(75,92%,56%)]/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}>
                {monthStats.strengthCount} {lang === 'ar' ? 'حديد' : 'Strength'}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                {monthStats.cardioCount} {lang === 'ar' ? 'كارديو' : 'Cardio'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
            {ORDERED_WEEK_DAYS.map((dayName) => (
              <div key={dayName} className={`py-1.5 text-[11px] sm:text-xs font-display font-bold uppercase ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                {translateDayName(dayName, lang, true)}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarCells.map((cell) => {
              const dayWorkouts = workoutsByDate.get(cell.dateStr) || [];
              const todayStr = toLocalDateString(new Date());
              const isPlannedDay = dayWorkouts.some((w) => (w.status as string) === 'planned' || (cell.dateStr > todayStr && w.status !== 'completed'));
              const hasStrength = dayWorkouts.some((w) => w.workoutType === 'strength' && !w.muscleGroups.includes('Cardio') && (w.status as string) !== 'planned');
              const hasCardio = dayWorkouts.some((w) => (w.workoutType === 'cardio' || w.muscleGroups.includes('Cardio')) && (w.status as string) !== 'planned');
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
                      ? isDark ? 'bg-[hsl(75,92%,56%)]/15 border-[hsl(75,92%,56%)] ring-1 ring-[hsl(75,92%,56%)]/50' : 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-300'
                      : dayWorkouts.length > 0
                      ? isDark ? 'bg-[hsl(240,5%,11%)] border-[hsl(75,92%,56%)]/30' : 'bg-indigo-50/50 border-indigo-200'
                      : isDark ? 'bg-[hsl(240,6%,4%)] border-[hsl(240,4%,16%)]' : 'bg-[hsl(40,20%,97.5%)] border-[hsl(40,10%,88%)]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`font-mono-num text-xs sm:text-sm font-bold w-6 h-6 rounded-lg flex items-center justify-center ${
                      cell.isToday ? (isDark ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,6%,4%)]' : 'bg-indigo-700 text-white') : isDark ? 'text-gray-200' : 'text-[hsl(240,10%,9%)]'
                    }`}>
                      {cell.dayNumber}
                    </span>
                    {isPlannedDay && (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm ring-1 ring-amber-500/50 shrink-0" />
                    )}
                    {isScheduledRest && dayWorkouts.length === 0 && (
                      <span><Moon className="w-3 h-3 text-gray-500 opacity-60" /></span>
                    )}
                  </div>
                  <div className="space-y-1 mt-1 w-full">
                    {hasStrength && (
                      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold truncate ${
                        isDark ? 'bg-[hsl(75,92%,56%)]/20 text-[hsl(75,92%,56%)] border-[hsl(75,92%,56%)]/30' : 'bg-indigo-100 text-indigo-700 border-indigo-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isDark ? 'bg-[hsl(75,92%,56%)]' : 'bg-indigo-600'}`} />
                        <span className="hidden sm:inline truncate">{lang === 'ar' ? 'حديد' : 'Strength'}</span>
                      </div>
                    )}
                    {hasCardio && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-semibold truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                        <span className="hidden sm:inline truncate">{lang === 'ar' ? 'كارديو' : 'Cardio'}</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className={`lg:col-span-4 rounded-2xl border p-5 flex flex-col justify-between gap-5 ${panelClass}`}>
          <div className="space-y-4">
            <div className="pb-4 border-b border-inherit">
              <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(75,92%,56%)]">
                {lang === 'ar' ? 'التاريخ المحدد' : 'Selected Date'}
              </span>
              <h2 className="text-lg font-display font-bold mt-0.5">
                {formatFullDate(selectedCalendarDate, lang)}
              </h2>
              <span className={`inline-flex items-center mt-2 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                isDark ? 'bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)] border-[hsl(75,92%,56%)]/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}>
                {selectedDateRelativeLabel}
              </span>
              {selectedDaySchedule && (
                <div className="mt-3 space-y-2">
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                    {lang === 'ar' ? 'الخطة المرجعية لهذا اليوم:' : 'Reference plan:'}{' '}
                    <strong>{(selectedDaySchedule as any).title || translateMuscleGroup(selectedDaySchedule.muscleGroups[0], lang)}</strong>
                  </p>
                  {isTodayOrFutureDate && !hasWorkoutsOrPlansOnSelectedDate && (
                    <button
                      onClick={handleOpenPlanDay}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                        isDark ? 'bg-[hsl(75,92%,56%)]/20 hover:bg-[hsl(75,92%,56%)]/30 text-[hsl(75,92%,56%)] border border-[hsl(75,92%,56%)]/40' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                      }`}
                    >
                      <ClipboardList className="w-4 h-4" />
                      <span>{lang === 'ar' ? 'ضع خطة لهذا اليوم (Put a Plan)' : 'Put a Plan'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {selectedDateWorkouts.length === 0 ? (
              <div className={`py-8 px-4 rounded-xl border border-dashed text-center space-y-2 ${isDark ? 'border-[hsl(240,4%,19%)] text-gray-400' : 'border-[hsl(40,10%,82%)] text-slate-500'}`}>
                <CalendarIcon className="w-6 h-6 mx-auto opacity-40" />
                <p className="text-xs font-medium">{lang === 'ar' ? 'لا توجد تمارين مسجلة في هذا التاريخ.' : 'No workouts recorded on this date.'}</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {selectedDateWorkouts.map((workout) => {
                  const expanded = expandedWorkoutId === workout.id;
                  const isPlan = (workout.status as string) === 'planned';
                  const isCopied = copiedWorkoutId === workout.id;

                  return (
                    <div key={workout.id} className={`p-3.5 rounded-xl border space-y-2.5 ${isDark ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)]' : 'bg-[hsl(40,20%,97.5%)] border-[hsl(40,10%,88%)]'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded ${
                            isPlan ? 'bg-amber-500/20 text-amber-300' : 'bg-indigo-100 text-indigo-700'
                          }`}>
                            {isPlan ? (lang === 'ar' ? 'خطة' : 'Planned') : 'Strength'}
                          </span>
                          <h3 className="font-display font-bold text-sm mt-1">{workout.title}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleCopyWorkoutDetails(workout, e)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${isCopied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-100 text-slate-700'}`}
                            title="Copy workout details"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => setExpandedWorkoutId(expanded ? null : workout.id)}
                            className="text-xs text-[hsl(75,92%,56%)] font-semibold cursor-pointer"
                          >
                            {expanded ? (lang === 'ar' ? 'إخفاء' : 'Hide') : (lang === 'ar' ? 'التفاصيل' : 'Details')}
                          </button>
                        </div>
                      </div>

                      {workout.muscleGroups.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {workout.muscleGroups.map((mg) => (
                            <span key={mg} className="text-[10px] px-2 py-0.5 rounded bg-black/10 text-gray-300">
                              {translateMuscleGroup(mg, lang)}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* تفاصيل التمارين عند الضغط على Details */}
                      {expanded && (
                        <div className="space-y-3 pt-2 border-t border-inherit">
                          {workout.exercises.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">
                              {lang === 'ar' ? 'لا توجد تمارين مضافة في هذه الخطة.' : 'No exercises added.'}
                            </p>
                          ) : (
                            workout.exercises.map((ex) => (
                              <div key={ex.id} className="space-y-1">
                                <span className="font-semibold text-xs text-[hsl(75,92%,56%)]">
                                  {ex.exerciseNameSnapshot}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2 border-t border-inherit">
                        <button
                          onClick={() => handleOpenEdit(workout)}
                          className="flex-1 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> {lang === 'ar' ? 'تعديل' : 'Edit'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(workout.id)}
                          className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 cursor-pointer"
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

      {editingWorkout && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
          <form
            onSubmit={handleSaveWorkout}
            className={`w-full max-w-2xl rounded-2xl border p-4 sm:p-6 space-y-4 max-h-[90vh] flex flex-col ${
              isDark ? 'bg-[hsl(240,5%,7.5%)] border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-inherit pb-3 shrink-0">
              <h3 className="font-bold text-lg">{lang === 'ar' ? 'تعديل / تخطيط التمرين' : 'Edit / Plan Workout'}</h3>
              <button type="button" onClick={handleCloseEdit}><X className="w-5 h-5 cursor-pointer" /></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">{lang === 'ar' ? 'عنوان التمرين' : 'Workout Title'}</label>
                  <input
                    required
                    value={editingWorkout.title}
                    onChange={(e) => setEditingWorkout({ ...editingWorkout, title: e.target.value })}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">{lang === 'ar' ? 'تاريخ التمرين' : 'Workout Date'}</label>
                  <input
                    type="date"
                    required
                    value={editingWorkout.actualDate}
                    onChange={(e) => setEditingWorkout({ ...editingWorkout, actualDate: e.target.value })}
                    className={fieldClass}
                  />
                </div>
              </div>

              {editingWorkout.exercises.map((ex) => {
                const exObj = exerciseMap.get(ex.exerciseId);
                const displayName = exObj?.name || ex.exerciseNameSnapshot;
                return (
                  <div key={ex.id} className={`p-3.5 rounded-xl border space-y-3 ${isDark ? 'bg-[hsl(240,5%,11%)] border-gray-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm">{displayName}</h4>
                      <button type="button" onClick={() => handleRemoveExercise(ex.id)} className="text-red-500 cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="p-4 rounded-xl border border-indigo-500/30 space-y-3">
                <label className="block text-xs font-semibold">{lang === 'ar' ? 'إضافة تمارين من عضلات اليوم:' : 'Add Exercises:'}</label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {allowedMuscles.map((mg) => (
                    <button
                      key={mg}
                      type="button"
                      onClick={() => setForgottenMuscleFilter(mg)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
                        forgottenMuscleFilter === mg ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-500/30'
                      }`}
                    >
                      {translateMuscleGroup(mg, lang)}
                    </button>
                  ))}
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {availableForgottenExercises.map((exercise) => (
                    <div key={exercise.id} className="flex items-center justify-between p-2 rounded-xl border bg-black/10">
                      <span className="text-xs font-semibold">{exercise.name}</span>
                      <button
                        type="button"
                        onClick={() => handleAddForgottenExercise(exercise.id)}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white cursor-pointer"
                      >
                        {lang === 'ar' ? 'إضافة' : 'Add'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-inherit flex justify-end gap-2 shrink-0">
              <button type="button" onClick={handleCloseEdit} className="px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer">
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer">
                {lang === 'ar' ? 'حفظ' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] bg-black/75 flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-5 rounded-2xl border space-y-4 ${panelClass}`}>
            <h3 className="font-bold text-red-500">{lang === 'ar' ? 'حذف جلسة التمرين؟' : 'Delete Workout Session?'}</h3>
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
