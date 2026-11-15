import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ensureDatabaseInitialized, generateId } from '../database/db';
import {
  DEFAULT_USER_SETTINGS,
  DEFAULT_WEEKLY_SCHEDULE,
} from '../database/defaultData';
import {
  AppSection,
  DayName,
  Exercise,
  ExerciseEntry,
  MuscleGroup,
  UserSettings,
  WeeklyScheduleDay,
  WeightUnit,
  WorkoutSession,
} from '../types/workout';
import {
  getDateMetadata,
  ORDERED_WEEK_DAYS,
  toLocalDateString,
} from '../utils/dateUtils';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface StartWorkoutOptions {
  workoutType?: 'strength' | 'cardio';
  title?: string;
  muscleGroups?: MuscleGroup[];
  exerciseIds?: string[];
  actualDate?: string; // YYYY-MM-DD
  notes?: string;
  plannedWorkoutId?: string;
}

interface GymContextValue {
  isInitialized: boolean;
  currentSection: AppSection;
  setCurrentSection: (section: AppSection) => void;
  selectedProgressExerciseId: string | null;
  setSelectedProgressExerciseId: (id: string | null) => void;
  selectedCalendarDate: string;
  setSelectedCalendarDate: (dateStr: string) => void;

  workouts: WorkoutSession[];
  completedWorkouts: WorkoutSession[];
  activeWorkout: WorkoutSession | null;
  exercises: Exercise[];
  weeklySchedule: WeeklyScheduleDay[];
  settings: UserSettings;

  startNewWorkout: (options?: StartWorkoutOptions) => Promise<WorkoutSession>;
  updateActiveWorkout: (updated: WorkoutSession) => Promise<void>;
  finishActiveWorkout: (customFinishTimestamp?: number) => Promise<WorkoutSession | null>;
  cancelActiveWorkout: () => Promise<void>;
  saveHistoricalWorkout: (workout: WorkoutSession) => Promise<void>;
  deleteWorkout: (workoutId: string) => Promise<void>;

  addExercise: (data: {
  name: string;
  muscleGroup: MuscleGroup;
  targetMuscle?: string;
  defaultWeightUnit?: WeightUnit;
  isBodyweight?: boolean;
  notes?: string;
  assignToDays?: DayName[];
}) => Promise<Exercise>;
  updateExercise: (exercise: Exercise) => Promise<void>;
  deleteExercise: (exerciseId: string) => Promise<void>;

  updateScheduleDay: (dayConfig: WeeklyScheduleDay) => Promise<void>;
  assignExerciseToDay: (day: DayName, exerciseId: string) => Promise<void>;
  removeExerciseFromDay: (day: DayName, exerciseId: string) => Promise<void>;
  resetScheduleToDefault: () => Promise<void>;

  updateSettings: (partial: Partial<UserSettings>) => Promise<void>;

  openProgressForExercise: (exerciseId: string) => void;
  openStartWorkoutForDate: (dateStr: string, workoutType?: 'strength' | 'cardio') => Promise<void>;

  toasts: ToastMessage[];
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
}

const GymContext = createContext<GymContextValue | undefined>(undefined);

export const GymProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentSection, setCurrentSection] = useState<AppSection>('dashboard');
  const [selectedProgressExerciseId, setSelectedProgressExerciseId] = useState<string | null>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(() =>
    toLocalDateString(new Date())
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = generateId('toast');
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    ensureDatabaseInitialized().then(() => {
      setIsInitialized(true);
    });
  }, []);

  const rawWorkouts = useLiveQuery(() => db.workouts.toArray(), [], []);
  const rawExercises = useLiveQuery(() => db.exercises.toArray(), [], []);
  const rawSchedule = useLiveQuery(() => db.weeklySchedule.toArray(), [], []);
  const rawSettings = useLiveQuery(() => db.settings.get('user_settings'), [], DEFAULT_USER_SETTINGS);

  const settings: UserSettings = rawSettings || DEFAULT_USER_SETTINGS;

  useEffect(() => {
    const htmlEl = document.documentElement;
    if (settings.theme === 'dark') {
      htmlEl.classList.add('dark');
      htmlEl.classList.remove('light');
      document.body.className =
        'bg-[#0A0D12] text-[#F3F4F6] antialiased selection:bg-emerald-500/30 selection:text-emerald-300';
    } else {
      htmlEl.classList.add('light');
      htmlEl.classList.remove('dark');
      document.body.className =
        'bg-[#F8FAFC] text-[#0F172A] antialiased selection:bg-emerald-500/20 selection:text-emerald-800';
    }

    if (settings.language === 'ar') {
      htmlEl.setAttribute('dir', 'rtl');
      htmlEl.setAttribute('lang', 'ar');
    } else {
      htmlEl.setAttribute('dir', 'ltr');
      htmlEl.setAttribute('lang', 'en');
    }
  }, [settings.theme, settings.language]);

  const exercises = useMemo(() => {
    const list = rawExercises || [];
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [rawExercises]);

  const weeklySchedule = useMemo(() => {
    const list =
      rawSchedule && rawSchedule.length > 0 ? rawSchedule : DEFAULT_WEEKLY_SCHEDULE;
    const map = new Map<DayName, WeeklyScheduleDay>();
    for (const d of list) {
      map.set(d.day, d);
    }
    return ORDERED_WEEK_DAYS.map(
      (dayName) =>
        map.get(dayName) ||
        DEFAULT_WEEKLY_SCHEDULE.find((d) => d.day === dayName)!
    );
  }, [rawSchedule]);

  const workouts = useMemo(() => rawWorkouts || [], [rawWorkouts]);

  const completedWorkouts = useMemo(() => {
    return workouts
      .filter((w) => w.status === 'completed' || (w.status as string) === 'planned')
      .sort((a, b) => {
        if (b.actualDate !== a.actualDate) {
          return b.actualDate.localeCompare(a.actualDate);
        }
        return (b.startTimestamp || 0) - (a.startTimestamp || 0);
      });
  }, [workouts]);

  const activeWorkout = useMemo(() => {
    const inProg = workouts
      .filter((w) => w.status === 'in_progress')
      .sort((a, b) => b.startTimestamp - a.startTimestamp);
    return inProg[0] || null;
  }, [workouts]);

  const startNewWorkout = async (options?: StartWorkoutOptions): Promise<WorkoutSession> => {
    const now = Date.now();
    const dateStr = options?.actualDate || toLocalDateString(new Date(now));
    const meta = getDateMetadata(dateStr);

    // التحقق من وجود خطة مخصصة محفوظة في التقويم لهذا التاريخ
    const existingPlan = workouts.find(
      (w) =>
        (options?.plannedWorkoutId && w.id === options.plannedWorkoutId) ||
        (w.actualDate === dateStr && (w.status as string) === 'planned')
    );

    const workoutType = options?.workoutType || existingPlan?.workoutType || 'strength';
    const muscleGroups: MuscleGroup[] =
      options?.muscleGroups && options.muscleGroups.length > 0
        ? options.muscleGroups
        : existingPlan && existingPlan.muscleGroups.length > 0
        ? existingPlan.muscleGroups
        : workoutType === 'cardio'
        ? ['Cardio']
        : ['Back'];

    const defaultTitle =
      options?.title ||
      existingPlan?.title ||
      (workoutType === 'cardio'
        ? 'Cardio Session'
        : `${muscleGroups.join(' + ')} Workout`);

    const resolvedExerciseIds =
      options?.exerciseIds && options.exerciseIds.length > 0
        ? options.exerciseIds
        : existingPlan
        ? existingPlan.exercises.map((e) => e.exerciseId)
        : [];

    const exerciseEntries: ExerciseEntry[] = [];
    if (workoutType === 'strength' && resolvedExerciseIds.length > 0) {
      for (const exId of resolvedExerciseIds) {
        const libEx = exercises.find((e) => e.id === exId);
        if (libEx) {
          const unit: WeightUnit = libEx.isBodyweight
            ? 'none'
            : libEx.defaultWeightUnit || settings.preferredWeightUnit;

          exerciseEntries.push({
            id: generateId('ex_entry'),
            exerciseId: libEx.id,
            exerciseNameSnapshot: libEx.name,
            muscleGroup: libEx.muscleGroup,
targetMuscle: libEx.targetMuscle || '',
            weightType: unit,
            sets: [1, 2, 3].map((setNum) => ({
              id: generateId('set'),
              setNumber: setNum,
              weight: unit === 'none' ? null : 0,
              reps: 10,
              completed: false,
            })),
            notes: '',
          });
        }
      }
    }

    const newSession: WorkoutSession & { plannedWorkoutId?: string } = {
      id: generateId('workout'),
      workoutType,
      title: defaultTitle,
      muscleGroups,
      actualDate: meta.actualDate,
      year: meta.year,
      month: meta.month,
      dayOfMonth: meta.dayOfMonth,
      dayOfWeek: meta.dayOfWeek,
      startTimestamp: now,
      finishTimestamp: null,
      durationMinutes: workoutType === 'cardio' ? 60 : null,
      timezone: meta.timezone,
      status: 'in_progress',
      notes: options?.notes || '',
      exercises: exerciseEntries,
      plannedWorkoutId: existingPlan?.id || options?.plannedWorkoutId,
    };

    if (activeWorkout) {
      await db.workouts.delete(activeWorkout.id);
    }

    await db.workouts.put(newSession);
    setCurrentSection('start-workout');
    return newSession;
  };

  const updateActiveWorkout = async (updated: WorkoutSession): Promise<void> => {
    const meta = getDateMetadata(updated.actualDate);
    const normalized: WorkoutSession = {
      ...updated,
      actualDate: meta.actualDate,
      year: meta.year,
      month: meta.month,
      dayOfMonth: meta.dayOfMonth,
      dayOfWeek: meta.dayOfWeek,
      timezone: meta.timezone,
    };
    await db.workouts.put(normalized);
  };

  const finishActiveWorkout = async (
    customFinishTimestamp?: number
  ): Promise<WorkoutSession | null> => {
    if (!activeWorkout) return null;

    const finishTs = customFinishTimestamp || Date.now();
    const durationMins = Math.max(1, Math.round((finishTs - activeWorkout.startTimestamp) / 60000));

    const cleanedExercises: ExerciseEntry[] = (activeWorkout.exercises || []).map(
      (ex) => {
        const completedSetsCount = (ex.sets || []).filter((s) => s.completed).length;
        // حساب سعرات حرارية تقريبية لكل تمرين حديد بناءً على المجموعات والعدات وأوقات الراحة
        const calculatedKcal = ex.caloriesBurned !== undefined && ex.caloriesBurned > 0
          ? ex.caloriesBurned
          : Math.round(completedSetsCount * 12 + durationMins * 4);

        return {
          ...ex,
          caloriesBurned: calculatedKcal,
          notes: '',
          sets: (ex.sets || []).map((s, idx) => ({
            ...s,
            setNumber: idx + 1,
            weight: ex.weightType === 'none' ? null : Math.max(0, Number(s.weight ?? 0)),
            reps: Math.max(0, Math.round(Number(s.reps ?? 0))),
            completed: true,
          })),
        };
      }
    );

    const meta = getDateMetadata(activeWorkout.actualDate);

    // إزالة الخطة المجدولة (النقطة الصفراء) لهذا اليوم عند إنهاء التمرين بنجاح
    const linkedPlanId = (activeWorkout as WorkoutSession & { plannedWorkoutId?: string }).plannedWorkoutId;
    const plansToRemove = workouts.filter(
      (w) =>
        (linkedPlanId && w.id === linkedPlanId) ||
        (w.actualDate === meta.actualDate && (w.status as string) === 'planned')
    );
    for (const plan of plansToRemove) {
      await db.workouts.delete(plan.id);
    }

    const completedSession: WorkoutSession = {
      ...activeWorkout,
      actualDate: meta.actualDate,
      year: meta.year,
      month: meta.month,
      dayOfMonth: meta.dayOfMonth,
      dayOfWeek: meta.dayOfWeek,
      finishTimestamp: finishTs,
      durationMinutes: durationMins,
      notes: '',
      status: 'completed',
      exercises: cleanedExercises,
    };
    delete (completedSession as WorkoutSession & { plannedWorkoutId?: string }).plannedWorkoutId;

    await db.workouts.put(completedSession);
    showToast(
      settings.language === 'ar'
        ? 'تم حفظ التمرين في السجل بنجاح!'
        : 'Workout completed and saved to history!',
      'success'
    );
    return completedSession;
  };

  const cancelActiveWorkout = async (): Promise<void> => {
    if (!activeWorkout) return;
    // حذف الجلسة النشطة فقط مع الإبقاء على أي خطة محفوظة (planned) في التقويم كما هي
    await db.workouts.delete(activeWorkout.id);
    showToast(
      settings.language === 'ar' ? 'تم إلغاء التمرين الحالي.' : 'Active workout cancelled.',
      'info'
    );
  };

  const saveHistoricalWorkout = async (workout: WorkoutSession): Promise<void> => {
    const meta = getDateMetadata(workout.actualDate);
    const cleanedExercises: ExerciseEntry[] = (workout.exercises || []).map((ex) => ({
      ...ex,
      sets: (ex.sets || []).map((s, idx) => ({
        ...s,
        setNumber: idx + 1,
        weight: ex.weightType === 'none' ? null : Math.max(0, Number(s.weight ?? 0)),
        reps: Math.max(0, Math.round(Number(s.reps ?? 0))),
        completed: true,
      })),
    }));

    const isPlanned = (workout.status as string) === 'planned';

    const record: WorkoutSession = {
      ...workout,
      actualDate: meta.actualDate,
      year: meta.year,
      month: meta.month,
      dayOfMonth: meta.dayOfMonth,
      dayOfWeek: meta.dayOfWeek,
      timezone: meta.timezone,
      status: (isPlanned ? 'planned' : 'completed') as WorkoutSession['status'],
      exercises: cleanedExercises,
    };

    await db.workouts.put(record);
    showToast(
      settings.language === 'ar'
        ? isPlanned
          ? 'تم حفظ الخطة بنجاح!'
          : 'تم حفظ بيانات التمرين بنجاح!'
        : isPlanned
        ? 'Workout plan saved!'
        : 'Workout session saved!',
      'success'
    );
  };

  const deleteWorkout = async (workoutId: string): Promise<void> => {
    await db.workouts.delete(workoutId);
    showToast(
      settings.language === 'ar'
        ? 'تم حذف التمرين من السجل.'
        : 'Workout deleted from history.',
      'info'
    );
  };

  
const addExercise = async (data: {
  name: string;
  muscleGroup: MuscleGroup;
  targetMuscle?: string;
  defaultWeightUnit?: WeightUnit;
  isBodyweight?: boolean;
  notes?: string;
  assignToDays?: DayName[];
}): Promise<Exercise> => {
  const unit: WeightUnit = data.defaultWeightUnit || 'none';

  const newEx: Exercise = {
    id: generateId('ex_custom'),
    name: data.name.trim(),
    muscleGroup: data.muscleGroup,
    targetMuscle: data.targetMuscle?.trim() || '',
    defaultWeightUnit: unit,
    isBodyweight: data.isBodyweight ?? false,
    notes: data.notes?.trim() || '',
    isCustom: true,
    createdAt: Date.now(),
  };

  await db.exercises.put(newEx);

  if (data.assignToDays && data.assignToDays.length > 0) {
    for (const day of data.assignToDays) {
      const daySchedule = weeklySchedule.find((d) => d.day === day);

      if (
        daySchedule &&
        !daySchedule.assignedExerciseIds.includes(newEx.id)
      ) {
        await db.weeklySchedule.put({
          ...daySchedule,
          assignedExerciseIds: [
            ...daySchedule.assignedExerciseIds,
            newEx.id,
          ],
        });
      }
    }
  }

  showToast(
    settings.language === 'ar'
      ? `تمت إضافة التمرين "${newEx.name}"`
      : `Added "${newEx.name}" to Exercise Library`,
    'success'
  );

  return newEx;
};


  
const updateExercise = async (exercise: Exercise): Promise<void> => {
  const updated: Exercise = {
    ...exercise,
    name: exercise.name.trim(),
    targetMuscle: exercise.targetMuscle?.trim() || '',
    isBodyweight:
      exercise.defaultWeightUnit === 'none' || exercise.isBodyweight,
    defaultWeightUnit: exercise.isBodyweight
      ? 'none'
      : exercise.defaultWeightUnit,
  };

  await db.exercises.put(updated);

  showToast(
    settings.language === 'ar'
      ? 'تم تحديث بيانات التمرين'
      : 'Exercise updated',
    'success'
  );
};


  const deleteExercise = async (exerciseId: string): Promise<void> => {
    await db.exercises.delete(exerciseId);
    for (const day of weeklySchedule) {
      if (day.assignedExerciseIds.includes(exerciseId)) {
        await db.weeklySchedule.put({
          ...day,
          assignedExerciseIds: day.assignedExerciseIds.filter((id) => id !== exerciseId),
        });
      }
    }
    showToast(
      settings.language === 'ar'
        ? 'تم حذف التمرين من المكتبة (التاريخ السابق محفوظ)'
        : 'Exercise removed from library (historical logs preserved)',
      'info'
    );
  };

  const updateScheduleDay = async (dayConfig: WeeklyScheduleDay): Promise<void> => {
    await db.weeklySchedule.put(dayConfig);
    showToast(
      settings.language === 'ar'
        ? 'تم تحديث جدول اليوم بنجاح'
        : `Updated ${dayConfig.day}'s workout plan`,
      'success'
    );
  };

  const assignExerciseToDay = async (day: DayName, exerciseId: string): Promise<void> => {
    const target = weeklySchedule.find((d) => d.day === day);
    if (!target) return;
    if (!target.assignedExerciseIds.includes(exerciseId)) {
      await db.weeklySchedule.put({
        ...target,
        assignedExerciseIds: [...target.assignedExerciseIds, exerciseId],
      });
    }
  };

  const removeExerciseFromDay = async (day: DayName, exerciseId: string): Promise<void> => {
    const target = weeklySchedule.find((d) => d.day === day);
    if (!target) return;
    await db.weeklySchedule.put({
      ...target,
      assignedExerciseIds: target.assignedExerciseIds.filter((id) => id !== exerciseId),
    });
  };

  const resetScheduleToDefault = async (): Promise<void> => {
    await db.weeklySchedule.clear();
    await db.weeklySchedule.bulkPut(DEFAULT_WEEKLY_SCHEDULE);
    showToast(
      settings.language === 'ar'
        ? 'تمت استعادة الجدول الأسبوعي الافتراضي'
        : 'Restored default weekly schedule',
      'info'
    );
  };

  const updateSettings = async (partial: Partial<UserSettings>): Promise<void> => {
    const merged: UserSettings = {
      ...settings,
      ...partial,
      id: 'user_settings',
      updatedAt: Date.now(),
    };
    await db.settings.put(merged);
  };

  const openProgressForExercise = (exerciseId: string) => {
    setSelectedProgressExerciseId(exerciseId);
    setCurrentSection('progress');
  };

  const openStartWorkoutForDate = async (
    dateStr: string,
    workoutType: 'strength' | 'cardio' = 'strength'
  ) => {
    const meta = getDateMetadata(dateStr);
    const existingPlan = workouts.find(
      (w) => w.actualDate === dateStr && (w.status as string) === 'planned'
    );

    if (existingPlan) {
      await startNewWorkout({
        workoutType: existingPlan.workoutType,
        title: existingPlan.title,
        muscleGroups: existingPlan.muscleGroups,
        exerciseIds: existingPlan.exercises.map((e) => e.exerciseId),
        actualDate: dateStr,
        plannedWorkoutId: existingPlan.id,
      });
      return;
    }

    const dayPlan = weeklySchedule.find((d) => d.day === meta.dayOfWeek);

    if (dayPlan && dayPlan.workoutType !== 'rest' && workoutType === dayPlan.workoutType) {
      await startNewWorkout({
        workoutType: dayPlan.workoutType,
        title: dayPlan.title,
        muscleGroups: dayPlan.muscleGroups,
        exerciseIds: dayPlan.assignedExerciseIds,
        actualDate: dateStr,
      });
    } else {
      await startNewWorkout({
        workoutType,
        actualDate: dateStr,
      });
    }
  };

  return (
    <GymContext.Provider
      value={{
        isInitialized,
        currentSection,
        setCurrentSection,
        selectedProgressExerciseId,
        setSelectedProgressExerciseId,
        selectedCalendarDate,
        setSelectedCalendarDate,
        workouts,
        completedWorkouts,
        activeWorkout,
        exercises,
        weeklySchedule,
        settings,
        startNewWorkout,
        updateActiveWorkout,
        finishActiveWorkout,
        cancelActiveWorkout,
        saveHistoricalWorkout,
        deleteWorkout,
        addExercise,
        updateExercise,
        deleteExercise,
        updateScheduleDay,
        assignExerciseToDay,
        removeExerciseFromDay,
        resetScheduleToDefault,
        updateSettings,
        openProgressForExercise,
        openStartWorkoutForDate,
        toasts,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </GymContext.Provider>
  );
};

export function useGym(): GymContextValue {
  const ctx = useContext(GymContext);
  if (!ctx) {
    throw new Error('useGym must be used inside a GymProvider');
  }
  return ctx;
};
