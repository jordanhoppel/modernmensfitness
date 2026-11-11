// Nutrition calculator maths shared by every page under /nutrition-calculators/.
// Sources are listed on the pages themselves. Short version:
//  - BMR: Mifflin-St Jeor (Mifflin et al., Am J Clin Nutr 1990). Frankenfield et al. (2005) found it the most
//    reliable of four common equations, still only approximate for any one person.
//  - BMR with a known body fat %: Katch-McArdle (McArdle, Katch and Katch, Exercise Physiology).
//  - Body fat: US Navy circumference method (Hodgdon and Beckett, 1984), inches.
//  - Protein: RDA 0.8 g/kg (Institute of Medicine); ISSN position stand 2017 (Jager et al.); Morton et al. 2018.

export type Sex = 'M' | 'F';
export const LB_PER_KG = 2.20462262;
export const CM_PER_IN = 2.54;
export const KCAL_PER_KG_FAT = 7700; // the 3,500 kcal per pound rule, which overestimates (Hall and Chow, 2013)
export const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;

export const ACTIVITY_LEVELS = [
  { key: 'sedentary', factor: 1.2, label: 'Sedentary', detail: 'Desk job, little or no exercise' },
  { key: 'light', factor: 1.375, label: 'Lightly active', detail: 'Light exercise or sport 1 to 3 days a week' },
  { key: 'moderate', factor: 1.55, label: 'Moderately active', detail: 'Moderate exercise or sport 3 to 5 days a week' },
  { key: 'very', factor: 1.725, label: 'Very active', detail: 'Hard exercise or sport 6 to 7 days a week' },
  { key: 'extra', factor: 1.9, label: 'Extra active', detail: 'Very hard training twice a day, or a physical job plus training' },
] as const;

export const mifflinBmr = (sex: Sex, weightKg: number, heightCm: number, ageYears: number): number =>
  10 * weightKg + 6.25 * heightCm - 5 * ageYears + (sex === 'M' ? 5 : -161);

export const katchMcArdleBmr = (leanMassKg: number): number => 370 + 21.6 * leanMassKg;

export const leanMassKg = (weightKg: number, bodyFatPct: number): number => weightKg * (1 - bodyFatPct / 100);

export const tdee = (bmr: number, activityFactor: number): number => bmr * activityFactor;

/** US Navy body fat %. Measurements in inches; hip is only used for women. Null when the log argument is not positive. */
export const navyBodyFat = (sex: Sex, heightIn: number, neckIn: number, waistIn: number, hipIn = 0): number | null => {
  if (sex === 'M') {
    const x = waistIn - neckIn;
    if (x <= 0 || heightIn <= 0) return null;
    return 86.01 * Math.log10(x) - 70.041 * Math.log10(heightIn) + 36.76;
  }
  const x = waistIn + hipIn - neckIn;
  if (x <= 0 || heightIn <= 0) return null;
  return 163.205 * Math.log10(x) - 97.684 * Math.log10(heightIn) - 78.387;
};

/** American Council on Exercise categories, as widely published. Upper bounds are exclusive. */
export const BODY_FAT_CATEGORIES: Record<Sex, { label: string; from: number; to: number }[]> = {
  M: [
    { label: 'Essential fat', from: 2, to: 6 },
    { label: 'Athletes', from: 6, to: 14 },
    { label: 'Fitness', from: 14, to: 18 },
    { label: 'Average', from: 18, to: 25 },
    { label: 'Obese', from: 25, to: 100 },
  ],
  F: [
    { label: 'Essential fat', from: 10, to: 14 },
    { label: 'Athletes', from: 14, to: 21 },
    { label: 'Fitness', from: 21, to: 25 },
    { label: 'Average', from: 25, to: 32 },
    { label: 'Obese', from: 32, to: 100 },
  ],
};
export const bodyFatCategory = (sex: Sex, pct: number): string => {
  const cats = BODY_FAT_CATEGORIES[sex];
  if (pct < cats[0].from) return 'Below the essential fat range';
  return cats.find((c) => pct >= c.from && pct < c.to)?.label ?? 'Obese';
};

export const PROTEIN_GOALS = {
  health: { label: 'General health, not training', low: 0.8, target: 0.8, high: 0.8, source: 'RDA, 0.8 g per kg' },
  active: { label: 'Exercise regularly or lift', low: 1.4, target: 1.7, high: 2.0, source: 'ISSN position stand, 1.4 to 2.0 g per kg' },
  muscle: { label: 'Build muscle with lifting', low: 1.6, target: 1.8, high: 2.0, source: 'Morton et al. 2018 (about 1.6 g per kg) and ISSN (up to 2.0)' },
  cut: { label: 'Lean and lifting hard in a calorie deficit', low: 2.3, target: 2.7, high: 3.1, source: 'ISSN position stand, 2.3 to 3.1 g per kg for lean resistance-trained people cutting' },
} as const;
export type ProteinGoal = keyof typeof PROTEIN_GOALS;

export const proteinGrams = (weightKg: number, goal: ProteinGoal) => {
  const g = PROTEIN_GOALS[goal];
  return { low: weightKg * g.low, target: weightKg * g.target, high: weightKg * g.high };
};

/** Calories needed to move `rateKgPerWeek` of body weight, spread over a day. */
export const dailyEnergyChange = (rateKgPerWeek: number): number => (rateKgPerWeek * KCAL_PER_KG_FAT) / 7;

export const weeksToGoal = (currentKg: number, goalKg: number, rateKgPerWeek: number): number =>
  rateKgPerWeek > 0 ? Math.abs(goalKg - currentKg) / rateKgPerWeek : Infinity;

export const calories = (proteinG: number, carbsG: number, fatG: number): number =>
  proteinG * KCAL_PER_G.protein + carbsG * KCAL_PER_G.carbs + fatG * KCAL_PER_G.fat;

/** Protein from g/kg, fat as a share of calories, carbs fill the rest. Carbs can come out negative when calories are too low. */
export const macroSplit = (targetCalories: number, weightKg: number, proteinPerKg: number, fatShare: number) => {
  const protein = weightKg * proteinPerKg;
  const fat = (targetCalories * fatShare) / KCAL_PER_G.fat;
  const carbs = (targetCalories - protein * KCAL_PER_G.protein - fat * KCAL_PER_G.fat) / KCAL_PER_G.carbs;
  return { protein, fat, carbs };
};
