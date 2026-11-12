import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Award,
  Calendar,
  Dumbbell,
  Flame,
  TrendingUp,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useGym } from '../context/GymContext';
import { getExerciseProgressSummary } from '../services/progressService';
import { MuscleGroup } from '../types/workout';
import { formatFullDate, formatShortDate } from '../utils/dateUtils';
import { MUSCLE_GROUPS, translateMuscleGroup } from '../utils/i18n';
import {
  formatOriginalWeight,
  formatSetPerformance,
} from '../utils/unitConversion';

export const ProgressPage: React.FC = () => {
  const {
    exercises,
    completedWorkouts,
    settings,
    selectedProgressExerciseId,
    setSelectedProgressExerciseId,
  } = useGym();

  const lang = settings.language;
  const isDark = settings.theme === 'dark';

  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | 'ALL'>('ALL');
  const [timeframe, setTimeframe] = useState<'all' | 'month' | 'week'>('all');

  // Determine which exercises have recorded history
  const exercisesWithHistoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of completedWorkouts) {
      for (const entry of w.exercises || []) {
        map.set(entry.exerciseId, (map.get(entry.exerciseId) || 0) + 1);
      }
    }
    return map;
  }, [completedWorkouts]);

  // Filter exercises: Must match muscle filter AND have at least 1 recorded session (> 0 sessions)
  const filteredExercises = useMemo(() => {
    return exercises
      .filter((ex) => {
        const matchesMuscle = muscleFilter === 'ALL' || ex.muscleGroup === muscleFilter;
        const hasSessions = (exercisesWithHistoryCounts.get(ex.id) || 0) > 0;
        return matchesMuscle && hasSessions;
      })
      .sort((a, b) => {
        const countA = exercisesWithHistoryCounts.get(a.id) || 0;
        const countB = exercisesWithHistoryCounts.get(b.id) || 0;
        if (countB !== countA) return countB - countA;
        return a.name.localeCompare(b.name);
      });
  }, [exercises, muscleFilter, exercisesWithHistoryCounts]);

  // Ensure a valid exercise is selected when filter changes or exercises load
  useEffect(() => {
    if (filteredExercises.length > 0) {
      const hasCurrentValid = filteredExercises.some((e) => e.id === selectedProgressExerciseId);
      if (!hasCurrentValid) {
        setSelectedProgressExerciseId(filteredExercises[0].id);
      }
    } else {
      setSelectedProgressExerciseId('');
    }
  }, [filteredExercises, selectedProgressExerciseId, setSelectedProgressExerciseId]);

  const activeExercise = useMemo(() => {
    return (
      exercises.find((e) => e.id === selectedProgressExerciseId) ||
      filteredExercises[0] ||
      null
    );
  }, [exercises, selectedProgressExerciseId, filteredExercises]);

  const progressSummary = useMemo(() => {
    if (!activeExercise) return null;
    return getExerciseProgressSummary(
      activeExercise.id,
      activeExercise.name,
      completedWorkouts,
      settings.preferredWeightUnit,
      timeframe,
      lang
    );
  }, [
    activeExercise,
    completedWorkouts,
    settings.preferredWeightUnit,
    timeframe,
    lang,
  ]);

  const chartData = useMemo(() => {
    if (!progressSummary) return [];
    return progressSummary.historyChronological.map((rec) => {
      const originalWeight = rec.bestWeightSet?.weight ?? 0;
      const bestSetDisplay = rec.bestWeightSet
        ? formatSetPerformance(
            rec.bestWeightSet.weight,
            rec.weightType,
            rec.bestWeightSet.reps,
            lang
          )
        : '—';

      return {
        date: rec.formattedDate,
        actualDate: rec.actualDate,
        weightValue: rec.normalizedBestWeight,
        originalWeight,
        bestSetDisplay,
        maxReps: rec.maxReps,
        totalSets: rec.totalSets,
        totalCalories: rec.totalCalories,
      };
    });
  }, [progressSummary, lang]);

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold tracking-tight">
            {lang === 'ar' ? 'متابعة التطور والأوزان' : 'Exercise Strength & Repetition Progress'}
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
            {lang === 'ar'
              ? 'مقارنة دقيقة للأوزان والعدات لكل تمرين مع دعم تمارين الكارديو ووزن الجسم.'
              : 'Track weight progression, repetition improvements, and cardio milestones per exercise.'}
          </p>
        </div>

        {/* Timeframe Selector */}
        <div
          className={`inline-flex rounded-xl p-1 border self-start sm:self-auto ${
            isDark
              ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
              : 'bg-white border-[hsl(40,10%,88%)]'
          }`}
        >
          {(
            [
              { id: 'all', label: lang === 'ar' ? 'كل الأوقات' : 'All Time' },
              { id: 'month', label: lang === 'ar' ? 'شهري' : 'Monthly' },
              { id: 'week', label: lang === 'ar' ? 'أسبوعي' : 'Weekly' },
            ] as const
          ).map((tf) => (
            <button
              key={tf.id}
              onClick={() => setTimeframe(tf.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                timeframe === tf.id
                  ? isDark
                    ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)] shadow-xs'
                    : 'bg-[hsl(76,78%,42%)] text-white shadow-xs'
                  : isDark
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* EXERCISE SELECTOR BAR */}
      <div
        className={`p-4 rounded-2xl border space-y-3.5 ${
          isDark
            ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
            : 'bg-white border-[hsl(40,10%,88%)] shadow-2xs'
        }`}
      >
        {/* Muscle Group Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setMuscleFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${
              muscleFilter === 'ALL'
                ? isDark
                  ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)]'
                  : 'bg-[hsl(76,78%,42%)] text-white'
                : isDark
                ? 'bg-[hsl(240,5%,11%)] text-gray-300'
                : 'bg-[hsl(40,15%,94%)] text-slate-700'
            }`}
          >
            {lang === 'ar' ? 'الكل' : 'All Groups'}
          </button>
          {MUSCLE_GROUPS.map((mg) => (
            <button
              key={mg}
              onClick={() => setMuscleFilter(mg)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${
                muscleFilter === mg
                  ? isDark
                    ? 'bg-[hsl(75,92%,56%)] text-[hsl(240,10%,9%)]'
                    : 'bg-[hsl(76,78%,42%)] text-white'
                  : isDark
                  ? 'bg-[hsl(240,5%,11%)] text-gray-300'
                  : 'bg-[hsl(40,15%,94%)] text-slate-700'
              }`}
            >
              {translateMuscleGroup(mg, lang)}
            </button>
          ))}
        </div>

        {/* Exercise Selector Dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label htmlFor="progress-exercise-select" className="text-xs font-semibold shrink-0">
            {lang === 'ar' ? 'اختر التمرين للمقارنة:' : 'Select Exercise:'}
          </label>
          <select
            id="progress-exercise-select"
            value={activeExercise?.id || ''}
            onChange={(e) => setSelectedProgressExerciseId(e.target.value)}
            className={`flex-1 px-3.5 py-2.5 rounded-xl font-display font-bold text-sm border focus:outline-none ${
              isDark
                ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-white focus:border-[hsl(75,92%,56%)]'
                : 'bg-[hsl(40,20%,97.5%)] border-[hsl(40,10%,85%)] text-slate-900 focus:border-[hsl(76,78%,42%)]'
            }`}
          >
            {filteredExercises.length === 0 ? (
              <option value="" disabled>
                {lang === 'ar' ? 'لا توجد تمارين مسجلة لهذه العضلة' : 'No recorded exercises for this filter'}
              </option>
            ) : (
              filteredExercises.map((ex) => {
                const cnt = exercisesWithHistoryCounts.get(ex.id) || 0;
                return (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} ({translateMuscleGroup(ex.muscleGroup, lang)}) — {cnt}{' '}
                    {lang === 'ar' ? 'جلسات مسجلة' : 'sessions'}
                  </option>
                );
              })
            )}
          </select>
        </div>
      </div>

      {/* IF NO SESSIONS FOR SELECTED EXERCISE */}
      {!activeExercise || !progressSummary || progressSummary.totalSessions === 0 ? (
        <div
          className={`p-10 rounded-2xl border border-dashed text-center space-y-3 ${
            isDark ? 'border-[hsl(240,4%,19%)] text-gray-400' : 'border-[hsl(40,10%,85%)] text-slate-500'
          }`}
        >
          <TrendingUp className="w-8 h-8 mx-auto opacity-40" />
          <h3 className="font-display font-bold text-base">
            {lang === 'ar'
              ? `لا توجد سجلات بعد لتمرين "${activeExercise?.name || ''}"`
              : `No Recorded Sessions Yet for "${activeExercise?.name || ''}"`}
          </h3>
          <p className="text-xs max-w-md mx-auto">
            {lang === 'ar'
              ? 'قم بتسجيل هذا التمرين في جلسة تمرين مكتملة لعرض مقارنات الأداء والمخططات البيانية.'
              : 'Record sets for this exercise inside a workout session to unlock performance charts and comparisons.'}
          </p>
        </div>
      ) : (
        <>
          {/* TOP SUMMARY CARDS (2 Cards for Cardio, 4 Cards for Strength/Bodyweight) */}
          <div
            className={`grid gap-3.5 sm:gap-4 ${
              progressSummary.isCardio
                ? 'grid-cols-1 sm:grid-cols-2'
                : 'grid-cols-2 lg:grid-cols-4'
            }`}
          >
            {/* Best Weight / Duration Card */}
            <div
              className={`p-4 sm:p-5 rounded-xl border ${
                isDark
                  ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
                  : 'bg-white border-[hsl(40,10%,88%)] shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>
                  {progressSummary.isCardio
                    ? lang === 'ar'
                      ? 'أقصى مدة تمرين'
                      : 'Max Duration'
                    : lang === 'ar'
                    ? 'أعلى وزن مسجل'
                    : 'Best Recorded Weight'}
                </span>
                <Award
                  className={`w-4 h-4 ${
                    isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
                  }`}
                />
              </div>
              <div
                className={`mt-2 font-mono-num text-xl sm:text-2xl font-bold ${
                  isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
                }`}
              >
                {progressSummary.isCardio
                  ? `${progressSummary.bestRepsRecord?.reps || 0} ${
                      lang === 'ar' ? 'دقيقة' : 'mins'
                    }`
                  : progressSummary.bestWeightRecord
                  ? formatOriginalWeight(
                      progressSummary.bestWeightRecord.weight,
                      progressSummary.bestWeightRecord.unit,
                      lang
                    )
                  : '—'}
              </div>
              {progressSummary.bestWeightRecord && !progressSummary.isCardio && (
                <p className="text-[11px] text-gray-400 mt-1 font-mono-num">
                  × {progressSummary.bestWeightRecord.reps}{' '}
                  {lang === 'ar' ? 'عدات' : 'reps'} (
                  {formatShortDate(progressSummary.bestWeightRecord.actualDate, lang)})
                </p>
              )}
            </div>

            {/* Best Reps Card (Hidden for Cardio) */}
            {!progressSummary.isCardio && (
              <div
                className={`p-4 sm:p-5 rounded-xl border ${
                  isDark
                    ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
                    : 'bg-white border-[hsl(40,10%,88%)] shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{lang === 'ar' ? 'أعلى عدد عدات' : 'Best Repetition Set'}</span>
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="mt-2 font-mono-num text-xl sm:text-2xl font-bold text-cyan-400">
                  {progressSummary.bestRepsRecord
                    ? `${progressSummary.bestRepsRecord.reps} ${
                        lang === 'ar' ? 'عدات' : 'reps'
                      }`
                    : '—'}
                </div>
                {progressSummary.bestRepsRecord && (
                  <p className="text-[11px] text-gray-400 mt-1 font-mono-num">
                    @{' '}
                    {formatOriginalWeight(
                      progressSummary.bestRepsRecord.weight,
                      progressSummary.bestRepsRecord.unit,
                      lang
                    )}{' '}
                    ({formatShortDate(progressSummary.bestRepsRecord.actualDate, lang)})
                  </p>
                )}
              </div>
            )}

            {/* Most Recent Performance (Hidden for Cardio) */}
            {!progressSummary.isCardio && (
              <div
                className={`p-4 sm:p-5 rounded-xl border ${
                  isDark
                    ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
                    : 'bg-white border-[hsl(40,10%,88%)] shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{lang === 'ar' ? 'الأداء الأخير' : 'Most Recent Session'}</span>
                  <Dumbbell
                    className={`w-4 h-4 ${
                      isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
                    }`}
                  />
                </div>
                <div className="mt-2 font-mono-num text-base sm:text-lg font-bold">
                  {progressSummary.currentSession?.bestWeightSet
                    ? formatSetPerformance(
                        progressSummary.currentSession.bestWeightSet.weight,
                        progressSummary.currentSession.weightType,
                        progressSummary.currentSession.bestWeightSet.reps,
                        lang
                      )
                    : '—'}
                </div>
                {progressSummary.currentSession && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    {formatShortDate(progressSummary.currentSession.actualDate, lang)}
                  </p>
                )}
              </div>
            )}

            {/* Workout Frequency */}
            <div
              className={`p-4 sm:p-5 rounded-xl border ${
                isDark
                  ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
                  : 'bg-white border-[hsl(40,10%,88%)] shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{lang === 'ar' ? 'عدد مرات التمرين' : 'Workout Frequency'}</span>
                <Activity className="w-4 h-4 text-purple-400" />
              </div>
              <div className="mt-2 font-mono-num text-xl sm:text-2xl font-bold">
                {progressSummary.totalSessions}{' '}
                <span className="text-xs font-normal text-gray-400">
                  {lang === 'ar' ? 'جلسات' : 'sessions'}
                </span>
              </div>
              {progressSummary.lastPerformedDate && (
                <p className="text-[11px] text-gray-400 mt-1">
                  {lang === 'ar' ? 'آخر مرة:' : 'Last:'}{' '}
                  {formatShortDate(progressSummary.lastPerformedDate, lang)}
                </p>
              )}
            </div>
          </div>

          {/* SESSION COMPARISON SPOTLIGHT (Hidden for Cardio) */}
          {!progressSummary.isCardio && (
            <div
              className={`rounded-2xl border p-5 sm:p-6 ${
                isDark
                  ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
                  : 'bg-white border-[hsl(40,10%,88%)] shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-inherit">
                <div>
                  <h2 className="text-base sm:text-lg font-display font-bold">
                    {activeExercise.name} —{' '}
                    {lang === 'ar'
                      ? 'مقارنة الجلسة الحالية مع الجلسة السابقة'
                      : 'Previous vs. Current Session Comparison'}
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                {/* Previous Session */}
                <div
                  className={`p-4 rounded-xl border ${
                    isDark
                      ? 'bg-[hsl(240,5%,11%)]/60 border-[hsl(240,4%,19%)]'
                      : 'bg-[hsl(40,20%,97.5%)] border-[hsl(40,10%,88%)]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span className="font-semibold uppercase">
                      {lang === 'ar' ? 'الجلسة السابقة' : 'Previous Session'}
                    </span>
                    {progressSummary.previousSession && (
                      <span className="font-mono-num">
                        {formatFullDate(progressSummary.previousSession.actualDate, lang)}
                      </span>
                    )}
                  </div>
                  {progressSummary.previousSession && progressSummary.previousSession.bestWeightSet ? (
                    <div className="space-y-2">
                      <div className="font-mono-num text-lg font-bold">
                        {formatSetPerformance(
                          progressSummary.previousSession.bestWeightSet.weight,
                          progressSummary.previousSession.weightType,
                          progressSummary.previousSession.bestWeightSet.reps,
                          lang
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 py-3">
                      {lang === 'ar' ? 'لا توجد جلسة سابقة للمقارنة بعد.' : 'No prior session recorded.'}
                    </p>
                  )}
                </div>

                {/* Current Session */}
                <div
                  className={`p-4 rounded-xl border ${
                    isDark
                      ? 'bg-[hsl(75,92%,56%)]/10 border-[hsl(75,92%,56%)]/40'
                      : 'bg-[hsl(76,78%,42%)]/5 border-[hsl(76,78%,42%)]/30'
                  }`}
                >
                  <div
                    className={`flex items-center justify-between text-xs mb-2 ${
                      isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
                    }`}
                  >
                    <span className="font-bold uppercase flex items-center gap-1">
                      <ArrowRight className="w-3.5 h-3.5" />
                      {lang === 'ar' ? 'الجلسة الحالية (الأحدث)' : 'Current Session (Latest)'}
                    </span>
                    {progressSummary.currentSession && (
                      <span className="font-mono-num">
                        {formatFullDate(progressSummary.currentSession.actualDate, lang)}
                      </span>
                    )}
                  </div>
                  {progressSummary.currentSession && progressSummary.currentSession.bestWeightSet ? (
                    <div className="space-y-2">
                      <div
                        className={`font-mono-num text-lg font-bold ${
                          isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
                        }`}
                      >
                        {formatSetPerformance(
                          progressSummary.currentSession.bestWeightSet.weight,
                          progressSummary.currentSession.weightType,
                          progressSummary.currentSession.bestWeightSet.reps,
                          lang
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {!progressSummary.isBodyweightOnly && !progressSummary.isCardio && (
              <div
                className={`rounded-2xl border p-5 ${
                  isDark
                    ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
                    : 'bg-white border-[hsl(40,10%,88%)] shadow-xs'
                }`}
              >
                <div className="mb-4">
                  <h3 className="font-display font-bold text-base">
                    {lang === 'ar' ? 'مخطط تطور الأوزان عبر الجلسات' : 'Weight Progression Over Time'}
                  </h3>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDark ? 'hsl(240, 4%, 16%)' : 'hsl(40, 10%, 88%)}'}
                      />
                      <XAxis dataKey="date" tick={{ fill: isDark ? '#9CA3AF' : '#64748B', fontSize: 11 }} />
                      <YAxis tick={{ fill: isDark ? '#9CA3AF' : '#64748B', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? 'hsl(240, 5%, 7.5%)' : 'hsl(0, 0%, 100%)',
                          borderColor: isDark ? 'hsl(240, 4%, 19%)' : 'hsl(40, 10%, 88%)',
                          borderRadius: '12px',
                          fontSize: '12px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="weightValue"
                        stroke={isDark ? 'hsl(75, 92%, 56%)' : 'hsl(76, 78%, 42%)'}
                        strokeWidth={3}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div
              className={`rounded-2xl border p-5 ${
                progressSummary.isBodyweightOnly || progressSummary.isCardio ? 'lg:col-span-2' : ''
              } ${
                isDark
                  ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
                  : 'bg-white border-[hsl(40,10%,88%)] shadow-xs'
              }`}
            >
              <div className="mb-4">
                <h3 className="font-display font-bold text-base">
                  {progressSummary.isCardio
                    ? lang === 'ar'
                      ? 'مخطط المدة والزمن (دقائق) عبر الجلسات'
                      : 'Duration Progression Over Time (Minutes)'
                    : lang === 'ar'
                    ? 'مخطط تطور العدات (Repetitions)'
                    : 'Repetition Progression Over Time'}
                </h3>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? 'hsl(240, 4%, 16%)' : 'hsl(40, 10%, 88%)}'}
                    />
                    <XAxis dataKey="date" tick={{ fill: isDark ? '#9CA3AF' : '#64748B', fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fill: isDark ? '#9CA3AF' : '#64748B', fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: any) => [
                        progressSummary.isCardio
                          ? `${value} ${lang === 'ar' ? 'دقيقة' : 'mins'}`
                          : value,
                        progressSummary.isCardio
                          ? lang === 'ar'
                            ? 'المدة'
                            : 'Duration'
                          : lang === 'ar'
                          ? 'العدات'
                          : 'Reps',
                      ]}
                      contentStyle={{
                        backgroundColor: isDark ? 'hsl(240, 5%, 7.5%)' : 'hsl(0, 0%, 100%)',
                        borderColor: isDark ? 'hsl(240, 4%, 19%)' : 'hsl(40, 10%, 88%)',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="maxReps"
                      stroke="#06B6D4"
                      strokeWidth={3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* HISTORICAL LOG */}
          <div
            className={`rounded-2xl border p-5 space-y-4 ${
              isDark
                ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
                : 'bg-white border-[hsl(40,10%,88%)] shadow-xs'
            }`}
          >
            <h3 className="font-display font-bold text-base">
              {lang === 'ar'
                ? `جميع الجلسات التاريخية لتمرين "${activeExercise.name}"`
                : `Historical Performance Log for ${activeExercise.name}`}
            </h3>
            <div className="space-y-3">
              {[...progressSummary.historyChronological].reverse().map((rec) => (
                <div
                  key={`${rec.workoutId}_${rec.actualDate}`}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isDark
                      ? 'bg-[hsl(240,5%,11%)]/70 border-[hsl(240,4%,19%)]'
                      : 'bg-[hsl(40,20%,97.5%)] border-[hsl(40,10%,88%)]'
                  }`}
                >
                  <div className="space-y-1">
                    <div
                      className={`flex items-center gap-2 text-xs font-semibold ${
                        isDark ? 'text-[hsl(75,92%,56%)]' : 'text-[hsl(76,78%,42%)]'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatFullDate(rec.actualDate, lang)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {progressSummary.isCardio ? (
                      <div className="flex items-center gap-3 text-xs font-mono-num font-semibold">
                        <span className="flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-orange-400" />
                          {rec.totalCalories} kcal
                        </span>
                        <span>
                          {rec.maxReps} {lang === 'ar' ? 'دقائق' : 'mins'}
                        </span>
                      </div>
                    ) : (
                      rec.sets.map((s) => (
                        <span
                          key={s.id}
                          className={`px-2.5 py-1 rounded-lg font-mono-num text-xs font-semibold border ${
                            isDark
                              ? 'bg-[hsl(240,6%,4%)] border-[hsl(240,4%,19%)] text-gray-200'
                              : 'bg-white border-[hsl(40,10%,88%)] text-slate-800'
                          }`}
                        >
                          #{s.setNumber}:{' '}
                          {formatSetPerformance(s.weight, rec.weightType, s.reps, lang)}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
