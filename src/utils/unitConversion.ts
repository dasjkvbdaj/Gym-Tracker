import { PreferredWeightUnit, WeightUnit } from '../types/workout';

export const LB_TO_KG_FACTOR = 0.45359237;

export function lbsToKg(lbs: number): number {
  return lbs * LB_TO_KG_FACTOR;
}

export function kgToLbs(kg: number): number {
  return kg / LB_TO_KG_FACTOR;
}

/**
 * Normalizes a weight value into a target unit ('kg' or 'lbs') for internal comparison only.
 * Never mutates historical stored data.
 */
export function convertWeight(
  weight: number | null,
  fromUnit: WeightUnit,
  toUnit: PreferredWeightUnit
): number {
  if (weight === null || weight === undefined || fromUnit === 'none') {
    return 0;
  }
  if (fromUnit === toUnit) {
    return weight;
  }
  if (fromUnit === 'lbs' && toUnit === 'kg') {
    return Number((weight * LB_TO_KG_FACTOR).toFixed(2));
  }
  if (fromUnit === 'kg' && toUnit === 'lbs') {
    return Number((weight / LB_TO_KG_FACTOR).toFixed(2));
  }
  return weight;
}

/**
 * Formats a weight value and unit in its original recorded unit
 */
export function formatOriginalWeight(
  weight: number | null,
  unit: WeightUnit,
  lang: 'en' | 'ar' = 'en'
): string {
  if (unit === 'none' || weight === null || weight === undefined) {
    return lang === 'ar' ? 'وزن الجسم' : 'Bodyweight';
  }
  const cleanNum = Number.isInteger(weight) ? weight.toString() : Number(weight.toFixed(2)).toString();
  return `${cleanNum} ${unit}`;
}

/**
 * Formats a set as "100 lbs × 12 reps" or "Bodyweight × 15 reps"
 */
export function formatSetPerformance(
  weight: number | null,
  unit: WeightUnit,
  reps: number,
  lang: 'en' | 'ar' = 'en'
): string {
  const repsLabel = lang === 'ar' ? 'عدات' : 'reps';
  if (unit === 'none' || weight === null) {
    const bw = lang === 'ar' ? 'وزن الجسم' : 'Bodyweight';
    return `${bw} × ${reps} ${repsLabel}`;
  }
  const cleanWeight = Number.isInteger(weight) ? weight.toString() : Number(weight.toFixed(2)).toString();
  return `${cleanWeight} ${unit} × ${reps} ${repsLabel}`;
}
