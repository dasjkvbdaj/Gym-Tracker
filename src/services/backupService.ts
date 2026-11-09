import { db } from '../database/db';
import {
  DEFAULT_EXERCISES,
  DEFAULT_USER_SETTINGS,
  DEFAULT_WEEKLY_SCHEDULE,
} from '../database/defaultData';
import {
  BackupData,
  Exercise,
  MuscleGroup,
  UserSettings,
  WeeklyScheduleDay,
  WorkoutSession,
} from '../types/workout';
import { toLocalDateString } from '../utils/dateUtils';
import { MUSCLE_GROUPS } from '../utils/i18n';

export const CURRENT_BACKUP_VERSION = 1;

export interface BackupValidationResult {
  valid: boolean;
  error?: string;
  data?: BackupData;
  summary?: {
    exportedAt: string;
    backupVersion: number;
    totalWorkouts: number;
    completedWorkouts: number;
    inProgressWorkouts: number;
    totalExercises: number;
    customExercises: number;
    scheduleDays: number;
  };
}

export interface ImportSummary {
  mode: 'replace' | 'merge';
  workoutsAdded: number;
  workoutsUpdated: number;
  exercisesAdded: number;
  exercisesUpdated: number;
  scheduleUpdated: boolean;
}

/**
 * Collects all application data from IndexedDB and triggers a JSON file download
 */
export async function exportFullBackup(): Promise<{ filename: string; data: BackupData }> {
  const [workouts, exercises, weeklySchedule, settingsArr] = await Promise.all([
    db.workouts.toArray(),
    db.exercises.toArray(),
    db.weeklySchedule.toArray(),
    db.settings.toArray(),
  ]);

  const settings: UserSettings =
    settingsArr.find((s) => s.id === 'user_settings') || DEFAULT_USER_SETTINGS;

  const now = new Date();
  const datePart = toLocalDateString(now);
  const filename = `GymTracker_Backup_${datePart}.json`;

  const payload: BackupData = {
    appIdentifier: 'IRONPULSE_GYM_TRACKER',
    backupVersion: CURRENT_BACKUP_VERSION,
    exportedAt: now.toISOString(),
    exportTimestamp: now.getTime(),
    settings,
    weeklySchedule:
      weeklySchedule.length > 0 ? weeklySchedule : DEFAULT_WEEKLY_SCHEDULE,
    exercises: exercises.length > 0 ? exercises : DEFAULT_EXERCISES,
    workouts,
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 3000);

  return { filename, data: payload };
}

/**
 * Validates a raw JSON string before importing
 */
export function validateBackupJson(rawText: string): BackupValidationResult {
  if (!rawText || !rawText.trim()) {
    return { valid: false, error: 'The selected file is empty.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return {
      valid: false,
      error: 'Invalid JSON file format. Please select a valid GymTracker backup (.json) file.',
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, error: 'Backup root must be a valid JSON object.' };
  }

  const obj = parsed as Record<string, unknown>;

  if (
    typeof obj.backupVersion !== 'number' ||
    obj.backupVersion < 1 ||
    obj.backupVersion > CURRENT_BACKUP_VERSION
  ) {
    return {
      valid: false,
      error: `Unsupported or missing backup schema version (found: ${String(obj.backupVersion)}).`,
    };
  }

  if (!Array.isArray(obj.workouts)) {
    return { valid: false, error: 'Backup is missing the "workouts" array.' };
  }

  if (!Array.isArray(obj.exercises)) {
    return { valid: false, error: 'Backup is missing the "exercises" array.' };
  }

  if (!Array.isArray(obj.weeklySchedule)) {
    return { valid: false, error: 'Backup is missing the "weeklySchedule" array.' };
  }

  if (!obj.settings || typeof obj.settings !== 'object') {
    return { valid: false, error: 'Backup is missing user settings configuration.' };
  }

  // Validate individual workout records
  for (let i = 0; i < obj.workouts.length; i++) {
    const w = obj.workouts[i] as Partial<WorkoutSession>;
    if (!w || typeof w.id !== 'string' || !w.id.trim()) {
      return { valid: false, error: `Workout record at index ${i} is missing a valid unique ID.` };
    }
    if (typeof w.actualDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(w.actualDate)) {
      return {
        valid: false,
        error: `Workout "${w.id}" has an invalid actualDate format (expected YYYY-MM-DD).`,
      };
    }
    if (w.workoutType !== 'strength' && w.workoutType !== 'cardio') {
      return {
        valid: false,
        error: `Workout "${w.id}" has an invalid workoutType.`,
      };
    }
    if (!Array.isArray(w.exercises)) {
      return {
        valid: false,
        error: `Workout "${w.id}" is missing its exercises array.`,
      };
    }
    for (const exEntry of w.exercises) {
      if (
        !exEntry ||
        typeof exEntry.id !== 'string' ||
        !['kg', 'lbs', 'none'].includes(exEntry.weightType) ||
        !Array.isArray(exEntry.sets)
      ) {
        return {
          valid: false,
          error: `Workout "${w.id}" contains a malformed exercise entry or invalid weight unit.`,
        };
      }
    }
  }

  // Validate individual exercises
  for (let i = 0; i < obj.exercises.length; i++) {
    const ex = obj.exercises[i] as Partial<Exercise>;
    if (
      !ex ||
      typeof ex.id !== 'string' ||
      typeof ex.name !== 'string' ||
      !ex.name.trim() ||
      !MUSCLE_GROUPS.includes(ex.muscleGroup as MuscleGroup)
    ) {
      return {
        valid: false,
        error: `Exercise record at index ${i} is invalid or missing required fields.`,
      };
    }
  }

  const backupData = obj as unknown as BackupData;
  const completedWorkouts = backupData.workouts.filter((w) => w.status === 'completed').length;
  const inProgressWorkouts = backupData.workouts.filter((w) => w.status === 'in_progress').length;
  const customExercises = backupData.exercises.filter((e) => e.isCustom).length;

  return {
    valid: true,
    data: backupData,
    summary: {
      exportedAt: backupData.exportedAt || new Date().toISOString(),
      backupVersion: backupData.backupVersion,
      totalWorkouts: backupData.workouts.length,
      completedWorkouts,
      inProgressWorkouts,
      totalExercises: backupData.exercises.length,
      customExercises,
      scheduleDays: backupData.weeklySchedule.length,
    },
  };
}

/**
 * Executes an atomic Import Backup in either 'replace' or 'merge' mode.
 * If any error occurs, the IndexedDB transaction rolls back and existing data is preserved.
 */
export async function executeImportBackup(
  backup: BackupData,
  mode: 'replace' | 'merge'
): Promise<ImportSummary> {
  let workoutsAdded = 0;
  let workoutsUpdated = 0;
  let exercisesAdded = 0;
  let exercisesUpdated = 0;
  let scheduleUpdated = false;

  await db.transaction(
    'rw',
    db.workouts,
    db.exercises,
    db.weeklySchedule,
    db.settings,
    async () => {
      if (mode === 'replace') {
        await Promise.all([
          db.workouts.clear(),
          db.exercises.clear(),
          db.weeklySchedule.clear(),
          db.settings.clear(),
        ]);

        if (backup.exercises.length > 0) {
          await db.exercises.bulkPut(backup.exercises);
          exercisesAdded = backup.exercises.length;
        } else {
          await db.exercises.bulkPut(DEFAULT_EXERCISES);
          exercisesAdded = DEFAULT_EXERCISES.length;
        }

        if (backup.workouts.length > 0) {
          await db.workouts.bulkPut(backup.workouts);
          workoutsAdded = backup.workouts.length;
        }

        if (backup.weeklySchedule && backup.weeklySchedule.length > 0) {
          await db.weeklySchedule.bulkPut(backup.weeklySchedule);
        } else {
          await db.weeklySchedule.bulkPut(DEFAULT_WEEKLY_SCHEDULE);
        }
        scheduleUpdated = true;

        const cleanSettings: UserSettings = {
          ...DEFAULT_USER_SETTINGS,
          ...backup.settings,
          id: 'user_settings',
          updatedAt: Date.now(),
        };
        await db.settings.put(cleanSettings);
      } else {
        // MERGE MODE: Preserve existing records, merge by unique IDs
        const existingWorkoutsMap = new Map<string, WorkoutSession>();
        const currentWorkouts = await db.workouts.toArray();
        for (const w of currentWorkouts) {
          existingWorkoutsMap.set(w.id, w);
        }

        const workoutsToPut: WorkoutSession[] = [];
        for (const incomingWorkout of backup.workouts) {
          const existing = existingWorkoutsMap.get(incomingWorkout.id);
          if (!existing) {
            workoutsToPut.push(incomingWorkout);
            workoutsAdded++;
          } else {
            // If incoming workout is completed and local was in_progress, or incoming has later finishTimestamp, update safely
            const incomingTime = incomingWorkout.finishTimestamp || incomingWorkout.startTimestamp || 0;
            const existingTime = existing.finishTimestamp || existing.startTimestamp || 0;
            if (incomingTime > existingTime) {
              workoutsToPut.push(incomingWorkout);
              workoutsUpdated++;
            }
          }
        }
        if (workoutsToPut.length > 0) {
          await db.workouts.bulkPut(workoutsToPut);
        }

        // Merge Exercises by unique ID
        const existingExercisesMap = new Map<string, Exercise>();
        const currentExercises = await db.exercises.toArray();
        for (const ex of currentExercises) {
          existingExercisesMap.set(ex.id, ex);
        }

        const exercisesToPut: Exercise[] = [];
        for (const incomingEx of backup.exercises) {
          const existing = existingExercisesMap.get(incomingEx.id);
          if (!existing) {
            exercisesToPut.push(incomingEx);
            exercisesAdded++;
          } else if (existing.name !== incomingEx.name || existing.notes !== incomingEx.notes) {
            // Keep existing local customizations unless incoming is custom
            if (incomingEx.isCustom && !existing.isCustom) {
              exercisesToPut.push(incomingEx);
              exercisesUpdated++;
            }
          }
        }
        if (exercisesToPut.length > 0) {
          await db.exercises.bulkPut(exercisesToPut);
        }

        // Merge Weekly Schedule assignedExerciseIds without losing existing assignments
        const currentSchedule = await db.weeklySchedule.toArray();
        const scheduleMap = new Map<string, WeeklyScheduleDay>();
        for (const day of currentSchedule) {
          scheduleMap.set(day.day, day);
        }

        const scheduleToPut: WeeklyScheduleDay[] = [];
        for (const incDay of backup.weeklySchedule || []) {
          const localDay = scheduleMap.get(incDay.day);
          if (!localDay) {
            scheduleToPut.push(incDay);
            scheduleUpdated = true;
          } else {
            const mergedExIds = Array.from(
              new Set([...localDay.assignedExerciseIds, ...(incDay.assignedExerciseIds || [])])
            );
            if (mergedExIds.length !== localDay.assignedExerciseIds.length) {
              scheduleToPut.push({
                ...localDay,
                assignedExerciseIds: mergedExIds,
              });
              scheduleUpdated = true;
            }
          }
        }
        if (scheduleToPut.length > 0) {
          await db.weeklySchedule.bulkPut(scheduleToPut);
        }
      }
    }
  );

  return {
    mode,
    workoutsAdded,
    workoutsUpdated,
    exercisesAdded,
    exercisesUpdated,
    scheduleUpdated,
  };
}
