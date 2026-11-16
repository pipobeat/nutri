export type MealType = 'cafe' | 'almoco' | 'lanche' | 'jantar';

export type ShoppingCategory =
  | 'peixes'
  | 'aves'
  | 'ovos_laticinios'
  | 'graos'
  | 'leguminosas'
  | 'frutas'
  | 'verduras'
  | 'complementos'
  | 'outros';

/** Grupo de substituição: alimentos trocáveis entre si. */
export type SubGroup =
  | 'peixe'
  | 'ovo'
  | 'laticinio'
  | 'carbo'
  | 'leguminosa'
  | 'fruta'
  | 'vegetal'
  | 'gordura'
  | 'bebida'
  | 'outro';

export type DataSource = 'TACO' | 'USDA' | 'Rótulo' | 'Estimado' | 'Personalizado' | 'Open Food Facts';

export type Prep =
  | 'cru'
  | 'cozido'
  | 'grelhado'
  | 'assado'
  | 'refogado'
  | 'frito'
  | 'enlatado, escorrido'
  | 'pronto'
  | 'industrializado';

export type NutrientKey = 'b12' | 'vitd' | 'ferro' | 'zinco' | 'calcio' | 'omega3';

export interface Macros {
  kcal: number;
  p: number;
  c: number;
  f: number;
  fiber: number;
}

/** Micronutrientes por 100 g (TACO). null = não analisado na TACO. */
export interface Micro {
  ca: number | null; // cálcio, mg
  fe: number | null; // ferro, mg
  zn: number | null; // zinco, mg
  na: number | null; // sódio, mg
  mg: number | null; // magnésio, mg
  k: number | null; // potássio, mg
  vitc: number | null; // vitamina C, mg
}

export interface Food {
  id: string;
  name: string;
  prep: Prep;
  /** valores por 100 g (ou 100 ml para líquidos) */
  per100: Macros;
  unit: 'g' | 'ml';
  /** peso de uma unidade, quando faz sentido (ex.: ovo = 50 g) */
  unitWeight?: number;
  unitLabel?: string;
  source: DataSource;
  /** descrição exata do item na fonte */
  sourceRef: string;
  /** observação sobre precisão */
  note?: string;
  group: SubGroup;
  shopping: { name: string; category: ShoppingCategory; factor?: number; factorNote?: string };
  nutrients?: NutrientKey[];
  custom?: boolean;
  edited?: boolean;
  /** id na TACO, quando o alimento vem dela */
  tacoId?: number;
  micro?: Micro;
  /** medidas caseiras do IBGE (POF 2008-2009): [nome, gramas] */
  measures?: [string, number][];
  /** carne: 'c' = frango, 'm' = outras carnes terrestres */
  meat?: 'c' | 'm';
}

export interface PlanItem {
  id: string;
  foodId: string;
  qty: number;
  note?: string;
}

export interface PlanMeal {
  type: MealType;
  items: PlanItem[];
}

/** índice 0 = segunda … 6 = domingo */
export type WeekPlan = PlanMeal[][];

export type LogOrigin = 'plano' | 'manual' | 'fora' | 'rapido';

export interface LogEntry {
  id: string;
  date: string; // AAAA-MM-DD
  meal: MealType;
  foodId?: string;
  name: string;
  qty: number;
  unit: 'g' | 'ml' | 'porção';
  macros: Macros;
  origin: LogOrigin;
  /** id do item do plano, quando originado do cardápio */
  planItemId?: string;
  note?: string;
  estimated?: boolean;
  /** micronutrientes da quantidade registrada (quando a fonte tem) */
  micro?: Micro;
  createdAt: number;
}

export interface WeightEntry {
  id: string;
  date: string;
  weight: number;
  waist?: number;
  note?: string;
}

export interface ExerciseEntry {
  id: string;
  date: string;
  type: string;
  minutes: number;
  rpe: number; // 1–10
  note?: string;
}

export interface Supplement {
  id: string;
  name: string;
  dose: string;
  time: string;
  frequency: string;
  note?: string;
  active: boolean;
}

export interface SavedMeal {
  id: string;
  name: string;
  items: { foodId: string; qty: number }[];
}

export interface Profile {
  name: string;
  sex: 'm' | 'f';
  age: number;
  height: number;
  weight: number;
  activity: string;
  activityFactor: number;
  goal: string;
  diet: string;
  budget: string;
}

export interface Goals {
  kcal: number;
  p: number;
  c: number;
  f: number;
  fiber: number;
  water: number;
  weightTarget?: number;
}

export interface Reminder {
  id: string;
  label: string;
  time: string;
  enabled: boolean;
}

export interface Settings {
  theme: 'dark' | 'light' | 'system';
  reduceMotion: boolean;
  glassMl: number;
  excludedTerms: string[];
  /** consome frango ocasionalmente (peito grelhado) */
  allowChicken: boolean;
  preferredFoods: string[];
  reminders: Reminder[];
  notificationsEnabled: boolean;
}

export interface ShoppingState {
  checked: Record<string, boolean>;
  overrides: Record<string, string>;
  removed: Record<string, boolean>;
  manual: { id: string; name: string; qty: string; category: ShoppingCategory; checked: boolean }[];
}
