import { ChevronLeft, ChevronRight, CopyPlus, RotateCcw, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FoodSearch } from '../components/FoodSearch';
import { MealCard, usePlanEntries, type ItemAction } from '../components/MealCard';
import { MacroLine } from '../components/NutritionProgress';
import { QtySheet } from '../components/QtySheet';
import { SwapSheet } from '../components/SwapSheet';
import { Badge, Button, Card, cx, Segmented, Sheet, useConfirm, useToast } from '../components/ui';
import { addDays, fromKey, shortDate, todayKey, weekdayIndex, weekKeys, WEEKDAYS, WEEKDAYS_SHORT } from '../lib/dates';
import { fmt0 } from '../lib/format';
import { useToday } from '../lib/hooks';
import { dayMacros, itemMacros, MEAL_LABEL, MEAL_ORDER, scale } from '../lib/nutrition';
import { useStore } from '../store/useStore';
import { useUI } from '../store/ui';
import type { Food, MealType, PlanItem } from '../types';

export function WeeklyMenu() {
  const today = useToday();
  const date = useUI((s) => s.menuDay);
  const setDate = useUI((s) => s.setMenuDay);
  const s = useStore();
  const toast = useToast();
  const { ask, node: confirmNode } = useConfirm();
  const day = weekdayIndex(date);
  const meals = s.plan[day];
  const entries = usePlanEntries(date);
  const log = useStore((x) => x.log);
  const week = weekKeys(date);
  const totals = useMemo(() => dayMacros(s.foods, meals), [s.foods, meals]);

  const [edit, setEdit] = useState<{ meal: MealType; item: PlanItem } | null>(null);
  const [swap, setSwap] = useState<{ meal: MealType; item: PlanItem } | null>(null);
  const [adding, setAdding] = useState<MealType | null>(null);
  const [addFood, setAddFood] = useState<Food | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [dup, setDup] = useState<{ kind: 'meal' | 'day'; meal?: MealType } | null>(null);

  const onItemAction = (meal: MealType, item: PlanItem, a: ItemAction) => {
    if (a === 'qty') setEdit({ meal, item });
    if (a === 'swap') setSwap({ meal, item });
    if (a === 'remove') {
      s.removePlanItem(day, meal, item.id);
      toast('Item removido do cardápio', { action: { label: 'Desfazer', run: () => s.addPlanItem(day, meal, item.foodId, item.qty) } });
    }
  };

  const diff = (v: number, g: number, unit: string) => {
    const d = v - g;
    return <span className={cx('tnum', Math.abs(d) / Math.max(g, 1) > 0.1 ? 'text-warn' : 'text-accent')}>{d >= 0 ? '+' : ''}{fmt0(d)} {unit}</span>;
  };

  return (
    <div>
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Cardápio</h1>
          <p className="text-[13px] text-muted">Plano semanal — tudo é editável</p>
        </div>
        <Badge tone="warn">Plano inicial de exemplo</Badge>
      </header>

      {/* calendário semanal */}
      <div className="mb-4 flex items-center gap-1">
        <button aria-label="Semana anterior" onClick={() => setDate(addDays(date, -7))} className="grid h-10 w-8 place-items-center text-muted"><ChevronLeft size={20} /></button>
        <div className="grid flex-1 grid-cols-7 gap-1">
          {week.map((k, i) => {
            const sel = k === date;
            const has = log.some((e) => e.date === k);
            return (
              <button key={k} onClick={() => setDate(k)} aria-label={`${WEEKDAYS[i]}, ${shortDate(k)}`} aria-current={sel ? 'date' : undefined}
                className={cx('relative flex h-16 flex-col items-center justify-center rounded-2xl transition', sel ? 'bg-accent text-accent-ink' : 'bg-surface text-ink hover:bg-raised', k === today && !sel && 'ring-1 ring-accent/50')}>
                <span className={cx('text-[11px] font-medium', sel ? 'text-accent-ink/80' : 'text-muted')}>{WEEKDAYS_SHORT[i]}</span>
                <span className="tnum text-[17px] font-semibold">{fromKey(k).getDate()}</span>
                {has && <span className={cx('absolute bottom-1.5 h-1 w-1 rounded-full', sel ? 'bg-accent-ink' : 'bg-accent')} />}
              </button>
            );
          })}
        </div>
        <button aria-label="Próxima semana" onClick={() => setDate(addDays(date, 7))} className="grid h-10 w-8 place-items-center text-muted"><ChevronRight size={20} /></button>
      </div>
      {weekKeys(today)[0] !== week[0] && (
        <button onClick={() => setDate(todayKey())} className="mb-3 text-[13px] font-semibold text-accent">Voltar para hoje</button>
      )}

      <Card className="mb-4">
        <div className="flex items-baseline justify-between">
          <p className="font-semibold">{WEEKDAYS[day]} <span className="font-normal text-muted">· planejado</span></p>
          <p className="tnum text-[22px] font-semibold">{fmt0(totals.kcal)} <span className="text-[13px] font-normal text-muted">kcal</span></p>
        </div>
        <MacroLine m={totals} className="mt-1" />
        <div className="mt-3 grid grid-cols-4 gap-2 rounded-2xl bg-raised/60 p-3 text-center text-[12px]">
          <div><p className="text-faint">Calorias</p>{diff(totals.kcal, s.goals.kcal, '')}</div>
          <div><p className="text-faint">Proteína</p>{diff(totals.p, s.goals.p, 'g')}</div>
          <div><p className="text-faint">Carbo</p>{diff(totals.c, s.goals.c, 'g')}</div>
          <div><p className="text-faint">Gordura</p>{diff(totals.f, s.goals.f, 'g')}</div>
        </div>
        <div className="mt-2 flex items-start justify-between gap-3">
          <p className="text-[12px] text-faint">Diferença do plano em relação à sua meta, calculada pela base nutricional.</p>
          {Math.abs(totals.kcal - s.goals.kcal) > s.goals.kcal * 0.05 && (
            <button onClick={() => setAdjustOpen(true)} className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-accent"><Wand2 size={14} /> Sugerir ajuste</button>
          )}
        </div>
      </Card>

      <div className="space-y-3">
        {meals.map((m) => (
          <MealCard
            key={m.type}
            meal={m}
            foods={s.foods}
            entries={entries.filter((e) => e.meal === m.type)}
            onToggleMeal={() => {
              const wasDone = entries.some((e) => e.meal === m.type);
              s.toggleMealDone(date, m.type);
              toast(wasDone ? `${MEAL_LABEL[m.type]} desmarcado` : `${MEAL_LABEL[m.type]} registrado em ${shortDate(date)}`);
            }}
            onToggleItem={(it) => s.togglePlanItem(date, m.type, it)}
            onItemAction={(it, a) => onItemAction(m.type, it, a)}
            onAdd={() => setAdding(m.type)}
            onDuplicate={() => setDup({ kind: 'meal', meal: m.type })}
          />
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="subtle" icon={<CopyPlus size={18} />} onClick={() => setDup({ kind: 'day' })}>Duplicar {WEEKDAYS[day].toLowerCase()}</Button>
        <Button variant="ghost" icon={<RotateCcw size={18} />} onClick={() => ask('Restaurar cardápio inicial?', 'Todas as edições do cardápio semanal serão substituídas pelo plano inicial. Seus registros de consumo não serão apagados.', () => { s.resetPlan(); toast('Cardápio inicial restaurado'); }, 'Restaurar')}>
          Restaurar plano inicial
        </Button>
      </div>
      <p className="mt-3 text-[12px] text-faint">Marcar uma refeição como realizada registra os alimentos em {shortDate(date)}. Alterações no cardápio não mudam registros já feitos.</p>

      {/* editar quantidade */}
      <QtySheet
        open={!!edit}
        onClose={() => setEdit(null)}
        food={edit ? s.foods[edit.item.foodId] ?? null : null}
        initialQty={edit?.item.qty}
        confirmLabel="Salvar no cardápio"
        onConfirm={(q) => { s.setItemQty(day, edit!.meal, edit!.item.id, q); setEdit(null); toast('Quantidade atualizada'); }}
        onDelete={() => { onItemAction(edit!.meal, edit!.item, 'remove'); setEdit(null); }}
      />
      <SwapSheet open={!!swap} onClose={() => setSwap(null)} item={swap?.item ?? null}
        onPick={(foodId, qty) => { s.replaceItem(day, swap!.meal, swap!.item.id, foodId, qty); toast('Alimento substituído'); }} />

      {/* adicionar item */}
      <Sheet open={!!adding && !addFood} onClose={() => setAdding(null)} title={`Adicionar ao ${adding ? MEAL_LABEL[adding].toLowerCase() : ''}`}>
        <FoodSearch autoFocus onPick={(f) => setAddFood(f)} />
      </Sheet>
      <QtySheet open={!!addFood} onClose={() => setAddFood(null)} food={addFood} confirmLabel="Adicionar ao cardápio"
        onConfirm={(q) => { s.addPlanItem(day, adding!, addFood!.id, q); setAddFood(null); setAdding(null); toast('Alimento adicionado'); }} />

      <AdjustSheet open={adjustOpen} onClose={() => setAdjustOpen(false)} day={day} onDone={() => toast('Porções ajustadas')} />
      <DuplicateSheet dup={dup} fromDay={day} onClose={() => setDup(null)} onDone={(msg) => toast(msg)} />
      {confirmNode}
    </div>
  );
}

function DuplicateSheet({ dup, fromDay, onClose, onDone }: { dup: { kind: 'meal' | 'day'; meal?: MealType } | null; fromDay: number; onClose: () => void; onDone: (m: string) => void }) {
  const s = useStore();
  const [targets, setTargets] = useState<number[]>([]);
  const [toMeal, setToMeal] = useState<MealType | 'same'>('same');
  const close = () => { setTargets([]); setToMeal('same'); onClose(); };
  const apply = () => {
    if (!dup) return;
    if (dup.kind === 'day') s.duplicateDay(fromDay, targets);
    else s.duplicateMeal(fromDay, dup.meal!, targets, toMeal === 'same' ? undefined : toMeal);
    onDone(`Copiado para ${targets.map((t) => WEEKDAYS[t]).join(', ')}`);
    close();
  };
  return (
    <Sheet open={!!dup} onClose={close}
      title={dup?.kind === 'day' ? `Duplicar ${WEEKDAYS[fromDay].toLowerCase()}` : `Duplicar ${dup?.meal ? MEAL_LABEL[dup.meal].toLowerCase() : ''}`}
      footer={<Button className="w-full" disabled={!targets.length} onClick={apply}>Copiar</Button>}>
      <p className="mb-3 text-[13px] text-muted">Escolha os dias de destino. O conteúdo atual {dup?.kind === 'day' ? 'desses dias' : 'da refeição de destino'} será substituído.</p>
      <div className="grid grid-cols-4 gap-2">
        {WEEKDAYS.map((w, i) => {
          const sel = targets.includes(i);
          const disabled = i === fromDay && (dup?.kind === 'day' || toMeal === 'same' || toMeal === dup?.meal);
          return (
            <button key={w} disabled={disabled} onClick={() => setTargets(sel ? targets.filter((t) => t !== i) : [...targets, i])}
              className={cx('h-11 rounded-2xl text-[13px] font-semibold transition disabled:opacity-30', sel ? 'bg-accent text-accent-ink' : 'bg-raised')}>
              {WEEKDAYS_SHORT[i]}
            </button>
          );
        })}
      </div>
      {dup?.kind === 'meal' && (
        <div className="mt-4">
          <p className="mb-2 px-1 text-[13px] font-medium text-muted">Copiar como</p>
          <Segmented value={toMeal} onChange={(v) => { setToMeal(v); setTargets([]); }} options={[{ value: 'same', label: 'Mesma' }, ...MEAL_ORDER.filter((m) => m !== dup.meal).map((m) => ({ value: m, label: MEAL_LABEL[m].split(' ')[0] }))]} />
        </div>
      )}
    </Sheet>
  );
}

/** Propõe escalar carboidratos e frutas do dia para aproximar as calorias da meta. Só aplica com confirmação. */
function AdjustSheet({ open, onClose, day, onDone }: { open: boolean; onClose: () => void; day: number; onDone: () => void }) {
  const s = useStore();
  const proposal = useMemo(() => {
    const meals = s.plan[day];
    const before = dayMacros(s.foods, meals);
    const gap = s.goals.kcal - before.kcal;
    const flex = meals.flatMap((m) => m.items.map((it) => ({ meal: m.type, it, f: s.foods[it.foodId] }))).filter((x) => x.f && (x.f.group === 'carbo' || x.f.group === 'fruta'));
    const flexK = flex.reduce((a, x) => a + itemMacros(s.foods, x.it.foodId, x.it.qty).kcal, 0);
    const factor = flexK > 0 ? Math.min(1.6, Math.max(0.6, 1 + gap / flexK)) : 1;
    const changes = flex.map((x) => ({ ...x, qty: Math.max(5, Math.round((x.it.qty * factor) / 5) * 5) })).filter((x) => x.qty !== x.it.qty);
    let after = before;
    for (const c of changes) {
      const d = scale(c.f!.per100, c.qty - c.it.qty);
      after = { kcal: after.kcal + d.kcal, p: after.p + d.p, c: after.c + d.c, f: after.f + d.f, fiber: after.fiber + d.fiber };
    }
    return { before, after, changes, capped: factor === 1.6 || factor === 0.6 };
  }, [s.plan, s.foods, s.goals, day]);
  return (
    <Sheet open={open} onClose={onClose} title={`Ajustar porções · ${WEEKDAYS[day]}`}
      footer={<div className="flex gap-2"><Button variant="subtle" className="flex-1" onClick={onClose}>Cancelar</Button><Button className="flex-1" disabled={!proposal.changes.length} onClick={() => {
        proposal.changes.forEach((c) => s.setItemQty(day, c.meal, c.it.id, c.qty)); onDone(); onClose();
      }}>Aplicar</Button></div>}>
      <p className="mb-3 text-[13.5px] text-muted">Sugestão: ajustar apenas carboidratos e frutas, mantendo as fontes de proteína. Revise antes de aplicar — você pode desfazer editando as quantidades.</p>
      {proposal.changes.length === 0 ? <p className="py-4 text-sm text-muted">Não há carboidratos ou frutas para ajustar neste dia.</p> : (
        <ul className="mb-4 space-y-1.5">
          {proposal.changes.map((c) => (
            <li key={c.it.id} className="tnum flex justify-between gap-3 text-[14px]">
              <span className="truncate">{c.f!.name} <span className="text-faint">· {MEAL_LABEL[c.meal].split(' ')[0].toLowerCase()}</span></span>
              <span className="shrink-0"><span className="text-faint">{fmt0(c.it.qty)} →</span> <b>{fmt0(c.qty)} {c.f!.unit}</b></span>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-raised/60 p-3 text-[13px]">
        <div><p className="text-faint">Antes</p><MacroLine m={proposal.before} /></div>
        <div><p className="text-faint">Depois</p><MacroLine m={proposal.after} /></div>
      </div>
      {proposal.capped && <p className="mt-2 text-[12px] text-warn">O ajuste foi limitado a ±60% das porções; o dia ainda fica {proposal.after.kcal < s.goals.kcal ? 'abaixo' : 'acima'} da meta.</p>}
    </Sheet>
  );
}
