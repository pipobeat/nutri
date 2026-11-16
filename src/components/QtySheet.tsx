import { Minus, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { fmt0, fmt1, parseNum } from '../lib/format';
import { scale, scaleMicro } from '../lib/nutrition';
import type { Food } from '../types';
import { MacroLine } from './NutritionProgress';
import { Button, Field, Sheet, SourceBadge, TextInput, cx } from './ui';

export function QtySheet({ open, onClose, food, initialQty, title, confirmLabel = 'Salvar', onConfirm, onDelete, children, header, confirmDisabled }: {
  open: boolean; onClose: () => void; food: Food | null; initialQty?: number; title?: string; confirmLabel?: string;
  onConfirm: (qty: number) => void; onDelete?: () => void; children?: ReactNode; header?: ReactNode; confirmDisabled?: boolean;
}) {
  const [raw, setRaw] = useState('');
  const [mode, setMode] = useState<'base' | 'unit'>('base');
  useEffect(() => {
    if (open && food) {
      const q = initialQty ?? food.unitWeight ?? 100;
      setMode('base');
      setRaw(String(q).replace('.', ','));
    }
  }, [open, food, initialQty]);
  if (!food) return null;
  const n = parseNum(raw);
  const qty = mode === 'unit' && food.unitWeight ? n * food.unitWeight : n;
  const valid = Number.isFinite(qty) && qty > 0 && qty <= 5000;
  const step = mode === 'unit' ? 1 : food.unit === 'ml' ? 50 : qty >= 100 ? 10 : 5;
  const bump = (d: number) => {
    const cur = Number.isFinite(n) ? n : 0;
    setRaw(String(Math.max(0, +(cur + d).toFixed(2))).replace('.', ','));
  };
  const switchMode = (m: 'base' | 'unit') => {
    if (m === mode || !food.unitWeight) return;
    if (Number.isFinite(n)) setRaw(fmt1(m === 'unit' ? n / food.unitWeight : n * food.unitWeight));
    setMode(m);
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title ?? food.name}
      footer={
        <div className="flex gap-2">
          {onDelete && (
            <Button variant="danger" onClick={onDelete} icon={<Trash2 size={18} />} ariaLabel="Excluir" />
          )}
          <Button className="flex-1" disabled={!valid || confirmDisabled} onClick={() => onConfirm(Math.round(qty * 10) / 10)}>{confirmLabel}</Button>
        </div>
      }
    >
      <div className="space-y-5">
        {header}
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
          <SourceBadge source={food.source} />
          <span className="text-faint">{food.sourceRef}</span>
        </div>
        {food.note && <p className="rounded-2xl bg-warn/10 px-3 py-2 text-[12.5px] text-warn">{food.note}</p>}

        <Field label="Quantidade" error={raw && !valid ? 'Informe uma quantidade entre 0 e 5.000.' : undefined} htmlFor="qty">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Diminuir" onClick={() => bump(-step)} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-raised active:scale-95"><Minus size={18} /></button>
            <TextInput id="qty" inputMode="decimal" value={raw} onChange={(e) => setRaw(e.target.value)} className="text-center text-lg font-semibold tnum" invalid={!!raw && !valid} />
            <button type="button" aria-label="Aumentar" onClick={() => bump(step)} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-raised active:scale-95"><Plus size={18} /></button>
          </div>
        </Field>
        <div className="flex gap-2">
          <UnitChip active={mode === 'base'} onClick={() => switchMode('base')}>{food.unit === 'ml' ? 'ml' : 'gramas'}</UnitChip>
          {food.unitWeight && food.unitLabel && (
            <UnitChip active={mode === 'unit'} onClick={() => switchMode('unit')}>{food.unitLabel} ({fmt0(food.unitWeight)} {food.unit})</UnitChip>
          )}
        </div>
        {mode === 'unit' && valid && <p className="-mt-3 px-1 text-[12.5px] text-faint">= {fmt0(qty)} {food.unit}</p>}
        {food.measures && food.measures.length > 0 && (
          <div>
            <p className="mb-2 px-1 text-[12px] font-medium text-faint">Medidas caseiras (IBGE)</p>
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {food.measures.slice(0, 10).map(([name, g]) => (
                <button key={name} type="button" onClick={() => { setMode('base'); setRaw(String(g).replace('.', ',')); }}
                  className={cx('shrink-0 rounded-full px-3 py-1.5 text-[12.5px] transition', mode === 'base' && Math.abs(n - g) < 0.01 ? 'bg-accent/15 font-semibold text-accent' : 'bg-raised text-muted')}>
                  1 {name} <span className="text-faint">· {fmt0(g)} {food.unit}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-raised/60 p-4">
          <p className="mb-2 text-[12px] font-medium uppercase tracking-wider text-faint">Nesta quantidade</p>
          <MacroLine m={scale(food.per100, valid ? qty : 0)} />
          {food.per100.fiber > 0 && <p className="tnum mt-1 text-[12.5px] text-muted">Fibras {fmt1(scale(food.per100, valid ? qty : 0).fiber)} g</p>}
          {food.micro && valid && (() => {
            const mc = scaleMicro(food.micro, qty)!;
            const parts = ([['fe', 'Ferro', 1], ['zn', 'Zinco', 1], ['ca', 'Cálcio', 0], ['na', 'Sódio', 0], ['vitc', 'Vit. C', 0]] as const)
              .filter(([k]) => mc[k] !== null && (mc[k] as number) > 0)
              .map(([k, l, d]) => `${l} ${d ? fmt1(mc[k] as number) : fmt0(mc[k] as number)} mg`);
            return parts.length ? <p className="tnum mt-1 text-[12px] text-faint">{parts.join(' · ')}</p> : null;
          })()}
        </div>
        {children}
      </div>
    </Sheet>
  );
}

function UnitChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cx('h-9 rounded-full px-4 text-[13px] font-semibold transition', active ? 'bg-ink text-bg' : 'bg-raised text-muted')}>
      {children}
    </button>
  );
}
