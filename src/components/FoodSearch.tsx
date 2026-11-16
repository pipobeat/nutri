import { Search, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { fmt0, fmt1 } from '../lib/format';
import { normalize, violatesDiet } from '../lib/nutrition';
import { useStore } from '../store/useStore';
import type { Food } from '../types';
import { TACO_FOODS } from '../data/taco';
import { cx, SourceBadge } from './ui';

/** Alimentos permitidos pela dieta: base + cadastrados + TACO completa (sem duplicar o que já está na base). */
export function useFoodList(includeTaco = true, includeMeat = false) {
  const foods = useStore((s) => s.foods);
  const excluded = useStore((s) => s.settings.excludedTerms);
  const allowChicken = useStore((s) => s.settings.allowChicken);
  return useMemo(() => {
    const own = Object.values(foods);
    const have = new Set(own.map((f) => f.tacoId).filter(Boolean));
    const taco = includeTaco ? TACO_FOODS.filter((f) => !have.has(f.tacoId) && !foods[f.id]) : [];
    return [...own, ...taco].filter((f) => includeMeat || (f.meat !== 'm' && (allowChicken || f.meat !== 'c') && !violatesDiet(f.name, excluded, allowChicken)));
  }, [foods, excluded, allowChicken, includeTaco, includeMeat]);
}

/** Índice (id → alimento) com tudo que a busca enxerga — usado pelo cálculo de pratos. */
export function useFoodIndex(includeMeat = false) {
  const list = useFoodList(true, includeMeat);
  return useMemo(() => Object.fromEntries(list.map((f) => [f.id, f])), [list]);
}

export function FoodRow({ f, onClick, right }: { f: Food; onClick?: () => void; right?: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-raised active:scale-[0.99]">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[15px] font-medium">{f.name}</p>
        </div>
        <p className="tnum mt-0.5 truncate text-[12.5px] text-muted">
          {fmt0(f.per100.kcal)} kcal · P {fmt1(f.per100.p)} · C {fmt1(f.per100.c)} · G {fmt1(f.per100.f)} <span className="text-faint">/100 {f.unit}</span>
        </p>
        <p className="mt-0.5 text-[11.5px] text-faint">{f.prep}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <SourceBadge source={f.source} />
        {right}
      </div>
    </button>
  );
}

/** Busca por nome em toda a base (sem acento, por palavras). */
export function FoodSearch({ onPick, autoFocus, filter, placeholder = 'Buscar alimento (ex.: salmão, arroz, iogurte)', onSearchProducts }: {
  onPick: (f: Food) => void; autoFocus?: boolean; filter?: (f: Food) => boolean; placeholder?: string; onSearchProducts?: (q: string) => void;
}) {
  const [q, setQ] = useState('');
  const all = useFoodList();
  const ownFoods = useStore((s) => s.foods);
  const upsertFood = useStore((s) => s.upsertFood);
  // alimentos da TACO entram na base pessoal ao serem usados (cardápio, refeições salvas, histórico)
  const pick = (f: Food) => { if (!ownFoods[f.id]) upsertFood(f); onPick(f); };
  const preferred = useStore((s) => s.settings.preferredFoods);
  const log = useStore((s) => s.log);
  const recentIds = useMemo(() => {
    const seen: string[] = [];
    for (let i = log.length - 1; i >= 0 && seen.length < 8; i--) {
      const id = log[i].foodId;
      if (id && !seen.includes(id)) seen.push(id);
    }
    return seen;
  }, [log]);

  const results = useMemo(() => {
    const words = normalize(q).split(/\s+/).filter(Boolean);
    let list = all.filter((f) => (filter ? filter(f) : true) && (words.length || !f.id.startsWith('taco_') || false));
    if (words.length) {
      list = list.filter((f) => {
        const hay = normalize(`${f.name} ${f.sourceRef} ${f.prep} ${f.shopping.name}`);
        return words.every((w) => hay.includes(w));
      });
    }
    const score = (f: Food) => (preferred.includes(f.id) ? -3 : 0) + (recentIds.includes(f.id) ? -2 : 0) + (words.length && normalize(f.name).startsWith(words[0]) ? -1 : 0) + (f.id.startsWith('taco_') ? 1 : 0);
    return list.sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name, 'pt-BR'));
  }, [q, all, filter, preferred, recentIds]);

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-1 bg-surface px-1 pb-2">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
          <input
            autoFocus={autoFocus}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder}
            aria-label="Buscar alimento"
            className="h-12 w-full rounded-2xl bg-raised pl-11 pr-4 text-ink outline-none placeholder:text-faint focus:ring-2 focus:ring-accent/40"
          />
        </div>
      </div>
      {!q.trim() && <p className="px-2 pb-2 text-[12px] text-faint">Digite para buscar também nos {TACO_FOODS.length} alimentos da TACO completa.</p>}
      {results.length === 0 ? (
        <div className="px-3 py-8 text-center text-sm text-muted">
          <p>Nenhum alimento da base para “{q}”.</p>
          {onSearchProducts ? (
            <button onClick={() => onSearchProducts(q)} className="mt-3 inline-flex h-10 items-center gap-2 rounded-2xl bg-accent/15 px-4 font-semibold text-accent">
              <Search size={16} /> Buscar “{q}” em produtos e marcas
            </button>
          ) : <p>Você pode cadastrá-lo na aba <b>Novo</b>.</p>}
        </div>
      ) : (
        <ul className="-mx-2">
          {results.map((f) => (
            <li key={f.id}>
              <FoodRow
                f={f}
                onClick={() => pick(f)}
                right={preferred.includes(f.id) ? <Star size={13} className={cx('fill-carb text-carb')} aria-label="Preferido" /> : recentIds.includes(f.id) ? <span className="text-[11px] text-faint">recente</span> : null}
              />
            </li>
          ))}
        </ul>
      )}
      {onSearchProducts && q.trim().length >= 2 && results.length > 0 && (
        <button onClick={() => onSearchProducts(q)} className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-[13.5px] font-semibold text-accent hover:bg-accent/10">
          <Search size={15} /> Não achou? Buscar “{q.trim()}” em produtos e marcas
        </button>
      )}
    </div>
  );
}
