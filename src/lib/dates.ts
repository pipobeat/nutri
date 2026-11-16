const pad = (n: number) => String(n).padStart(2, '0');

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function fromKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export const todayKey = () => toKey(new Date());

export function addDays(k: string, n: number): string {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
}
/** 0 = segunda … 6 = domingo */
export function weekdayIndex(k: string): number {
  return (fromKey(k).getDay() + 6) % 7;
}
export function mondayOf(k: string): string {
  return addDays(k, -weekdayIndex(k));
}
export function weekKeys(k: string): string[] {
  const mon = mondayOf(k);
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
}
export const WEEKDAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
export const WEEKDAYS_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function longDate(k: string): string {
  return fromKey(k).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}
export function shortDate(k: string): string {
  return fromKey(k).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
export function mediumDate(k: string): string {
  return fromKey(k).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}
export function daysBetween(a: string, b: string): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000);
}
export function greeting(h = new Date().getHours()): string {
  if (h < 5) return 'Boa noite';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}
