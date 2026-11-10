
export type MuscleGroup =
  | 'Back'
  | 'Chest'
  | 'Biceps'
  | 'Triceps'
  | 'Shoulders'
  | 'Traps'
  | 'Forearms'
  | 'Abs'
  | 'Legs'
  | 'Cardio';

export type WeightUnit = 'kg' | 'lbs' | 'none';

export type PreferredWeightUnit = 'kg' | 'lbs';

export type DayName =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export type AppSection =
  | 'dashboard'
  | 'schedule'
  | 'exercises'
  | 'start-workout'
  | 'calendar'
  | 'progress'
  | 'settings';

export interface SetEntry {
  id: string;
  setNumber: number;
  weight: number | null; // null when weightType === 'none' (Bodyweight)
  reps: number;
  completed?: boolean;
}

export interface ExerciseEntry {
  id: string;
  exerciseId: string;
  exerciseNameSnapshot: string;
  muscleGroup: MuscleGroup;
  weightType: WeightUnit; // 'kg' | 'lbs' | 'none'
  sets: SetEntry[];
  notes: string;
}

export interface CardioDetails {
  activityType: string;
  durationMinutes: number;
  distance: number | null;
  distanceUnit: 'km' | 'mi';
  notes: string;
}

export interface WorkoutSession {
  id: string;
  workoutType: 'strength' | 'cardio';
  title: string;
  muscleGroups: MuscleGroup[];
  actualDate: string; // YYYY-MM-DD in local timezone
  year: number;
  month: number; // 1 - 12
  dayOfMonth: number; // 1 - 31
  dayOfWeek: DayName;
  startTimestamp: number;
  finishTimestamp: number | null;
  durationMinutes: number | null;
  timezone: string;
  status: 'in_progress' | 'completed';
  notes: string;
  exercises: ExerciseEntry[];
  cardioDetails?: CardioDetails;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  defaultWeightUnit: WeightUnit;
  isBodyweight: boolean;
  notes: string;
  isCustom?: boolean;
  createdAt: number;
}

export interface WeeklyScheduleDay {
  day: DayName;
  title: string;
  workoutType: 'strength' | 'cardio' | 'rest';
  muscleGroups: MuscleGroup[];
  assignedExerciseIds: string[];
  notes?: string;
}

export interface UserSettings {
  id: string; // 'user_settings'
  theme: 'dark' | 'light';
  language: 'en' | 'ar';
  preferredWeightUnit: PreferredWeightUnit;
  updatedAt: number;
}

export interface BackupData {
  appIdentifier: 'IRONPULSE_GYM_TRACKER';
  backupVersion: number;
  exportedAt: string;
  exportTimestamp: number;
  settings: UserSettings;
  weeklySchedule: WeeklyScheduleDay[];
  exercises: Exercise[];
  workouts: WorkoutSession[];
}
