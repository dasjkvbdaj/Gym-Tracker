export interface SetEntry {
  id: string;
  setNumber: number;
  weight: number | null;
  reps: number;
  completed: boolean;
  caloriesBurned?: number; // إضافة السعرات لكل مجموعة إن أردت دقة تفصيلية
}

export interface ExerciseEntry {
  id: string;
  exerciseId: string;
  exerciseNameSnapshot: string;
  muscleGroup: MuscleGroup;
  weightType: WeightUnit;
  sets: SetEntry[];
  caloriesBurned?: number; // إجمالي سعرات التمرين
  notes?: string;
}
