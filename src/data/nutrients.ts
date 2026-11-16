import type { NutrientKey } from '../types';

export interface NutrientInfo {
  key: NutrientKey | 'proteina' | 'fibras';
  name: string;
  role: string;
  sources: string[];
  pescNote: string;
  signs: string;
  exams: string;
}

/** Conteúdo educativo geral. Não é orientação individual. */
export const NUTRIENTS: NutrientInfo[] = [
  {
    key: 'b12',
    name: 'Vitamina B12',
    role: 'Participa da formação de glóbulos vermelhos, do funcionamento do sistema nervoso e da síntese de DNA.',
    sources: ['Peixes (sardinha, salmão, atum)', 'Frutos do mar (camarão, mariscos)', 'Ovos', 'Leite, iogurte e queijos'],
    pescNote: 'Peixes, frutos do mar, ovos e laticínios contribuem para a ingestão de B12, mas a adequação depende da quantidade e da frequência de consumo.',
    signs: 'Cansaço persistente, formigamento ou alterações de memória podem ter muitas causas — não servem para diagnóstico.',
    exams: 'Vitamina B12 sérica, hemograma e, a critério profissional, ácido metilmalônico ou homocisteína.',
  },
  {
    key: 'vitd',
    name: 'Vitamina D',
    role: 'Ajuda na absorção de cálcio e na saúde óssea e muscular; também atua no sistema imune.',
    sources: ['Exposição solar (principal fonte)', 'Peixes gordos (salmão, sardinha)', 'Gema de ovo', 'Atum'],
    pescNote: 'Poucos alimentos são boas fontes. Não use doses elevadas de vitamina D sem avaliação profissional.',
    signs: 'Níveis baixos muitas vezes não causam sintomas perceptíveis. Só exames confirmam.',
    exams: '25-hidroxivitamina D [25(OH)D], a critério profissional.',
  },
  {
    key: 'ferro',
    name: 'Ferro',
    role: 'Transporte de oxigênio no sangue (hemoglobina) e metabolismo energético.',
    sources: ['Feijões, lentilha e grão-de-bico (ferro não heme)', 'Folhas verde-escuras (espinafre, couve)', 'Aveia e pães integrais', 'Frutos do mar e peixes (ferro heme)'],
    pescNote: 'Combinar fontes vegetais de ferro com alimentos ricos em vitamina C (laranja, limão, tomate, morango) pode favorecer a absorção. Café e chá preto junto das refeições podem reduzir a absorção do ferro não heme. Não use suplementos de ferro sem avaliação profissional.',
    signs: 'Cansaço e palidez são inespecíficos e não indicam, sozinhos, falta de ferro.',
    exams: 'Hemograma, ferritina e, a critério profissional, ferro sérico e saturação de transferrina.',
  },
  {
    key: 'zinco',
    name: 'Zinco',
    role: 'Imunidade, cicatrização, paladar e funcionamento de centenas de enzimas.',
    sources: ['Frutos do mar (especialmente ostras e camarão)', 'Leguminosas', 'Castanhas e sementes', 'Ovos, queijos e cereais integrais'],
    pescNote: 'Frutos do mar ajudam bastante. Deixar leguminosas de molho antes do cozimento pode melhorar o aproveitamento.',
    signs: 'Sinais são pouco específicos; não presuma deficiência por sintomas.',
    exams: 'Zinco sérico/plasmático, interpretado por um profissional.',
  },
  {
    key: 'calcio',
    name: 'Cálcio',
    role: 'Saúde dos ossos e dentes, contração muscular e transmissão nervosa.',
    sources: ['Leite, iogurte e queijos', 'Sardinha (com espinhas)', 'Brócolis, couve e rúcula', 'Chia e amêndoas'],
    pescNote: 'Laticínios e sardinha são fontes relevantes no seu padrão alimentar.',
    signs: 'Ingestão baixa raramente dá sintomas no curto prazo.',
    exams: 'Cálcio sérico não reflete a ingestão; a avaliação é feita por um profissional, às vezes com densitometria.',
  },
  {
    key: 'omega3',
    name: 'Ômega-3 (EPA/DHA)',
    role: 'Gorduras associadas à saúde cardiovascular e cerebral.',
    sources: ['Salmão', 'Sardinha', 'Atum (com moderação)', 'Chia e linhaça (ALA, forma vegetal com baixa conversão em EPA/DHA)'],
    pescNote: 'Peixes gordos 1–2×/semana contribuem bem. Prefira variar e escolher opções com menor teor de mercúrio, como sardinha e salmão; evite depender de grandes predadores ou de muito atum.',
    signs: 'Não há sintomas confiáveis de ingestão baixa.',
    exams: 'Índice de ômega-3 existe, mas não é rotina; converse com um profissional.',
  },
  {
    key: 'proteina',
    name: 'Proteína',
    role: 'Preservação e construção de massa muscular, saciedade e recuperação.',
    sources: ['Peixes e frutos do mar', 'Ovos', 'Iogurte, cottage e queijos', 'Leguminosas'],
    pescNote: 'Distribuir a proteína ao longo das 4 refeições costuma ajudar na saciedade.',
    signs: '—',
    exams: '—',
  },
  {
    key: 'fibras',
    name: 'Fibras',
    role: 'Saúde intestinal, saciedade e controle glicêmico.',
    sources: ['Feijões, lentilha e grão-de-bico', 'Aveia, chia e integrais', 'Frutas e verduras'],
    pescNote: 'Referência comum para adultos: 25–38 g/dia. Aumente aos poucos, com boa ingestão de água.',
    signs: '—',
    exams: '—',
  },
];
