/**
 * TACO completa (NEPA/UNICAMP, 4ª ed., 2011) embutida no app — 591 alimentos com energia,
 * macros, fibras e micronutrientes, mais medidas caseiras do IBGE (POF 2008-2009) para 204 deles.
 * Fontes e processamento: data/taco/NOTICE.md. Funciona offline.
 */
import type { DataSource, Food, Micro, NutrientKey, Prep, ShoppingCategory, SubGroup } from '../types';
import rows from './taco.gen.json';

type Row = [number, string, string, string, number, number, number, number, number,
  number | null, number | null, number | null, number | null, number | null, number | null, number | null, '' | 'c' | 'm', [string, number][]];

const CAT: Record<string, { group: SubGroup; shop: ShoppingCategory }> = {
  'Cereais e derivados': { group: 'carbo', shop: 'graos' },
  'Verduras, hortaliças e derivados': { group: 'vegetal', shop: 'verduras' },
  'Frutas e derivados': { group: 'fruta', shop: 'frutas' },
  'Pescados e frutos do mar': { group: 'peixe', shop: 'peixes' },
  'Carnes e derivados': { group: 'peixe', shop: 'aves' },
  'Alimentos preparados': { group: 'outro', shop: 'outros' },
  'Leguminosas e derivados': { group: 'leguminosa', shop: 'leguminosas' },
  'Leite e derivados': { group: 'laticinio', shop: 'ovos_laticinios' },
  'Produtos açucarados': { group: 'outro', shop: 'outros' },
  'Gorduras e óleos': { group: 'gordura', shop: 'complementos' },
  'Bebidas (alcoólicas e não alcoólicas)': { group: 'bebida', shop: 'outros' },
  'Nozes e sementes': { group: 'gordura', shop: 'complementos' },
  'Miscelâneas': { group: 'outro', shop: 'complementos' },
  'Ovos e derivados': { group: 'ovo', shop: 'ovos_laticinios' },
  'Outros alimentos industrializados': { group: 'outro', shop: 'outros' },
};
const PREP: Record<string, Prep> = { cozido: 'cozido', assado: 'assado', frito: 'frito', cru: 'cru', refogado: 'refogado', grelhado: 'grelhado', torrado: 'pronto' };
// fontes de referência: ≥ 15% do valor diário por 100 g (Ca 1000 mg, Fe 14 mg, Zn 7 mg)
const OILY_FISH = /salm[aã]o|sardinha|atum|cavalinha|arenque|truta/i;

function nutrientTags(r: Row): NutrientKey[] {
  const t: NutrientKey[] = [];
  const [, name, cat] = r;
  if (/Pescados|Carnes|Ovos|Leite/.test(cat)) t.push('b12');
  if (/Pescados/.test(cat) && OILY_FISH.test(name)) t.push('vitd', 'omega3');
  if (/Ovos/.test(cat)) t.push('vitd');
  if ((r[9] ?? 0) >= 150) t.push('calcio');
  if ((r[10] ?? 0) >= 2.1) t.push('ferro');
  if ((r[11] ?? 0) >= 1.05) t.push('zinco');
  return t;
}

export function tacoRowToFood(r: Row): Food {
  const [id, name, cat, prep, kcal, p, c, f, fiber, ca, fe, zn, na, mg, k, vitc, meat, measures] = r;
  const m = CAT[cat] ?? { group: 'outro' as SubGroup, shop: 'outros' as ShoppingCategory };
  const drink = cat.startsWith('Bebidas');
  const micro: Micro = { ca, fe, zn, na, mg, k, vitc };
  let group = m.group;
  if (group === 'vegetal' && c >= 12 && kcal >= 60) group = 'carbo'; // batatas, mandioca, milho…
  const unitMeasure = measures.find(([n]) => n === 'unidade') ?? measures.find(([n]) => /^unidade/.test(n)) ?? (group === 'fruta' ? undefined : measures.find(([n]) => /fatia|filé|bife|pedaço/.test(n)));
  return {
    id: `taco_${id}`,
    name,
    prep: PREP[prep] ?? (cat === 'Alimentos preparados' ? 'pronto' : 'pronto'),
    per100: { kcal, p, c, f, fiber },
    unit: drink ? 'ml' : 'g',
    unitWeight: unitMeasure?.[1],
    unitLabel: unitMeasure?.[0],
    source: 'TACO' as DataSource,
    sourceRef: `${name} (TACO nº ${id})`,
    note: drink ? 'Valores por 100 g na TACO; considerados ≈ 100 ml.' : undefined,
    group,
    shopping: { name: name.split(',')[0], category: meat === 'c' ? 'aves' : m.shop },
    nutrients: nutrientTags(r),
    tacoId: id,
    micro,
    measures: measures.length ? measures : undefined,
    meat: meat || undefined,
  };
}

const ALL = (rows as unknown as Row[]).map(tacoRowToFood);
export const TACO_FOODS: Food[] = ALL;
const byName = new Map(ALL.map((f) => [normalizeName(f.name), f]));
export const tacoById = new Map(ALL.map((f) => [f.tacoId!, f]));

function normalizeName(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').replace(/,\s*/g, ', ').replace(/\s*\(taco.*$/, '').trim();
}

/** Liga um alimento da base inicial ao item correspondente da TACO (micronutrientes e medidas caseiras). */
export function enrichWithTaco(f: Food): Food {
  if (f.source !== 'TACO' || f.tacoId) return f;
  const t = byName.get(normalizeName(f.sourceRef));
  if (!t) return f;
  return { ...f, tacoId: t.tacoId, micro: t.micro, measures: t.measures, nutrients: [...new Set([...(f.nutrients ?? []), ...(t.nutrients ?? [])])] };
}
