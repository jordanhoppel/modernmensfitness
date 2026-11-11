// RPE to percentage of 1RM, built the way the Tuchscherer (Reactive Training Systems) chart is built:
// the RPE 10 row says what percentage of 1RM you can lift for N reps taken to failure, and every lower
// RPE is that same row shifted by the reps you had left in reserve (RPE 8 = 2 reps left, so 5 reps at
// RPE 8 is the same load as 7 reps to failure). Individual lifters differ by a few percent either way.

/** Percent of 1RM for 1..12 reps taken to failure (the RPE 10 row). */
const FAILURE_ROW = [100, 95.5, 92.2, 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68.0];

export const MAX_REPS_TO_FAILURE = FAILURE_ROW.length;
export const RPE_VALUES = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6];

/** Percent of 1RM for `reps` at `rpe`, or null when it is outside the chart (more than 12 reps to failure). */
export const percentOfOneRepMax = (reps: number, rpe: number): number | null => {
  const toFailure = reps + (10 - rpe);
  if (reps < 1 || toFailure < 1 || toFailure > MAX_REPS_TO_FAILURE) return null;
  const lo = Math.floor(toFailure);
  const hi = Math.ceil(toFailure);
  const a = FAILURE_ROW[lo - 1];
  const b = FAILURE_ROW[hi - 1];
  return a + (b - a) * (toFailure - lo); // half-RPE steps land halfway between two rows
};

export const weightForSet = (oneRepMax: number, reps: number, rpe: number): number | null => {
  const pct = percentOfOneRepMax(reps, rpe);
  return pct === null ? null : (oneRepMax * pct) / 100;
};

export const estimateOneRepMax = (weight: number, reps: number, rpe: number): number | null => {
  const pct = percentOfOneRepMax(reps, rpe);
  return pct === null ? null : (weight * 100) / pct;
};

/** What each RPE number means in reps left in the tank. */
export const RPE_MEANINGS: { rpe: string; left: string; feel: string }[] = [
  { rpe: '10', left: '0', feel: 'Maximum effort. No more reps possible.' },
  { rpe: '9.5', left: '0, maybe a little more weight', feel: 'No more reps, but you could have added a small amount of weight.' },
  { rpe: '9', left: '1', feel: 'One more rep was possible.' },
  { rpe: '8.5', left: '1 to 2', feel: 'One rep for sure, maybe two.' },
  { rpe: '8', left: '2', feel: 'Two more reps were possible. Fast bar speed, still grinding the last rep.' },
  { rpe: '7.5', left: '2 to 3', feel: 'Two reps for sure, maybe three.' },
  { rpe: '7', left: '3', feel: 'Three more reps were possible. The bar moves fast.' },
  { rpe: '6', left: '4', feel: 'Light. Good for speed work and warm-ups.' },
];
