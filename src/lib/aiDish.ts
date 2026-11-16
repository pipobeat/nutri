/**
 * Cálculo de pratos com IA (Claude, API da Anthropic) — opcional.
 * A chamada sai direto do navegador para api.anthropic.com com a chave que você salvou neste aparelho.
 * Ingredientes que o modelo associa a um alimento da base local são recalculados com os valores
 * da base (TACO/USDA); os demais ficam marcados como estimativa da IA.
 */
import type { DishEstimate, DishIngredient } from './dish';
import type { FoodIndex } from './nutrition';
import { uid } from './format';
import { TACO_FOODS } from '../data/taco';

const KEY_STORAGE = 'nutri-pessoal:anthropic-key';
export const AI_MODEL = 'claude-opus-5-5';

export function getApiKey(): string {
  try { return localStorage.getItem(KEY_STORAGE) ?? ''; } catch { return ''; }
}
export function setApiKey(k: string) {
  try { if (k) localStorage.setItem(KEY_STORAGE, k.trim()); else localStorage.removeItem(KEY_STORAGE); } catch { /* sem armazenamento */ }
}

export class AiError extends Error {
  constructor(public kind: 'nokey' | 'auth' | 'rate' | 'network' | 'refusal' | 'other', msg: string) { super(msg); }
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['dish', 'ingredients', 'confidence', 'notes', 'nutrient_sources', 'diet_warning'],
  properties: {
    dish: { type: 'string', description: 'Nome curto do prato em português' },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'base_food_id', 'grams', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'assumption'],
        properties: {
          name: { type: 'string', description: 'Ingrediente e forma de preparo, ex.: "Peito de frango grelhado"' },
          base_food_id: { type: 'string', description: 'id do alimento equivalente (base pessoal ou taco_N da TACO), ou "" se não houver equivalente' },
          grams: { type: 'number', description: 'Quantidade pronta para consumo, em gramas (ou ml)' },
          kcal: { type: 'number' },
          protein_g: { type: 'number' },
          carbs_g: { type: 'number' },
          fat_g: { type: 'number' },
          fiber_g: { type: 'number' },
          assumption: { type: 'string', description: 'Suposição feita (porção típica, receita, óleo de preparo) ou ""' },
        },
      },
    },
    confidence: { type: 'string', enum: ['alta', 'média', 'baixa'] },
    notes: { type: 'array', items: { type: 'string' }, description: 'Observações curtas e úteis, sem julgamento' },
    nutrient_sources: { type: 'array', items: { type: 'string' }, description: 'Ex.: "Proteína: frango e parmesão"' },
    diet_warning: { type: 'string', description: 'Aviso se o prato tiver carne bovina, suína ou outra carne terrestre além de frango; senão ""' },
  },
} as const;

// tabela TACO completa, idêntica em todas as chamadas (fica no cache de prompt)
const TACO_TABLE = TACO_FOODS.filter((f) => f.meat !== 'm')
  .map((f) => `${f.id} | ${f.name} | ${Math.round(f.per100.kcal)} | ${f.per100.p} | ${f.per100.c} | ${f.per100.f} | ${f.per100.fiber}`)
  .join('\n');

function personalBase(foods: FoodIndex): string {
  const base = Object.values(foods)
    .filter((f) => !f.id.startsWith('dish_') && !f.id.startsWith('taco_'))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((f) => `${f.id} | ${f.name} | ${f.prep} | ${Math.round(f.per100.kcal)} kcal | P ${f.per100.p} | C ${f.per100.c} | G ${f.per100.f} | fibra ${f.per100.fiber}`)
    .join('\n');
  return `Alimentos da base pessoal do usuário (preferir estes ids quando equivalentes; valores por 100 g/ml):
id | nome | preparo | kcal | proteína | carboidrato | gordura | fibra
${base}`;
}

const STABLE_PROMPT = `Você é um assistente de nutrição de um app pessoal brasileiro. O usuário descreve em texto livre algo que comeu (um prato, um lanche, uma refeição de restaurante) e você estima a composição nutricional.

Como responder:
- Decomponha o prato em ingredientes, cada um com quantidade pronta para consumo em gramas (ou ml para líquidos).
- Respeite quantidades que o usuário informar. Se não informar, use porções típicas brasileiras de um adulto; para restaurante/delivery, porções de restaurante. Registre a suposição em "assumption".
- Inclua como ingrediente separado o óleo, a manteiga ou o creme que a receita normalmente leva (ex.: molho Alfredo leva manteiga, creme e queijo), indicando a suposição.
- Quando um ingrediente corresponder a um item das tabelas (mesmo alimento e forma de preparo), preencha "base_food_id" com o id e calcule os valores com os números da tabela. Quando não houver equivalente, deixe "" e use valores de tabelas reconhecidas (TBCA, USDA) com sua melhor estimativa.
- Valores por ingrediente são para a quantidade indicada (não por 100 g).
- "confidence": "alta" só se o usuário deu quantidades e os ingredientes são claros; "baixa" se o prato é vago ou de receita muito variável.
- Notas curtas, práticas, em português do Brasil, sem tom de julgamento, sem diagnóstico e sem recomendar suplementos.
- O usuário é pescetariano e come frango ocasionalmente; se o prato tiver carne bovina, suína ou outra carne terrestre, calcule mesmo assim e preencha "diet_warning".

Tabela TACO completa (NEPA/UNICAMP, 4ª ed.) — valores por 100 g:
id | nome | kcal | proteína | carboidrato | gordura | fibra
${TACO_TABLE}`;

export async function estimateWithAI(text: string, foods: FoodIndex, signal?: AbortSignal, lookup: FoodIndex = foods): Promise<DishEstimate> {
  const apiKey = getApiKey();
  if (!apiKey) throw new AiError('nokey', 'Adicione sua chave da API da Anthropic em Ajustes para usar o cálculo com IA.');
  const [{ default: Anthropic }, { jsonSchemaOutputFormat }] = await Promise.all([import('@anthropic-ai/sdk'), import('@anthropic-ai/sdk/helpers/json-schema')]);
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 90_000 });

  let res;
  try {
    res = await client.beta.messages.parse(
      {
        model: AI_MODEL,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low', format: jsonSchemaOutputFormat(SCHEMA) },
        system: [
          // instruções + TACO: idênticas em toda chamada → cache de prompt
          { type: 'text', text: STABLE_PROMPT, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: personalBase(foods) },
        ],
        messages: [{ role: 'user', content: `O que eu comi: ${text.trim()}` }],
      },
      { signal },
    );
  } catch (e) {
    if (signal?.aborted) throw e;
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) throw new AiError('auth', 'Chave da API inválida ou sem permissão. Confira em Ajustes.');
    if (e instanceof Anthropic.RateLimitError) throw new AiError('rate', 'Limite de uso da API atingido. Tente de novo em instantes.');
    if (e instanceof Anthropic.APIConnectionError) throw new AiError('network', 'Sem conexão com a API. Verifique a internet.');
    if (e instanceof Anthropic.APIError) throw new AiError('other', `Erro da API (${e.status ?? '—'}). Tente novamente.`);
    throw new AiError('other', 'Não foi possível calcular agora.');
  }
  if (res.stop_reason === 'refusal') throw new AiError('refusal', 'A IA não conseguiu responder a essa descrição. Tente reformular.');
  const out = res.parsed_output;
  if (!out) throw new AiError('other', 'Resposta incompleta da IA. Tente novamente.');

  const ingredients: DishIngredient[] = out.ingredients
    .filter((i) => i.grams > 0)
    .map((i) => {
      const f = i.base_food_id ? lookup[i.base_food_id] ?? lookup[`taco_${i.base_food_id.replace(/\D/g, '')}`] : undefined;
      if (f) return { key: uid(), name: f.name, foodId: f.id, grams: i.grams, per100: f.per100, micro: f.micro, origin: 'base' as const, note: i.assumption || undefined };
      const k = 100 / i.grams;
      return {
        key: uid(), name: i.name, grams: i.grams, origin: 'ia' as const, note: i.assumption || undefined,
        per100: { kcal: Math.max(0, i.kcal * k), p: Math.max(0, i.protein_g * k), c: Math.max(0, i.carbs_g * k), f: Math.max(0, i.fat_g * k), fiber: Math.max(0, i.fiber_g * k) },
      };
    });
  return {
    dish: out.dish || text.trim(),
    method: 'ia',
    ingredients,
    confidence: out.confidence,
    notes: out.notes,
    sources: out.nutrient_sources,
    dietWarning: out.diet_warning || undefined,
  };
}
