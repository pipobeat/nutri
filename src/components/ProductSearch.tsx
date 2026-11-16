import { motion } from 'framer-motion';
import { Barcode, ImageOff, Loader2, Search, WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { fmt0, fmt1 } from '../lib/format';
import { highlights, productToFood, searchProducts, SearchError, type Product } from '../lib/openfoodfacts';
import { violatesDiet } from '../lib/nutrition';
import { useStore } from '../store/useStore';
import type { Food, Goals } from '../types';
import { Badge, Button, cx, EmptyState } from './ui';

const NUTRI_COLORS: Record<string, string> = { a: '#1e8f4e', b: '#60ac0e', c: '#c9a400', d: '#e07c00', e: '#d9381e' };

export function NutriScore({ grade }: { grade?: string }) {
  if (!grade) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-raised px-2 py-0.5 text-[11px] font-semibold text-muted" title="Nutri-Score (Open Food Facts)">
      Nutri-Score <span className="grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold uppercase text-white" style={{ background: NUTRI_COLORS[grade] }}>{grade}</span>
    </span>
  );
}

function Thumb({ src, size = 48 }: { src?: string; size?: number }) {
  const [err, setErr] = useState(false);
  return (
    <div className="grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white/90" style={{ width: size, height: size }}>
      {src && !err ? <img src={src} alt="" loading="lazy" onError={() => setErr(true)} className="h-full w-full object-contain" /> : <ImageOff size={size / 2.6} className="text-black/30" />}
    </div>
  );
}

/** Busca de produtos industrializados / lanches por nome, marca ou código de barras (Open Food Facts). */
export function ProductSearch({ onPick, initialQuery = '' }: { onPick: (food: Food, product: Product) => void; initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery);
  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'done' | 'error'; items: Product[]; error?: SearchError; query?: string }>({ status: 'idle', items: [] });
  const excluded = useStore((s) => s.settings.excludedTerms);
  const allowChicken = useStore((s) => s.settings.allowChicken);
  const ctrl = useRef<AbortController | null>(null);

  const run = async (query = q) => {
    const term = query.trim();
    if (term.length < 2) return;
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setState((s) => ({ ...s, status: 'loading', query: term }));
    try {
      const items = await searchProducts(term, c.signal);
      if (!c.signal.aborted) setState({ status: 'done', items, query: term });
    } catch (e) {
      if (c.signal.aborted) return;
      setState({ status: 'error', items: [], error: e instanceof SearchError ? e : new SearchError('server', 'Erro na busca.'), query: term });
    }
  };
  useEffect(() => { if (initialQuery) run(initialQuery); return () => ctrl.current?.abort(); }, []); // eslint-disable-line

  return (
    <div>
      <form className="sticky top-0 z-10 -mx-1 flex gap-2 bg-surface px-1 pb-2" onSubmit={(e) => { e.preventDefault(); run(); }}>
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            enterKeyHint="search"
            placeholder="Produto, marca ou código de barras"
            aria-label="Buscar produto ou marca"
            className="h-12 w-full rounded-2xl bg-raised pl-11 pr-4 text-ink outline-none placeholder:text-faint focus:ring-2 focus:ring-accent/40"
          />
        </div>
        <Button type="submit" disabled={q.trim().length < 2 || state.status === 'loading'}>Buscar</Button>
      </form>

      {state.status === 'idle' && (
        <div className="space-y-3 px-1 py-4 text-[13.5px] leading-relaxed text-muted">
          <p>Pesquise qualquer produto: <span className="text-ink">“iogurte Nestlé grego”</span>, <span className="text-ink">“whey Growth”</span>, <span className="text-ink">“barra Bold”</span>, <span className="text-ink">“pão de queijo Forno de Minas”</span>…</p>
          <p className="flex items-start gap-2"><Barcode size={16} className="mt-0.5 shrink-0" /> Também aceita o código de barras (os números abaixo das barras).</p>
          <p className="text-[12px] text-faint">Dados do Open Food Facts, base aberta e colaborativa com informações de rótulo. Podem conter erros — confira com a embalagem.</p>
        </div>
      )}
      {state.status === 'loading' && (
        <div className="space-y-2 py-2" aria-busy="true" aria-label="Buscando">
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div key={i} className="flex items-center gap-3 px-2 py-2" initial={{ opacity: 0.4 }} animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 }}>
              <div className="h-12 w-12 rounded-xl bg-raised" />
              <div className="flex-1 space-y-2"><div className="h-3 w-2/3 rounded bg-raised" /><div className="h-3 w-1/3 rounded bg-raised" /></div>
            </motion.div>
          ))}
          <p className="flex items-center justify-center gap-2 text-[12.5px] text-faint"><Loader2 size={14} className="animate-spin" /> Consultando Open Food Facts…</p>
        </div>
      )}
      {state.status === 'error' && (
        <EmptyState
          icon={<WifiOff size={22} />}
          title={state.error?.kind === 'offline' ? 'Você está offline' : 'Não foi possível buscar'}
          text={`${state.error?.message ?? ''} Você ainda pode usar o registro “Rápido” ou cadastrar o alimento em “Novo”.`}
          action={<Button variant="subtle" onClick={() => run(state.query)}>Tentar de novo</Button>}
        />
      )}
      {state.status === 'done' && state.items.length === 0 && (
        <EmptyState icon={<Search size={22} />} title={`Nada encontrado para “${state.query}”`} text="Tente outro nome, só a marca ou o código de barras. Se não achar, use “Rápido” com os valores do rótulo." />
      )}
      {state.status === 'done' && state.items.length > 0 && (
        <ul className="-mx-2">
          {state.items.map((p) => {
            const blocked = violatesDiet(`${p.name}`, excluded, allowChicken);
            return (
              <li key={p.code}>
                <button
                  onClick={() => !blocked && onPick(productToFood(p), p)}
                  disabled={!!blocked}
                  className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-raised active:scale-[0.99] disabled:opacity-45"
                >
                  <Thumb src={p.image} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{p.name}</p>
                    <p className="truncate text-[12.5px] text-muted">{[p.brand, p.quantity].filter(Boolean).join(' · ') || 'marca não informada'}</p>
                    {blocked ? (
                      <p className="text-[12px] text-warn">Fora do seu padrão alimentar (“{blocked}”)</p>
                    ) : p.has.kcal ? (
                      <p className="tnum text-[12.5px] text-faint">
                        <b className="font-semibold text-ink">{fmt0(p.per100.kcal)} kcal</b> · P {fmt1(p.per100.p)} · C {fmt1(p.per100.c)} · G {fmt1(p.per100.f)} <span>/100 {p.liquid ? 'ml' : 'g'}</span>
                      </p>
                    ) : (
                      <p className="text-[12px] text-warn">Sem informação nutricional</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {p.isBR && <Badge tone="accent">BR</Badge>}
                    {p.nutriscore && <span className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold uppercase text-white" style={{ background: NUTRI_COLORS[p.nutriscore] }} title={`Nutri-Score ${p.nutriscore.toUpperCase()}`}>{p.nutriscore}</span>}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Cabeçalho detalhado do produto (calorias, nutrientes, destaques, % da meta). */
export function ProductDetails({ p, goals }: { p: Product; goals: Goals }) {
  const unit = p.liquid ? 'ml' : 'g';
  const hl = highlights(p);
  const serving = p.servingQty;
  const per = (v: number) => (serving ? (v * serving) / 100 : undefined);
  const rows: [string, number | undefined, string, number | undefined][] = [
    ['Calorias', p.has.kcal ? p.per100.kcal : undefined, 'kcal', p.has.kcal ? per(p.per100.kcal) : undefined],
    ['Proteínas', p.has.macros ? p.per100.p : undefined, 'g', per(p.per100.p)],
    ['Carboidratos', p.has.macros ? p.per100.c : undefined, 'g', per(p.per100.c)],
    ['  dos quais açúcares', p.extra.sugars, 'g', p.extra.sugars !== undefined ? per(p.extra.sugars) : undefined],
    ['Gorduras', p.has.macros ? p.per100.f : undefined, 'g', per(p.per100.f)],
    ['  das quais saturadas', p.extra.satFat, 'g', p.extra.satFat !== undefined ? per(p.extra.satFat) : undefined],
    ['Fibras', p.per100.fiber || undefined, 'g', p.per100.fiber ? per(p.per100.fiber) : undefined],
    ['Sódio', p.extra.sodiumMg, 'mg', p.extra.sodiumMg !== undefined ? per(p.extra.sodiumMg) : undefined],
  ];
  const ref = serving ?? 100;
  const pctK = goals.kcal ? ((p.per100.kcal * ref) / 100 / goals.kcal) * 100 : 0;
  const pctP = goals.p ? ((p.per100.p * ref) / 100 / goals.p) * 100 : 0;
  const level = p.per100.kcal / 100 > 4 ? 'muito calórico' : p.per100.kcal / 100 >= 1.5 ? 'moderadamente calórico' : 'pouco calórico';

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Thumb src={p.image} size={64} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-muted">{[p.brand, p.quantity].filter(Boolean).join(' · ')}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <NutriScore grade={p.nutriscore} />
            {p.nova && <Badge>NOVA {p.nova}{p.nova === 4 ? ' · ultraprocessado' : ''}</Badge>}
          </div>
        </div>
      </div>

      {p.has.kcal ? (
        <div className="rounded-2xl bg-raised/60 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="tnum text-[34px] font-semibold leading-none">{fmt0(p.per100.kcal)}<span className="text-[14px] font-normal text-muted"> kcal / 100 {unit}</span></p>
              <p className="mt-1 text-[13px] text-muted">{level[0].toUpperCase() + level.slice(1)}{p.kcalEstimated && <span className="text-warn"> · kcal calculadas pelos macros</span>}</p>
            </div>
            {serving && (
              <div className="text-right">
                <p className="tnum text-[20px] font-semibold">{fmt0(per(p.per100.kcal)!)} kcal</p>
                <p className="text-[12px] text-faint">por porção ({p.servingSize ?? `${fmt0(serving)} ${unit}`})</p>
              </div>
            )}
          </div>
          <p className="tnum mt-3 text-[12.5px] text-muted">
            {serving ? '1 porção' : '100 ' + unit} = <b className="text-ink">{fmt0(pctK)}%</b> da sua meta de calorias e <b className="text-ink">{fmt0(pctP)}%</b> da meta de proteína.
          </p>
        </div>
      ) : (
        <p className="rounded-2xl bg-warn/10 px-3 py-2 text-[13px] text-warn">Este produto não tem informação nutricional no Open Food Facts. Use o registro “Rápido” com os valores da embalagem.</p>
      )}

      {hl.length > 0 && (
        <div>
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-faint">Perfil nutricional</p>
          <div className="flex flex-wrap gap-1.5">
            {hl.map((h) => (
              <span key={h.label} className={cx('rounded-full px-2.5 py-1 text-[12px] font-semibold', h.tone === 'good' ? 'bg-accent/15 text-accent' : h.tone === 'warn' ? 'bg-warn/15 text-warn' : 'bg-raised text-muted')}>{h.label}</span>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-faint">Indicativo, por 100 {unit}: proteína/fibras pelos critérios de alegação da UE (Reg. 1924/2006); gordura, açúcares e sódio pelo semáforo da FSA (Reino Unido).</p>
        </div>
      )}

      <div>
        <p className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-faint">Informação nutricional</p>
        <table className="tnum w-full text-[13.5px]">
          <thead><tr className="text-[11.5px] text-faint"><th className="py-1 text-left font-medium" /><th className="text-right font-medium">100 {unit}</th>{serving && <th className="text-right font-medium">porção</th>}</tr></thead>
          <tbody>
            {rows.map(([label, v, u, pv]) => (
              <tr key={label} className="border-t border-line/50">
                <td className={cx('py-1.5', label.startsWith('  ') ? 'pl-3 text-muted' : '')}>{label.trim()}</td>
                <td className="text-right">{v === undefined ? <span className="text-faint">—</span> : `${u === 'kcal' || u === 'mg' ? fmt0(v) : fmt1(v)} ${u}`}</td>
                {serving && <td className="text-right text-muted">{pv === undefined || v === undefined ? '—' : `${u === 'kcal' || u === 'mg' ? fmt0(pv) : fmt1(pv)} ${u}`}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
