import { Exercise, UserSettings, WeeklyScheduleDay } from '../types/workout';

export const DEFAULT_EXERCISES: Exercise[] = [];

export const DEFAULT_WEEKLY_SCHEDULE: WeeklyScheduleDay[] = [
  {
    day: 'Monday',
    title: 'Back + Biceps + Forearms',
    workoutType: 'strength',
    muscleGroups: ['Back', 'Biceps', 'Forearms'],
    assignedExerciseIds: [],
    notes: 'Pull focus: Back width, mid-back thickness, biceps, and forearm flexors.',
  },
  {
    day: 'Tuesday',
    title: 'Chest + Triceps + Abs',
    workoutType: 'strength',
    muscleGroups: ['Chest', 'Triceps', 'Abs'],
    assignedExerciseIds: [],
    notes: 'Push focus: Chest pressing, flyes, triceps isolation, and core.',
  },
  {
    day: 'Wednesday',
    title: 'Cardio — 1 Hour',
    workoutType: 'cardio',
    muscleGroups: ['Cardio'],
    assignedExerciseIds: [],
    notes: 'Dedicated 60-minute cardiovascular conditioning session.',
  },
  {
    day: 'Thursday',
    title: 'Shoulders + Traps',
    workoutType: 'strength',
    muscleGroups: ['Shoulders', 'Traps'],
    assignedExerciseIds: [],
    notes: 'Overhead pressing, medial/rear delts, and upper traps.',
  },
  {
    day: 'Friday',
    title: 'Abs + Forearms',
    workoutType: 'strength',
    muscleGroups: ['Abs', 'Forearms'],
    assignedExerciseIds: [],
    notes: 'Core conditioning and grip/forearm development.',
  },
  {
    day: 'Saturday',
    title: 'Legs',
    workoutType: 'strength',
    muscleGroups: ['Legs'],
    assignedExerciseIds: [],
    notes: 'Lower body strength: Quads, hamstrings, glutes, and calves.',
  },
  {
    day: 'Sunday',
    title: 'Rest',
    workoutType: 'rest',
    muscleGroups: [],
    assignedExerciseIds: [],
    notes: 'Scheduled recovery day. You can still record a workout if you train today.',
  },
];

export const DEFAULT_USER_SETTINGS: UserSettings = {
  id: 'user_settings',
  theme: 'dark',
  language: 'en',
  preferredWeightUnit: 'kg',
  updatedAt: Date.now(),
};
