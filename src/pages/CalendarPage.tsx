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

  const now = new Date();
  const [viewYear, setViewYear] = useState<number>(now.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(now.getMonth() + 1); // 1 - 12

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

  // Scheduled rest days from user's weekly plan
  const scheduledRestDays = useMemo(() => {
    return new Set(
      weeklySchedule.filter((d) => d.workoutType === 'rest').map((d) => d.day)
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
    () => weeklySchedule.find((d) => d.day === selectedDateMeta.dayOfWeek),
    [weeklySchedule, selectedDateMeta]
  );

  // Count stats for currently viewed month
  const monthStats = useMemo(() => {
    let strengthCount = 0;
    let cardioCount = 0;
    for (const w of completedWorkouts) {
      if (w.year === viewYear && w.month === viewMonth) {
        if (w.workoutType === 'cardio') cardioCount++;
        else strengthCount++;
      }
    }
    return { strengthCount, cardioCount, total: strengthCount + cardioCount };
  }, [completedWorkouts, viewYear, viewMonth]);

  // Year range options (from 2020 to currentYear + 5)
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
            {lang === 'ar' ? 'تقويم التمارين الشهري' : 'Workout Activity Calendar'}
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
            {lang === 'ar'
              ? 'يعرض التمارين المسجلة فعلياً حسب التاريخ. اضغط على أي يوم لعرض التفاصيل أو إضافة تمرين.'
              : 'Displays actual recorded workout dates. Select any date to inspect sessions or log a workout.'}
          </p>
        </div>

        <button
          onClick={handleJumpToToday}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? 'الانتقال إلى اليوم' : 'Jump to Today'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT 8 COLS: MONTHLY CALENDAR GRID */}
        <div
          className={`lg:col-span-8 rounded-2xl border p-4 sm:p-6 space-y-5 ${
            isDark ? 'bg-[#121721] border-[#1F2937]' : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          {/* Month & Year Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-[#181F2C] border-[#2D3748] text-gray-300 hover:border-gray-500'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
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
                  className={`px-3 py-2 rounded-xl font-display font-bold text-sm sm:text-base border focus:outline-none focus:border-emerald-500 ${
                    isDark
                      ? 'bg-[#181F2C] border-[#2D3748] text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
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
                  className={`px-3 py-2 rounded-xl font-mono-num font-bold text-sm sm:text-base border focus:outline-none focus:border-emerald-500 ${
                    isDark
                      ? 'bg-[#181F2C] border-[#2D3748] text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
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
                    ? 'bg-[#181F2C] border-[#2D3748] text-gray-300 hover:border-gray-500'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
                aria-label="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Month Summary Pills */}
            <div className="flex items-center gap-2 text-xs font-mono-num">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {monthStats.strengthCount} {lang === 'ar' ? 'حديد' : 'Strength'}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                {monthStats.cardioCount} {lang === 'ar' ? 'كارديو' : 'Cardio'}
              </span>
            </div>
          </div>

          {/* Weekday Column Headers (Mon - Sun) */}
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

          {/* 7x5 / 7x6 Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarCells.map((cell) => {
              const dayWorkouts = workoutsByDate.get(cell.dateStr) || [];
              const hasStrength = dayWorkouts.some(
                (w) => w.workoutType === 'strength'
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
                        ? 'bg-emerald-500/15 border-emerald-500 ring-1 ring-emerald-500/50'
                        : 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500/40'
                      : dayWorkouts.length > 0
                      ? isDark
                        ? 'bg-[#181F2C] border-emerald-500/30 hover:border-emerald-500/60'
                        : 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-400'
                      : isDark
                      ? 'bg-[#0E131B] border-[#1F2937] hover:border-gray-700'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`font-mono-num text-xs sm:text-sm font-bold w-6 h-6 rounded-lg flex items-center justify-center ${
                        cell.isToday
                          ? 'bg-emerald-500 text-slate-950'
                          : isSelected
                          ? 'text-emerald-400'
                          : isDark
                          ? 'text-gray-200'
                          : 'text-slate-800'
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

                  {/* Visual Indicators for Actual Recorded Activity */}
                  <div className="space-y-1 mt-1 w-full">
                    {hasStrength && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
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

          {/* Calendar Legend */}
          <div
            className={`pt-3 border-t flex flex-wrap items-center gap-4 text-xs ${
              isDark ? 'border-[#1F2937] text-gray-400' : 'border-slate-200 text-slate-600'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>{lang === 'ar' ? 'تمرين حديد مسجل' : 'Strength Training Recorded'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-cyan-400" />
              <span>{lang === 'ar' ? 'جلسة كارديو مسجلة' : 'Cardio Session Recorded'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-gray-500" />
              <span>{lang === 'ar' ? 'يوم راحة مخطط' : 'Planned Rest Day'}</span>
            </div>
          </div>
        </div>

        {/* RIGHT 4 COLS: SELECTED DATE DETAILS & HISTORICAL WORKOUT TRIGGER */}
        <div
          className={`lg:col-span-4 rounded-2xl border p-5 flex flex-col justify-between gap-5 ${
            isDark ? 'bg-[#121721] border-[#1F2937]' : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <div className="space-y-4">
            <div className="pb-4 border-b border-inherit">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
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
                  {lang === 'ar' ? 'الخطة المرجعية لهذا اليوم:' : 'Reference plan:'}{' '}
                  <strong>{selectedDaySchedule.title}</strong>
                </p>
              )}
            </div>

            {/* Recorded Workouts on Selected Date */}
            {selectedDateWorkouts.length === 0 ? (
              <div
                className={`py-8 px-4 rounded-xl border border-dashed text-center space-y-2 ${
                  isDark
                    ? 'border-[#2D3748] text-gray-400'
                    : 'border-slate-300 text-slate-500'
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
                        ? 'bg-[#181F2C] border-[#2D3748]'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded ${
                            w.workoutType === 'cardio'
                              ? 'bg-cyan-500/15 text-cyan-400'
                              : 'bg-emerald-500/15 text-emerald-400'
                          }`}
                        >
                          {w.workoutType === 'cardio' ? (
                            <Flame className="w-3 h-3" />
                          ) : (
                            <Dumbbell className="w-3 h-3" />
                          )}
                          <span>
                            {w.workoutType === 'cardio' ? 'Cardio' : 'Strength'}
                          </span>
                        </span>
                        <h3 className="font-display font-bold text-sm mt-1">
                          {w.title}
                        </h3>
                      </div>

                      <span className="text-[11px] font-mono-num text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDurationMinutes(w.durationMinutes, lang)}
                      </span>
                    </div>

                    <div className="text-[11px] text-gray-400 font-mono-num">
                      {formatTimeFromTimestamp(w.startTimestamp, lang)}
                      {w.finishTimestamp
                        ? ` – ${formatTimeFromTimestamp(w.finishTimestamp, lang)}`
                        : ''}
                    </div>

                    {w.muscleGroups.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {w.muscleGroups.map((mg) => (
                          <span
                            key={mg}
                            className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                              isDark
                                ? 'bg-[#121721] text-gray-300'
                                : 'bg-white text-slate-700'
                            }`}
                          >
                            {translateMuscleGroup(mg, lang)}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Exercise Summary */}
                    {w.exercises.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-inherit">
                        {w.exercises.map((ex) => (
                          <div key={ex.id} className="text-xs">
                            <div className="font-semibold text-emerald-400">
                              {ex.exerciseNameSnapshot}
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-0.5 font-mono-num text-[11px]">
                              {ex.sets.map((s) => (
                                <span
                                  key={s.id}
                                  className={`px-1.5 py-0.5 rounded ${
                                    isDark ? 'bg-[#121721]' : 'bg-white'
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

          {/* ADD WORKOUT TO SELECTED DATE BUTTONS */}
          <div className="pt-4 border-t border-inherit space-y-2">
            <button
              onClick={() => openStartWorkoutForDate(selectedCalendarDate, 'strength')}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>
                {lang === 'ar'
                  ? 'تسجيل تمرين حديد في هذا التاريخ'
                  : 'Log Strength Workout on This Date'}
              </span>
            </button>

            <button
              onClick={() => openStartWorkoutForDate(selectedCalendarDate, 'cardio')}
              className={`w-full py-2.5 px-4 rounded-xl font-display font-semibold text-xs border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isDark
                  ? 'bg-[#181F2C] border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/15'
                  : 'bg-cyan-50 border-cyan-200 text-cyan-800 hover:bg-cyan-100'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>
                {lang === 'ar'
                  ? 'تسجيل جلسة كارديو في هذا التاريخ'
                  : 'Log Cardio Session on This Date'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
