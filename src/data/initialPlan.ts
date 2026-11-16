import type { MealType, PlanMeal, WeekPlan } from '../types';

type Row = [foodId: string, qty: number, note?: string];
type DayDef = Record<MealType, Row[]>;

const SALADA: Row = ['folhas', 50, 'salada à vontade'];

/** Cardápio inicial (exemplo) informado pelo usuário. Pesos de alimentos prontos/cozidos. */
const DAYS: DayDef[] = [
  // Segunda
  {
    cafe: [['ovo_preparo', 100, '2 ovos mexidos'], ['pao_integral', 60], ['iogurte_proteico', 170], ['banana', 100]],
    almoco: [['salmao_grelhado', 170], ['arroz_integral', 150], ['feijao_preto', 100], ['brocolis', 100], SALADA, ['azeite', 5]],
    lanche: [['iogurte_proteico', 170], ['aveia', 30], ['morango', 100]],
    jantar: [['ovo_preparo', 150, 'omelete de 3 ovos'], ['cottage', 150], ['batata_doce', 180], ['espinafre', 80]],
  },
  // Terça
  {
    cafe: [['ovo_cozido', 100, '2 ovos cozidos'], ['pao_integral', 60], ['mamao', 150], ['leite_integral', 200]],
    almoco: [['sardinha_assada', 170], ['arroz_integral', 150], ['feijao_preto', 100], ['couve_refogada', 100], ['tomate', 80, 'tomate com limão'], ['limao', 10]],
    lanche: [['iogurte_proteico', 170], ['castanha_para', 15], ['maca', 130]],
    jantar: [['tilapia_grelhada', 170], ['batata_inglesa', 180], ['lentilha', 100], ['abobrinha', 100]],
  },
  // Quarta
  {
    cafe: [['iogurte_proteico', 200], ['aveia', 30], ['banana', 100], ['chia', 10], ['ovo_cozido', 100, '2 ovos cozidos']],
    almoco: [['camarao_cozido', 180], ['arroz_integral', 150], ['feijao_preto', 100], ['brocolis', 100], ['folhas', 50, 'salada verde']],
    lanche: [['cottage', 150], ['laranja', 150, '1 fruta à escolha'], ['amendoas', 10]],
    jantar: [['frango_grelhado', 150, 'peito de frango grelhado'], ['batata_doce', 180], ['brocolis', 100], ['folhas', 50, 'salada de folhas'], ['azeite', 5]],
  },
  // Quinta
  {
    cafe: [['ovo_preparo', 100, '2 ovos mexidos'], ['pao_integral', 60], ['leite_integral', 200], ['banana', 100]],
    almoco: [['tilapia_grelhada', 170], ['arroz_integral', 150], ['lentilha', 120], ['cenoura', 75], ['brocolis', 75]],
    lanche: [['iogurte_proteico', 170], ['aveia', 20], ['morango', 100]],
    jantar: [['atum_agua', 150], ['grao_de_bico', 100], ['ovo_cozido', 50, '1 ovo cozido'], ['tomate', 60], ['pepino', 50], ['folhas', 40], ['azeite', 5]],
  },
  // Sexta
  {
    cafe: [['ovo_preparo', 100, 'omelete de 2 ovos'], ['cottage', 80], ['pao_integral', 60], ['mamao', 150]],
    almoco: [['salmao_grelhado', 170], ['arroz_integral', 150], ['feijao_preto', 100], ['couve_refogada', 100], SALADA],
    lanche: [['iogurte_proteico', 170], ['banana', 100], ['pasta_amendoim', 10]],
    jantar: [['macarrao_integral', 150], ['camarao_cozido', 180], ['molho_tomate', 100], ['parmesao', 10], ['folhas', 50, 'salada verde']],
  },
  // Sábado
  {
    cafe: [['ovo_preparo', 100, '2 ovos'], ['aveia', 40], ['banana', 100], ['iogurte_natural', 100]],
    almoco: [['sardinha_assada', 170], ['arroz_integral', 150], ['feijao_preto', 100], ['legumes_mix', 150, 'legumes grelhados'], SALADA],
    lanche: [['cottage', 150], ['maca', 130], ['castanha_para', 10]],
    jantar: [['tilapia_grelhada', 170], ['pure_batata', 180], ['brocolis', 100], ['lentilha', 100]],
  },
  // Domingo
  {
    cafe: [['ovo_preparo', 100, '2 ovos mexidos'], ['pao_integral', 60], ['queijo_minas', 30], ['laranja', 150, '1 fruta à escolha']],
    almoco: [['merluza_assada', 180, 'peixe assado'], ['arroz_integral', 150], ['feijao_preto', 100], ['legumes_mix', 150, 'legumes assados'], SALADA],
    lanche: [['iogurte_proteico', 170], ['chia', 10], ['morango', 100]],
    jantar: [['frango_grelhado', 150, 'peito de frango grelhado'], ['arroz_integral', 120], ['grao_de_bico', 100], ['folhas', 50], ['tomate', 60]],
  },
];

const ORDER: MealType[] = ['cafe', 'almoco', 'lanche', 'jantar'];

/** Versão 1 dos jantares de quarta e domingo (antes de incluir frango) — usada na migração de dados. */
export const V1_DINNERS: Record<number, string[]> = {
  2: ['ovo_preparo', 'queijo_minas', 'batata_doce', 'folhas'],
  6: ['ovo_preparo', 'grao_de_bico', 'cottage', 'folhas', 'tomate'],
};

/** Pratos prontos com frango grelhado, disponíveis em Registrar → Salvas. */
export const CHICKEN_DISHES = [
  { id: 'sm_frango_1', name: 'Frango grelhado com arroz, feijão e salada', items: [{ foodId: 'frango_grelhado', qty: 150 }, { foodId: 'arroz_integral', qty: 150 }, { foodId: 'feijao_preto', qty: 100 }, { foodId: 'folhas', qty: 50 }, { foodId: 'azeite', qty: 5 }] },
  { id: 'sm_frango_2', name: 'Frango grelhado com batata-doce e legumes', items: [{ foodId: 'frango_grelhado', qty: 150 }, { foodId: 'batata_doce', qty: 200 }, { foodId: 'legumes_mix', qty: 150 }] },
  { id: 'sm_frango_3', name: 'Macarrão integral com frango e molho de tomate', items: [{ foodId: 'macarrao_integral', qty: 180 }, { foodId: 'frango_grelhado', qty: 120 }, { foodId: 'molho_tomate', qty: 100 }, { foodId: 'parmesao', qty: 10 }] },
  { id: 'sm_frango_4', name: 'Salada de frango com grão-de-bico', items: [{ foodId: 'frango_grelhado', qty: 120 }, { foodId: 'grao_de_bico', qty: 100 }, { foodId: 'folhas', qty: 80 }, { foodId: 'tomate', qty: 80 }, { foodId: 'pepino', qty: 50 }, { foodId: 'azeite', qty: 10 }] },
  { id: 'sm_frango_5', name: 'Wrap integral de frango (pão integral + frango + folhas + requeijão)', items: [{ foodId: 'pao_integral', qty: 50 }, { foodId: 'frango_cozido', qty: 100 }, { foodId: 'folhas', qty: 30 }, { foodId: 'tomate', qty: 40 }, { foodId: 'requeijao', qty: 15 }] },
];

export function buildInitialPlan(): WeekPlan {
  return DAYS.map((day, d) =>
    ORDER.map<PlanMeal>((type) => ({
      type,
      items: day[type].map(([foodId, qty, note], i) => ({ id: `p${d}${type}${i}`, foodId, qty, note })),
    })),
  );
}
