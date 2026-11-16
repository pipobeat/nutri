import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Bookmark, Loader2, Sparkles, Trash2, Wand2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { AiError, estimateWithAI, getApiKey } from '../lib/aiDish';
import { dishHighlights, dishMicro, dishToFood, dishTotals, estimateLocal, ingMacros, type DishEstimate, type DishIngredient } from '../lib/dish';
import { fmt0, fmt1, parseNum } from '../lib/format';
import { MEAL_LABEL } from '../lib/nutrition';
import { useStore } from '../store/useStore';
import { useUI } from '../store/ui';
import type { MealType } from '../types';
import { FoodSearch, useFoodIndex } from './FoodSearch';
import { MacroLine } from './NutritionProgress';
import { Badge, Button, cx, Segmented, Sheet, useToast } from './ui';

const EXAMPLES = ['Peito de frango grelhado com macarrão ao molho Alfredo', 'Poke de salmão com arroz, manga e cream cheese', '2 pães de queijo e café com leite', 'Prato feito: arroz, feijão, filé de tilápia, salada e batata frita'];

export function DishEstimator({ date, meal, away }: { date: string; meal: MealType; away: boolean }) {
  const s = useStore();
  const index = useFoodIndex(true); // o cálculo reconhece tudo (com aviso se fugir da dieta)
  const go = useUI((x) => x.go);
  const toast = useToast();
  const hasKey = !!getApiKey();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'ia' | 'local'>(hasKey ? 'ia' : 'local');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AiError | null>(null);
  const [est, setEst] = useState<DishEstimate | null>(null);
  const [resolve, setResolve] = useState<DishIngredient | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  const run = async () => {
    if (text.trim().length < 3) return;
    setError(null);
    if (mode === 'local') { setEst(estimateLocal(text, index)); return; }
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setBusy(true);
    try {
      const r = await estimateWithAI(text, s.foods, c.signal, index);
      if (!c.signal.aborted) setEst(r);
    } catch (e) {
      if (!c.signal.aborted) setError(e instanceof AiError ? e : new AiError('other', 'Não foi possível calcular agora.'));
    } finally {
      if (!c.signal.aborted) setBusy(false);
    }
  };

  const update = (key: string, patch: Partial<DishIngredient>) => est && setEst({ ...est, ingredients: est.ingredients.map((i) => (i.key === key ? { ...i, ...patch, defaulted: false } : i)) });
  const remove = (key: string) => est && setEst({ ...est, ingredients: est.ingredients.filter((i) => i.key !== key) });
  const valid = est ? est.ingredients.filter((i) => i.origin !== 'none') : [];
  const totals = dishTotals(valid);
  const grams = valid.reduce((a, i) => a + i.grams, 0);
  const unresolved = est ? est.ingredients.some((i) => i.origin === 'none') : false;

  const register = () => {
    if (!est || !valid.length) return;
    s.addLog({
      date, meal, name: est.dish, qty: 1, unit: 'porção', macros: totals, micro: dishMicro(valid), origin: away ? 'fora' : 'rapido', estimated: true,
      note: valid.map((i) => `${i.name} ${fmt0(i.grams)} g`).join(', '),
    });
    toast(`${est.dish} registrado no ${MEAL_LABEL[meal].toLowerCase()}`);
    setEst(null); setText('');
  };
  const saveDish = () => {
    if (!est || !valid.length) return;
    s.upsertFood(dishToFood(est.dish, valid, est.method));
    toast('Prato salvo na sua base — busque pelo nome para registrar de novo');
  };

  return (
    <div>
      <p className="mb-3 text-[13.5px] leading-relaxed text-muted">Descreva o que comeu, do jeito que falaria. O app separa os ingredientes, estima as porções e calcula calorias e macros.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="ex.: Peito de frango grelhado com macarrão ao molho Alfredo"
        aria-label="Descrição do prato"
        className="w-full resize-none rounded-2xl bg-raised p-4 text-ink outline-none placeholder:text-faint focus:ring-2 focus:ring-accent/40"
      />
      {!text && (
        <div className="no-scrollbar -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
          {EXAMPLES.map((x) => (
            <button key={x} onClick={() => setText(x)} className="shrink-0 rounded-full bg-raised px-3 py-1.5 text-[12.5px] text-muted hover:text-ink">{x}</button>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center gap-2">
        <Segmented value={mode} onChange={(m) => { setMode(m); setError(null); }} className="flex-1" options={[{ value: 'ia', label: '✦ Com IA' }, { value: 'local', label: 'Offline' }]} />
        <Button onClick={run} disabled={text.trim().length < 3 || busy} icon={busy ? <Loader2 size={17} className="animate-spin" /> : <Wand2 size={17} />}>{busy ? 'Calculando' : 'Calcular'}</Button>
      </div>
      <p className="mt-2 px-1 text-[11.5px] leading-snug text-faint">
        {mode === 'ia'
          ? hasKey ? 'Usa o Claude (Anthropic) para entender qualquer prato. Ingredientes da base são recalculados com a TACO; o resto é estimativa da IA.' : 'Para usar a IA, adicione sua chave da API da Anthropic em Ajustes.'
          : 'Funciona sem internet: reconhece os alimentos da sua base e usa porções típicas quando você não informa a quantidade.'}
      </p>
      {mode === 'ia' && !hasKey && <Button variant="subtle" size="sm" className="mt-2" onClick={() => go('ajustes')}>Configurar chave da IA</Button>}

      {busy && (
        <div className="mt-4 space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => <motion.div key={i} className="h-12 rounded-2xl bg-raised" animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1.3, repeat: Infinity, delay: i * 0.12 }} />)}
          <p className="flex items-center justify-center gap-2 text-[12.5px] text-faint"><Sparkles size={14} /> Analisando ingredientes e porções…</p>
        </div>
      )}
      {error && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-danger/10 p-3 text-[13.5px] text-danger" role="alert">
          <AlertTriangle size={17} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p>{error.message}</p>
            <div className="mt-2 flex gap-2">
              {error.kind !== 'nokey' && error.kind !== 'auth' && <button className="font-semibold underline" onClick={run}>Tentar de novo</button>}
              {(error.kind === 'nokey' || error.kind === 'auth') && <button className="font-semibold underline" onClick={() => go('ajustes')}>Abrir Ajustes</button>}
              <button className="font-semibold underline" onClick={() => { setMode('local'); setError(null); setEst(estimateLocal(text, index)); }}>Calcular offline</button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {est && !busy && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="mt-5 space-y-4">
            <div className="rounded-3xl bg-raised/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[16px] font-semibold leading-snug">{est.dish}</p>
                <button aria-label="Descartar cálculo" onClick={() => setEst(null)} className="text-faint hover:text-ink"><X size={18} /></button>
              </div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="tnum text-[38px] font-semibold leading-none">{fmt0(totals.kcal)}<span className="text-[14px] font-normal text-muted"> kcal</span></p>
                <div className="text-right text-[12px] text-faint">
                  <p className="tnum">{fmt0(grams)} g no total</p>
                  <p className="tnum">{grams ? fmt0((totals.kcal / grams) * 100) : 0} kcal / 100 g</p>
                </div>
              </div>
              <MacroLine m={totals} className="mt-2" />
              <p className="tnum mt-1 text-[12.5px] text-muted">Fibras {fmt1(totals.fiber)} g · {fmt0((totals.kcal / Math.max(1, s.goals.kcal)) * 100)}% da meta de calorias · {fmt0((totals.p / Math.max(1, s.goals.p)) * 100)}% da de proteína</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone={est.confidence === 'alta' ? 'accent' : est.confidence === 'média' ? 'info' : 'warn'}>confiança {est.confidence}</Badge>
                <Badge>{est.method === 'ia' ? 'calculado com IA' : 'estimativa offline'}</Badge>
                {dishHighlights(valid).map((h) => (
                  <span key={h.label} className={cx('rounded-full px-2 py-0.5 text-[11px] font-semibold', h.tone === 'good' ? 'bg-accent/15 text-accent' : h.tone === 'warn' ? 'bg-warn/15 text-warn' : 'bg-raised text-muted')}>{h.label}</span>
                ))}
              </div>
            </div>

            {est.dietWarning && <p className="rounded-2xl bg-warn/10 px-3 py-2 text-[13px] text-warn">{est.dietWarning}</p>}

            <div>
              <p className="mb-1 px-1 text-[12px] font-semibold uppercase tracking-wider text-faint">Ingredientes · toque nos gramas para ajustar</p>
              <ul className="divide-y divide-line/60">
                {est.ingredients.map((i) => (
                  <li key={i.key} className="flex items-center gap-2 py-2.5">
                    <button className="min-w-0 flex-1 text-left" onClick={() => i.origin === 'none' && setResolve(i)} disabled={i.origin !== 'none'}>
                      <p className={cx('truncate text-[14.5px]', i.origin === 'none' && 'text-warn')}>{i.name}</p>
                      <p className="tnum truncate text-[12px] text-faint">
                        {i.origin === 'none' ? 'não reconhecido — toque para escolher' : `${fmt0(ingMacros(i).kcal)} kcal · P ${fmt0(ingMacros(i).p)} · C ${fmt0(ingMacros(i).c)} · G ${fmt0(ingMacros(i).f)}`}
                        {i.origin === 'base' && <span className="text-accent"> · base</span>}
                        {i.origin === 'ia' && <span className="text-warn"> · IA ≈</span>}
                        {i.defaulted && <span> · porção típica</span>}
                      </p>
                      {i.note && <p className="truncate text-[11.5px] text-faint">{i.note}</p>}
                    </button>
                    {i.origin !== 'none' && (
                      <label className="flex items-center gap-1 rounded-xl bg-raised px-2">
                        <input inputMode="decimal" aria-label={`Gramas de ${i.name}`} defaultValue={fmt0(i.grams)} key={`${i.key}-${i.grams}`}
                          onBlur={(e) => { const n = parseNum(e.target.value); if (Number.isFinite(n) && n > 0 && n <= 3000) update(i.key, { grams: n }); else e.target.value = fmt0(i.grams); }}
                          className="tnum h-9 w-14 bg-transparent text-right text-[14px] font-semibold outline-none" />
                        <span className="text-[12px] text-faint">g</span>
                      </label>
                    )}
                    <button aria-label={`Remover ${i.name}`} onClick={() => remove(i.key)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-faint hover:text-danger"><Trash2 size={15} /></button>
                  </li>
                ))}
              </ul>
            </div>

            {(est.sources?.length || est.notes.length) ? (
              <div className="space-y-1.5 rounded-2xl bg-raised/40 p-3 text-[13px] text-muted">
                {est.sources?.map((x) => <p key={x}>• {x}</p>)}
                {est.notes.map((x) => <p key={x} className="text-faint">{x}</p>)}
              </div>
            ) : null}

            <div className="flex gap-2">
              <Button className="flex-1" disabled={!valid.length} onClick={register}>Registrar no {MEAL_LABEL[meal].split(' ')[0].toLowerCase()}</Button>
              <Button variant="subtle" disabled={!valid.length} onClick={saveDish} icon={<Bookmark size={16} />} ariaLabel="Salvar prato na base" />
            </div>
            {unresolved && <p className="text-[12px] text-faint">Itens não reconhecidos não entram no total.</p>}
            <p className="text-[11.5px] leading-snug text-faint">Estimativa: o valor real depende da receita, do tamanho da porção e do preparo. O registro fica marcado com ≈.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={!!resolve} onClose={() => setResolve(null)} title={`Qual alimento é “${resolve?.name ?? ''}”?`}>
        <FoodSearch autoFocus onPick={(f) => { update(resolve!.key, { name: f.name, foodId: f.id, per100: f.per100, micro: f.micro, origin: 'base', grams: f.unitWeight ?? 100 }); setResolve(null); }} />
      </Sheet>
    </div>
  );
}
