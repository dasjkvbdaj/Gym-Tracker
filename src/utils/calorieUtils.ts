import { WorkoutSession } from '../types/workout';

export function calculateWorkoutMetrics(session: WorkoutSession, currentBodyWeightKg: number = 115) {
  let activeLiftingSeconds = 0;
  let totalRestSeconds = 0;

  session.exercises.forEach((exercise) => {
    if (exercise.muscleGroup === 'Cardio' || exercise.exerciseNameSnapshot.toLowerCase().includes('cardio')) {
      return;
    }

    exercise.sets.forEach((set) => {
      if (set.startedAt && set.completedAt && set.completedAt > set.startedAt) {
        activeLiftingSeconds += Math.floor((set.completedAt - set.startedAt) / 1000);
      } else {
        activeLiftingSeconds += 45; // افتراضي في حال السجلات القديمة
      }

      if (set.restSecondsBefore && set.restSecondsBefore > 0) {
        totalRestSeconds += set.restSecondsBefore;
      }
    });
  });

  const activeMinutes = activeLiftingSeconds / 60;
  const restMinutes = totalRestSeconds / 60;

  const metLift = 5.5; // الجهد الفعلي للحديد
  const metRest = 2.5; // وقت الراحة والتعافي

  const weightToUse = session.userWeightAtWorkout || currentBodyWeightKg;

  const caloriesLift = metLift * 3.5 * (weightToUse / 200) * activeMinutes;
  const caloriesRest = metRest * 3.5 * (weightToUse / 200) * restMinutes;

  const totalCalories = Math.round(caloriesLift + caloriesRest);

  return {
    activeLiftingSeconds,
    totalRestSeconds,
    activeMinutes: Math.round(activeMinutes * 10) / 10,
    restMinutes: Math.round(restMinutes * 10) / 10,
    totalCalories: Math.max(10, totalCalories),
    weightUsed: weightToUse,
  };
}
