
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
} from 'lucide-react';

import { useGym } from '../context/GymContext';

import {
  formatDurationMinutes,
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

export const CalendarPage: React.FC = () => {
  const {
    completedWorkouts,
    weeklySchedule,
    settings,
    selectedCalendarDate,
    setSelectedCalendarDate,
    openStartWorkoutForDate,
  } = useGym();

  const lang = settings.language;
  const isDark = settings.theme === 'dark';

  // Light mode accent colors
  const lightStrengthColor = 'text-indigo-700';
  const lightStrengthBg = 'bg-indigo-50';
  const lightStrengthBorder = 'border-indigo-200';

  const lightStrengthAccent = isDark
    ? 'text-[hsl(75,92%,56%)]'
    : lightStrengthColor;

  const lightStrengthAccentBg = isDark
    ? 'bg-[hsl(75,92%,56%)]/15'
    : lightStrengthBg;

  const lightStrengthAccentBorder = isDark
    ? 'border-[hsl(75,92%,56%)]/30'
    : lightStrengthBorder;

  const now = new Date();

  const [viewYear, setViewYear] = useState<number>(
    now.getFullYear()
  );

  const [viewMonth, setViewMonth] = useState<number>(
    now.getMonth() + 1
  );

  const calendarCells = useMemo(
    () => getMonthCalendarGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  // Map dateStr -> WorkoutSession[]
  const workoutsByDate = useMemo(() => {
    const map = new Map<string, typeof completedWorkouts>();

    for (const w of completedWorkouts) {
      const existing = map.get(w.actualDate) || [];
      existing.push(w);
      map.set(w.actualDate, existing);
    }

    return map;
  }, [completedWorkouts]);

  // Scheduled rest days
  const scheduledRestDays = useMemo(() => {
    return new Set(
      weeklySchedule
        .filter((d) => d.workoutType === 'rest')
        .map((d) => d.day)
    );
  }, [weeklySchedule]);

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
    const todayStr = toLocalDateString(today);

    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth() + 1);
    setSelectedCalendarDate(todayStr);
  };

  const selectedDateWorkouts = useMemo(() => {
    return workoutsByDate.get(selectedCalendarDate) || [];
  }, [workoutsByDate, selectedCalendarDate]);

  const selectedDateMeta = useMemo(
    () => getDateMetadata(selectedCalendarDate),
    [selectedCalendarDate]
  );

  const selectedDaySchedule = useMemo(
    () =>
      weeklySchedule.find(
        (d) => d.day === selectedDateMeta.dayOfWeek
      ),
    [weeklySchedule, selectedDateMeta]
  );

  // Monthly statistics
  const monthStats = useMemo(() => {
    let strengthCount = 0;
    let cardioCount = 0;

    for (const w of completedWorkouts) {
      if (w.year === viewYear && w.month === viewMonth) {
        if (w.workoutType === 'cardio') {
          cardioCount++;
        } else {
          strengthCount++;
        }
      }
    }

    return {
      strengthCount,
      cardioCount,
      total: strengthCount + cardioCount,
    };
  }, [completedWorkouts, viewYear, viewMonth]);

  // Year options
  const yearOptions = useMemo(() => {
    const curY = new Date().getFullYear();
    const years: number[] = [];

    for (let y = curY - 6; y <= curY + 4; y++) {
      years.push(y);
    }

    return years;
  }, []);

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
            {lang === 'ar'
              ? 'تقويم التمارين الشهري'
              : 'Workout Activity Calendar'}
          </h1>

          <p
            className={`text-sm mt-1 ${
              isDark ? 'text-gray-400' : 'text-slate-600'
            }`}
          >
            {lang === 'ar'
              ? 'يعرض التمارين المسجلة فعلياً حسب التاريخ. اضغط على أي يوم لعرض التفاصيل أو إضافة تمرين.'
              : 'Displays actual recorded workout dates. Select any date to inspect sessions or log a workout.'}
          </p>
        </div>

        {/* JUMP TO TODAY */}
        <button
          onClick={handleJumpToToday}
          className={`self-start sm:self-auto px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
            isDark
              ? 'bg-[hsl(75,92%,56%)]/15 hover:bg-[hsl(75,92%,56%)]/25 text-[hsl(75,92%,56%)] border-[hsl(75,92%,56%)]/30'
              : 'bg-indigo-700 hover:bg-indigo-800 text-white border-indigo-700 shadow-sm'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5" />

          <span>
            {lang === 'ar' ? 'الانتقال إلى اليوم' : 'Jump to Today'}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT: CALENDAR */}
        <div
          className={`lg:col-span-8 rounded-2xl border p-4 sm:p-6 space-y-5 ${
            isDark
              ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
              : 'bg-white border-[hsl(40,10%,88%)] shadow-xs'
          }`}
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
                  onChange={(e) =>
                    setViewMonth(Number(e.target.value))
                  }
                  aria-label="Select Month"
                  className={`px-3 py-2 rounded-xl font-display font-bold text-sm sm:text-base border focus:outline-none focus:border-[hsl(75,92%,56%)] ${
                    isDark
                      ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)] text-white'
                      : 'bg-[hsl(40,20%,97.5%)] border-[hsl(40,10%,85%)] text-[hsl(240,10%,9%)]'
                  }`}
                >
                  {(lang === 'ar'
                    ? MONTH_NAMES_AR
                    : MONTH_NAMES_EN
                  ).map((mName, idx) => (
                    <option key={mName} value={idx + 1}>
                      {mName}
                    </option>
                  ))}
                </select>

                <select
                  value={viewYear}
                  onChange={(e) =>
                    setViewYear(Number(e.target.value))
                  }
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

              {/* STRENGTH */}
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

              {/* CARDIO - UNCHANGED */}
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
              const dayWorkouts =
                workoutsByDate.get(cell.dateStr) || [];

              const hasStrength = dayWorkouts.some(
                (w) => w.workoutType === 'strength'
              );

              const hasCardio = dayWorkouts.some(
                (w) =>
                  w.workoutType === 'cardio' ||
                  w.muscleGroups.includes('Cardio')
              );

              const isScheduledRest =
                scheduledRestDays.has(cell.dayOfWeek);

              const isSelected =
                cell.dateStr === selectedCalendarDate;

              return (
                <button
                  key={cell.dateStr}
                  onClick={() =>
                    setSelectedCalendarDate(cell.dateStr)
                  }
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

                    {isScheduledRest &&
                      dayWorkouts.length === 0 && (
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
              isDark
                ? 'border-[hsl(240,4%,16%)] text-gray-400'
                : 'border-[hsl(40,10%,88%)] text-slate-600'
            }`}
          >

            <div className="flex items-center gap-1.5">
              <span
                className={`w-3 h-3 rounded-full ${
                  isDark ? 'bg-[hsl(75,92%,56%)]' : 'bg-indigo-600'
                }`}
              />

              <span>
                {lang === 'ar'
                  ? 'تمرين حديد مسجل'
                  : 'Strength Training Recorded'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-cyan-400" />

              <span>
                {lang === 'ar'
                  ? 'جلسة كارديو مسجلة'
                  : 'Cardio Session Recorded'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-gray-500" />

              <span>
                {lang === 'ar'
                  ? 'يوم راحة مخطط'
                  : 'Planned Rest Day'}
              </span>
            </div>

          </div>
        </div>

        {/* RIGHT: SELECTED DATE DETAILS */}
        <div
          className={`lg:col-span-4 rounded-2xl border p-5 flex flex-col justify-between gap-5 ${
            isDark
              ? 'bg-[hsl(240,5%,7.5%)] border-[hsl(240,4%,16%)]'
              : 'bg-white border-[hsl(40,10%,88%)] shadow-xs'
          }`}
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

              {selectedDaySchedule && (
                <p
                  className={`text-xs mt-1 ${
                    isDark ? 'text-gray-400' : 'text-slate-500'
                  }`}
                >
                  {lang === 'ar'
                    ? 'الخطة المرجعية لهذا اليوم:'
                    : 'Reference plan:'}{' '}
                  <strong>{selectedDaySchedule.title}</strong>
                </p>
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
                    ? 'يمكنك إضافة تمرين لهذا التاريخ حتى لو كان يوم راحة مجدول.'
                    : 'You can record a strength or cardio session on any date, including scheduled rest days.'}
                </p>
              </div>

            ) : (

              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">

                {selectedDateWorkouts.map((w) => (

                  <div
                    key={w.id}
                    className={`p-3.5 rounded-xl border space-y-2.5 ${
                      isDark
                        ? 'bg-[hsl(240,5%,11%)] border-[hsl(240,4%,19%)]'
                        : 'bg-[hsl(40,20%,97.5%)] border-[hsl(40,10%,88%)]'
                    }`}
                  >

                    <div className="flex items-start justify-between gap-2">

                      <div>

                        {/* WORKOUT TYPE */}
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded ${
                            w.workoutType === 'cardio'
                              ? 'bg-cyan-500/15 text-cyan-400'
                              : isDark
                                ? 'bg-[hsl(75,92%,56%)]/15 text-[hsl(75,92%,56%)]'
                                : 'bg-indigo-100 text-indigo-700'
                          }`}
                        >

                          {w.workoutType === 'cardio' ? (
                            <Flame className="w-3 h-3" />
                          ) : (
                            <Dumbbell className="w-3 h-3" />
                          )}

                          <span>
                            {w.workoutType === 'cardio'
                              ? 'Cardio'
                              : 'Strength'}
                          </span>

                        </span>

                        <h3 className="font-display font-bold text-sm mt-1">
                          {w.title}
                        </h3>

                      </div>

                      <span className="text-[11px] font-mono-num text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />

                        {formatDurationMinutes(
                          w.durationMinutes,
                          lang
                        )}
                      </span>

                    </div>

                    {/* TIME */}
                    <div className="text-[11px] text-gray-400 font-mono-num">
                      {formatTimeFromTimestamp(
                        w.startTimestamp,
                        lang
                      )}

                      {w.finishTimestamp
                        ? ` – ${formatTimeFromTimestamp(
                            w.finishTimestamp,
                            lang
                          )}`
                        : ''}
                    </div>

                    {/* MUSCLE GROUPS */}
                    {w.muscleGroups.length > 0 && (
                      <div className="flex flex-wrap gap-1">

                        {w.muscleGroups.map((mg) => (
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

                    {/* EXERCISE SUMMARY */}
                    {w.exercises.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-inherit">

                        {w.exercises.map((ex) => (

                          <div key={ex.id} className="text-xs">

                            {/* EXERCISE NAME */}
                            <div
                              className={`font-semibold ${
                                isDark
                                  ? 'text-[hsl(75,92%,56%)]'
                                  : 'text-indigo-700'
                              }`}
                            >
                              {ex.exerciseNameSnapshot}
                            </div>

                            {/* SETS */}
                            <div className="flex flex-wrap gap-1.5 mt-0.5 font-mono-num text-[11px]">

                              {ex.sets.map((s) => (
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
                              ))}

                            </div>

                          </div>
                        ))}

                      </div>
                    )}

                  </div>
                ))}

              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
};
