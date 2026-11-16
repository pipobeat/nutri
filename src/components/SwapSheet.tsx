import { useMemo, useState } from 'react';
import { fmt0 } from '../lib/format';
import { itemMacros, scale } from '../lib/nutrition';
import { useStore } from '../store/useStore';
import type { Food, PlanItem } from '../types';
import { FoodSearch, useFoodList } from './FoodSearch';
import { Segmented, Sheet, SourceBadge, cx } from './ui';

const PROTEIN_GROUPS = new Set(['peixe', 'ovo', 'laticinio', 'leguminosa']);

/** Sugere alternativas do mesmo grupo, com porção ajustada para manter proteína (fontes proteicas) ou calorias (demais). */
export function SwapSheet({ open, onClose, item, onPick }: { open: boolean; onClose: () => void; item: PlanItem | null; onPick: (foodId: string, qty: number) => void }) {
  const foods = useStore((s) => s.foods);
  const list = useFoodList();
  const [tab, setTab] = useState<'sim' | 'todos'>('sim');
  const cur = item ? foods[item.foodId] : null;

  const suggestions = useMemo(() => {
    if (!cur || !item) return [];
    const base = itemMacros(foods, item.foodId, item.qty);
    const byProtein = PROTEIN_GROUPS.has(cur.group) && base.p > 3;
    return list
      .filter((f) => f.id !== cur.id && f.group === cur.group && f.per100.kcal > 0)
      .map((f) => {
        let qty = byProtein && f.per100.p > 0 ? (base.p / f.per100.p) * 100 : (base.kcal / f.per100.kcal) * 100;
        qty = Math.max(5, Math.round(qty / 5) * 5);
        const m = scale(f.per100, qty);
        const diff = Math.abs(m.kcal - base.kcal) / Math.max(base.kcal, 1) + Math.abs(m.p - base.p) / Math.max(base.p, 5);
        return { f, qty, m, diff };
      })
      .filter((s) => s.qty <= 600)
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 12);
  }, [cur, item, foods, list]);

  if (!item || !cur) return null;
  const base = itemMacros(foods, item.foodId, item.qty);
  const pick = (f: Food, qty: number) => { onPick(f.id, qty); onClose(); };

  return (
    <Sheet open={open} onClose={onClose} title={`Substituir ${cur.name.toLowerCase()}`}>
      <p className="mb-3 text-[13px] text-muted">
        Atual: {fmt0(item.qty)} {cur.unit} · {fmt0(base.kcal)} kcal · P {fmt0(base.p)} g. Porções sugeridas mantêm {PROTEIN_GROUPS.has(cur.group) && base.p > 3 ? 'a proteína' : 'as calorias'} parecidas.
      </p>
      <Segmented value={tab} onChange={setTab} className="mb-3" options={[{ value: 'sim', label: 'Semelhantes' }, { value: 'todos', label: 'Todos os alimentos' }]} />
      {tab === 'sim' ? (
        suggestions.length ? (
          <ul className="-mx-2">
            {suggestions.map(({ f, qty, m }) => {
              const dk = m.kcal - base.kcal;
              const dp = m.p - base.p;
              return (
                <li key={f.id}>
                  <button onClick={() => pick(f, qty)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-raised active:scale-[0.99]">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium">{f.name}</p>
                      <p className="tnum text-[12.5px] text-muted">{fmt0(qty)} {f.unit} · {fmt0(m.kcal)} kcal · P {fmt0(m.p)} · C {fmt0(m.c)} · G {fmt0(m.f)}</p>
                      <p className="tnum text-[12px] text-faint">
                        <span className={cx(Math.abs(dk) > 60 && 'text-warn')}>{dk >= 0 ? '+' : ''}{fmt0(dk)} kcal</span> · {dp >= 0 ? '+' : ''}{fmt0(dp)} g proteína
                      </p>
                    </div>
                    <SourceBadge source={f.source} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-muted">Sem alternativas cadastradas nesse grupo. Use “Todos os alimentos”.</p>
        )
      ) : (
        <FoodSearch onPick={(f) => pick(f, Math.max(5, Math.round(((base.kcal || 100) / Math.max(f.per100.kcal, 1)) * 100 / 5) * 5))} />
      )}
    </Sheet>
  );
}
