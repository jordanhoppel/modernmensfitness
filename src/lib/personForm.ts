// Reads the shared PersonFields form on any nutrition calculator page.
import { CM_PER_IN, LB_PER_KG, type Sex } from './nutrition';

export type Units = 'imperial' | 'metric';
export type Person = { sex: Sex; age: number; heightCm: number; weightKg: number; activityFactor: number; bodyFatPct: number | null; units: Units };
export type ReadResult = { person: Person | null; error: string; incomplete: boolean };

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
const num = (id: string): number => parseFloat((el<HTMLInputElement>(id)?.value ?? '').trim());

export const state = { units: 'imperial' as Units, sex: 'M' as Sex };

const round = (n: number, dp = 1) => (Number.isFinite(n) ? String(Math.round(n * 10 ** dp) / 10 ** dp) : '');

function applyUnits(next: Units) {
  if (next === state.units) return;
  const w = num('weight');
  const ft = num('height-ft');
  const inch = num('height-in') || 0;
  const cm = num('height-cm');
  const weightInput = el<HTMLInputElement>('weight');
  if (weightInput && w > 0) weightInput.value = round(next === 'metric' ? w / LB_PER_KG : w * LB_PER_KG);
  if (next === 'metric' && ft > 0) el<HTMLInputElement>('height-cm')!.value = round((ft * 12 + inch) * CM_PER_IN);
  if (next === 'imperial' && cm > 0) {
    const totalIn = cm / CM_PER_IN;
    el<HTMLInputElement>('height-ft')!.value = String(Math.floor(totalIn / 12));
    el<HTMLInputElement>('height-in')!.value = round(totalIn % 12);
  }
  state.units = next;
  el('height-imperial')!.hidden = next === 'metric';
  el('height-metric')!.hidden = next === 'imperial';
  const label = el('weight-label');
  if (label) label.textContent = next === 'metric' ? 'Weight (kg)' : 'Weight (lb)';
}

export function initPerson(onChange: () => void) {
  document.querySelectorAll<HTMLButtonElement>('#units-seg .seg-btn').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('#units-seg .seg-btn').forEach((x) => x.classList.toggle('active', x === b));
    applyUnits(b.dataset.units as Units);
    onChange();
  }));
  document.querySelectorAll<HTMLButtonElement>('#sex-seg .seg-btn').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('#sex-seg .seg-btn').forEach((x) => x.classList.toggle('active', x === b));
    state.sex = b.dataset.sex as Sex;
    onChange();
  }));
  document.querySelectorAll('.nc input, .nc select').forEach((i) => i.addEventListener('input', onChange));
}

export function readPerson(): ReadResult {
  const age = num('age');
  const w = num('weight');
  const heightCm = state.units === 'metric' ? num('height-cm') : ((num('height-ft') || 0) * 12 + (num('height-in') || 0)) * CM_PER_IN;
  if (!(age > 0) || !(w > 0) || !(heightCm > 0)) return { person: null, error: '', incomplete: true };
  if (age < 18 || age > 100) return { person: null, error: 'These formulas were built on adults, so this calculator covers ages 18 to 100.', incomplete: false };
  const weightKg = state.units === 'metric' ? w : w / LB_PER_KG;
  if (weightKg < 30 || weightKg > 300) return { person: null, error: 'Enter a body weight between 66 and 660 lb (30 and 300 kg).', incomplete: false };
  if (heightCm < 120 || heightCm > 230) return { person: null, error: 'Enter a height between about 3 ft 11 in and 7 ft 7 in (120 and 230 cm).', incomplete: false };
  const bf = num('bodyfat');
  return {
    person: { sex: state.sex, age, heightCm, weightKg, activityFactor: el<HTMLSelectElement>('activity') ? parseFloat(el<HTMLSelectElement>('activity')!.value) : 1.55, bodyFatPct: bf > 0 ? bf : null, units: state.units },
    error: '', incomplete: false,
  };
}

/** Display helpers so results follow the unit the visitor chose. */
export const showWeight = (kg: number, units: Units) => (units === 'metric' ? `${round(kg)} kg` : `${round(kg * LB_PER_KG)} lb`);
export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
