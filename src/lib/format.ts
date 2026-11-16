const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const nf1f = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const fmt0 = (n: number) => nf0.format(Math.round(n));
export const fmt1 = (n: number) => nf1.format(n);
export const fmt1f = (n: number) => nf1f.format(n);
export const kcal = (n: number) => `${fmt0(n)} kcal`;
export const grams = (n: number) => `${fmt0(n)} g`;

/** Converte "78,5" ou "78.5" em número. */
export function parseNum(v: string | number): number {
  if (typeof v === 'number') return v;
  let t = String(v).trim().replace(/\s/g, '');
  if (!t) return NaN;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
