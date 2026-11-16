import type { Food, Goals, LogEntry, Macros, MealType, Micro, PlanMeal, Profile } from '../types';

export const ZERO: Macros = { kcal: 0, p: 0, c: 0, f: 0, fiber: 0 };

export const MEAL_LABEL: Record<MealType, string> = {
  cafe: 'Café da manhã',
  almoco: 'Almoço',
  lanche: 'Lanche da tarde',
  jantar: 'Jantar',
};
export const MEAL_ORDER: MealType[] = ['cafe', 'almoco', 'lanche', 'jantar'];
/** horário aproximado de referência para "próxima refeição" */
export const MEAL_HOUR: Record<MealType, number> = { cafe: 7, almoco: 12, lanche: 16, jantar: 20 };

export function scale(per100: Macros, qty: number): Macros {
  const k = qty / 100;
  return { kcal: per100.kcal * k, p: per100.p * k, c: per100.c * k, f: per100.f * k, fiber: per100.fiber * k };
}
export const MICRO_KEYS = ['ca', 'fe', 'zn', 'na', 'mg', 'k', 'vitc'] as const;
export function scaleMicro(m: Micro | undefined, qty: number): Micro | undefined {
  if (!m) return undefined;
  const k = qty / 100;
  const o = {} as Micro;
  for (const key of MICRO_KEYS) o[key] = m[key] === null ? null : m[key]! * k;
  return o;
}
/** Instantâneo nutricional de uma quantidade de alimento (macros + micronutrientes, se houver). */
export function snapshot(f: Food, qty: number): { macros: Macros; micro?: Micro } {
  return { macros: scale(f.per100, qty), micro: scaleMicro(f.micro, qty) };
}

export function add(a: Macros, b: Macros): Macros {
  return { kcal: a.kcal + b.kcal, p: a.p + b.p, c: a.c + b.c, f: a.f + b.f, fiber: a.fiber + b.fiber };
}
export const sum = (list: Macros[]) => list.reduce(add, ZERO);

export type FoodIndex = Record<string, Food>;

export function itemMacros(foods: FoodIndex, foodId: string, qty: number): Macros {
  const f = foods[foodId];
  return f ? scale(f.per100, qty) : ZERO;
}
export function mealMacros(foods: FoodIndex, meal: PlanMeal): Macros {
  return sum(meal.items.map((i) => itemMacros(foods, i.foodId, i.qty)));
}
export function dayMacros(foods: FoodIndex, day: PlanMeal[]): Macros {
  return sum(day.map((m) => mealMacros(foods, m)));
}
export function logTotals(entries: LogEntry[]): Macros {
  return sum(entries.map((e) => e.macros));
}

/** Mifflin-St Jeor — estimativa */
export function bmr(p: Profile): number {
  return 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'm' ? 5 : -161);
}
export const tdee = (p: Profile) => bmr(p) * p.activityFactor;

/** kcal a partir dos macros (4/4/9) — usado para checar coerência das metas */
export const kcalFromMacros = (g: Pick<Goals, 'p' | 'c' | 'f'>) => g.p * 4 + g.c * 4 + g.f * 9;

/** "Meta atingida": calorias entre 90% e 105% da meta e proteína ≥ 90% da meta */
export function metGoal(t: Macros, g: Goals): boolean {
  return t.kcal >= g.kcal * 0.9 && t.kcal <= g.kcal * 1.05 && t.p >= g.p * 0.9;
}

/** MET aproximados (Compêndio de Atividades Físicas) — só para estimativa exibida à parte */
export const EXERCISE_TYPES: { label: string; met: number }[] = [
  { label: 'Corrida', met: 9.8 },
  { label: 'Caminhada', met: 3.5 },
  { label: 'Bicicleta', met: 7.5 },
  { label: 'Natação', met: 7.0 },
  { label: 'Futebol', met: 7.0 },
  { label: 'Vôlei / Beach tennis', met: 5.0 },
  { label: 'Tênis / Padel', met: 7.3 },
  { label: 'Basquete', met: 6.5 },
  { label: 'Musculação', met: 5.0 },
  { label: 'HIIT / Funcional', met: 8.0 },
  { label: 'Cardio (esteira/elíptico)', met: 7.0 },
  { label: 'Yoga / Alongamento', met: 2.5 },
  { label: 'Outro', met: 5.0 },
];
export function exerciseKcal(type: string, minutes: number, weight: number, rpe: number): number {
  const base = EXERCISE_TYPES.find((t) => t.label === type)?.met ?? 5;
  const adj = base * (0.8 + (Math.min(10, Math.max(1, rpe)) / 10) * 0.4); // ±20% pela intensidade percebida
  return adj * weight * (minutes / 60);
}

/** Carnes que não fazem parte do padrão alimentar (bovina, suína e outras carnes terrestres). */
export const MEAT_TERMS = ['carne', 'bovin', 'boi', 'porco', 'suín', 'bacon', 'presunto', 'linguiça', 'salsicha', 'peru', 'picanha', 'costela', 'cordeiro', 'pato', 'salame', 'mortadela', 'calabresa', 'hambúrguer', 'hamburguer', 'cupim', 'alcatra', 'bife', 'contra filé', 'contrafilé', 'filé mignon', 'acém', 'músculo bovino', 'fígado bovino', 'charque', 'carne-seca', 'paio', 'toucinho', 'torresmo', 'mocotó', 'dobradinha', 'sarapatel', 'fraldinha', 'lagarto', 'bisteca', 'chuleta', 'coxão', 'patinho', 'maminha', 'pernil', 'chester', 'kafta'];
/** Frango: liberado por padrão (peito grelhado, consumo ocasional); pode ser desativado nos Ajustes. */
export const CHICKEN_TERMS = ['frango', 'galinha caipira', 'coxa', 'sobrecoxa', 'asa de'];

export function violatesDiet(name: string, extra: string[] = [], allowChicken = true): string | null {
  const n = name.toLowerCase();
  // "carne de soja", "carne de caranguejo/siri" não são carnes terrestres
  const cleaned = n.replace(/carne de (soja|caranguejo|siri|jaca)/g, '');
  const terms = [...MEAT_TERMS, ...(allowChicken ? [] : CHICKEN_TERMS), ...extra.map((e) => e.toLowerCase()).filter(Boolean)];
  for (const t of terms) if (t && cleaned.includes(t)) return t;
  return null;
}

export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
