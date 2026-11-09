import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Award,
  Calendar,
  Dumbbell,
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

  const filteredExercises = useMemo(() => {
    return exercises
      .filter((ex) => muscleFilter === 'ALL' || ex.muscleGroup === muscleFilter)
      .sort((a, b) => {
        const countA = exercisesWithHistoryCounts.get(a.id) || 0;
        const countB = exercisesWithHistoryCounts.get(b.id) || 0;
        if (countB !== countA) return countB - countA;
        return a.name.localeCompare(b.name);
      });
  }, [exercises, muscleFilter, exercisesWithHistoryCounts]);

  // Ensure a valid exercise is selected
  useEffect(() => {
    if (
      !selectedProgressExerciseId ||
      !exercises.some((e) => e.id === selectedProgressExerciseId)
    ) {
      // Pick first exercise with history, or first exercise overall
      const firstWithHistory = exercises.find(
        (e) => (exercisesWithHistoryCounts.get(e.id) || 0) > 0
      );
      const fallback = firstWithHistory || exercises[0];
      if (fallback) {
        setSelectedProgressExerciseId(fallback.id);
      }
    }
  }, [
    exercises,
    selectedProgressExerciseId,
    exercisesWithHistoryCounts,
    setSelectedProgressExerciseId,
  ]);

  const activeExercise = useMemo(() => {
    return (
      exercises.find((e) => e.id === selectedProgressExerciseId) ||
      filteredExercises[0] ||
      exercises[0]
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

  // Prepare Chart Data (preserving original unit labels in tooltips)
  const chartData = useMemo(() => {
    if (!progressSummary) return [];
    return progressSummary.historyChronological.map((rec) => {
      const originalWeight = rec.bestWeightSet?.weight ?? 0;
      const originalUnit = rec.weightType;
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
        // If all sessions use the same unit, plot originalWeight; if mixed units exist, plot normalizedWeight for accurate curve while displaying original in tooltip
        weightValue: rec.normalizedBestWeight,
        originalWeight,
        originalUnit,
        bestSetDisplay,
        maxReps: rec.maxReps,
        totalSets: rec.totalSets,
      };
    });
  }, [progressSummary, lang]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
            {lang === 'ar'
              ? 'متابعة التطور والأوزان'
              : 'Exercise Strength & Repetition Progress'}
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
            {lang === 'ar'
              ? 'مقارنة دقيقة للأوزان والعدات لكل تمرين على حدة مع الحفاظ على الوحدات الأصلية (kg / lbs).'
              : 'Track weight progression, repetition improvements, and session-to-session comparisons per exercise.'}
          </p>
        </div>

        {/* Timeframe Selector: All Time | Monthly | Weekly */}
        <div
          className={`inline-flex rounded-xl p-1 border self-start sm:self-auto ${
            isDark ? 'bg-[#121721] border-[#1F2937]' : 'bg-white border-slate-200'
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
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
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
          isDark ? 'bg-[#121721] border-[#1F2937]' : 'bg-white border-slate-200 shadow-2xs'
        }`}
      >
        {/* Muscle Group Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setMuscleFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${
              muscleFilter === 'ALL'
                ? 'bg-emerald-500 text-slate-950'
                : isDark
                ? 'bg-[#181F2C] text-gray-300'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {lang === 'ar' ? 'الكل' : 'All Groups'}
          </button>
          {MUSCLE_GROUPS.filter((m) => m !== 'Cardio').map((mg) => (
            <button
              key={mg}
              onClick={() => setMuscleFilter(mg)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${
                muscleFilter === mg
                  ? 'bg-emerald-500 text-slate-950'
                  : isDark
                  ? 'bg-[#181F2C] text-gray-300'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {translateMuscleGroup(mg, lang)}
            </button>
          ))}
        </div>

        {/* Exercise Selector Dropdown + Quick Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label
            htmlFor="progress-exercise-select"
            className="text-xs font-semibold shrink-0"
          >
            {lang === 'ar' ? 'اختر التمرين للمقارنة:' : 'Select Exercise:'}
          </label>
          <select
            id="progress-exercise-select"
            value={activeExercise?.id || ''}
            onChange={(e) => setSelectedProgressExerciseId(e.target.value)}
            className={`flex-1 px-3.5 py-2.5 rounded-xl font-display font-bold text-sm border focus:outline-none focus:border-emerald-500 ${
              isDark
                ? 'bg-[#181F2C] border-[#2D3748] text-white'
                : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            {filteredExercises.map((ex) => {
              const cnt = exercisesWithHistoryCounts.get(ex.id) || 0;
              return (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({ex.muscleGroup}) — {cnt}{' '}
                  {lang === 'ar' ? 'جلسات مسجلة' : 'sessions'}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* IF NO SESSIONS FOR SELECTED EXERCISE */}
      {!progressSummary || progressSummary.totalSessions === 0 ? (
        <div
          className={`p-10 rounded-2xl border border-dashed text-center space-y-3 ${
            isDark ? 'border-[#2D3748] text-gray-400' : 'border-slate-300 text-slate-500'
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
              ? 'قم بتسجيل هذا التمرين في جلسة تمرين مكتملة لعرض مقارنات الأوزان والعدات والمخططات البيانية.'
              : 'Record sets for this exercise inside a workout session to unlock weight and repetition progression charts and comparisons.'}
          </p>
        </div>
      ) : (
        <>
          {/* TOP 4 SUMMARY CARDS FOR THIS EXERCISE */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {/* Best Weight Recorded */}
            <div
              className={`p-4 sm:p-5 rounded-xl border ${
                isDark
                  ? 'bg-[#121721] border-[#1F2937]'
                  : 'bg-white border-slate-200 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>
                  {lang === 'ar' ? 'أعلى وزن مسجل' : 'Best Recorded Weight'}
                </span>
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 font-mono-num text-xl sm:text-2xl font-bold text-emerald-400">
                {progressSummary.bestWeightRecord
                  ? formatOriginalWeight(
                      progressSummary.bestWeightRecord.weight,
                      progressSummary.bestWeightRecord.unit,
                      lang
                    )
                  : '—'}
              </div>
              {progressSummary.bestWeightRecord && (
                <p className="text-[11px] text-gray-400 mt-1 font-mono-num">
                  × {progressSummary.bestWeightRecord.reps}{' '}
                  {lang === 'ar' ? 'عدات' : 'reps'} (
                  {formatShortDate(
                    progressSummary.bestWeightRecord.actualDate,
                    lang
                  )}
                  )
                </p>
              )}
            </div>

            {/* Best Repetition Performance */}
            <div
              className={`p-4 sm:p-5 rounded-xl border ${
                isDark
                  ? 'bg-[#121721] border-[#1F2937]'
                  : 'bg-white border-slate-200 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>
                  {lang === 'ar' ? 'أعلى عدد عدات' : 'Best Repetition Set'}
                </span>
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
                  (
                  {formatShortDate(
                    progressSummary.bestRepsRecord.actualDate,
                    lang
                  )}
                  )
                </p>
              )}
            </div>

            {/* Most Recent Performance */}
            <div
              className={`p-4 sm:p-5 rounded-xl border ${
                isDark
                  ? 'bg-[#121721] border-[#1F2937]'
                  : 'bg-white border-slate-200 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>
                  {lang === 'ar' ? 'الأداء الأخير' : 'Most Recent Session'}
                </span>
                <Dumbbell className="w-4 h-4 text-emerald-400" />
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
                  {formatShortDate(
                    progressSummary.currentSession.actualDate,
                    lang
                  )}
                </p>
              )}
            </div>

            {/* Workout Frequency */}
            <div
              className={`p-4 sm:p-5 rounded-xl border ${
                isDark
                  ? 'bg-[#121721] border-[#1F2937]'
                  : 'bg-white border-slate-200 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>
                  {lang === 'ar' ? 'عدد مرات التمرين' : 'Workout Frequency'}
                </span>
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

          {/* SESSION-TO-SESSION COMPARISON SPOTLIGHT (PREVIOUS VS CURRENT) */}
          <div
            className={`rounded-2xl border p-5 sm:p-6 ${
              isDark
                ? 'bg-[#121721] border-[#1F2937]'
                : 'bg-white border-slate-200 shadow-xs'
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
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  {lang === 'ar'
                    ? 'يتم الحفاظ على الوحدات الأصلية المسجلة (kg أو lbs أو وزن الجسم) لكل جلسة.'
                    : 'Original entered units (kg, lbs, or Bodyweight) are preserved for every historical session.'}
                </p>
              </div>

              {progressSummary.comparisonDelta && (
                <div className="flex items-center gap-2 self-start sm:self-center">
                  {progressSummary.comparisonDelta.sameUnit &&
                  progressSummary.comparisonDelta.weightDiffOriginal !== null ? (
                    <span
                      className={`px-3 py-1 rounded-lg font-mono-num text-xs font-bold border ${
                        progressSummary.comparisonDelta.weightDiffOriginal > 0
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : progressSummary.comparisonDelta.weightDiffOriginal < 0
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : 'bg-gray-500/15 text-gray-300 border-gray-500/30'
                      }`}
                    >
                      {progressSummary.comparisonDelta.weightDiffOriginal > 0
                        ? `+${progressSummary.comparisonDelta.weightDiffOriginal}`
                        : progressSummary.comparisonDelta.weightDiffOriginal}{' '}
                      {progressSummary.comparisonDelta.unitLabel}
                    </span>
                  ) : !progressSummary.comparisonDelta.sameUnit ? (
                    <span className="px-3 py-1 rounded-lg font-mono-num text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {progressSummary.comparisonDelta.weightDiffNormalized > 0
                        ? `+${progressSummary.comparisonDelta.weightDiffNormalized}`
                        : progressSummary.comparisonDelta.weightDiffNormalized}{' '}
                      {settings.preferredWeightUnit} (converted)
                    </span>
                  ) : null}

                  <span
                    className={`px-3 py-1 rounded-lg font-mono-num text-xs font-bold border ${
                      progressSummary.comparisonDelta.repsDiff > 0
                        ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                        : 'bg-gray-500/15 text-gray-300 border-gray-500/30'
                    }`}
                  >
                    {progressSummary.comparisonDelta.repsDiff > 0
                      ? `+${progressSummary.comparisonDelta.repsDiff}`
                      : progressSummary.comparisonDelta.repsDiff}{' '}
                    {lang === 'ar' ? 'عدات' : 'reps'}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              {/* Previous Session Card */}
              <div
                className={`p-4 rounded-xl border ${
                  isDark
                    ? 'bg-[#181F2C]/60 border-[#2D3748]'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                  <span className="font-semibold uppercase">
                    {lang === 'ar' ? 'الجلسة السابقة' : 'Previous Session'}
                  </span>
                  {progressSummary.previousSession && (
                    <span className="font-mono-num">
                      {formatFullDate(
                        progressSummary.previousSession.actualDate,
                        lang
                      )}
                    </span>
                  )}
                </div>

                {progressSummary.previousSession &&
                progressSummary.previousSession.bestWeightSet ? (
                  <div className="space-y-2">
                    <div className="font-mono-num text-lg font-bold">
                      {formatSetPerformance(
                        progressSummary.previousSession.bestWeightSet.weight,
                        progressSummary.previousSession.weightType,
                        progressSummary.previousSession.bestWeightSet.reps,
                        lang
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {progressSummary.previousSession.sets.map((s) => (
                        <span
                          key={s.id}
                          className={`text-[11px] font-mono-num px-2 py-0.5 rounded border ${
                            isDark
                              ? 'bg-[#121721] border-[#2D3748] text-gray-300'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          #{s.setNumber}:{' '}
                          {formatSetPerformance(
                            s.weight,
                            progressSummary.previousSession!.weightType,
                            s.reps,
                            lang
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 py-3">
                    {lang === 'ar'
                      ? 'لا توجد جلسة سابقة للمقارنة بعد (تم تسجيل جلسة واحدة فقط).'
                      : 'No prior session recorded before the current one.'}
                  </p>
                )}
              </div>

              {/* Current (Most Recent) Session Card */}
              <div
                className={`p-4 rounded-xl border ${
                  isDark
                    ? 'bg-emerald-500/10 border-emerald-500/40'
                    : 'bg-emerald-50/70 border-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-emerald-400 mb-2">
                  <span className="font-bold uppercase flex items-center gap-1">
                    <ArrowRight className="w-3.5 h-3.5" />
                    {lang === 'ar' ? 'الجلسة الحالية (الأحدث)' : 'Current Session (Latest)'}
                  </span>
                  {progressSummary.currentSession && (
                    <span className="font-mono-num">
                      {formatFullDate(
                        progressSummary.currentSession.actualDate,
                        lang
                      )}
                    </span>
                  )}
                </div>

                {progressSummary.currentSession &&
                progressSummary.currentSession.bestWeightSet ? (
                  <div className="space-y-2">
                    <div className="font-mono-num text-lg font-bold text-emerald-400">
                      {formatSetPerformance(
                        progressSummary.currentSession.bestWeightSet.weight,
                        progressSummary.currentSession.weightType,
                        progressSummary.currentSession.bestWeightSet.reps,
                        lang
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {progressSummary.currentSession.sets.map((s) => (
                        <span
                          key={s.id}
                          className={`text-[11px] font-mono-num px-2 py-0.5 rounded border ${
                            isDark
                              ? 'bg-[#121721] border-emerald-500/30 text-gray-200'
                              : 'bg-white border-emerald-200 text-slate-800'
                          }`}
                        >
                          #{s.setNumber}:{' '}
                          {formatSetPerformance(
                            s.weight,
                            progressSummary.currentSession!.weightType,
                            s.reps,
                            lang
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* CHARTS: WEIGHT PROGRESSION & REPETITION PROGRESSION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weight Progression Chart */}
            {!progressSummary.isBodyweightOnly && (
              <div
                className={`rounded-2xl border p-5 ${
                  isDark
                    ? 'bg-[#121721] border-[#1F2937]'
                    : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="mb-4">
                  <h3 className="font-display font-bold text-base">
                    {lang === 'ar'
                      ? 'مخطط تطور الأوزان عبر الجلسات'
                      : 'Weight Progression Over Time'}
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                    {lang === 'ar'
                      ? `أعلى وزن مسجل في كل جلسة (${settings.preferredWeightUnit})`
                      : `Top set weight per workout session (normalized in ${settings.preferredWeightUnit} when comparing mixed units)`}
                  </p>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDark ? '#1F2937' : '#E2E8F0'}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: isDark ? '#9CA3AF' : '#64748B', fontSize: 11 }}
                      />
                      <YAxis
                        tick={{ fill: isDark ? '#9CA3AF' : '#64748B', fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDark ? '#121721' : '#FFFFFF',
                          borderColor: isDark ? '#2D3748' : '#CBD5E1',
                          borderRadius: '12px',
                          fontSize: '12px',
                        }}
                        formatter={(_val: unknown, _name: unknown, props: { payload?: { bestSetDisplay?: string } }) => [
                          props?.payload?.bestSetDisplay || '',
                          lang === 'ar' ? 'أفضل مجموعة (بالوحدة الأصلية)' : 'Best Set (Original Unit)',
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="weightValue"
                        stroke="#10B981"
                        strokeWidth={3}
                        dot={{ r: 5, fill: '#10B981' }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Repetition Progression Chart */}
            <div
              className={`rounded-2xl border p-5 ${
                progressSummary.isBodyweightOnly ? 'lg:col-span-2' : ''
              } ${
                isDark
                  ? 'bg-[#121721] border-[#1F2937]'
                  : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="mb-4">
                <h3 className="font-display font-bold text-base">
                  {lang === 'ar'
                    ? 'مخطط تطور العدات (Repetitions)'
                    : 'Repetition Progression Over Time'}
                </h3>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  {lang === 'ar'
                    ? 'أعلى عدد عدات مسجل في كل جلسة لهذا التمرين'
                    : 'Highest repetitions achieved in a single set per session'}
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#1F2937' : '#E2E8F0'}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: isDark ? '#9CA3AF' : '#64748B', fontSize: 11 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: isDark ? '#9CA3AF' : '#64748B', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#121721' : '#FFFFFF',
                        borderColor: isDark ? '#2D3748' : '#CBD5E1',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                      formatter={(val: unknown) => [
                        `${String(val)} reps`,
                        lang === 'ar' ? 'أعلى عدات' : 'Max Reps',
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="maxReps"
                      stroke="#06B6D4"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#06B6D4' }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* COMPLETE HISTORICAL LOG FOR THIS EXERCISE */}
          <div
            className={`rounded-2xl border p-5 space-y-4 ${
              isDark
                ? 'bg-[#121721] border-[#1F2937]'
                : 'bg-white border-slate-200 shadow-xs'
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
                      ? 'bg-[#181F2C]/70 border-[#2D3748]'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatFullDate(rec.actualDate, lang)}</span>
                    </div>
                    {rec.notes && (
                      <p className="text-xs italic text-gray-400">“{rec.notes}”</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {rec.sets.map((s) => (
                      <span
                        key={s.id}
                        className={`px-2.5 py-1 rounded-lg font-mono-num text-xs font-semibold border ${
                          isDark
                            ? 'bg-[#121721] border-[#2D3748] text-gray-200'
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        #{s.setNumber}:{' '}
                        {formatSetPerformance(
                          s.weight,
                          rec.weightType,
                          s.reps,
                          lang
                        )}
                      </span>
                    ))}
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
