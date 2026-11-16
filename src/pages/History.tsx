import { CalendarDays } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EntrySheet } from '../components/EntrySheet';
import { MacroLine } from '../components/NutritionProgress';
import { Badge, Card, EmptyState } from '../components/ui';
import { longDate } from '../lib/dates';
import { fmt0 } from '../lib/format';
import { logTotals, MEAL_LABEL, MEAL_ORDER, metGoal } from '../lib/nutrition';
import { useStore } from '../store/useStore';
import type { LogEntry } from '../types';

export function History() {
  const log = useStore((s) => s.log);
  const goals = useStore((s) => s.goals);
  const water = useStore((s) => s.water);
  const [editing, setEditing] = useState<LogEntry | null>(null);
  const [limit, setLimit] = useState(14);
  const days = useMemo(() => {
    const m = new Map<string, LogEntry[]>();
    log.forEach((e) => m.set(e.date, [...(m.get(e.date) ?? []), e]));
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [log]);
  return (
    <div>
      <header className="mb-4">
        <h1 className="text-[28px] font-bold tracking-tight">Histórico</h1>
        <p className="text-[13px] text-muted">Tudo o que você registrou, dia a dia</p>
      </header>
      {days.length === 0 ? (
        <Card><EmptyState icon={<CalendarDays size={22} />} title="Sem registros ainda" text="Quando você registrar refeições, elas aparecem aqui." /></Card>
      ) : (
        <div className="space-y-3">
          {days.slice(0, limit).map(([d, entries]) => {
            const t = logTotals(entries);
            return (
              <Card key={d}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold first-letter:uppercase">{longDate(d)}</p>
                  {metGoal(t, goals) && <Badge tone="accent">na meta</Badge>}
                </div>
                <MacroLine m={t} className="mt-1" />
                {water[d] ? <p className="tnum mt-0.5 text-[12px] text-water">Água: {fmt0(water[d])} ml</p> : null}
                <div className="mt-3 space-y-2">
                  {MEAL_ORDER.map((m) => {
                    const es = entries.filter((e) => e.meal === m);
                    if (!es.length) return null;
                    return (
                      <div key={m}>
                        <p className="text-[12px] font-semibold uppercase tracking-wider text-faint">{MEAL_LABEL[m]} · {fmt0(logTotals(es).kcal)} kcal</p>
                        {es.map((e) => (
                          <button key={e.id} onClick={() => setEditing(e)} className="flex w-full justify-between gap-3 rounded-lg py-1 text-left text-[13.5px] hover:text-accent">
                            <span className="truncate">{e.name} <span className="text-faint">· {e.unit === 'porção' ? 'porção' : `${fmt0(e.qty)} ${e.unit}`}</span></span>
                            <span className="tnum shrink-0 text-muted">{fmt0(e.macros.kcal)}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
          {days.length > limit && <button onClick={() => setLimit(limit + 14)} className="w-full py-3 text-[14px] font-semibold text-accent">Carregar mais</button>}
        </div>
      )}
      <EntrySheet entry={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
