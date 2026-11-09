import { DayName, MuscleGroup } from '../types/workout';

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Back',
  'Chest',
  'Biceps',
  'Triceps',
  'Shoulders',
  'Traps',
  'Forearms',
  'Abs',
  'Legs',
  'Cardio',
];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, { en: string; ar: string }> = {
  Back: { en: 'Back', ar: 'الظهر (Back)' },
  Chest: { en: 'Chest', ar: 'الصدر (Chest)' },
  Biceps: { en: 'Biceps', ar: 'البايسبس (Biceps)' },
  Triceps: { en: 'Triceps', ar: 'الترايسبس (Triceps)' },
  Shoulders: { en: 'Shoulders', ar: 'الأكتاف (Shoulders)' },
  Traps: { en: 'Traps', ar: 'الترابيس (Traps)' },
  Forearms: { en: 'Forearms', ar: 'السواعد (Forearms)' },
  Abs: { en: 'Abs', ar: 'البطن (Abs)' },
  Legs: { en: 'Legs', ar: 'الأرجل (Legs)' },
  Cardio: { en: 'Cardio', ar: 'كارديو (Cardio)' },
};

export const DAY_LABELS: Record<DayName, { en: string; shortEn: string; ar: string; shortAr: string }> = {
  Monday: { en: 'Monday', shortEn: 'Mon', ar: 'الإثنين', shortAr: 'إثنين' },
  Tuesday: { en: 'Tuesday', shortEn: 'Tue', ar: 'الثلاثاء', shortAr: 'ثلاثاء' },
  Wednesday: { en: 'Wednesday', shortEn: 'Wed', ar: 'الأربعاء', shortAr: 'أربعاء' },
  Thursday: { en: 'Thursday', shortEn: 'Thu', ar: 'الخميس', shortAr: 'خميس' },
  Friday: { en: 'Friday', shortEn: 'Fri', ar: 'الجمعة', shortAr: 'جمعة' },
  Saturday: { en: 'Saturday', shortEn: 'Sat', ar: 'السبت', shortAr: 'سبت' },
  Sunday: { en: 'Sunday', shortEn: 'Sun', ar: 'الأحد', shortAr: 'أحد' },
};

export function translateMuscleGroup(group: MuscleGroup, lang: 'en' | 'ar'): string {
  return MUSCLE_GROUP_LABELS[group]?.[lang] || group;
}

export function translateDayName(day: DayName, lang: 'en' | 'ar', short = false): string {
  const item = DAY_LABELS[day];
  if (!item) return day;
  if (lang === 'ar') return short ? item.shortAr : item.ar;
  return short ? item.shortEn : item.en;
}

export const UI_TEXT = {
  en: {
    appName: 'IRONPULSE',
    appTagline: 'Personal Gym Tracker',
    dashboard: 'Dashboard',
    myWorkout: 'My Workout',
    exercises: 'Exercises',
    startWorkout: 'Start Workout',
    workoutHistory: 'Workout History',
    calendar: 'Calendar',
    progress: 'Progress',
    settings: 'Settings',
    activeWorkout: 'Active Workout in Progress',
    resumeWorkout: 'Resume Workout',
    finishWorkout: 'Finish Workout',
    cancelWorkout: 'Cancel Workout',
    totalSessions: 'Total Sessions',
    thisWeek: 'Completed This Week',
    cardioSessions: 'Cardio Sessions',
    totalWorkoutTime: 'Total Workout Time',
    lastCompletedWorkout: 'Last Completed Workout',
    weeklySchedule: 'Weekly Workout Plan',
    recentActivity: 'Recent Workout Activity',
    weeklyActivityChart: 'Weekly Activity (Sessions & Sets)',
    recentProgression: 'Recent Exercise Progression',
    noWorkoutsYet: 'No workouts recorded yet',
    startFirstWorkoutDesc: 'Begin your fitness log by starting a strength or cardio session. All records stay privately on your device.',
    strengthTraining: 'Strength Training',
    cardioSession: 'Cardio Session',
    restDay: 'Rest Day',
    bodyweight: 'Bodyweight',
    noWeight: 'No Weight',
    sets: 'Sets',
    reps: 'Reps',
    weight: 'Weight',
    addSet: 'Add Set',
    addExercise: 'Add Exercise',
    notes: 'Notes',
    saveChanges: 'Save Changes',
    exportBackup: 'Export Backup',
    importBackup: 'Import Backup',
  },
  ar: {
    appName: 'IRONPULSE',
    appTagline: 'متتبع التمارين الشخصي',
    dashboard: 'لوحة التحكم',
    myWorkout: 'جدول التمارين',
    exercises: 'مكتبة التمارين',
    startWorkout: 'بدء تمرين',
    workoutHistory: 'سجل التمارين',
    calendar: 'التقويم',
    progress: 'التطور والأداء',
    settings: 'الإعدادات',
    activeWorkout: 'تمرين جارٍ حالياً',
    resumeWorkout: 'متابعة التمرين',
    finishWorkout: 'إنهاء وحفظ التمرين',
    cancelWorkout: 'إلغاء التمرين',
    totalSessions: 'إجمالي الجلسات',
    thisWeek: 'تمارين هذا الأسبوع',
    cardioSessions: 'جلسات الكارديو',
    totalWorkoutTime: 'إجمالي وقت التمرين',
    lastCompletedWorkout: 'آخر تمرين مكتمل',
    weeklySchedule: 'جدول التمارين الأسبوعي',
    recentActivity: 'أحدث التمارين المسجلة',
    weeklyActivityChart: 'نشاط الأسبوع (الجلسات والمجموعات)',
    recentProgression: 'أحدث تطور في الأوزان والعدات',
    noWorkoutsYet: 'لا توجد تمارين مسجلة حتى الآن',
    startFirstWorkoutDesc: 'ابدأ بتسجيل أول جلسة تمرين حديد أو كارديو. جميع بياناتك تُحفظ محلياً على جهازك بدقة.',
    strengthTraining: 'تمرين مقاومة / حديد',
    cardioSession: 'جلسة كارديو',
    restDay: 'يوم راحة',
    bodyweight: 'وزن الجسم',
    noWeight: 'بدون وزن',
    sets: 'المجموعات',
    reps: 'العدات',
    weight: 'الوزن',
    addSet: 'إضافة مجموعة',
    addExercise: 'إضافة تمرين',
    notes: 'ملاحظات',
    saveChanges: 'حفظ التعديلات',
    exportBackup: 'تصدير نسخة احتياطية',
    importBackup: 'استيراد نسخة احتياطية',
  },
};
