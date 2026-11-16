import { Pencil, Plus, RotateCcw, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { FoodFormSheet } from '../components/FoodForm';
import { FoodSearch } from '../components/FoodSearch';
import { Button, Card, cx, Sheet, SourceBadge, useConfirm, useToast } from '../components/ui';
import { BASE_FOODS } from '../data/foods';
import { fmt0, fmt1 } from '../lib/format';
import { useStore } from '../store/useStore';
import type { Food } from '../types';

export function Foods() {
  const s = useStore();
  const toast = useToast();
  const { ask, node } = useConfirm();
  const [sel, setSel] = useState<Food | null>(null);
  const [form, setForm] = useState<{ food: Food | null } | null>(null);
  const inUse = (id: string) => s.plan.some((d) => d.some((m) => m.items.some((i) => i.foodId === id)));
  const pref = s.settings.preferredFoods;
  const isBase = (id: string) => BASE_FOODS.some((f) => f.id === id);

  return (
    <div>
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Alimentos</h1>
          <p className="text-[13px] text-muted">{Object.keys(s.foods).length} itens · base inicial TACO/USDA + os seus</p>
        </div>
        <Button size="sm" icon={<Plus size={16} />} onClick={() => setForm({ food: null })}>Novo</Button>
      </header>
      <Card><FoodSearch onPick={setSel} placeholder="Buscar na base" /></Card>

      <Sheet open={!!sel} onClose={() => setSel(null)} title={sel?.name ?? ''}>
        {sel && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2"><SourceBadge source={sel.source} />{sel.edited && <span className="text-[12px] text-warn">editado por você</span>}<span className="text-[12.5px] text-faint">{sel.sourceRef}</span></div>
            <div className="grid grid-cols-5 gap-2 rounded-2xl bg-raised/60 p-3 text-center">
              {([['kcal', 'kcal'], ['p', 'Prot.'], ['c', 'Carb.'], ['f', 'Gord.'], ['fiber', 'Fibras']] as const).map(([k, l]) => (
                <div key={k}><p className="text-[11px] text-muted">{l}</p><p className="tnum font-semibold">{k === 'kcal' ? fmt0(sel.per100[k]) : fmt1(sel.per100[k])}</p></div>
              ))}
            </div>
            <p className="text-[12px] text-faint">Por 100 {sel.unit} · preparo: {sel.prep}{sel.unitWeight ? ` · 1 ${sel.unitLabel} = ${fmt0(sel.unitWeight)} ${sel.unit}` : ''}</p>
            {sel.note && <p className="rounded-2xl bg-warn/10 px-3 py-2 text-[12.5px] text-warn">{sel.note}</p>}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="subtle" icon={<Star size={16} className={cx(pref.includes(sel.id) && 'fill-carb text-carb')} />} onClick={() => s.setSettings({ preferredFoods: pref.includes(sel.id) ? pref.filter((x) => x !== sel.id) : [...pref, sel.id] })}>
                {pref.includes(sel.id) ? 'Preferido' : 'Marcar preferido'}
              </Button>
              <Button variant="subtle" icon={<Pencil size={16} />} onClick={() => { setForm({ food: sel }); setSel(null); }}>Editar valores</Button>
              {sel.edited && isBase(sel.id) && <Button variant="ghost" icon={<RotateCcw size={16} />} onClick={() => { s.restoreFood(sel.id); setSel(null); toast('Valores originais restaurados'); }}>Restaurar original</Button>}
              {sel.custom && (
                <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => {
                  if (inUse(sel.id)) return toast('Este alimento está no cardápio. Substitua-o antes de excluir.', { tone: 'err' });
                  ask('Excluir alimento?', 'Registros antigos continuam com os valores já salvos.', () => { s.deleteFood(sel.id); setSel(null); toast('Alimento excluído'); }, 'Excluir');
                }}>Excluir</Button>
              )}
            </div>
          </div>
        )}
      </Sheet>
      <FoodFormSheet open={!!form} food={form?.food ?? null} onClose={() => setForm(null)} />
      {node}
    </div>
  );
}
