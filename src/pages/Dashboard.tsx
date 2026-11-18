import React, { useMemo } from 'react';
import {
  Activity,
  ArrowUpRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  Dumbbell,
  Flame,
  History,
  Play,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useGym } from '../context/GymContext';
import { getExerciseProgressSummary } from '../services/progressService';
import {
  formatDurationMinutes,
  formatFullDate,
  formatShortDate,
  getCurrentWeekRange,
  getDateMetadata,
  toLocalDateString,
} from '../utils/dateUtils';
import {
  translateDayName,
  translateMuscleGroup,
  UI_TEXT,
} from '../utils/i18n';
import { formatSetPerformance } from '../utils/unitConversion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../database/db';

export const Dashboard: React.FC = () => {
  const {
    completedWorkouts,
    activeWorkout,
    weeklySchedule,
    exercises,
    settings,
    setCurrentSection,
    startNewWorkout,
    openProgressForExercise,
    setSelectedCalendarDate,
  } = useGym();

  const lang = settings.language;
  const t = UI_TEXT[lang];
  const isDark = settings.theme === 'dark';
  const isArabic = lang === 'ar';

  const todayStr = toLocalDateString(new Date());
  const todayMeta = getDateMetadata(todayStr);

  // جلب الـ Splits المحفوظة لمعرفة نظام الـ Rotation النشط
  const savedSplits = useLiveQuery(() => db.workoutSplits.toArray(), [], []) || [];
  // @ts-ignore
  const activeSplitId = settings.activeSplitId || 'default';
  // @ts-ignore
  const currentSplitType = settings.activeSplitType || 'fixed';
  // @ts-ignore
  const activeSplitData = savedSplits.find(s => s.id === activeSplitId);

  // تحديد خطة اليوم بناءً على النظام النشط (Rotation أو Fixed)
  const todayPlan = useMemo(() => {
    if (currentSplitType === 'rotation' && activeSplitData && Array.isArray(activeSplitData.daysData)) {
      const days = activeSplitData.daysData;
      if (days.length === 0) return null;
      
      // حساب رقم اليوم بناءً على عدد الأيام المنقضية أو التدوير الدوري
      const epochDays = Math.floor(new Date().getTime() / (1000 * 60 * 60 * 24));
      const rotationIndex = epochDays % days.length;
      const currentRotDay = days[rotationIndex];

      return {
        title: currentRotDay.isRest ? (isArabic ? 'يوم راحة' : 'Rest Day') : currentRotDay.title,
        workoutType: currentRotDay.isRest ? 'rest' : 'strength',
        muscleGroups: currentRotDay.muscleGroups || [],
        assignedExerciseIds: [],
        isRest: currentRotDay.isRest
      };
    } else {
      // النظام الثابت العادي
      const found = weeklySchedule.find((d) => d.day === todayMeta.dayOfWeek);
      return found ? { ...found, isRest: found.workoutType === 'rest' } : null;
    }
  }, [currentSplitType, activeSplitData, weeklySchedule, todayMeta.dayOfWeek, isArabic]);

  const isRestDay = todayPlan?.isRest || todayPlan?.workoutType === 'rest';

  // البحث عن خطة مخصصة لليوم في التقويم (Put a Plan)
  const todayCalendarPlan = useMemo(
    () =>
      completedWorkouts.find(
        (w) => w.actualDate === todayStr && (w.status as string) === 'planned'
      ),
    [completedWorkouts, todayStr]
  );

  // الجلسات المكتملة فعلياً فقط
  const actualCompletedWorkouts = useMemo(
    () => completedWorkouts.filter((w) => (w.status as string) !== 'planned'),
    [completedWorkouts]
  );

  const weekRange = useMemo(
    () => getCurrentWeekRange(new Date()),
    []
  );

  const stats = useMemo(() => {
    const totalSessions = actualCompletedWorkouts.length;
    const workoutsThisWeek = actualCompletedWorkouts.filter(
      (w) =>
        w.actualDate >= weekRange.startOfWeek &&
        w.actualDate <= weekRange.endOfWeek
    ).length;
    const cardioSessions = actualCompletedWorkouts.filter(
      (w) => w.workoutType === 'cardio' || w.muscleGroups.includes('Cardio')
    ).length;

    return {
      totalSessions,
      workoutsThisWeek,
      cardioSessions,
    };
  }, [actualCompletedWorkouts, weekRange]);

  const weeklyChartData = useMemo(() => {
    return weekRange.weekDates.map(({ day, dateStr }) => {
      const dayWorkouts = actualCompletedWorkouts.filter(
        (w) => w.actualDate === dateStr
      );

      const totalSets = dayWorkouts.reduce((sum, w) => {
        const exSets = (w.exercises || []).reduce(
          (sAcc, ex) => sAcc + (ex.sets ? ex.sets.length : 0),
          0
        );
        return sum + exSets;
      }, 0);

      return {
        dayName: translateDayName(day, lang, true),
        fullDate: formatShortDate(dateStr, lang),
        sessions: dayWorkouts.length,
        sets: totalSets,
      };
    });
  }, [actualCompletedWorkouts, weekRange, lang]);

  const recentProgressions = useMemo(() => {
    if (actualCompletedWorkouts.length === 0) return [];

    const seenExerciseIds = new Set<string>();
    const items: ReturnType<
      typeof getExerciseProgressSummary
    >[] = [];

    for (const w of actualCompletedWorkouts) {
      for (const exEntry of w.exercises || []) {
        if (!seenExerciseIds.has(exEntry.exerciseId)) {
          seenExerciseIds.add(exEntry.exerciseId);
          const libEx = exercises.find(
            (e) => e.id === exEntry.exerciseId
          );
          const exName = libEx ? libEx.name : exEntry.exerciseNameSnapshot;
          const summary = getExerciseProgressSummary(
            exEntry.exerciseId,
            exName,
            actualCompletedWorkouts,
            settings.preferredWeightUnit,
            'all',
            lang
          );
          if (summary.currentSession && summary.currentSession.bestWeightSet) {
            items.push(summary);
          }
        }
        if (items.length >= 6) break;
      }
      if (items.length >= 6) break;
    }

    return items;
  }, [
    actualCompletedWorkouts,
    exercises,
    settings.preferredWeightUnit,
    lang,
  ]);

  const handleStartTodayPlan = async () => {
    if (activeWorkout) {
      setCurrentSection('start-workout');
      return;
    }

    if (todayCalendarPlan) {
      await startNewWorkout({
        workoutType: todayCalendarPlan.workoutType,
        title: todayCalendarPlan.title,
        muscleGroups: todayCalendarPlan.muscleGroups,
        exerciseIds: todayCalendarPlan.exercises.map((e) => e.exerciseId),
        actualDate: todayStr,
        plannedWorkoutId: todayCalendarPlan.id,
      } as Parameters<typeof startNewWorkout>[0]);
      return;
    }

    if (isRestDay) {
      return;
    }

    if (todayPlan && todayPlan.workoutType !== 'rest') {
      await startNewWorkout({
        workoutType: todayPlan.workoutType,
        title: todayPlan.title,
        muscleGroups: todayPlan.muscleGroups,
        exerciseIds: todayPlan.assignedExerciseIds || [],
        actualDate: todayStr,
      });
      return;
    }

    await startNewWorkout({
      workoutType: 'strength',
      actualDate: todayStr,
    });
  };

  return (
    <div className="space-y-6">
      {/* HERO HEADER */}
      <div
        className={`rounded-2xl p-5 sm:p-6 border relative overflow-hidden ${
          isDark
            ? 'bg-gradient-to-br from-[hsl(240,5%,7.5%)] via-[hsl(240,5%,7.5%)] to-[hsl(240,5%,11%)] border-[hsl(240,4%,16%)]'
            : 'bg-white border-[hsl(40,10%,88%)] shadow-sm'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-1.5">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
                isDark
                  ? 'bg-[hsl(75,92%,56%)]/10 text-[hsl(75,92%,56%)] border-[hsl(75,92%,56%)]/25'
                  : 'bg-amber-100 text-amber-950 border-amber-300'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>{formatFullDate(todayStr, lang)}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
              {isArabic ? 'لوحة متابعة التمارين' : 'Personal Training Dashboard'}
            </h1>
            <p
              className={`text-sm ${
                isDark ? 'text-gray-400' : 'text-slate-600'
              }`}
            >
              {todayCalendarPlan ? (
                <>
                  <span>{isArabic ? 'الخطة المقترحة لليوم: ' : "Today's Scheduled Plan: "}</span>
                  <span className={`font-semibold ${isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'}`}>
                    {todayCalendarPlan.title}
                  </span>
                </>
              ) : todayPlan ? (
                <>
                  <span>{isArabic ? 'الخطة المقترحة لليوم: ' : "Today's Scheduled Plan: "}</span>
                  <span className={`font-semibold ${isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'}`}>
                    {todayPlan.title}
                  </span>
                </>
              ) : null}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {activeWorkout ? (
              <button
                onClick={() => setCurrentSection('start-workout')}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{t.resumeWorkout}</span>
              </button>
            ) : (
              <button
                onClick={handleStartTodayPlan}
                disabled={isRestDay && !todayCalendarPlan}
                className={`w-full sm:w-auto px-5 py-3 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isRestDay && !todayCalendarPlan
                    ? (isDark ? 'bg-[hsl(240,5%,15%)] text-gray-400 border border-[hsl(240,4%,20%)]' : 'bg-slate-200 text-slate-500 border border-slate-300')
                    : isDark
                    ? 'bg-[hsl(75,92%,56%)] hover:bg-[hsl(75,92%,50%)] text-[hsl(240,10%,9%)] shadow-[hsl(75,92%,56%)]/15'
                    : 'bg-[hsl(76,78%,42%)] hover:bg-[hsl(76,78%,37%)] text-white shadow-[hsl(76,78%,42%)]/15'
                }`}
              >
                {!isRestDay && <Play className="w-4 h-4 fill-current" />}
                <span>
                  {isRestDay && !todayCalendarPlan
                    ? (isArabic ? '🏖️ يوم راحة (Rest Day)' : '🏖️ Rest Day')
                    : t.startWorkout}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* باقي الـ Dashboard (KPIs, Charts, Recent Activity...) */}
      {/* ... (باقي كود الـ Dashboard تبقى كما هي بدون تغييرات جذرية) ... */}
    </div>
  );
};
