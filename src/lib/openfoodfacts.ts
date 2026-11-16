/**
 * Integração com o Open Food Facts (https://world.openfoodfacts.org) — base aberta e colaborativa
 * de produtos alimentícios com dados de rótulo. Não exige chave de API e permite CORS.
 * Os dados são enviados por voluntários e podem conter erros: o app sempre sinaliza a fonte.
 */
import type { Food, Macros } from '../types';

const FIELDS = [
  'code', 'product_name', 'product_name_pt', 'generic_name_pt', 'brands', 'quantity', 'serving_size', 'serving_quantity',
  'nutriments', 'nutriscore_grade', 'nova_group', 'image_front_small_url', 'image_front_url', 'countries_tags', 'categories_tags',
].join(',');
const APP = 'app_name=NutriPessoal&app_version=1.1';

export interface Product {
  code: string;
  name: string;
  brand: string;
  quantity?: string;
  servingSize?: string;
  servingQty?: number;
  image?: string;
  nutriscore?: string;
  nova?: number;
  isBR: boolean;
  liquid: boolean;
  per100: Macros;
  extra: { sugars?: number; satFat?: number; sodiumMg?: number };
  /** quais valores foram informados no rótulo */
  has: { kcal: boolean; macros: boolean };
  kcalEstimated: boolean;
}

type Raw = Record<string, any>;
const num = (v: unknown): number | undefined => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

export function parseProduct(r: Raw): Product | null {
  const n = r.nutriments ?? {};
  const name = (r.product_name_pt || r.product_name || r.generic_name_pt || '').toString().trim();
  if (!name || !r.code) return null;
  const p = num(n.proteins_100g), c = num(n.carbohydrates_100g), f = num(n.fat_100g);
  let kcal = num(n['energy-kcal_100g']);
  let kcalEstimated = false;
  if (kcal === undefined && num(n.energy_100g) !== undefined) kcal = num(n.energy_100g)! / 4.184; // kJ → kcal
  const hasMacros = p !== undefined || c !== undefined || f !== undefined;
  if (kcal === undefined && hasMacros) { kcal = (p ?? 0) * 4 + (c ?? 0) * 4 + (f ?? 0) * 9; kcalEstimated = true; }
  const brands = Array.isArray(r.brands) ? r.brands.join(', ') : (r.brands ?? '').toString();
  const sodium = num(n.sodium_100g) ?? (num(n.salt_100g) !== undefined ? num(n.salt_100g)! / 2.5 : undefined);
  const qty = (r.quantity ?? '').toString();
  const cats = (r.categories_tags ?? []) as string[];
  return {
    code: String(r.code),
    name,
    brand: brands.split(',')[0]?.trim() ?? '',
    quantity: qty || undefined,
    servingSize: r.serving_size || undefined,
    servingQty: num(r.serving_quantity) || undefined,
    image: r.image_front_small_url || r.image_front_url || undefined,
    nutriscore: typeof r.nutriscore_grade === 'string' && /^[a-e]$/.test(r.nutriscore_grade) ? r.nutriscore_grade : undefined,
    nova: num(r.nova_group),
    isBR: ((r.countries_tags ?? []) as string[]).includes('en:brazil'),
    liquid: /\b\d+([.,]\d+)?\s?(ml|l)\b/i.test(qty) || cats.some((t) => t.includes('beverages')),
    per100: { kcal: kcal ?? 0, p: p ?? 0, c: c ?? 0, f: f ?? 0, fiber: num(n.fiber_100g) ?? 0 },
    extra: { sugars: num(n.sugars_100g), satFat: num(n['saturated-fat_100g']), sodiumMg: sodium !== undefined ? sodium * 1000 : undefined },
    has: { kcal: kcal !== undefined, macros: hasMacros },
    kcalEstimated,
  };
}

const cache = new Map<string, Product[]>();

async function getJSON(url: string, signal?: AbortSignal): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  signal?.addEventListener('abort', () => ctrl.abort());
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export class SearchError extends Error {
  constructor(public kind: 'offline' | 'timeout' | 'server', msg: string) { super(msg); }
}

/** Busca por nome, marca ou código de barras. Produtos vendidos no Brasil aparecem primeiro. */
export async function searchProducts(query: string, signal?: AbortSignal): Promise<Product[]> {
  const q = query.trim();
  const key = q.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new SearchError('offline', 'Sem conexão com a internet.');
  let raw: Raw[] = [];
  try {
    if (/^\d{8,14}$/.test(q)) {
      const d = await getJSON(`https://world.openfoodfacts.org/api/v2/product/${q}.json?fields=${FIELDS}&${APP}`, signal);
      raw = d?.status === 1 && d.product ? [{ ...d.product, code: d.code ?? q }] : [];
    } else {
      try {
        // API de busca nova (rápida)
        const d = await getJSON(`https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page_size=40&langs=pt,en&fields=${FIELDS}&${APP}`, signal);
        raw = d?.hits ?? [];
      } catch (e) {
        if ((e as Error).name === 'AbortError' && signal?.aborted) throw e;
        // reserva: API clássica
        const d = await getJSON(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=40&fields=${FIELDS}&${APP}`, signal);
        raw = d?.products ?? [];
      }
    }
  } catch (e) {
    if (signal?.aborted) throw e;
    const err = e as Error;
    if (err.name === 'AbortError') throw new SearchError('timeout', 'A busca demorou demais. Tente de novo.');
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new SearchError('offline', 'Sem conexão com a internet.');
    throw new SearchError('server', 'Não foi possível consultar a base de produtos agora.');
  }
  const seen = new Set<string>();
  const list = raw
    .map(parseProduct)
    .filter((p): p is Product => !!p && !seen.has(p.code) && !!seen.add(p.code))
    .sort((a, b) => Number(b.isBR) - Number(a.isBR) || Number(b.has.kcal) - Number(a.has.kcal));
  cache.set(key, list);
  return list;
}

// ---------- Perfil nutricional (indicativo) ----------
export interface Highlight { label: string; tone: 'good' | 'warn' | 'neutral' }

/**
 * Destaques por 100 g, com critérios públicos:
 *  - proteína e fibras: alegações da UE (Reg. 1924/2006): "fonte" / "rico"
 *  - gordura, gordura saturada, açúcares e sódio: semáforo da FSA (Reino Unido), nível "alto"
 *  - densidade calórica: baixa < 1,5 kcal/g · média 1,5–4 · alta > 4
 */
export function highlights(p: Product): Highlight[] {
  const h: Highlight[] = [];
  const m = p.per100;
  if (!p.has.kcal) return h;
  const protPct = m.kcal > 0 ? (m.p * 4) / m.kcal : 0;
  if (protPct >= 0.2) h.push({ label: 'Rico em proteína', tone: 'good' });
  else if (protPct >= 0.12) h.push({ label: 'Fonte de proteína', tone: 'good' });
  if (m.fiber >= 6) h.push({ label: 'Rico em fibras', tone: 'good' });
  else if (m.fiber >= 3) h.push({ label: 'Fonte de fibras', tone: 'good' });
  const liq = p.liquid;
  if (m.f > (liq ? 8.75 : 17.5)) h.push({ label: 'Alto em gordura', tone: 'warn' });
  if ((p.extra.satFat ?? 0) > (liq ? 2.5 : 5)) h.push({ label: 'Alto em gordura saturada', tone: 'warn' });
  if ((p.extra.sugars ?? 0) > (liq ? 11.25 : 22.5)) h.push({ label: 'Alto em açúcares', tone: 'warn' });
  if ((p.extra.sodiumMg ?? 0) > (liq ? 300 : 600)) h.push({ label: 'Alto em sódio', tone: 'warn' });
  const d = m.kcal / 100;
  h.push(d > 4 ? { label: 'Alta densidade calórica', tone: 'warn' } : d < 1.5 ? { label: 'Baixa densidade calórica', tone: 'good' } : { label: 'Densidade calórica média', tone: 'neutral' });
  return h;
}

export function productToFood(p: Product): Food {
  return {
    id: `off_${p.code}`,
    name: [p.name, p.brand].filter(Boolean).join(' · '),
    prep: 'industrializado',
    per100: { ...p.per100 },
    unit: p.liquid ? 'ml' : 'g',
    unitWeight: p.servingQty,
    unitLabel: p.servingQty ? 'porção' : undefined,
    source: 'Open Food Facts',
    sourceRef: `Open Food Facts · código ${p.code}${p.quantity ? ` · ${p.quantity}` : ''}`,
    note: `Dados de rótulo enviados por colaboradores${p.kcalEstimated ? '; calorias calculadas pelos macros' : ''}. Confira com a embalagem.`,
    group: 'outro',
    shopping: { name: [p.name, p.brand].filter(Boolean).join(' · '), category: 'outros' },
    custom: true,
  };
}
