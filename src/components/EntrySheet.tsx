import { useEffect, useState } from 'react';
import { parseNum } from '../lib/format';
import { MEAL_LABEL, MEAL_ORDER } from '../lib/nutrition';
import { useStore } from '../store/useStore';
import type { LogEntry, MealType } from '../types';
import { QtySheet } from './QtySheet';
import { Button, Field, Segmented, Sheet, TextInput, useToast } from './ui';

/** Edita um registro: alimentos da base → quantidade; registros rápidos → valores. */
export function EntrySheet({ entry, onClose }: { entry: LogEntry | null; onClose: () => void }) {
  const s = useStore();
  const toast = useToast();
  const food = entry?.foodId ? s.foods[entry.foodId] : undefined;
  const [meal, setMeal] = useState<MealType>('cafe');
  useEffect(() => { if (entry) setMeal(entry.meal); }, [entry]);

  const remove = () => {
    if (!entry) return;
    s.removeLog(entry.id);
    onClose();
    toast('Registro excluído', { action: { label: 'Desfazer', run: () => s.addLog({ ...entry }) } });
  };

  if (entry && food) {
    return (
      <QtySheet open onClose={onClose} food={food} initialQty={entry.qty} title={`Editar · ${food.name}`} confirmLabel="Salvar registro"
        onConfirm={(qty) => { s.updateLog(entry.id, { qty, meal }); onClose(); toast('Registro atualizado'); }} onDelete={remove}>
        <MealPicker value={meal} onChange={setMeal} />
      </QtySheet>
    );
  }
  return <QuickEdit entry={entry} onClose={onClose} onDelete={remove} />;
}

export function MealPicker({ value, onChange }: { value: MealType; onChange: (m: MealType) => void }) {
  return (
    <div>
      <p className="mb-2 px-1 text-[13px] font-medium text-muted">Refeição</p>
      <Segmented value={value} onChange={onChange} options={MEAL_ORDER.map((m) => ({ value: m, label: MEAL_LABEL[m].split(' ')[0] }))} />
    </div>
  );
}

function QuickEdit({ entry, onClose, onDelete }: { entry: LogEntry | null; onClose: () => void; onDelete: () => void }) {
  const s = useStore();
  const toast = useToast();
  const [v, setV] = useState({ name: '', kcal: '', p: '', c: '', f: '' });
  const [meal, setMeal] = useState<MealType>('cafe');
  useEffect(() => {
    if (entry) {
      setV({ name: entry.name, kcal: String(Math.round(entry.macros.kcal)), p: String(+entry.macros.p.toFixed(1)), c: String(+entry.macros.c.toFixed(1)), f: String(+entry.macros.f.toFixed(1)) });
      setMeal(entry.meal);
    }
  }, [entry]);
  const kcal = parseNum(v.kcal);
  const valid = v.name.trim() && Number.isFinite(kcal) && kcal >= 0;
  return (
    <Sheet open={!!entry} onClose={onClose} title="Editar registro"
      footer={<div className="flex gap-2"><Button variant="danger" onClick={onDelete}>Excluir</Button><Button className="flex-1" disabled={!valid} onClick={() => {
        const n = (x: string) => (Number.isFinite(parseNum(x)) ? parseNum(x) : 0);
        s.updateLog(entry!.id, { name: v.name.trim(), meal, macros: { kcal, p: n(v.p), c: n(v.c), f: n(v.f), fiber: entry!.macros.fiber } });
        onClose(); toast('Registro atualizado');
      }}>Salvar</Button></div>}>
      <div className="space-y-4">
        <Field label="Descrição"><TextInput value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          {(['kcal', 'p', 'c', 'f'] as const).map((k) => (
            <Field key={k} label={{ kcal: 'Calorias (kcal)', p: 'Proteínas (g)', c: 'Carboidratos (g)', f: 'Gorduras (g)' }[k]}>
              <TextInput inputMode="decimal" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
            </Field>
          ))}
        </div>
        <MealPicker value={meal} onChange={setMeal} />
      </div>
    </Sheet>
  );
}
