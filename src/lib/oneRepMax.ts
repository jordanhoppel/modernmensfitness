// One-rep-max estimation shared by the calculator script and the static charts,
// so the numbers on the page and in the tables can never disagree.

export type Formula = { key: string; name: string; estimate: (weight: number, reps: number) => number };

export const FORMULAS: Formula[] = [
  { key: 'epley', name: 'Epley', estimate: (w, r) => w * (1 + r / 30) },
  { key: 'brzycki', name: 'Brzycki', estimate: (w, r) => (w * 36) / (37 - r) },
  { key: 'lombardi', name: 'Lombardi', estimate: (w, r) => w * Math.pow(r, 0.1) },
  { key: 'mayhew', name: 'Mayhew', estimate: (w, r) => (100 * w) / (52.2 + 41.9 * Math.exp(-0.055 * r)) },
  { key: 'oconner', name: "O'Conner", estimate: (w, r) => w * (1 + r / 40) },
  { key: 'wathan', name: 'Wathan', estimate: (w, r) => (100 * w) / (48.8 + 53.8 * Math.exp(-0.075 * r)) },
];

/** Above this many reps every formula drifts, so the page warns instead of pretending. */
export const MAX_RELIABLE_REPS = 10;
export const MAX_REPS = 30;

/** A single rep IS the max. The formulas overshoot it (Mayhew reads about 9% high at 1 rep). */
export const estimateOneRepMax = (weight: number, reps: number): number => {
  if (reps <= 1) return weight;
  const total = FORMULAS.reduce((sum, f) => sum + f.estimate(weight, reps), 0);
  return total / FORMULAS.length;
};

export const perFormula = (weight: number, reps: number) =>
  FORMULAS.map((f) => ({ name: f.name, value: reps <= 1 ? weight : f.estimate(weight, reps) }));
