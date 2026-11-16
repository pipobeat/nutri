import { Bookmark, Store, Trash2, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EntrySheet, MealPicker } from '../components/EntrySheet';
import { FoodForm } from '../components/FoodForm';
import { FoodSearch } from '../components/FoodSearch';
import { ProductDetails, ProductSearch } from '../components/ProductSearch';
import type { Product } from '../lib/openfoodfacts';
import { MacroLine } from '../components/NutritionProgress';
import { QtySheet } from '../components/QtySheet';
import { motion } from 'framer-motion';
import { DishEstimator } from '../components/DishEstimator';
import { Button, Card, cx, EmptyState, Field, SectionTitle, Sheet, spring, TextInput, Toggle, useToast } from '../components/ui';
import { mediumDate, todayKey } from '../lib/dates';
import { fmt0, parseNum } from '../lib/format';
import { useDayLog } from '../lib/hooks';
import { logTotals, MEAL_LABEL, scale } from '../lib/nutrition';
import { useStore } from '../store/useStore';
import { useUI } from '../store/ui';
import type { Food, LogEntry } from '../types';

type Tab = 'prato' | 'buscar' | 'marcas' | 'rapido' | 'salvas' | 'novo';

export function FoodLog() {
  const { logDate: date, logMeal: meal, setLogTarget } = useUI();
  const s = useStore();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('buscar');
  const [picked, setPicked] = useState<Food | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [productQuery, setProductQuery] = useState('');
  const [away, setAway] = useState(false);
  const [editing, setEditing] = useState<LogEntry | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const { entries } = useDayLog(date);
  const mealEntries = entries.filter((e) => e.meal === meal);

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-[28px] font-bold tracking-tight">Registrar alimento</h1>
        <p className="text-[13px] text-muted">Os totais do dia atualizam automaticamente.</p>
      </header>

      <Card className="mb-4 space-y-4">
        <div className="flex items-center gap-3">
          <Field label="Data" htmlFor="logdate">
            <TextInput id="logdate" type="date" value={date} max={todayKey()} onChange={(e) => e.target.value && setLogTarget(e.target.value, meal)} className="w-auto" />
          </Field>
          <div className="flex flex-1 items-center justify-end gap-2 pt-6">
            <Store size={16} className="text-muted" />
            <span className="text-[13px] text-muted">Fora de casa</span>
            <Toggle checked={away} onChange={setAway} label="Consumido fora de casa" />
          </div>
        </div>
        <MealPicker value={meal} onChange={(m) => setLogTarget(date, m)} />
      </Card>

      <div role="tablist" className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {([['prato', '✦ Prato'], ['buscar', 'Base'], ['marcas', 'Marcas'], ['rapido', 'Rápido'], ['salvas', 'Salvas'], ['novo', 'Novo']] as [Tab, string][]).map(([v, l]) => (
          <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)}
            className={cx('relative isolate h-10 shrink-0 rounded-full px-4 text-[13.5px] font-semibold transition-colors', tab === v ? 'text-accent-ink' : 'bg-surface text-muted ring-1 ring-line/70')}>
            {tab === v && <motion.span layoutId="logtab" transition={spring} className="absolute inset-0 -z-10 rounded-full bg-accent" />}
            {l}
          </button>
        ))}
      </div>

      <Card className="mb-4">
        {tab === 'prato' && <DishEstimator date={date} meal={meal} away={away} />}
        {tab === 'buscar' && <FoodSearch onPick={(f) => { setProduct(null); setPicked(f); }} onSearchProducts={(q) => { setProductQuery(q.trim()); setTab('marcas'); }} />}
        {tab === 'marcas' && <ProductSearch key={productQuery} initialQuery={productQuery} onPick={(f, p) => { setProduct(p); setPicked(s.foods[f.id] ?? f); }} />}
        {tab === 'rapido' && <QuickAdd date={date} meal={meal} away={away} />}
        {tab === 'salvas' && <SavedMeals date={date} meal={meal} />}
        {tab === 'novo' && (
          <>
            <p className="mb-4 text-[13px] text-muted">Cadastre um alimento com os valores do rótulo ou de uma tabela. Ele fica disponível na busca.</p>
            <FoodForm submitLabel="Salvar e registrar" onSaved={(f) => { setTab('buscar'); setPicked(f); }} />
          </>
        )}
      </Card>

      <SectionTitle action={mealEntries.length > 0 && <button onClick={() => setSaveOpen(true)} className="flex items-center gap-1 text-[13px] font-semibold text-accent"><Bookmark size={14} /> Salvar como frequente</button>}>
        {MEAL_LABEL[meal]} · {date === todayKey() ? 'hoje' : mediumDate(date)}
      </SectionTitle>
      <Card className="p-2 sm:p-2">
        {mealEntries.length === 0 ? (
          <p className="px-3 py-4 text-[14px] text-muted">Nada registrado nesta refeição ainda.</p>
        ) : (
          <>
            {mealEntries.map((e) => (
              <button key={e.id} onClick={() => setEditing(e)} className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-raised/60">
                <span className="min-w-0">
                  <span className="block truncate text-[15px]">{e.name}{e.estimated && <span className="ml-1 text-warn">≈</span>}</span>
                  <span className="tnum block text-[12.5px] text-faint">{e.unit === 'porção' ? 'porção' : `${fmt0(e.qty)} ${e.unit}`} · {e.origin === 'plano' ? 'do cardápio' : e.origin === 'fora' ? 'fora de casa' : e.origin === 'rapido' ? 'registro rápido' : 'manual'}</span>
                </span>
                <span className="tnum font-semibold">{fmt0(e.macros.kcal)}</span>
              </button>
            ))}
            <MacroLine m={logTotals(mealEntries)} className="px-3 pb-2 pt-1" />
          </>
        )}
      </Card>

      <QtySheet open={!!picked} onClose={() => { setPicked(null); setProduct(null); }} food={picked} confirmLabel={`Adicionar ao ${MEAL_LABEL[meal].toLowerCase()}`}
        title={product ? product.name : undefined}
        header={product ? <ProductDetails p={product} goals={s.goals} /> : undefined}
        confirmDisabled={!!product && !product.has.kcal}
        onConfirm={(q) => {
          if (product && !s.foods[picked!.id]) s.upsertFood(picked!); // guarda o produto na base para buscas futuras
          s.addFoodLog(date, meal, picked!.id, q, away ? 'fora' : 'manual');
          toast(`${product ? product.name : picked!.name} registrado`);
          setPicked(null); setProduct(null);
        }}>
        <MealPicker value={meal} onChange={(m) => setLogTarget(date, m)} />
      </QtySheet>
      <EntrySheet entry={editing} onClose={() => setEditing(null)} />
      <SaveMealSheet open={saveOpen} onClose={() => setSaveOpen(false)} entries={mealEntries} />
    </div>
  );
}

function QuickAdd({ date, meal, away }: { date: string; meal: LogEntry['meal']; away: boolean }) {
  const s = useStore();
  const toast = useToast();
  const [v, setV] = useState({ name: '', kcal: '', p: '', c: '', f: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  const submit = () => {
    const e: Record<string, string> = {};
    if (!v.name.trim()) e.name = 'Descreva o que você comeu.';
    const k = parseNum(v.kcal);
    if (!Number.isFinite(k) || k < 0 || k > 5000) e.kcal = 'Informe as calorias (0–5.000).';
    for (const x of ['p', 'c', 'f'] as const) if (v[x] && (!Number.isFinite(parseNum(v[x])) || parseNum(v[x]) < 0)) e[x] = 'Inválido';
    setErr(e);
    if (Object.keys(e).length) return;
    const n = (x: string) => (x ? parseNum(x) : 0);
    s.addLog({ date, meal, name: v.name.trim(), qty: 1, unit: 'porção', macros: { kcal: k, p: n(v.p), c: n(v.c), f: n(v.f), fiber: 0 }, origin: away ? 'fora' : 'rapido', estimated: true });
    toast('Registro rápido adicionado');
    setV({ name: '', kcal: '', p: '', c: '', f: '' });
  };
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl bg-raised/60 p-3 text-[13px] text-muted">
        <Zap size={16} className="mt-0.5 shrink-0 text-carb" />
        Para refeições fora de casa, bebidas ou pratos sem informação detalhada. Os valores ficam marcados como estimativa sua.
      </div>
      <Field label="Descrição" error={err.name}><TextInput value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="ex.: Poke de salmão no restaurante" invalid={!!err.name} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Calorias (kcal)" error={err.kcal}><TextInput inputMode="decimal" value={v.kcal} onChange={(e) => setV({ ...v, kcal: e.target.value })} invalid={!!err.kcal} /></Field>
        <Field label="Proteínas (g)" error={err.p}><TextInput inputMode="decimal" value={v.p} onChange={(e) => setV({ ...v, p: e.target.value })} /></Field>
        <Field label="Carboidratos (g)" error={err.c}><TextInput inputMode="decimal" value={v.c} onChange={(e) => setV({ ...v, c: e.target.value })} /></Field>
        <Field label="Gorduras (g)" error={err.f}><TextInput inputMode="decimal" value={v.f} onChange={(e) => setV({ ...v, f: e.target.value })} /></Field>
      </div>
      <Button className="w-full" onClick={submit}>Adicionar</Button>
    </div>
  );
}

function SavedMeals({ date, meal }: { date: string; meal: LogEntry['meal'] }) {
  const s = useStore();
  const toast = useToast();
  if (!s.savedMeals.length)
    return <EmptyState icon={<Bookmark size={22} />} title="Nenhuma refeição salva" text="Registre alimentos em uma refeição e toque em “Salvar como frequente” para reutilizar com um toque." />;
  return (
    <ul className="-mx-2">
      {s.savedMeals.map((m) => {
        const t = m.items.reduce((acc, it) => {
          const f = s.foods[it.foodId];
          return f ? { kcal: acc.kcal + scale(f.per100, it.qty).kcal, p: acc.p + scale(f.per100, it.qty).p } : acc;
        }, { kcal: 0, p: 0 });
        return (
          <li key={m.id} className="flex items-center gap-2 rounded-2xl px-3 py-2.5 hover:bg-raised/60">
            <button className="min-w-0 flex-1 text-left" onClick={() => { s.logSavedMeal(m.id, date, meal); toast(`${m.name} registrado`); }}>
              <p className="truncate text-[15px] font-medium">{m.name}</p>
              <p className="tnum text-[12.5px] text-muted">{m.items.length} itens · {fmt0(t.kcal)} kcal · P {fmt0(t.p)} g</p>
            </button>
            <Button size="sm" onClick={() => { s.logSavedMeal(m.id, date, meal); toast(`${m.name} registrado`); }}>Registrar</Button>
            <button aria-label={`Excluir ${m.name}`} onClick={() => s.deleteSavedMeal(m.id)} className="grid h-9 w-9 place-items-center rounded-full text-faint hover:text-danger"><Trash2 size={16} /></button>
          </li>
        );
      })}
    </ul>
  );
}

function SaveMealSheet({ open, onClose, entries }: { open: boolean; onClose: () => void; entries: LogEntry[] }) {
  const s = useStore();
  const toast = useToast();
  const [name, setName] = useState('');
  const items = useMemo(() => entries.filter((e) => e.foodId).map((e) => ({ foodId: e.foodId!, qty: e.qty })), [entries]);
  const skipped = entries.length - items.length;
  return (
    <Sheet open={open} onClose={onClose} title="Salvar refeição frequente"
      footer={<Button className="w-full" disabled={!name.trim() || !items.length} onClick={() => { s.saveMeal(name.trim(), items); toast('Refeição salva'); setName(''); onClose(); }}>Salvar</Button>}>
      <Field label="Nome" hint={skipped ? `${skipped} registro(s) rápido(s) não entram, pois não vêm da base de alimentos.` : `${items.length} itens`}>
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="ex.: Café com ovos e iogurte" />
      </Field>
      <ul className={cx('mt-3 space-y-1 text-[13.5px] text-muted')}>
        {items.map((it, i) => <li key={i}>{s.foods[it.foodId]?.name} · {fmt0(it.qty)} {s.foods[it.foodId]?.unit}</li>)}
      </ul>
    </Sheet>
  );
}
