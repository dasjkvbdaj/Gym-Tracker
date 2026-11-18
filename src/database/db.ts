import Dexie, { type Table } from 'dexie';
import {
  Exercise,
  UserSettings,
  WeeklyScheduleDay,
  WorkoutSession,
} from '../types/workout';
import {
  DEFAULT_EXERCISES,
  DEFAULT_USER_SETTINGS,
  DEFAULT_WEEKLY_SCHEDULE,
} from './defaultData';

export interface WorkoutSplitRecord {
  id: string;
  name: string;
  type: 'fixed' | 'rotation';
  daysData: any;
  createdAt: number;
}

export class GymTrackerDatabase extends Dexie {
  workouts!: Table<WorkoutSession, string>;
  exercises!: Table<Exercise, string>;
  weeklySchedule!: Table<WeeklyScheduleDay, string>;
  settings!: Table<UserSettings, string>;
  workoutSplits!: Table<WorkoutSplitRecord, string>;

  constructor() {
    super('IronPulseGymTrackerDB');

    this.version(1).stores({
      workouts: 'id, actualDate, status, workoutType, startTimestamp, year, month',
      exercises: 'id, name, muscleGroup, createdAt',
      weeklySchedule: 'day',
      settings: 'id',
    });

    this.version(2).stores({
      workouts: 'id, actualDate, status, workoutType, startTimestamp, year, month',
      exercises: 'id, name, muscleGroup, createdAt',
      weeklySchedule: 'day',
      settings: 'id',
      workoutSplits: 'id, name, type, createdAt',
    });
  }
}

export const db = new GymTrackerDatabase();

let seedPromise: Promise<void> | null = null;

export async function ensureDatabaseInitialized(): Promise<void> {
  if (seedPromise) {
    return seedPromise;
  }

  seedPromise = (async () => {
    try {
      await db.transaction('rw', db.exercises, db.weeklySchedule, db.settings, db.workoutSplits, async () => {
        const DUMMY_PURGE_KEY = 'ironpulse_dummy_purged_v2';
        if (typeof window !== 'undefined' && localStorage.getItem(DUMMY_PURGE_KEY) !== 'true') {
          await db.exercises
            .filter(
              (ex) =>
                !ex.isCustom ||
                ex.id.startsWith('ex_back_') ||
                ex.id.startsWith('ex_biceps_') ||
                ex.id.startsWith('ex_forearms_') ||
                ex.id.startsWith('ex_chest_') ||
                ex.id.startsWith('ex_triceps_') ||
                ex.id.startsWith('ex_abs_') ||
                ex.id.startsWith('ex_shoulders_') ||
                ex.id.startsWith('ex_traps_') ||
                ex.id.startsWith('ex_legs_') ||
                ex.id.startsWith('ex_cardio_')
            )
            .delete();

          const existingSchedules = await db.weeklySchedule.toArray();
          const validIds = new Set((await db.exercises.toArray()).map((e) => e.id));
          for (const day of existingSchedules) {
            const cleanedIds = day.assignedExerciseIds.filter((id) => validIds.has(id));
            await db.weeklySchedule.put({ ...day, assignedExerciseIds: cleanedIds });
          }
          localStorage.setItem(DUMMY_PURGE_KEY, 'true');
        }

        const exerciseCount = await db.exercises.count();
        if (exerciseCount === 0 && DEFAULT_EXERCISES.length > 0) {
          await db.exercises.bulkPut(DEFAULT_EXERCISES);
        }

        const scheduleCount = await db.weeklySchedule.count();
        if (scheduleCount === 0) {
          await db.weeklySchedule.bulkPut(DEFAULT_WEEKLY_SCHEDULE);
        }

        const existingSettings = await db.settings.get('user_settings');
        if (!existingSettings) {
          await db.settings.put(DEFAULT_USER_SETTINGS);
        }
      });
    } catch (err) {
      console.error('Database initialization error:', err);
    }
  })();

  return seedPromise;
}

export function generateId(prefix = 'rec'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}
