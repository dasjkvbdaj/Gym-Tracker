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
  Scale,
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

  const todayStr = toLocalDateString(new Date());
  const todayMeta = getDateMetadata(todayStr);
  const todayPlan = weeklySchedule.find(
    (d) => d.day === todayMeta.dayOfWeek
  );

  const isRestDay = todayPlan?.workoutType === 'rest';

  const weekRange = useMemo(
    () => getCurrentWeekRange(new Date()),
    []
  );

  // Get Latest Recorded Body Weight from localStorage
  const latestWeightRecord = useMemo(() => {
    try {
      const saved = localStorage.getItem('gym_tracker_weight_history');
      if (saved) {
        const history = JSON.parse(saved);
        if (Array.isArray(history) && history.length > 0) {
          return history[0]; // أحدث وزن مسجل
        }
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  // Core KPI Calculations from actual saved workouts
  const stats = useMemo(() => {
    const totalSessions = completedWorkouts.length;

    const workoutsThisWeek = completedWorkouts.filter(
      (w) =>
        w.actualDate >= weekRange.startOfWeek &&
        w.actualDate <= weekRange.endOfWeek
    ).length;

    const cardioSessions = completedWorkouts.filter(
      (w) =>
        w.workoutType === 'cardio' ||
        w.muscleGroups.includes('Cardio')
    ).length;

    return {
      totalSessions,
      workoutsThisWeek,
      cardioSessions,
    };
  }, [completedWorkouts, weekRange]);

  // Weekly Activity Chart Data (Mon - Sun)
  const weeklyChartData = useMemo(() => {
    return weekRange.weekDates.map(({ day, dateStr }) => {
      const dayWorkouts = completedWorkouts.filter(
        (w) => w.actualDate === dateStr
      );

      const totalSets = dayWorkouts.reduce((sum, w) => {
        const exSets = (w.exercises || []).reduce(
          (sAcc, ex) =>
            sAcc + (ex.sets ? ex.sets.length : 0),
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
  }, [completedWorkouts, weekRange, lang]);

  // Recent Exercise Progression
  const recentProgressions = useMemo(() => {
    if (completedWorkouts.length === 0) return [];

    const seenExerciseIds = new Set<string>();

    const items: ReturnType<
      typeof getExerciseProgressSummary
    >[] = [];

    for (const w of completedWorkouts) {
      for (const exEntry of w.exercises || []) {
        if (!seenExerciseIds.has(exEntry.exerciseId)) {
          seenExerciseIds.add(exEntry.exerciseId);

          const libEx = exercises.find(
            (e) => e.id === exEntry.exerciseId
          );

          const exName = libEx
            ? libEx.name
            : exEntry.exerciseNameSnapshot;

          const summary = getExerciseProgressSummary(
            exEntry.exerciseId,
            exName,
            completedWorkouts,
            settings.preferredWeightUnit,
            'all',
            lang
          );

          if (
            summary.currentSession &&
            summary.currentSession.bestWeightSet
          ) {
            items.push(summary);
          }
        }

        if (items.length >= 6) break;
      }

      if (items.length >= 6) break;
    }

    return items;
  }, [
    completedWorkouts,
    exercises,
    settings.preferredWeightUnit,
    lang,
  ]);

  const handleStartTodayPlan = async () => {
    if (activeWorkout) {
      setCurrentSection('start-workout');
      return;
    }

    if (isRestDay) {
      return;
    }

    if (todayPlan) {
      await startNewWorkout({
        workoutType: todayPlan.workoutType,
        title: todayPlan.title,
        muscleGroups: todayPlan.muscleGroups,
        exerciseIds: todayPlan.assignedExerciseIds,
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
              {lang === 'ar'
                ? 'لوحة متابعة التمارين'
                : 'Personal Training Dashboard'}
            </h1>

            <p
              className={`text-sm ${
                isDark ? 'text-gray-400' : 'text-slate-600'
              }`}
            >
              {todayPlan ? (
                <>
                  <span>
                    {lang === 'ar'
                      ? `خطة ${translateDayName(
                          todayMeta.dayOfWeek,
                          lang
                        )} المقترحة: `
                      : `${todayMeta.dayOfWeek}'s Scheduled Plan: `}
                  </span>

                  <span
                    className={`font-semibold ${
                      isDark
                        ? 'text-[hsl(75,92%,56%)]'
                        : 'text-[hsl(76,78%,42%)]'
                    }`}
                  >
                    {todayPlan.title}
                  </span>
                </>
              ) : null}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {activeWorkout ? (
              <button
                onClick={() =>
                  setCurrentSection('start-workout')
                }
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{t.resumeWorkout}</span>
              </button>
            ) : (
              <button
                onClick={handleStartTodayPlan}
                disabled={isRestDay}
                className={`w-full sm:w-auto px-5 py-3 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-[hsl(75,92%,56%)] hover:bg-[hsl(75,92%,50%)] text-[hsl(240,10%,9%)] shadow-[hsl(75,92%,56%)]/15'
                    : 'bg-[hsl(76,78%,42%)] hover:bg-[hsl(76,78%,37%)] text-white shadow-[hsl(76,78%,42%)]/15'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {isRestDay
                    ? lang === 'ar'
                      ? 'يوم راحة'
                      : 'Rest Day'
                    : t.startWorkout}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4 KPI SUMMARY CARDS (INCLUDING THE NEW 4TH WEIGHT BOX) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">

        {/* TOTAL SESSIONS */}
        <div
          className={`p-4 sm:p-5 rounded-xl border ${
            isDark
              ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
              : 'bg-white border-[hsl(40,10%,88%)] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-medium ${
                isDark ? 'text-gray-400' : 'text-slate-500'
              }`}
            >
              {t.totalSessions}
            </span>
            <div className="w-8 h-8 rounded-lg bg-[hsl(75,92%,56%)]/10 text-[hsl(75,92%,56%)] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 font-mono-num text-2xl sm:text-3xl font-bold">
            {stats.totalSessions}
          </div>
          <p
            className={`text-xs mt-1 ${
              isDark ? 'text-gray-500' : 'text-slate-400'
            }`}
          >
            {lang === 'ar' ? 'جلسات مكتملة ومسجلة' : 'Completed workouts saved'}
          </p>
        </div>

        {/* THIS WEEK */}
        <div
          className={`p-4 sm:p-5 rounded-xl border ${
            isDark
              ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
              : 'bg-white border-[hsl(40,10%,88%)] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-medium ${
                isDark ? 'text-gray-400' : 'text-slate-500'
              }`}
            >
              {t.thisWeek}
            </span>
            <div className="w-8 h-8 rounded-lg bg-[hsl(75,92%,56%)]/10 text-[hsl(75,92%,56%)] flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 font-mono-num text-2xl sm:text-3xl font-bold">
            {stats.workoutsThisWeek}
          </div>
          <p
            className={`text-xs mt-1 ${
              isDark ? 'text-gray-500' : 'text-slate-400'
            }`}
          >
            {lang === 'ar' ? 'خلال الأسبوع الحالي' : 'Recorded this week'}
          </p>
        </div>

        {/* CARDIO SESSIONS */}
        <div
          className={`p-4 sm:p-5 rounded-xl border ${
            isDark
              ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
              : 'bg-white border-[hsl(40,10%,88%)] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-medium ${
                isDark ? 'text-gray-400' : 'text-slate-500'
              }`}
            >
              {t.cardioSessions}
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 font-mono-num text-2xl sm:text-3xl font-bold">
            {stats.cardioSessions}
          </div>
          <p
            className={`text-xs mt-1 ${
              isDark ? 'text-gray-500' : 'text-slate-400'
            }`}
          >
            {lang === 'ar' ? 'إجمالي جلسات الكارديو' : 'Total cardio sessions'}
          </p>
        </div>

        {/* 4TH BOX: CURRENT BODY WEIGHT */}
        <div
          onClick={() => setCurrentSection('weight')}
          className={`p-4 sm:p-5 rounded-xl border cursor-pointer transition-all hover:border-[hsl(75,92%,56%)]/50 ${
            isDark
              ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
              : 'bg-white border-[hsl(40,10%,88%)] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-medium ${
                isDark ? 'text-gray-400' : 'text-slate-500'
              }`}
            >
              {lang === 'ar' ? 'وزن الجسم الحالي' : 'Current Body Weight'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 font-mono-num text-2xl sm:text-3xl font-bold flex items-baseline gap-1.5">
            {latestWeightRecord ? (
              <>
                <span>{latestWeightRecord.weight}</span>
                <span className="text-xs uppercase font-normal text-gray-400">
                  {latestWeightRecord.unit}
                </span>
              </>
            ) : (
              <span className="text-sm font-normal text-gray-400 italic">
                {lang === 'ar' ? 'لم يسجل بعد' : 'Not logged'}
              </span>
            )}
          </div>
          <p
            className={`text-xs mt-1 ${
              isDark ? 'text-gray-500' : 'text-slate-400'
            }`}
          >
            {latestWeightRecord
              ? latestWeightRecord.date
              : lang === 'ar'
              ? 'انقر لتسجيل الوزن'
              : 'Click to log weight'}
          </p>
        </div>

      </div>

      {/* LAST COMPLETED WORKOUT BANNER OR EMPTY STATE */}
      {completedWorkouts.length > 0 ? (
        <div
          className={`rounded-xl p-5 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isDark
              ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
              : 'bg-white border-[hsl(40,10%,88%)] shadow-xs'
          }`}
        >
          <div className="space-y-1">
            <div
              className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${
                isDark
                  ? 'text-[hsl(75,92%,56%)]'
                  : 'text-[hsl(76,78%,42%)]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>{t.lastCompletedWorkout}</span>
            </div>

            <h2 className="text-lg font-display font-bold">
              {completedWorkouts[0].title}
            </h2>

            <div
              className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${
                isDark ? 'text-gray-400' : 'text-slate-600'
              }`}
            >
              <span>
                {lang === 'ar' ? 'التاريخ:' : 'Date:'}{' '}
                <strong
                  className={
                    isDark ? 'text-gray-200' : 'text-slate-900'
                  }
                >
                  {formatFullDate(
                    completedWorkouts[0].actualDate,
                    lang
                  )}
                </strong>
              </span>

              {completedWorkouts[0].durationMinutes && (
                <span>
                  {lang === 'ar' ? 'المدة:' : 'Duration:'}{' '}
                  <strong className="font-mono-num">
                    {formatDurationMinutes(
                      completedWorkouts[0].durationMinutes,
                      lang
                    )}
                  </strong>
                </span>
              )}

              {completedWorkouts[0].workoutType === 'strength' && (
                <span>
                  {lang === 'ar' ? 'التمارين:' : 'Exercises:'}{' '}
                  <strong className="font-mono-num">
                    {completedWorkouts[0].exercises.length}
                  </strong>
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedCalendarDate(completedWorkouts[0].actualDate);
              setCurrentSection('calendar');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border self-start sm:self-center transition-colors cursor-pointer ${
              isDark
                ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-200 hover:border-[hsl(75,92%,56%)]/40'
                : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,88%)] text-slate-800 hover:bg-[hsl(40,15%,95%)]'
            }`}
          >
            <span>
              {lang === 'ar' ? 'عرض التفاصيل' : 'View Details'}
            </span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          className={`rounded-2xl p-6 sm:p-8 border text-center space-y-4 ${
            isDark
              ? 'bg-[hsl(240,5%,7.5%)]/80 border-dashed border-[hsl(240,4%,19%)]'
              : 'bg-white border-dashed border-[hsl(40,10%,85%)]'
          }`}
        >
          <div
            className={`w-12 h-12 rounded-2xl ${
              isDark
                ? 'bg-[hsl(75,92%,56%)]/10 border-[hsl(75,92%,56%)]/25 text-[hsl(75,92%,56%)]'
                : 'bg-[hsl(76,78%,42%)]/10 border-[hsl(76,78%,42%)]/25 text-[hsl(76,78%,42%)]'
            } border flex items-center justify-center mx-auto`}
          >
            <Dumbbell className="w-6 h-6" />
          </div>

          <div className="max-w-md mx-auto space-y-1.5">
            <h2 className="text-lg font-display font-bold">
              {t.noWorkoutsYet}
            </h2>
            <p
              className={`text-xs sm:text-sm ${
                isDark ? 'text-gray-400' : 'text-slate-600'
              }`}
            >
              {t.startFirstWorkoutDesc}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              onClick={handleStartTodayPlan}
              disabled={isRestDay}
              className={`px-5 py-2.5 rounded-xl font-display font-semibold text-sm flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isDark
                  ? 'bg-[hsl(75,92%,56%)] hover:bg-[hsl(75,92%,50%)] text-[hsl(240,10%,9%)]'
                  : 'bg-[hsl(76,78%,42%)] hover:bg-[hsl(76,78%,37%)] text-white'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {isRestDay
                  ? lang === 'ar'
                    ? 'يوم راحة'
                    : 'Rest Day'
                  : t.startWorkout}
              </span>
            </button>

            <button
              onClick={() => setCurrentSection('schedule')}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium border cursor-pointer ${
                isDark
                  ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-gray-300 hover:bg-[hsl(240,5%,14%)]'
                  : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,88%)] text-slate-700 hover:bg-[hsl(40,15%,95%)]'
              }`}
            >
              {lang === 'ar'
                ? 'استعراض جدول الأسبوع'
                : 'Explore Weekly Schedule'}
            </button>
          </div>
        </div>
      )}

      {/* MIDDLE GRID: WEEKLY ACTIVITY + WEEKLY SCHEDULE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* WEEKLY ACTIVITY CHART */}
        <div
          className={`lg:col-span-7 rounded-xl p-5 border flex flex-col justify-between ${
            isDark
              ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
              : 'bg-white border-[hsl(40,10%,88%)] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-display font-bold">
                {t.weeklyActivityChart}
              </h2>
              <p
                className={`text-xs ${
                  isDark ? 'text-gray-400' : 'text-slate-500'
                }`}
              >
                {lang === 'ar'
                  ? 'عدد المجموعات والجلسات المسجلة فعلياً خلال هذا الأسبوع'
                  : 'Actual recorded sets and sessions completed this week'}
              </p>
            </div>

            <span
              className={`text-xs font-mono-num px-2.5 py-1 rounded-lg ${
                isDark
                  ? 'bg-[hsl(75,92%,56%)]/10 text-[hsl(75,92%,56%)] border-[hsl(75,92%,56%)]/20'
                  : 'bg-[hsl(76,78%,42%)]/10 text-[hsl(76,78%,42%)] border-[hsl(76,78%,42%)]/20'
              } border`}
            >
              {formatShortDate(weekRange.startOfWeek, lang)} –{' '}
              {formatShortDate(weekRange.endOfWeek, lang)}
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyChartData}
                margin={{
                  top: 10,
                  right: 10,
                  left: -20,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={
                    isDark
                      ? 'hsl(240, 4%, 16%)'
                      : 'hsl(40, 10%, 88%)'
                  }
                  vertical={false}
                />
                <XAxis
                  dataKey="dayName"
                  tick={{
                    fill: isDark ? '#9CA3AF' : '#64748B',
                    fontSize: 12,
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{
                    fill: isDark ? '#9CA3AF' : '#64748B',
                    fontSize: 12,
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark
                      ? 'hsl(240, 5%, 7.5%)'
                      : '#FFFFFF',
                    borderColor: isDark
                      ? 'hsl(240, 4%, 19%)'
                      : 'hsl(40, 10%, 88%)',
                    borderRadius: '12px',
                    color: isDark ? '#F3F4F6' : '#0F172A',
                    fontSize: '12px',
                  }}
                  formatter={(value: unknown, name: unknown) => [
                    String(value),
                    name === 'sets'
                      ? lang === 'ar'
                        ? 'المجموعات المكتملة'
                        : 'Completed Sets'
                      : lang === 'ar'
                      ? 'الجلسات'
                      : 'Workout Sessions',
                  ]}
                />
                <Bar
                  dataKey="sets"
                  name="sets"
                  fill={
                    isDark
                      ? 'hsl(75, 92%, 56%)'
                      : 'hsl(76, 78%, 42%)'
                  }
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                />
                <Bar
                  dataKey="sessions"
                  name="sessions"
                  fill="#06B6D4"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* WEEKLY SCHEDULE OVERVIEW */}
        <div
          className={`lg:col-span-5 rounded-xl p-5 border flex flex-col justify-between ${
            isDark
              ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
              : 'bg-white border-[hsl(40,10%,88%)] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-display font-bold">
                {t.weeklySchedule}
              </h2>
              <p
                className={`text-xs ${
                  isDark ? 'text-gray-400' : 'text-slate-500'
                }`}
              >
                {lang === 'ar'
                  ? 'مرجع تخطيطي — يمكنك التمرين في أي يوم'
                  : 'Planning reference — train any workout on any day'}
              </p>
            </div>

            <button
              onClick={() => setCurrentSection('schedule')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ml-2 transition-colors cursor-pointer ${
                isDark
                  ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-[hsl(75,92%,56%)] hover:bg-[hsl(240,5%,14%)]'
                  : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,88%)] text-[hsl(76,78%,42%)] hover:bg-[hsl(40,15%,92%)]'
              }`}
            >
              {lang === 'ar' ? 'تعديل الجدول' : 'Customize'}
            </button>
          </div>

          <div className="space-y-2">
            {weeklySchedule.map((dayPlan) => {
              const isToday =
                dayPlan.day === todayMeta.dayOfWeek;

              return (
                <div
                  key={dayPlan.day}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-colors ${
                    isToday
                      ? isDark
                        ? 'bg-[hsl(75,92%,56%)]/10 border-[hsl(75,92%,56%)]/40'
                        : 'bg-[hsl(76,78%,42%)]/10 border-[hsl(76,78%,42%)]/30'
                      : isDark
                      ? 'bg-[hsl(240,5%,11%)]/60 border-[hsl(240,4%,16%)]'
                      : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,88%)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`font-display font-bold w-16 shrink-0 ${
                        isToday
                          ? isDark
                            ? 'text-[hsl(75,92%,56%)]'
                            : 'text-[hsl(76,78%,42%)]'
                          : isDark
                          ? 'text-gray-300'
                          : 'text-slate-700'
                      }`}
                    >
                      {translateDayName(
                        dayPlan.day,
                        lang,
                        true
                      )}
                    </span>
                    <span
                      className={`truncate font-medium ${
                        dayPlan.workoutType === 'rest'
                          ? 'text-gray-500 italic'
                          : dayPlan.workoutType === 'cardio'
                          ? 'text-cyan-400'
                          : isDark
                          ? 'text-gray-200'
                          : 'text-slate-800'
                      }`}
                    >
                      {dayPlan.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* BOTTOM GRID: RECENT ACTIVITY + PROGRESSION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* RECENT WORKOUT ACTIVITY */}
        <div
          className={`rounded-xl p-5 border ${
            isDark
              ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
              : 'bg-white border-[hsl(40,10%,88%)] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-display font-bold">
              {t.recentActivity}
            </h2>
            <button
              onClick={() => setCurrentSection('calendar')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-[hsl(75,92%,56%)] hover:bg-[hsl(240,5%,14%)]'
                  : 'bg-[hsl(40,15%,94%)] border-[hsl(40,10%,88%)] text-[hsl(76,78%,42%)] hover:bg-[hsl(40,15%,92%)]'
              }`}
            >
              {lang === 'ar' ? 'عرض الكل' : 'View All'}
            </button>
          </div>

          {completedWorkouts.length === 0 ? (
            <div
              className={`py-8 text-center text-xs ${
                isDark ? 'text-gray-500' : 'text-slate-400'
              }`}
            >
              {lang === 'ar'
                ? 'ستظهر أحدث تمارينك المكتملة هنا بمجرد حفظ أول تمرين.'
                : 'Your recent completed workouts will appear here once recorded.'}
            </div>
          ) : (
            <div className="space-y-3">
              {completedWorkouts.slice(0, 4).map((session) => {
                const totalSets = (session.exercises || []).reduce(
                  (acc, ex) => acc + (ex.sets ? ex.sets.length : 0),
                  0
                );

                return (
                  <div
                    key={session.id}
                    onClick={() => {
                      setSelectedCalendarDate(session.actualDate);
                      setCurrentSection('calendar');
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isDark
                        ? 'bg-[hsl(240,5%,11%)]/70 border-[hsl(240,4%,16%)] hover:border-[hsl(75,92%,56%)]/40'
                        : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,88%)] hover:border-[hsl(76,78%,42%)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              session.workoutType === 'cardio'
                                ? 'bg-cyan-400'
                                : isDark
                                ? 'bg-[hsl(75,92%,56%)]'
                                : 'bg-[hsl(76,78%,42%)]'
                            }`}
                          />
                          <h3 className="font-display font-semibold text-sm">
                            {session.title}
                          </h3>
                        </div>
                        <p
                          className={`text-xs mt-0.5 ${
                            isDark ? 'text-gray-400' : 'text-slate-500'
                          }`}
                        >
                          {formatFullDate(session.actualDate, lang)}
                        </p>
                      </div>

                      <div className="text-end font-mono-num text-xs">
                        {session.workoutType === 'cardio' ? (
                          <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                            {formatDurationMinutes(
                              session.cardioDetails?.durationMinutes ||
                                session.durationMinutes,
                              lang
                            )}
                          </span>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded ${
                              isDark
                                ? 'bg-[hsl(75,92%,56%)]/10 text-[hsl(75,92%,56%)] border-[hsl(75,92%,56%)]/25'
                                : 'bg-[hsl(76,78%,42%)]/10 text-[hsl(76,78%,42%)] border-[hsl(76,78%,42%)]/25'
                            } border`}
                          >
                            {session.exercises.length}{' '}
                            {lang === 'ar' ? 'تمارين' : 'ex'} • {totalSets}{' '}
                            {lang === 'ar' ? 'مجموعات' : 'sets'}
                          </span>
                        )}
                      </div>
                    </div>

                    {session.muscleGroups.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {session.muscleGroups.map((mg) => (
                          <span
                            key={mg}
                            className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                              isDark
                                ? 'bg-[hsl(240,5%,7.5%)] text-gray-300 border border-[hsl(240,4%,19%)]'
                                : 'bg-white text-slate-600 border border-[hsl(40,10%,88%)]'
                            }`}
                          >
                            {translateMuscleGroup(mg, lang)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RECENT EXERCISE PROGRESSION */}
        <div
          className={`rounded-xl p-5 border ${
            isDark
              ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
              : 'bg-white border-[hsl(40,10%,88%)] shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-display font-bold">
              {t.recentProgression}
            </h2>
            <button
              onClick={() => setCurrentSection('progress')}
              className={`text-xs font-semibold ${
                isDark
                  ? 'text-[hsl(75,92%,56%)]'
                  : 'text-[hsl(76,78%,42%)]'
              } hover:underline cursor-pointer`}
            >
              {lang === 'ar' ? 'تحليل التطور' : 'Full Progress'}
            </button>
          </div>

          {recentProgressions.length === 0 ? (
            <div
              className={`py-8 text-center text-xs ${
                isDark ? 'text-gray-500' : 'text-slate-400'
              }`}
            >
              {lang === 'ar'
                ? 'سجّل تمارينك لمشاهدة مقارنات الأوزان والعدات بين الجلسات.'
                : 'Record workouts to track weight and repetition progression across sessions.'}
            </div>
          ) : (
            <div className="space-y-3">
              {recentProgressions.map((prog) => {
                const cur = prog.currentSession!;
                const prev = prog.previousSession;

                return (
                  <div
                    key={prog.exerciseId}
                    onClick={() =>
                      openProgressForExercise(prog.exerciseId)
                    }
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isDark
                        ? 'bg-[hsl(240,5%,11%)]/70 border-[hsl(240,4%,16%)] hover:border-[hsl(75,92%,56%)]/40'
                        : 'bg-[hsl(40,15%,95%)] border-[hsl(40,10%,88%)] hover:border-[hsl(76,78%,42%)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-semibold text-sm">
                        {prog.exerciseName}
                      </span>
                      <span
                        className={`text-[11px] font-mono-num ${
                          isDark ? 'text-gray-400' : 'text-slate-500'
                        }`}
                      >
                        {formatShortDate(cur.actualDate, lang)}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            isDark ? 'text-gray-400' : 'text-slate-500'
                          }
                        >
                          {lang === 'ar' ? 'الأخير:' : 'Latest:'}
                        </span>
                        <span
                          className={`font-mono-num font-bold ${
                            isDark
                              ? 'text-[hsl(75,92%,56%)]'
                              : 'text-[hsl(76,78%,42%)]'
                          }`}
                        >
                          {cur.bestWeightSet
                            ? formatSetPerformance(
                                cur.bestWeightSet.weight,
                                cur.weightType,
                                cur.bestWeightSet.reps,
                                lang
                              )
                            : '—'}
                        </span>
                      </div>

                      {prev && prev.bestWeightSet ? (
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span
                            className={
                              isDark ? 'text-gray-500' : 'text-slate-400'
                            }
                          >
                            {lang === 'ar' ? 'السابق:' : 'Prev:'}
                          </span>
                          <span className="font-mono-num">
                            {formatSetPerformance(
                              prev.bestWeightSet.weight,
                              prev.weightType,
                              prev.bestWeightSet.reps,
                              lang
                            )}
                          </span>
                        </div>
                      ) : (
                        <span
                          className={`text-[11px] ${
                            isDark ? 'text-gray-500' : 'text-slate-400'
                          }`}
                        >
                          {lang === 'ar'
                            ? 'أول جلسة مسجلة'
                            : 'First logged session'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
