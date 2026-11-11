// DOTS points. Coefficients and bodyweight limits are from the OpenPowerlifting source
// (crates/coefficients/src/dots.rs), written by Tim Konertz for the German IPF affiliate BVDK.
// OpenPowerlifting releases that code under a permissive licence that requires the copyright
// notice to be kept: Copyright (c) 2020 The OpenPowerlifting Project.

export type Sex = 'M' | 'F';

const COEFFICIENTS = {
  M: { a: -307.75076, b: 24.0900756, c: -0.1918759221, d: 0.0007391293, e: -0.000001093, min: 40, max: 210 },
  F: { a: -57.96288, b: 13.6175032, c: -0.1126655495, d: 0.0005158568, e: -0.0000010706, min: 40, max: 150 },
} as const;

/** Bodyweights outside the range the formula was fitted on are treated as the nearest limit. */
export const bodyweightLimits = (sex: Sex) => ({ min: COEFFICIENTS[sex].min, max: COEFFICIENTS[sex].max });
export const isClamped = (bodyweightKg: number, sex: Sex) => {
  const { min, max } = bodyweightLimits(sex);
  return bodyweightKg < min || bodyweightKg > max;
};

export const dotsCoefficient = (bodyweightKg: number, sex: Sex): number => {
  const k = COEFFICIENTS[sex];
  const x = Math.min(Math.max(bodyweightKg, k.min), k.max);
  return 500 / (k.a + k.b * x + k.c * x ** 2 + k.d * x ** 3 + k.e * x ** 4);
};

export const dots = (totalKg: number, bodyweightKg: number, sex: Sex): number => totalKg * dotsCoefficient(bodyweightKg, sex);
export const totalForDots = (score: number, bodyweightKg: number, sex: Sex): number => score / dotsCoefficient(bodyweightKg, sex);
