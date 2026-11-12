import {
  ExerciseEntry,
  PreferredWeightUnit,
  SetEntry,
  WeightUnit,
  WorkoutSession,
} from '../types/workout';
import { formatShortDate } from '../utils/dateUtils';
import { convertWeight } from '../utils/unitConversion';

export interface ExerciseSessionRecord {
  workoutId: string;
  actualDate: string;
  formattedDate: string;
  startTimestamp: number;
  weightType: WeightUnit;
  sets: SetEntry[];
  notes: string;
  bestWeightSet: SetEntry | null;
  bestRepsSet: SetEntry | null;
  normalizedBestWeight: number;
  maxReps: number;
  totalSets: number;
  totalCalories: number;
}

export interface ExerciseComparisonSummary {
  exerciseId: string;
  exerciseName: string;
  totalSessions: number;
  lastPerformedDate: string | null;
  isBodyweightOnly: boolean;
  isCardio: boolean;
  bestWeightRecord: {
    weight: number | null;
    unit: WeightUnit;
    reps: number;
    actualDate: string;
    normalizedKg: number;
  } | null;
  bestRepsRecord: {
    reps: number;
    weight: number | null;
    unit: WeightUnit;
    actualDate: string;
  } | null;
  currentSession: ExerciseSessionRecord | null;
  previousSession: ExerciseSessionRecord | null;
  comparisonDelta: {
    hasPrevious: boolean;
    sameUnit: boolean;
    weightDiffOriginal: number | null;
    weightDiffNormalized: number;
    repsDiff: number;
    unitLabel: string;
  } | null;
  historyChronological: ExerciseSessionRecord[];
}

function analyzeExerciseEntry(
  workout: WorkoutSession,
  entry: ExerciseEntry,
  preferredUnit: PreferredWeightUnit,
  lang: 'en' | 'ar' = 'en'
): ExerciseSessionRecord | null {
  const validSets = (entry.sets || []).filter((s) => s.reps > 0 || (s.weight !== null && s.weight > 0) || (s.caloriesBurned && s.caloriesBurned > 0));
  if (validSets.length === 0 && (!entry.sets || entry.sets.length === 0)) return null;

  const setsToUse = validSets.length > 0 ? validSets : entry.sets || [];

  let bestWeightSet: SetEntry = setsToUse[0] || { id: '1', setNumber: 1, weight: 0, reps: 0, completed: true };
  let bestRepsSet: SetEntry = setsToUse[0] || { id: '1', setNumber: 1, weight: 0, reps: 0, completed: true };

  let totalCalories = entry.caloriesBurned || 0;

  for (const s of setsToUse) {
    if (s.caloriesBurned) {
      totalCalories += s.caloriesBurned;
    }
    const sWeight = entry.weightType === 'none' ? 0 : s.weight ?? 0;
    const bestW = entry.weightType === 'none' ? 0 : bestWeightSet.weight ?? 0;

    if (sWeight > bestW || (sWeight === bestW && s.reps > bestWeightSet.reps)) {
      bestWeightSet = s;
    }

    if (
      s.reps > bestRepsSet.reps ||
      (s.reps === bestRepsSet.reps && sWeight > (bestRepsSet.weight ?? 0))
    ) {
      bestRepsSet = s;
    }
  }

  const normalizedBestWeight =
    entry.weightType === 'none'
      ? 0
      : convertWeight(bestWeightSet.weight, entry.weightType, preferredUnit);

  return {
    workoutId: workout.id,
    actualDate: workout.actualDate,
    formattedDate: formatShortDate(workout.actualDate, lang),
    startTimestamp: workout.startTimestamp,
    weightType: entry.weightType,
    sets: setsToUse,
    notes: entry.notes || '',
    bestWeightSet,
    bestRepsSet,
    normalizedBestWeight,
    maxReps: bestRepsSet?.reps || 0,
    totalSets: setsToUse.length,
    totalCalories,
  };
}

export function getExerciseProgressSummary(
  exerciseId: string,
  exerciseName: string,
  completedWorkouts: WorkoutSession[],
  preferredUnit: PreferredWeightUnit,
  timeframe: 'all' | 'month' | 'week' = 'all',
  lang: 'en' | 'ar' = 'en'
): ExerciseComparisonSummary {
  const now = new Date();
  let cutoffDateStr = '0000-00-00';

  if (timeframe === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 28);
    cutoffDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } else if (timeframe === 'month') {
    const d = new Date(now);
    d.setDate(d.getDate() - 90);
    cutoffDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const sortedWorkouts = [...completedWorkouts]
    .filter((w) => w.status === 'completed' && w.actualDate >= cutoffDateStr)
    .sort((a, b) => {
      if (a.actualDate !== b.actualDate) {
        return a.actualDate.localeCompare(b.actualDate);
      }
      return a.startTimestamp - b.startTimestamp;
    });

  const records: ExerciseSessionRecord[] = [];

  for (const w of sortedWorkouts) {
    for (const entry of w.exercises || []) {
      if (entry.exerciseId === exerciseId) {
        const rec = analyzeExerciseEntry(w, entry, preferredUnit, lang);
        if (rec) {
          records.push(rec);
        }
      }
    }
  }

  const isCardio = records.some((r) => r.weightType === 'none' && r.sets.some((s) => s.reps > 5));

  if (records.length === 0) {
    return {
      exerciseId,
      exerciseName,
      totalSessions: 0,
      lastPerformedDate: null,
      isBodyweightOnly: false,
      isCardio: false,
      bestWeightRecord: null,
      bestRepsRecord: null,
      currentSession: null,
      previousSession: null,
      comparisonDelta: null,
      historyChronological: [],
    };
  }

  const isBodyweightOnly = records.every((r) => r.weightType === 'none');

  let bestWeightRecord: ExerciseComparisonSummary['bestWeightRecord'] = null;
  let bestRepsRecord: ExerciseComparisonSummary['bestRepsRecord'] = null;

  for (const rec of records) {
    if (rec.bestWeightSet && rec.weightType !== 'none') {
      const normKg = convertWeight(rec.bestWeightSet.weight, rec.weightType, 'kg');
      if (
        !bestWeightRecord ||
        normKg > bestWeightRecord.normalizedKg ||
        (normKg === bestWeightRecord.normalizedKg &&
          rec.bestWeightSet.reps > bestWeightRecord.reps)
      ) {
        bestWeightRecord = {
          weight: rec.bestWeightSet.weight,
          unit: rec.weightType,
          reps: rec.bestWeightSet.reps,
          actualDate: rec.actualDate,
          normalizedKg: normKg,
        };
      }
    }

    if (rec.bestRepsSet) {
      if (
        !bestRepsRecord ||
        rec.bestRepsSet.reps > bestRepsRecord.reps ||
        (rec.bestRepsSet.reps === bestRepsRecord.reps &&
          (rec.bestRepsSet.weight ?? 0) > (bestRepsRecord.weight ?? 0))
      ) {
        bestRepsRecord = {
          reps: rec.bestRepsSet.reps,
          weight: rec.bestRepsSet.weight,
          unit: rec.weightType,
          actualDate: rec.actualDate,
        };
      }
    }
  }

  const currentSession = records[records.length - 1];
  const previousSession = records.length >= 2 ? records[records.length - 2] : null;

  let comparisonDelta: ExerciseComparisonSummary['comparisonDelta'] = null;
  if (currentSession && previousSession && currentSession.bestWeightSet && previousSession.bestWeightSet) {
    const sameUnit = currentSession.weightType === previousSession.weightType;
    const curW = currentSession.bestWeightSet.weight ?? 0;
    const prevW = previousSession.bestWeightSet.weight ?? 0;

    const weightDiffOriginal =
      sameUnit && currentSession.weightType !== 'none'
        ? Number((curW - prevW).toFixed(2))
        : null;

    const weightDiffNormalized = Number(
      (currentSession.normalizedBestWeight - previousSession.normalizedBestWeight).toFixed(2)
    );

    const repsDiff = currentSession.bestWeightSet.reps - previousSession.bestWeightSet.reps;

    comparisonDelta = {
      hasPrevious: true,
      sameUnit,
      weightDiffOriginal,
      weightDiffNormalized,
      repsDiff,
      unitLabel: sameUnit
        ? currentSession.weightType === 'none'
          ? 'Bodyweight'
          : currentSession.weightType
        : preferredUnit,
    };
  }

  return {
    exerciseId,
    exerciseName,
    totalSessions: records.length,
    lastPerformedDate: currentSession.actualDate,
    isBodyweightOnly,
    isCardio,
    bestWeightRecord,
    bestRepsRecord,
    currentSession,
    previousSession,
    comparisonDelta,
    historyChronological: records,
  };
}

export function getLastPerformanceForExercise(
  exerciseId: string,
  completedWorkouts: WorkoutSession[]
): {
  actualDate: string;
  weightType: WeightUnit;
  sets: SetEntry[];
  bestSet: SetEntry;
} | null {
  const sorted = [...completedWorkouts]
    .filter((w) => w.status === 'completed')
    .sort((a, b) => {
      if (b.actualDate !== a.actualDate) {
        return b.actualDate.localeCompare(a.actualDate);
      }
      return b.startTimestamp - a.startTimestamp;
    });

  for (const w of sorted) {
    for (const ex of w.exercises || []) {
      if (ex.exerciseId === exerciseId && ex.sets && ex.sets.length > 0) {
        let bestSet = ex.sets[0];
        for (const s of ex.sets) {
          const sw = ex.weightType === 'none' ? 0 : s.weight ?? 0;
          const bw = ex.weightType === 'none' ? 0 : bestSet.weight ?? 0;
          if (sw > bw || (sw === bw && s.reps > bestSet.reps)) {
            bestSet = s;
          }
        }
        return {
          actualDate: w.actualDate,
          weightType: ex.weightType,
          sets: ex.sets,
          bestSet,
        };
      }
    }
  }
  return null;
}
