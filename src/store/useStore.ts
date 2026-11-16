import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { BASE_FOODS } from '../data/foods';
import { enrichWithTaco } from '../data/taco';
import { buildInitialPlan, CHICKEN_DISHES, V1_DINNERS } from '../data/initialPlan';
import { todayKey, weekdayIndex } from '../lib/dates';
import { uid } from '../lib/format';
import { snapshot } from '../lib/nutrition';
import type {
  ExerciseEntry, Food, Goals, LogEntry, MealType, PlanItem, Profile, SavedMeal, Settings,
  ShoppingCategory, ShoppingState, Supplement, WeekPlan, WeightEntry,
} from '../types';
import { localAdapter, STORAGE_KEY } from './storage';

const baseIndex = Object.fromEntries(BASE_FOODS.map((f) => [f.id, enrichWithTaco(f)]));

const DIET_V1 = 'Pescetariana (peixes, frutos do mar, ovos e laticínios)';
const DIET_V2 = 'Pescetariana + frango ocasional (peito grelhado); sem carne bovina e suína';

export const DEFAULT_PROFILE: Profile = {
  name: '',
  sex: 'm',
  age: 25,
  height: 174,
  weight: 78,
  activity: 'Cardio e esportes 3–4×/semana, 30–60 min',
  activityFactor: 1.5,
  goal: 'Perder gordura corporal preservando massa muscular',
  diet: DIET_V2,
  budget: 'Intermediário',
};
export const DEFAULT_GOALS: Goals = { kcal: 2200, p: 145, c: 250, f: 70, fiber: 30, water: 2800 };
export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  reduceMotion: false,
  glassMl: 250,
  excludedTerms: [],
  allowChicken: true,
  preferredFoods: [],
  notificationsEnabled: false,
  reminders: [
    { id: 'r1', label: 'Café da manhã', time: '07:30', enabled: false },
    { id: 'r2', label: 'Almoço', time: '12:30', enabled: false },
    { id: 'r3', label: 'Lanche', time: '16:00', enabled: false },
    { id: 'r4', label: 'Jantar', time: '20:00', enabled: false },
    { id: 'r5', label: 'Beber água', time: '10:00', enabled: false },
    { id: 'r6', label: 'Pesagem semanal (segunda)', time: '07:00', enabled: false },
  ],
};
const EMPTY_SHOPPING: ShoppingState = { checked: {}, overrides: {}, removed: {}, manual: [] };

export interface AppState {
  version: number;
  profile: Profile;
  goals: Goals;
  settings: Settings;
  foods: Record<string, Food>;
  plan: WeekPlan;
  log: LogEntry[];
  water: Record<string, number>;
  weights: WeightEntry[];
  exercises: ExerciseEntry[];
  supplements: Supplement[];
  savedMeals: SavedMeal[];
  shopping: ShoppingState;
  welcomed: boolean;

  // perfil / metas / preferências
  setProfile: (p: Partial<Profile>) => void;
  setGoals: (g: Partial<Goals>) => void;
  setSettings: (s: Partial<Settings>) => void;
  setWelcomed: () => void;

  // alimentos
  upsertFood: (f: Food) => void;
  deleteFood: (id: string) => void;
  restoreFood: (id: string) => void;

  // cardápio
  setItemQty: (day: number, meal: MealType, itemId: string, qty: number) => void;
  replaceItem: (day: number, meal: MealType, itemId: string, foodId: string, qty: number) => void;
  addPlanItem: (day: number, meal: MealType, foodId: string, qty: number) => void;
  removePlanItem: (day: number, meal: MealType, itemId: string) => void;
  duplicateMeal: (fromDay: number, meal: MealType, toDays: number[], toMeal?: MealType) => void;
  duplicateDay: (fromDay: number, toDays: number[]) => void;
  resetPlan: () => void;

  // registros
  addLog: (e: Omit<LogEntry, 'id' | 'createdAt'>) => void;
  addFoodLog: (date: string, meal: MealType, foodId: string, qty: number, origin?: LogEntry['origin'], note?: string) => void;
  updateLog: (id: string, patch: Partial<LogEntry>) => void;
  removeLog: (id: string) => void;
  toggleMealDone: (date: string, meal: MealType) => void;
  togglePlanItem: (date: string, meal: MealType, item: PlanItem) => void;
  saveMeal: (name: string, items: { foodId: string; qty: number }[]) => void;
  deleteSavedMeal: (id: string) => void;
  logSavedMeal: (id: string, date: string, meal: MealType) => void;

  // água
  addWater: (date: string, ml: number) => void;
  setWater: (date: string, ml: number) => void;

  // corpo / treino / suplementos
  upsertWeight: (w: Omit<WeightEntry, 'id'> & { id?: string }) => void;
  removeWeight: (id: string) => void;
  upsertExercise: (e: Omit<ExerciseEntry, 'id'> & { id?: string }) => void;
  removeExercise: (id: string) => void;
  upsertSupplement: (s: Omit<Supplement, 'id'> & { id?: string }) => void;
  removeSupplement: (id: string) => void;

  // compras
  toggleShop: (key: string) => void;
  setShopOverride: (key: string, qty: string) => void;
  removeShop: (key: string) => void;
  restoreShop: () => void;
  addShopManual: (name: string, qty: string, category: ShoppingCategory) => void;
  toggleShopManual: (id: string) => void;
  removeShopManual: (id: string) => void;
  clearShopping: () => void;

  // dados
  importData: (json: string) => void;
  resetAll: () => void;
}

const freshData = () => ({
  version: 1,
  profile: DEFAULT_PROFILE,
  goals: DEFAULT_GOALS,
  settings: DEFAULT_SETTINGS,
  foods: { ...baseIndex },
  plan: buildInitialPlan(),
  log: [] as LogEntry[],
  water: {} as Record<string, number>,
  // peso informado no perfil inicial — registro real fornecido pelo usuário
  weights: [{ id: 'w0', date: todayKey(), weight: 78, note: 'Peso inicial informado no perfil' }] as WeightEntry[],
  exercises: [] as ExerciseEntry[],
  supplements: [] as Supplement[],
  savedMeals: CHICKEN_DISHES.map((d) => ({ ...d, items: [...d.items] })) as SavedMeal[],
  shopping: EMPTY_SHOPPING,
  welcomed: false,
});

const mapMeal = (plan: WeekPlan, day: number, meal: MealType, fn: (items: PlanItem[]) => PlanItem[]): WeekPlan =>
  plan.map((d, i) => (i !== day ? d : d.map((m) => (m.type === meal ? { ...m, items: fn(m.items) } : m))));

const cloneItems = (items: PlanItem[]) => items.map((it) => ({ ...it, id: uid() }));

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...freshData(),

      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      setGoals: (g) => set((s) => ({ goals: { ...s.goals, ...g } })),
      setSettings: (x) => set((s) => ({ settings: { ...s.settings, ...x } })),
      setWelcomed: () => set({ welcomed: true }),

      upsertFood: (f) => set((s) => ({ foods: { ...s.foods, [f.id]: f } })),
      deleteFood: (id) =>
        set((s) => {
          const foods = { ...s.foods };
          delete foods[id];
          return { foods };
        }),
      restoreFood: (id) => set((s) => (baseIndex[id] ? { foods: { ...s.foods, [id]: baseIndex[id] } } : {})),

      setItemQty: (day, meal, itemId, qty) =>
        set((s) => ({ plan: mapMeal(s.plan, day, meal, (items) => items.map((i) => (i.id === itemId ? { ...i, qty } : i))) })),
      replaceItem: (day, meal, itemId, foodId, qty) =>
        set((s) => ({ plan: mapMeal(s.plan, day, meal, (items) => items.map((i) => (i.id === itemId ? { ...i, foodId, qty, note: undefined } : i))) })),
      addPlanItem: (day, meal, foodId, qty) =>
        set((s) => ({ plan: mapMeal(s.plan, day, meal, (items) => [...items, { id: uid(), foodId, qty }]) })),
      removePlanItem: (day, meal, itemId) =>
        set((s) => ({ plan: mapMeal(s.plan, day, meal, (items) => items.filter((i) => i.id !== itemId)) })),
      duplicateMeal: (fromDay, meal, toDays, toMeal) =>
        set((s) => {
          const src = s.plan[fromDay].find((m) => m.type === meal)!;
          let plan = s.plan;
          for (const d of toDays) plan = mapMeal(plan, d, toMeal ?? meal, () => cloneItems(src.items));
          return { plan };
        }),
      duplicateDay: (fromDay, toDays) =>
        set((s) => ({
          plan: s.plan.map((d, i) => (toDays.includes(i) ? s.plan[fromDay].map((m) => ({ ...m, items: cloneItems(m.items) })) : d)),
        })),
      resetPlan: () => set({ plan: buildInitialPlan() }),

      addLog: (e) => set((s) => ({ log: [...s.log, { ...e, id: uid(), createdAt: Date.now() }] })),
      addFoodLog: (date, meal, foodId, qty, origin = 'manual', note) => {
        const f = get().foods[foodId];
        if (!f) return;
        get().addLog({
          date, meal, foodId, name: f.name, qty, unit: f.unit, ...snapshot(f, qty), origin, note,
          estimated: f.source === 'Estimado' || f.source === 'Rótulo',
        });
      },
      updateLog: (id, patch) =>
        set((s) => ({
          log: s.log.map((e) => {
            if (e.id !== id) return e;
            const next = { ...e, ...patch };
            // quantidade alterada → recalcula a partir do alimento
            if (patch.qty !== undefined && e.foodId && s.foods[e.foodId] && !patch.macros) {
              Object.assign(next, snapshot(s.foods[e.foodId], patch.qty));
            }
            return next;
          }),
        })),
      removeLog: (id) => set((s) => ({ log: s.log.filter((e) => e.id !== id) })),
      toggleMealDone: (date, meal) => {
        const s = get();
        const existing = s.log.filter((e) => e.date === date && e.meal === meal && e.origin === 'plano');
        if (existing.length) {
          const ids = new Set(existing.map((e) => e.id));
          set({ log: s.log.filter((e) => !ids.has(e.id)) });
          return;
        }
        const pm = s.plan[weekdayIndex(date)].find((m) => m.type === meal)!;
        const now = Date.now();
        const add: LogEntry[] = pm.items
          .filter((it) => s.foods[it.foodId])
          .map((it, i) => {
            const f = s.foods[it.foodId];
            return {
              id: uid(), date, meal, foodId: f.id, name: f.name, qty: it.qty, unit: f.unit,
              ...snapshot(f, it.qty), origin: 'plano', planItemId: it.id, createdAt: now + i,
              estimated: f.source === 'Estimado' || f.source === 'Rótulo',
            };
          });
        set({ log: [...s.log, ...add] });
      },
      togglePlanItem: (date, meal, item) => {
        const s = get();
        const ex = s.log.find((e) => e.date === date && e.meal === meal && e.planItemId === item.id);
        if (ex) return set({ log: s.log.filter((e) => e.id !== ex.id) });
        const f = s.foods[item.foodId];
        if (!f) return;
        set({
          log: [...s.log, {
            id: uid(), date, meal, foodId: f.id, name: f.name, qty: item.qty, unit: f.unit, ...snapshot(f, item.qty),
            origin: 'plano', planItemId: item.id, createdAt: Date.now(), estimated: f.source === 'Estimado' || f.source === 'Rótulo',
          }],
        });
      },
      saveMeal: (name, items) => set((s) => ({ savedMeals: [...s.savedMeals, { id: uid(), name, items }] })),
      deleteSavedMeal: (id) => set((s) => ({ savedMeals: s.savedMeals.filter((m) => m.id !== id) })),
      logSavedMeal: (id, date, meal) => {
        const sm = get().savedMeals.find((m) => m.id === id);
        sm?.items.forEach((it) => get().addFoodLog(date, meal, it.foodId, it.qty, 'manual', sm.name));
      },

      addWater: (date, ml) => set((s) => ({ water: { ...s.water, [date]: Math.max(0, (s.water[date] ?? 0) + ml) } })),
      setWater: (date, ml) => set((s) => ({ water: { ...s.water, [date]: Math.max(0, ml) } })),

      upsertWeight: (w) =>
        set((s) => {
          const id = w.id ?? uid();
          const list = s.weights.some((x) => x.id === id) ? s.weights.map((x) => (x.id === id ? { ...w, id } : x)) : [...s.weights, { ...w, id }];
          list.sort((a, b) => a.date.localeCompare(b.date));
          const latest = list[list.length - 1];
          return { weights: list, profile: latest ? { ...s.profile, weight: latest.weight } : s.profile };
        }),
      removeWeight: (id) =>
        set((s) => {
          const list = s.weights.filter((x) => x.id !== id);
          const latest = list[list.length - 1];
          return { weights: list, profile: latest ? { ...s.profile, weight: latest.weight } : s.profile };
        }),
      upsertExercise: (e) =>
        set((s) => {
          const id = e.id ?? uid();
          const list = s.exercises.some((x) => x.id === id) ? s.exercises.map((x) => (x.id === id ? { ...e, id } : x)) : [...s.exercises, { ...e, id }];
          return { exercises: list.sort((a, b) => b.date.localeCompare(a.date)) };
        }),
      removeExercise: (id) => set((s) => ({ exercises: s.exercises.filter((x) => x.id !== id) })),
      upsertSupplement: (x) =>
        set((s) => {
          const id = x.id ?? uid();
          return { supplements: s.supplements.some((y) => y.id === id) ? s.supplements.map((y) => (y.id === id ? { ...x, id } : y)) : [...s.supplements, { ...x, id }] };
        }),
      removeSupplement: (id) => set((s) => ({ supplements: s.supplements.filter((x) => x.id !== id) })),

      toggleShop: (key) => set((s) => ({ shopping: { ...s.shopping, checked: { ...s.shopping.checked, [key]: !s.shopping.checked[key] } } })),
      setShopOverride: (key, qty) =>
        set((s) => {
          const overrides = { ...s.shopping.overrides };
          if (qty.trim()) overrides[key] = qty.trim();
          else delete overrides[key];
          return { shopping: { ...s.shopping, overrides } };
        }),
      removeShop: (key) => set((s) => ({ shopping: { ...s.shopping, removed: { ...s.shopping.removed, [key]: true } } })),
      restoreShop: () => set((s) => ({ shopping: { ...s.shopping, removed: {} } })),
      addShopManual: (name, qty, category) =>
        set((s) => ({ shopping: { ...s.shopping, manual: [...s.shopping.manual, { id: uid(), name, qty, category, checked: false }] } })),
      toggleShopManual: (id) =>
        set((s) => ({ shopping: { ...s.shopping, manual: s.shopping.manual.map((m) => (m.id === id ? { ...m, checked: !m.checked } : m)) } })),
      removeShopManual: (id) => set((s) => ({ shopping: { ...s.shopping, manual: s.shopping.manual.filter((m) => m.id !== id) } })),
      clearShopping: () => set((s) => ({ shopping: { ...EMPTY_SHOPPING, overrides: s.shopping.overrides } })),

      importData: (json) => {
        const data = JSON.parse(json);
        const st = data?.state ?? data;
        if (!st || typeof st !== 'object' || !Array.isArray(st.plan) || !st.foods) throw new Error('Arquivo não parece ser um backup deste app.');
        set({ ...freshData(), ...st, settings: { ...DEFAULT_SETTINGS, ...st.settings } });
      },
      resetAll: () => set({ ...freshData() }),
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      migrate: (persisted, from) => {
        const st = (persisted ?? {}) as Partial<AppState>;
        if (from < 2) {
          // v2: frango (peito grelhado) passa a fazer parte do padrão alimentar
          if (st.profile?.diet === DIET_V1) st.profile = { ...st.profile, diet: DIET_V2 };
          const existing = new Set((st.savedMeals ?? []).map((m) => m.id));
          st.savedMeals = [...(st.savedMeals ?? []), ...CHICKEN_DISHES.filter((d) => !existing.has(d.id))];
          // troca os jantares de quarta e domingo só se ainda estiverem como no plano original
          if (Array.isArray(st.plan)) {
            const fresh = buildInitialPlan();
            st.plan = st.plan.map((day, d) => {
              const v1 = V1_DINNERS[d];
              if (!v1) return day;
              return day.map((m) => (m.type === 'jantar' && m.items.map((i) => i.foodId).join() === v1.join() ? fresh[d].find((x) => x.type === 'jantar')! : m));
            });
          }
        }
        return st as AppState;
      },
      storage: createJSONStorage(() => localAdapter),
      partialize: (s) => {
        const { version, profile, goals, settings, foods, plan, log, water, weights, exercises, supplements, savedMeals, shopping, welcomed } = s;
        return { version, profile, goals, settings, foods, plan, log, water, weights, exercises, supplements, savedMeals, shopping, welcomed };
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        // base atualizada (novos itens, correções, micronutrientes) sem perder edições do usuário
        const foods: Record<string, Food> = { ...baseIndex };
        for (const [id, f] of Object.entries(p.foods ?? {})) {
          const b = baseIndex[id];
          if (b && !f.edited) continue;
          foods[id] = b ? { ...f, tacoId: b.tacoId, micro: b.micro, measures: b.measures } : f;
        }
        return { ...current, ...p, foods, settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) } };
      },
    },
  ),
);

export function exportJSON(): string {
  const s = useStore.getState();
  const { version, profile, goals, settings, foods, plan, log, water, weights, exercises, supplements, savedMeals, shopping, welcomed } = s;
  return JSON.stringify({ app: 'nutri-pessoal', exportedAt: new Date().toISOString(), state: { version, profile, goals, settings, foods, plan, log, water, weights, exercises, supplements, savedMeals, shopping, welcomed } }, null, 2);
}
