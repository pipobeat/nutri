import type { ShoppingCategory, WeekPlan } from '../types';
import type { FoodIndex } from './nutrition';
import { fmt0, fmt1 } from './format';

export const CATEGORY_LABEL: Record<ShoppingCategory, string> = {
  peixes: 'Peixes e frutos do mar',
  aves: 'Frango',
  ovos_laticinios: 'Ovos e laticínios',
  graos: 'Grãos, cereais e pães',
  leguminosas: 'Leguminosas',
  frutas: 'Frutas',
  verduras: 'Verduras e legumes',
  complementos: 'Temperos e complementos',
  outros: 'Outros',
};
export const CATEGORY_ORDER: ShoppingCategory[] = ['peixes', 'aves', 'ovos_laticinios', 'graos', 'leguminosas', 'frutas', 'verduras', 'complementos', 'outros'];

export interface ShoppingLine {
  key: string;
  name: string;
  category: ShoppingCategory;
  /** quantidade no cardápio (peso pronto) */
  planned: number;
  unit: 'g' | 'ml';
  /** quantidade sugerida para compra, já convertida */
  buy: string;
  note?: string;
  uses: number;
}

/** Quantidades sempre que possível em unidades de mercado */
function formatBuy(qty: number, unit: 'g' | 'ml', unitWeight?: number, unitLabel?: string): string {
  if (unitWeight && unitLabel && ['ovo', 'lata escorrida', 'pote', 'unidade média'].includes(unitLabel)) {
    const n = Math.ceil(qty / unitWeight - 0.05);
    const label = unitLabel === 'ovo' ? (n === 1 ? 'ovo' : 'ovos') : unitLabel === 'lata escorrida' ? (n === 1 ? 'lata' : 'latas') : unitLabel === 'pote' ? (n === 1 ? 'pote' : 'potes') : n === 1 ? 'unidade' : 'unidades';
    return `${n} ${label}`;
  }
  if (qty >= 1000) return `${fmt1(qty / 1000)} ${unit === 'ml' ? 'L' : 'kg'}`;
  return `${fmt0(Math.ceil(qty / 10) * 10)} ${unit}`;
}

/** Gera a lista agregando os itens do cardápio por "nome de compra" (evita duplicação). */
export function buildShopping(plan: WeekPlan, foods: FoodIndex): ShoppingLine[] {
  const acc = new Map<string, { planned: number; raw: number; unit: 'g' | 'ml'; category: ShoppingCategory; name: string; uses: number; uw?: number; ul?: string; notes: Set<string> }>();
  for (const day of plan) {
    for (const meal of day) {
      for (const item of meal.items) {
        const f = foods[item.foodId];
        if (!f) continue;
        const key = f.shopping.name;
        const cur = acc.get(key) ?? { planned: 0, raw: 0, unit: f.unit, category: f.shopping.category, name: f.shopping.name, uses: 0, uw: f.unitWeight, ul: f.unitLabel, notes: new Set<string>() };
        cur.planned += item.qty;
        cur.raw += item.qty * (f.shopping.factor ?? 1);
        cur.uses += 1;
        if (f.shopping.factorNote) cur.notes.add(f.shopping.factorNote);
        acc.set(key, cur);
      }
    }
  }
  return [...acc.entries()]
    .map(([key, v]) => ({
      key,
      name: v.name,
      category: v.category,
      planned: v.planned,
      unit: v.unit,
      uses: v.uses,
      buy: formatBuy(v.raw, v.unit, v.uw, v.ul),
      note: v.notes.size ? [...v.notes].join(' · ') : undefined,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/** Itens que todo cardápio precisa mas não têm peso definido */
export const PANTRY_EXTRAS: { key: string; name: string; category: ShoppingCategory }[] = [
  { key: 'x_cebola', name: 'Cebola', category: 'verduras' },
  { key: 'x_alho', name: 'Alho', category: 'complementos' },
  { key: 'x_temperos', name: 'Temperos (sal, pimenta, ervas)', category: 'complementos' },
];
