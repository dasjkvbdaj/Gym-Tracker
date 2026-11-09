import { DayName } from '../types/workout';

const DAY_NAMES: DayName[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const ORDERED_WEEK_DAYS: DayName[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/**
 * Returns local date string in YYYY-MM-DD format from a Date object
 */
export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Safely parses a YYYY-MM-DD string in the user's local timezone (avoids UTC shift)
 */
export function parseLocalDateString(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return new Date();
  }
  const [year, month, day] = parts;
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

/**
 * Extracts structured date metadata from a YYYY-MM-DD local date string
 */
export function getDateMetadata(dateStr: string): {
  actualDate: string;
  year: number;
  month: number;
  dayOfMonth: number;
  dayOfWeek: DayName;
  timezone: string;
} {
  const d = parseLocalDateString(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const dayOfMonth = d.getDate();
  const dayOfWeek = DAY_NAMES[d.getDay()];
  let timezone = 'Local';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
  } catch {
    timezone = 'Local';
  }
  return {
    actualDate: toLocalDateString(d),
    year,
    month,
    dayOfMonth,
    dayOfWeek,
    timezone,
  };
}

/**
 * Formats a YYYY-MM-DD string into a full readable date like "Sunday, November 8, 2026"
 */
export function formatFullDate(dateStr: string, lang: 'en' | 'ar' = 'en'): string {
  const d = parseLocalDateString(dateStr);
  try {
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Formats a YYYY-MM-DD string into a concise readable date like "Nov 8, 2026"
 */
export function formatShortDate(dateStr: string, lang: 'en' | 'ar' = 'en'): string {
  const d = parseLocalDateString(dateStr);
  try {
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Formats a timestamp (ms) into local time string like "05:30 PM"
 */
export function formatTimeFromTimestamp(
  timestamp: number | null | undefined,
  lang: 'en' | 'ar' = 'en'
): string {
  if (!timestamp) return '—';
  try {
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  } catch {
    return '—';
  }
}

/**
 * Formats duration in minutes into "1h 15m" or "45 min"
 */
export function formatDurationMinutes(
  minutes: number | null | undefined,
  lang: 'en' | 'ar' = 'en'
): string {
  if (minutes === null || minutes === undefined || minutes <= 0) {
    return lang === 'ar' ? 'أقل من دقيقة' : '< 1 min';
  }
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (lang === 'ar') {
    if (hrs > 0 && mins > 0) return `${hrs} س ${mins} د`;
    if (hrs > 0) return `${hrs} ساعة`;
    return `${mins} دقيقة`;
  }
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins} min`;
}

/**
 * Formats elapsed seconds into HH:MM:SS or MM:SS for live workout timer
 */
export function formatElapsedSeconds(totalSeconds: number): string {
  const safeSecs = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safeSecs / 3600);
  const mins = Math.floor((safeSecs % 3600) / 60);
  const secs = safeSecs % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Returns the Monday-based start of the current week (YYYY-MM-DD) and end of week (Sunday)
 */
export function getCurrentWeekRange(referenceDate: Date = new Date()): {
  startOfWeek: string;
  endOfWeek: string;
  weekDates: { day: DayName; dateStr: string }[];
} {
  const d = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    12,
    0,
    0
  );
  const jsDay = d.getDay(); // 0 is Sunday, 1 is Monday
  const diffToMonday = jsDay === 0 ? -6 : 1 - jsDay;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  const weekDates: { day: DayName; dateStr: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    weekDates.push({
      day: ORDERED_WEEK_DAYS[i],
      dateStr: toLocalDateString(cur),
    });
  }

  return {
    startOfWeek: weekDates[0].dateStr,
    endOfWeek: weekDates[6].dateStr,
    weekDates,
  };
}

/**
 * Generates calendar cells for a given year and month (1-12), starting week on Monday
 */
export interface CalendarCell {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayOfWeek: DayName;
}

export function getMonthCalendarGrid(year: number, month: number): CalendarCell[] {
  const todayStr = toLocalDateString(new Date());
  const firstDayOfMonth = new Date(year, month - 1, 1, 12, 0, 0);
  const daysInMonth = new Date(year, month, 0).getDate(); // Handles leap years automatically

  // Monday = 0, ..., Sunday = 6
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;

  const cells: CalendarCell[] = [];

  // Previous month padding days
  for (let i = startOffset - 1; i >= 0; i--) {
    const prevDate = new Date(year, month - 1, -i, 12, 0, 0);
    const dateStr = toLocalDateString(prevDate);
    cells.push({
      dateStr,
      dayNumber: prevDate.getDate(),
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      dayOfWeek: DAY_NAMES[prevDate.getDay()],
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const curDate = new Date(year, month - 1, day, 12, 0, 0);
    const dateStr = toLocalDateString(curDate);
    cells.push({
      dateStr,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      dayOfWeek: DAY_NAMES[curDate.getDay()],
    });
  }

  // Next month padding days to complete 6 rows (42 cells) or 5 rows (35 cells)
  const totalNeeded = cells.length > 35 ? 42 : 35;
  let nextMonthDay = 1;
  while (cells.length < totalNeeded) {
    const nextDate = new Date(year, month, nextMonthDay++, 12, 0, 0);
    const dateStr = toLocalDateString(nextDate);
    cells.push({
      dateStr,
      dayNumber: nextDate.getDate(),
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      dayOfWeek: DAY_NAMES[nextDate.getDay()],
    });
  }

  return cells;
}
