/**
 * Estimativa de pratos descritos em texto livre ("peito de frango grelhado com macarrão ao molho Alfredo").
 * Dois motores com o mesmo formato de saída:
 *  - local (offline): separa o texto em ingredientes, reconhece cada um na base TACO/USDA do app
 *    e usa porções típicas quando a quantidade não é informada;
 *  - IA (opcional): Claude decompõe o prato; ingredientes que existem na base local são recalculados
 *    com os valores da base, os demais ficam marcados como estimativa da IA (ver aiDish.ts).
 */
import type { Food, Macros, Micro } from '../types';
import { MICRO_KEYS, normalize, scale, scaleMicro, type FoodIndex } from './nutrition';
import { uid } from './format';

export interface DishIngredient {
  key: string;
  name: string;
  grams: number;
  per100: Macros;
  micro?: Micro;
  origin: 'base' | 'ia' | 'none';
  foodId?: string;
  note?: string;
  defaulted?: boolean;
}
export interface DishEstimate {
  dish: string;
  method: 'local' | 'ia';
  ingredients: DishIngredient[];
  confidence: 'alta' | 'média' | 'baixa';
  notes: string[];
  sources?: string[];
  dietWarning?: string;
}

export const ingMacros = (i: DishIngredient): Macros => scale(i.per100, i.grams);
export const dishTotals = (ings: DishIngredient[]): Macros =>
  ings.reduce((a, i) => { const m = ingMacros(i); return { kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f, fiber: a.fiber + m.fiber }; }, { kcal: 0, p: 0, c: 0, f: 0, fiber: 0 });

// regras de reconhecimento (texto sem acento, minúsculo) — a primeira que casar vence
const RULES: [RegExp, string][] = [
  [/frango.*(cozid|desfiad)|(cozid|desfiad).*frango/, 'frango_cozido'],
  [/frango|peito|\bfile de frango|galinha/, 'frango_grelhado'],
  [/salmao/, 'salmao_grelhado'], [/tilapia/, 'tilapia_grelhada'], [/sardinha.*(lata|conserva|oleo)/, 'sardinha_lata_oleo'], [/sardinha/, 'sardinha_assada'],
  [/atum/, 'atum_agua'], [/camar/, 'camarao_cozido'], [/peixe|merluza|pescada|bacalhau|robalo|linguado|saint peter/, 'merluza_assada'],
  [/ovo.*frit|frit.*ovo/, 'ovo_frito'], [/omelete|mexid/, 'ovo_preparo'], [/\bovos?\b/, 'ovo_cozido'],
  [/(macarrao|massa|espaguete|penne|talharim|fettuc|parafuso|lasanha|nhoque).*integral/, 'macarrao_integral'],
  [/macarrao|massa|espaguete|penne|talharim|fettuc|parafuso|lasanha|nhoque|miojo/, 'macarrao'],
  [/alfredo|molho branco|quatro queijos|bechamel/, 'molho_alfredo'],
  [/molho.*tomate|molho vermelho|sugo|pomodoro|bolonhesa de soja/, 'molho_tomate'],
  [/arroz.*integral/, 'arroz_integral'], [/arroz/, 'arroz_branco'],
  [/feijao.*preto|feijoada de/, 'feijao_preto'], [/feijao/, 'feijao_carioca'], [/lentilha/, 'lentilha'], [/grao.de.bico|homus|hummus/, 'grao_de_bico'],
  [/batata palha|chips/, '~batata, frita, tipo chips'], [/batata.*frita|fritas/, 'batata_frita'], [/pure/, 'pure_batata'], [/batata.doce/, 'batata_doce'], [/batata/, 'batata_inglesa'],
  [/mandioca|aipim|macaxeira/, 'mandioca'], [/cuscuz/, 'cuscuz'], [/tapioca/, 'tapioca'],
  [/pao de queijo/, 'pao_queijo'], [/pao.*integral|pao de forma|torrada/, 'pao_integral'], [/\bpao|paes\b/, 'pao_frances'],
  [/salada|folhas|alface|rucula|agriao/, 'folhas'], [/legumes|vegetais/, 'legumes_mix'], [/brocolis/, 'brocolis'], [/cenoura/, 'cenoura'],
  [/tomate/, 'tomate'], [/pepino/, 'pepino'], [/abobrinha/, 'abobrinha'], [/espinafre/, 'espinafre'], [/couve/, 'couve_refogada'],
  [/parmes/, 'parmesao'], [/cottage/, 'cottage'], [/ricota/, 'ricota'], [/minas|queijo branco/, 'queijo_minas'], [/requeijao|catupiry/, 'requeijao'],
  [/queijo|mussarela|mucarela|muzzarela|mozarela/, 'mucarela'], [/creme de leite/, 'creme_leite'],
  [/iogurte.*(proteic|protein|grego|skyr)/, 'iogurte_proteico'], [/iogurte/, 'iogurte_natural'],
  [/leite.*desnat/, 'leite_desnatado'], [/\bleite\b/, 'leite_integral'], [/whey/, 'whey'],
  [/banana/, 'banana'], [/\bmaca\b|\bmacas\b/, 'maca'], [/mamao/, 'mamao'], [/morango/, 'morango'], [/suco.*laranja/, 'suco_laranja'], [/laranja/, 'laranja'],
  [/abacate/, 'abacate'], [/manga\b/, 'manga'], [/abacaxi/, 'abacaxi'], [/melancia/, 'melancia'], [/\buvas?\b/, 'uva'],
  [/aveia/, 'aveia'], [/chia/, 'chia'], [/caju/, 'castanha_caju'], [/castanha/, 'castanha_para'], [/amendoa/, 'amendoas'], [/pasta de amendoim/, 'pasta_amendoim'],
  [/azeite|oleo/, 'azeite'], [/manteiga/, 'manteiga'], [/cafe/, 'cafe'], [/agua de coco/, 'agua_coco'], [/cerveja|chope/, 'cerveja'], [/refrigerante|\bcoca\b/, 'refrigerante'],
];

/** Porção típica (g ou ml) quando o texto não diz a quantidade */
const DEFAULT_G: Record<string, number> = {
  molho_alfredo: 80, molho_tomate: 80, parmesao: 10, mucarela: 30, queijo_minas: 30, requeijao: 20, creme_leite: 30, ricota: 40,
  azeite: 5, manteiga: 10, pao_frances: 50, pao_integral: 50, batata_frita: 120, folhas: 50, chia: 10, aveia: 30, castanha_para: 15,
  castanha_caju: 20, amendoas: 15, whey: 30, pasta_amendoim: 15, tomate: 60, pepino: 50, cenoura: 60, limao: 10, cafe: 100,
  ovo_cozido: 100, ovo_preparo: 100, ovo_frito: 50, macarrao: 200, macarrao_integral: 200, cottage: 100, iogurte_proteico: 160, iogurte_natural: 170,
  tapioca: 70, pao_queijo: 60, leite_integral: 150, leite_desnatado: 150, cuscuz: 150,
};
const GROUP_G: Record<string, number> = { peixe: 150, ovo: 100, laticinio: 150, carbo: 150, leguminosa: 100, vegetal: 80, fruta: 120, gordura: 10, bebida: 250, outro: 100 };

const NUM_WORDS: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, meia: 0.5, meio: 0.5 };
const MEASURES: [RegExp, number][] = [
  [/colher(es)? de sopa/, 15], [/colher(es)? de cha/, 5], [/conchas?/, 100], [/escumadeiras?/, 90], [/xicaras?/, 160], [/fatias?/, 25], [/copos?/, 250], [/latas?/, 350],
];

const MEASURE_WORDS = ['colher de sopa', 'colher de sobremesa', 'colher de cha', 'colher de cafe', 'colher de arroz', 'colher de servir', 'concha', 'escumadeira', 'fatia', 'unidade pequena', 'unidade', 'copo americano', 'copo medio', 'copo grande', 'copo', 'xicara', 'pedaco', 'file', 'bife', 'prato fundo', 'prato raso', 'prato', 'porcao', 'pote', 'lata', 'folha', 'metade', 'gomo', 'punhado'];

/** Gramas de uma medida caseira: primeiro a medida do IBGE para aquele alimento, depois um valor genérico. */
function measureGrams(rest: string, food?: Food): { grams: number; label: string } | undefined {
  const word = MEASURE_WORDS.find((w) => new RegExp(`\\b${w}(e?s)?\\b`).test(rest.replace(/colheres/g, 'colher').replace(/fatias/g, 'fatia').replace(/conchas/g, 'concha')));
  if (!word) return undefined;
  const m = food?.measures?.find(([n]) => normalize(n).startsWith(word)) ?? food?.measures?.find(([n]) => normalize(n).includes(word.split(' ')[0]));
  if (m) return { grams: m[1], label: `${m[0]} (IBGE)` };
  for (const [re, w] of MEASURES) if (re.test(rest)) return { grams: w, label: word };
  if (word.startsWith('unidade') && food?.unitWeight) return { grams: food.unitWeight, label: word };
  return undefined;
}

function parseQty(seg: string, food?: Food): { grams?: number; measure?: string } {
  const g = seg.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gr|gramas?|ml|l|litros?)\b/);
  if (g) {
    const n = Number(g[1].replace(',', '.'));
    const mult = /^(kg|l|litro)/.test(g[2]) ? 1000 : 1;
    return { grams: n * mult };
  }
  const c = seg.match(/^(\d+(?:[.,]\d+)?|um|uma|dois|duas|tres|quatro|cinco|meia|meio)\s+/);
  const n = c ? NUM_WORDS[c[1]] ?? Number(c[1].replace(',', '.')) : 1;
  const rest = c ? seg.slice(c[0].length) : seg;
  const ms = measureGrams(rest, food);
  if (ms) return { grams: n * ms.grams, measure: `${c ? fmtN(n) + ' ' : ''}${n > 1 ? ms.label.replace(/^(\S+?)(ão)?\b/, (_w: string, a: string, b?: string) => (b ? a + 'ões' : /[aeiou]$/.test(a) ? a + 's' : a + 'es')) : ms.label}` };
  if (!c) return {};
  if (food?.unitWeight) return { grams: n * food.unitWeight, measure: `${fmtN(n)} ${food.unitLabel ?? 'unidade'}` };
  if (/ovo/.test(rest)) return { grams: n * 50 };
  return {};
}
const fmtN = (n: number) => String(n).replace('.', ',');

const STOP = new Set(['de', 'do', 'da', 'dos', 'das', 'com', 'sem', 'em', 'no', 'na', 'um', 'uma', 'meu', 'minha', 'tipo', 'bem', 'pouco', 'muito', 'grande', 'pequeno', 'pequena', 'media', 'medio', 'colher', 'colheres', 'sopa', 'cha', 'sobremesa', 'servir', 'xicaras', 'conchas', 'fatias', 'unidades', 'copos', 'pedacos', 'pedaco', 'porcao', 'porcoes', 'prato', 'pratos', 'cheia', 'cheio', 'rasa', 'raso']);
const PREP_WORDS = ['cozid', 'assad', 'grelhad', 'frit', 'cru', 'refogad', 'torrad', 'vapor'];
/** forma de preparo pedida no texto ("ralada", "crua" → cru; "no vapor" → cozido) */
function segPrepOf(seg: string): string | undefined {
  if (/ralad|\bcrua?s?\b|in natura/.test(seg)) return 'cru';
  if (/vapor/.test(seg)) return 'cozid';
  return PREP_WORDS.find((p) => seg.includes(p));
}

/** Pontua o quanto o nome de um alimento corresponde ao trecho digitado. */
function scoreFood(seg: string, f: Food): number {
  const words = seg.split(/[\s,]+/).filter((w) => w.length > 2 && !STOP.has(w) && !/^\d/.test(w) && !MEASURE_WORDS.includes(w));
  if (!words.length) return 0;
  const name = normalize(f.name);
  const tokens = name.split(/[\s,()/-]+/).filter((t) => t.length > 2 && !STOP.has(t));
  const stem = (w: string) => w.replace(/(oes|aes|s)$/, '');
  const hit = (w: string) => tokens.some((t) => stem(t) === stem(w) || (w.length > 4 && t.startsWith(w.slice(0, -1))));
  const matched = words.filter(hit).length;
  if (!matched) return 0;
  let score = matched * 2 - (words.length - matched) * 0.7 - Math.max(0, tokens.length - matched) * 0.25;
  if (tokens[0] && words.some((w) => stem(w) === stem(tokens[0]))) score += 2; // nome principal ("Feijoada", "Abobrinha")
  const segPrep = segPrepOf(seg);
  if (segPrep) score += name.includes(segPrep) ? 1.5 : -1;
  else if (name.includes('cru') && ['carbo', 'leguminosa', 'peixe', 'ovo'].includes(f.group)) score -= 1.5; // sem preparo dito: prefere o pronto
  if (!f.id.startsWith('taco_')) score += 0.4; // base pessoal primeiro
  if (/desidratad|em po|farinha/.test(name) && !/desidratad|po\b|farinha/.test(seg)) score -= 1;
  return score;
}

function segWords(seg: string) {
  return seg.split(/[\s,]+/).filter((w) => w.length > 2 && !STOP.has(w) && !/^\d/.test(w) && !MEASURE_WORDS.includes(w));
}
const stemW = (w: string) => w.replace(/(oes|aes|s)$/, '');
const nameTokens = (f: Food) => normalize(f.name).split(/[\s,()/-]+/).filter((t) => t.length > 2 && !STOP.has(t));
const firstToken = (f: Food) => stemW(nameTokens(f)[0] ?? '');
function matchedWords(seg: string, f: Food): Set<string> {
  const toks = nameTokens(f);
  return new Set(segWords(seg).filter((w) => toks.some((t) => stemW(t) === stemW(w) || (w.length > 4 && t.startsWith(w.slice(0, -1))))));
}

function bestFuzzy(seg: string, foods: FoodIndex): { food?: Food; score: number } {
  let food: Food | undefined;
  let score = 0;
  for (const f of Object.values(foods)) {
    const sc = scoreFood(seg, f);
    if (sc > score) { food = f; score = sc; }
  }
  return { food, score };
}

export function matchFood(seg: string, foods: FoodIndex): Food | undefined {
  const fuzzy = bestFuzzy(seg, foods);
  // pratos prontos da TACO (feijoada, baião de dois, estrogonofe de frango…) têm prioridade quando o nome bate bem
  if (fuzzy.food && fuzzy.food.prep === 'pronto' && fuzzy.food.id.startsWith('taco_') && fuzzy.score >= 5) return fuzzy.food;
  for (const [re, target] of RULES) {
    if (!re.test(seg)) continue;
    const rule = target.startsWith('~') ? Object.values(foods).find((f) => normalize(f.name).startsWith(target.slice(1))) : foods[target];
    if (!rule) continue;
    // um item mais específico vence a regra genérica: "banana nanica" (palavra a mais), "cenoura ralada" (crua)
    if (fuzzy.food && fuzzy.food.id !== rule.id) {
      const fw = matchedWords(seg, fuzzy.food), rw = matchedWords(seg, rule);
      const moreSpecific = [...rw].every((w) => fw.has(w)) && fw.size > rw.size;
      const prep = segPrepOf(seg);
      const rightPrep = !!prep && normalize(fuzzy.food.name).includes(prep) && !normalize(rule.name).includes(prep) && firstToken(fuzzy.food) === firstToken(rule);
      if (moreSpecific || rightPrep) return fuzzy.food;
    }
    return rule;
  }
  return fuzzy.score >= 2.5 ? fuzzy.food : undefined;
}

export function splitDish(text: string): string[] {
  return normalize(text)
    .replace(/\(|\)/g, ' ')
    .split(/\s*(?:,|;|\+|\n|\be\b|\bcom\b|\bao\b|\ba\b(?= molho)|\bmais\b|\bacompanhad[oa]s? de\b|\bsobre\b)\s*/)
    .map((x) => x.trim())
    .filter((x) => x && !/^(de|do|da|uma?|o|a)$/.test(x));
}

/** Porção típica quando o texto não diz a quantidade. */
function defaultGrams(food: Food): number {
  if (DEFAULT_G[food.id]) return DEFAULT_G[food.id];
  const m = (re: RegExp) => food.measures?.find(([n]) => re.test(n))?.[1];
  if (food.id.startsWith('taco_') && food.group === 'outro' && food.prep === 'pronto' && !food.measures) return 200; // prato pronto
  if (food.group === 'fruta') { const u = m(/^unidade$/) ?? m(/^unidade/) ?? m(/^porção/); if (u) return u; }
  if (/^p[aã]o/i.test(food.name)) { const u = m(/^unidade$/) ?? m(/fatia/); if (u) return u * (/fatia/.test(food.unitLabel ?? 'fatia') ? 2 : 1); }
  if (food.group === 'gordura' || food.group === 'outro') { const c = m(/colher de sopa/); if (c) return c; }
  if (food.per100.kcal > 350 && !food.measures) return 30; // salgadinhos, doces, farinhas: porção pequena
  return GROUP_G[food.group] ?? 100;
}

export function estimateLocal(text: string, foods: FoodIndex): DishEstimate {
  const ings: DishIngredient[] = [];
  for (const seg of splitDish(text)) {
    const food = matchFood(seg, foods);
    const { grams, measure } = parseQty(seg, food);
    if (!food) {
      ings.push({ key: uid(), name: seg, grams: grams ?? 100, per100: { kcal: 0, p: 0, c: 0, f: 0, fiber: 0 }, origin: 'none' });
      continue;
    }
    const def = defaultGrams(food);
    if (ings.some((i) => i.foodId === food.id) && !grams) continue; // "arroz e arroz" → uma vez só
    ings.push({
      key: uid(), name: food.name, foodId: food.id, grams: grams ?? def, per100: food.per100, micro: food.micro, origin: 'base',
      defaulted: !grams, note: measure ? `${measure} = ${Math.round(grams!)} g` : undefined,
    });
  }
  const unmatched = ings.filter((i) => i.origin === 'none').length;
  const defaulted = ings.filter((i) => i.defaulted).length;
  const notes: string[] = [];
  const meat = ings.map((i) => (i.foodId ? foods[i.foodId] : undefined)).filter((f) => f?.meat === 'm');
  if (defaulted) notes.push('Quantidades não informadas foram estimadas como porções típicas — ajuste os gramas se souber.');
  if (unmatched) notes.push(`${unmatched} item(ns) não reconhecido(s) — toque para escolher um alimento da base ou remova.`);
  if (ings.some((i) => /grelhad|refogad/.test(normalize(i.name)))) notes.push('Óleo/manteiga usados no preparo não estão incluídos, salvo se você descrever.');
  return {
    dish: text.trim(), method: 'local', ingredients: ings, confidence: unmatched ? 'baixa' : defaulted ? 'média' : 'alta', notes,
    dietWarning: meat.length ? `Contém carne fora do seu padrão alimentar (${meat.map((f) => f!.name.split(',')[0]).join(', ')}). O cálculo foi feito mesmo assim.` : undefined,
  };
}

/** Soma dos micronutrientes, só quando todos os ingredientes têm dados (senão o total enganaria). */
export function dishMicro(ings: DishIngredient[]): Micro | undefined {
  if (!ings.length || ings.some((i) => !i.micro)) return undefined;
  const o = {} as Micro;
  for (const k of MICRO_KEYS) {
    let sum = 0;
    for (const i of ings) {
      const v = scaleMicro(i.micro, i.grams)![k];
      if (v === null) { sum = NaN; break; }
      sum += v;
    }
    o[k] = Number.isNaN(sum) ? null : sum;
  }
  return o;
}

/** Destaques do prato, com os mesmos critérios usados nos produtos (por 100 g do prato). */
export function dishHighlights(ings: DishIngredient[]): { label: string; tone: 'good' | 'warn' | 'neutral' }[] {
  const t = dishTotals(ings);
  const grams = ings.reduce((a, i) => a + i.grams, 0);
  if (!grams || !t.kcal) return [];
  const h: { label: string; tone: 'good' | 'warn' | 'neutral' }[] = [];
  const protPct = (t.p * 4) / t.kcal;
  if (protPct >= 0.2) h.push({ label: 'Rico em proteína', tone: 'good' });
  else if (protPct >= 0.12) h.push({ label: 'Fonte de proteína', tone: 'good' });
  const fiber100 = (t.fiber / grams) * 100;
  if (fiber100 >= 6) h.push({ label: 'Rico em fibras', tone: 'good' });
  else if (fiber100 >= 3) h.push({ label: 'Fonte de fibras', tone: 'good' });
  if ((t.f / grams) * 100 > 17.5) h.push({ label: 'Alto em gordura', tone: 'warn' });
  const d = t.kcal / grams;
  h.push(d > 4 ? { label: 'Alta densidade calórica', tone: 'warn' } : d < 1.5 ? { label: 'Baixa densidade calórica', tone: 'good' } : { label: 'Densidade calórica média', tone: 'neutral' });
  return h;
}

/** Transforma o prato em um alimento da base (por 100 g), para registrar de novo depois. */
export function dishToFood(name: string, ings: DishIngredient[], method: 'local' | 'ia'): Food {
  const t = dishTotals(ings);
  const grams = Math.max(1, ings.reduce((a, i) => a + i.grams, 0));
  const k = 100 / grams;
  return {
    id: `dish_${uid()}`,
    name,
    prep: 'pronto',
    per100: { kcal: t.kcal * k, p: t.p * k, c: t.c * k, f: t.f * k, fiber: t.fiber * k },
    unit: 'g',
    micro: (() => { const mc = dishMicro(ings); return mc ? (scaleMicro(mc, (100 / grams) * 100) as Micro) : undefined; })(),
    unitWeight: Math.round(grams),
    unitLabel: 'prato',
    source: 'Estimado',
    sourceRef: `Prato ${method === 'ia' ? 'calculado com IA' : 'estimado pelo app'}: ${ings.map((i) => `${i.name} ${Math.round(i.grams)} g`).join(', ')}`,
    note: 'Estimativa a partir dos ingredientes; valores reais variam com a receita e o preparo.',
    group: 'outro',
    shopping: { name, category: 'outros' },
    custom: true,
  };
}
