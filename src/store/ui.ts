import { create } from 'zustand';
import type { MealType } from '../types';
import { MEAL_HOUR, MEAL_ORDER } from '../lib/nutrition';
import { todayKey } from '../lib/dates';

export type Route = 'hoje' | 'cardapio' | 'registrar' | 'compras' | 'mais' | 'evolucao' | 'treinos' | 'nutrientes' | 'ajustes' | 'historico' | 'alimentos';
export const ROUTES: Route[] = ['hoje', 'cardapio', 'registrar', 'compras', 'mais', 'evolucao', 'treinos', 'nutrientes', 'ajustes', 'historico', 'alimentos'];

export function currentMealByTime(h = new Date().getHours()): MealType {
  let m: MealType = 'cafe';
  for (const t of MEAL_ORDER) if (h >= MEAL_HOUR[t] - 1.5) m = t;
  return m;
}

interface UI {
  route: Route;
  logDate: string;
  logMeal: MealType;
  menuDay: string;
  go: (r: Route, opts?: { date?: string; meal?: MealType }) => void;
  setLogTarget: (date: string, meal: MealType) => void;
  setMenuDay: (d: string) => void;
}

const fromHash = (): Route => {
  const h = window.location.hash.replace(/^#\/?/, '') as Route;
  return ROUTES.includes(h) ? h : 'hoje';
};

export const useUI = create<UI>((set) => ({
  route: fromHash(),
  logDate: todayKey(),
  logMeal: currentMealByTime(),
  menuDay: todayKey(),
  go: (route, opts) => {
    if (window.location.hash !== `#/${route}`) history.pushState(null, '', `#/${route}`);
    set((s) => ({ route, logDate: opts?.date ?? (route === 'registrar' && !opts ? todayKey() : s.logDate), logMeal: opts?.meal ?? (route === 'registrar' && !opts ? currentMealByTime() : s.logMeal) }));
    window.scrollTo({ top: 0 });
  },
  setLogTarget: (logDate, logMeal) => set({ logDate, logMeal }),
  setMenuDay: (menuDay) => set({ menuDay }),
}));

window.addEventListener('popstate', () => useUI.setState({ route: fromHash() }));
