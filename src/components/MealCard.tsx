import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeftRight, Check, Copy, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { fmt0 } from '../lib/format';
import { itemMacros, MEAL_LABEL, mealMacros, type FoodIndex } from '../lib/nutrition';
import { useStore } from '../store/useStore';
import type { LogEntry, PlanItem, PlanMeal } from '../types';
import { MacroLine } from './NutritionProgress';
import { cx, IconButton, spring } from './ui';

export type ItemAction = 'qty' | 'swap' | 'remove';

export function MealCard({ meal, foods, entries, onToggleMeal, onToggleItem, onItemAction, onAdd, onDuplicate }: {
  meal: PlanMeal;
  foods: FoodIndex;
  entries: LogEntry[];
  onToggleMeal: () => void;
  onToggleItem: (it: PlanItem) => void;
  onItemAction: (it: PlanItem, a: ItemAction) => void;
  onAdd: () => void;
  onDuplicate: () => void;
}) {
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const total = useMemo(() => mealMacros(foods, meal), [foods, meal]);
  const doneIds = new Set(entries.map((e) => e.planItemId));
  const allDone = meal.items.length > 0 && meal.items.every((i) => doneIds.has(i.id));
  const someDone = entries.length > 0;

  return (
    <motion.section layout transition={spring} className={cx('rounded-3xl border bg-surface p-4 transition-colors sm:p-5', allDone ? 'border-accent/40' : 'border-line/70')}>
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] font-semibold">{MEAL_LABEL[meal.type]}</h3>
          <MacroLine m={total} className="mt-1" />
        </div>
        <IconButton label="Duplicar refeição" onClick={onDuplicate}><Copy size={18} /></IconButton>
        <button
          onClick={onToggleMeal}
          aria-pressed={someDone}
          className={cx(
            'flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition active:scale-95',
            someDone ? 'bg-accent text-accent-ink' : 'bg-raised text-ink',
          )}
        >
          <Check size={16} strokeWidth={2.6} />
          {someDone ? (allDone ? 'Realizada' : 'Parcial') : 'Realizar'}
        </button>
      </header>

      <ul className="mt-3 divide-y divide-line/60">
        <AnimatePresence initial={false}>
          {meal.items.map((it) => {
            const f = foods[it.foodId];
            const done = doneIds.has(it.id);
            const m = itemMacros(foods, it.foodId, it.qty);
            return (
              <motion.li key={it.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="relative">
                <div className="flex items-center gap-3 py-2.5">
                  <button
                    onClick={() => onToggleItem(it)}
                    aria-label={done ? `Desmarcar ${f?.name}` : `Marcar ${f?.name} como consumido`}
                    aria-pressed={done}
                    className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition', done ? 'border-accent bg-accent text-accent-ink' : 'border-line text-transparent hover:border-muted')}
                  >
                    <Check size={14} strokeWidth={3} />
                  </button>
                  <button className="min-w-0 flex-1 text-left" onClick={() => onItemAction(it, 'qty')}>
                    <p className={cx('truncate text-[15px]', done && 'text-muted line-through decoration-line')}>
                      {f ? f.name : <span className="text-danger">Alimento removido</span>}
                    </p>
                    <p className="tnum truncate text-[12.5px] text-faint">
                      {fmt0(it.qty)} {f?.unit ?? 'g'}{it.note ? ` · ${it.note}` : ''} · {fmt0(m.kcal)} kcal · P {fmt0(m.p)} g
                    </p>
                  </button>
                  <IconButton label="Opções do item" onClick={() => setMenuFor(menuFor === it.id ? null : it.id)}><MoreHorizontal size={18} /></IconButton>
                </div>
                <AnimatePresence>
                  {menuFor === it.id && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="mb-2 flex flex-wrap gap-2 pl-10">
                      <Chip onClick={() => { setMenuFor(null); onItemAction(it, 'qty'); }}><Pencil size={14} /> Quantidade</Chip>
                      <Chip onClick={() => { setMenuFor(null); onItemAction(it, 'swap'); }}><ArrowLeftRight size={14} /> Substituir</Chip>
                      <Chip danger onClick={() => { setMenuFor(null); onItemAction(it, 'remove'); }}><Trash2 size={14} /> Remover</Chip>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      {meal.items.length === 0 && <p className="py-3 text-sm text-muted">Nenhum alimento nesta refeição.</p>}
      <button onClick={onAdd} className="mt-1 flex h-10 items-center gap-2 rounded-xl px-2 text-[14px] font-semibold text-accent transition hover:bg-accent/10">
        <Plus size={18} /> Adicionar alimento
      </button>
    </motion.section>
  );
}

function Chip({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cx('flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition active:scale-95', danger ? 'bg-danger/12 text-danger' : 'bg-raised text-ink')}>
      {children}
    </button>
  );
}

/** Consumidos de uma refeição (registros vindos do plano) */
export function usePlanEntries(date: string) {
  const log = useStore((s) => s.log);
  return useMemo(() => log.filter((e) => e.date === date && e.origin === 'plano'), [log, date]);
}
