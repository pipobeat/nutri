import { useEffect, useState } from 'react';
import { fmt0, parseNum, uid } from '../lib/format';
import { kcalFromMacros, violatesDiet } from '../lib/nutrition';
import { CATEGORY_LABEL, CATEGORY_ORDER } from '../lib/shopping';
import { useStore } from '../store/useStore';
import type { Food, Prep, ShoppingCategory, SubGroup } from '../types';
import { Button, Field, Select, Sheet, TextInput, useToast } from './ui';

const PREPS: Prep[] = ['cru', 'cozido', 'grelhado', 'assado', 'refogado', 'frito', 'enlatado, escorrido', 'pronto', 'industrializado'];
const GROUPS: { v: SubGroup; l: string }[] = [
  { v: 'peixe', l: 'Peixes, frutos do mar e frango' }, { v: 'ovo', l: 'Ovos' }, { v: 'laticinio', l: 'Laticínios' }, { v: 'carbo', l: 'Carboidratos' },
  { v: 'leguminosa', l: 'Leguminosas' }, { v: 'fruta', l: 'Frutas' }, { v: 'vegetal', l: 'Verduras e legumes' }, { v: 'gordura', l: 'Gorduras e oleaginosas' },
  { v: 'bebida', l: 'Bebidas' }, { v: 'outro', l: 'Outro' },
];

type FormState = Record<'name' | 'kcal' | 'p' | 'c' | 'f' | 'fiber' | 'unitWeight' | 'unitLabel' | 'sourceRef', string> & {
  prep: Prep; unit: 'g' | 'ml'; group: SubGroup; category: ShoppingCategory;
};

const empty: FormState = { name: '', kcal: '', p: '', c: '', f: '', fiber: '', unitWeight: '', unitLabel: '', sourceRef: '', prep: 'pronto', unit: 'g', group: 'outro', category: 'outros' };

export function FoodForm({ initial, onSaved, submitLabel = 'Salvar alimento' }: { initial?: Food | null; onSaved: (f: Food) => void; submitLabel?: string }) {
  const s = useStore();
  const toast = useToast();
  const [v, setV] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (initial) {
      setV({
        name: initial.name, kcal: String(initial.per100.kcal), p: String(initial.per100.p), c: String(initial.per100.c), f: String(initial.per100.f),
        fiber: String(initial.per100.fiber || ''), unitWeight: initial.unitWeight ? String(initial.unitWeight) : '', unitLabel: initial.unitLabel ?? '',
        sourceRef: initial.custom ? initial.sourceRef : '', prep: initial.prep, unit: initial.unit, group: initial.group, category: initial.shopping.category,
      });
    } else setV(empty);
    setErrors({});
  }, [initial]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  const num = (x: string) => parseNum(x || '0');
  const macroK = kcalFromMacros({ p: num(v.p), c: num(v.c), f: num(v.f) });
  const k = num(v.kcal);
  const incoherent = Number.isFinite(k) && k > 20 && Math.abs(macroK - k) / k > 0.25;

  const submit = () => {
    const e: Record<string, string> = {};
    if (!v.name.trim()) e.name = 'Informe o nome.';
    const bad = violatesDiet(v.name, s.settings.excludedTerms, s.settings.allowChicken);
    if (bad) e.name = `“${bad}” não faz parte do seu padrão alimentar (pescetariano / itens excluídos).`;
    for (const key of ['kcal', 'p', 'c', 'f', 'fiber'] as const) {
      const n = num(v[key]);
      if (!Number.isFinite(n) || n < 0) e[key] = 'Número inválido.';
      else if (key === 'kcal' ? n > 900 : n > 100) e[key] = key === 'kcal' ? 'Máximo 900 kcal por 100 g.' : 'Máximo 100 g por 100 g.';
    }
    if (!v.kcal.trim()) e.kcal = 'Informe as calorias.';
    if (num(v.p) + num(v.c) + num(v.f) > 100.5) e.f = 'A soma dos macros passa de 100 g por 100 g.';
    if (v.unitWeight && (!Number.isFinite(num(v.unitWeight)) || num(v.unitWeight) <= 0)) e.unitWeight = 'Peso inválido.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const isBase = initial && !initial.custom;
    const food: Food = {
      ...(initial ?? {}),
      id: initial?.id ?? `c_${uid()}`,
      name: v.name.trim(),
      prep: v.prep,
      unit: v.unit,
      per100: { kcal: num(v.kcal), p: num(v.p), c: num(v.c), f: num(v.f), fiber: num(v.fiber) },
      unitWeight: v.unitWeight ? num(v.unitWeight) : undefined,
      unitLabel: v.unitWeight ? v.unitLabel.trim() || 'porção' : undefined,
      source: isBase ? initial!.source : 'Personalizado',
      sourceRef: isBase ? initial!.sourceRef : v.sourceRef.trim() || 'Informado pelo usuário',
      group: v.group,
      shopping: { ...(initial?.shopping ?? {}), name: initial?.shopping.name ?? v.name.trim(), category: v.category },
      custom: initial ? initial.custom : true,
      edited: isBase ? true : undefined,
      note: isBase ? 'Valores editados por você a partir da fonte original.' : initial?.note,
    } as Food;
    s.upsertFood(food);
    toast(initial ? 'Alimento atualizado' : 'Alimento cadastrado');
    onSaved(food);
  };

  return (
    <div className="space-y-4">
      <Field label="Nome" error={errors.name} htmlFor="ff-name"><TextInput id="ff-name" value={v.name} onChange={set('name')} placeholder="ex.: Tapioca com queijo" invalid={!!errors.name} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Preparo"><Select value={v.prep} onChange={set('prep')}>{PREPS.map((p) => <option key={p} value={p}>{p}</option>)}</Select></Field>
        <Field label="Unidade base"><Select value={v.unit} onChange={set('unit')}><option value="g">gramas (g)</option><option value="ml">mililitros (ml)</option></Select></Field>
      </div>
      <p className="px-1 text-[13px] font-semibold">Valores por 100 {v.unit}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Calorias (kcal)" error={errors.kcal}><TextInput inputMode="decimal" value={v.kcal} onChange={set('kcal')} invalid={!!errors.kcal} /></Field>
        <Field label="Proteínas (g)" error={errors.p}><TextInput inputMode="decimal" value={v.p} onChange={set('p')} invalid={!!errors.p} /></Field>
        <Field label="Carboidratos (g)" error={errors.c}><TextInput inputMode="decimal" value={v.c} onChange={set('c')} invalid={!!errors.c} /></Field>
        <Field label="Gorduras (g)" error={errors.f}><TextInput inputMode="decimal" value={v.f} onChange={set('f')} invalid={!!errors.f} /></Field>
        <Field label="Fibras (g, opcional)" error={errors.fiber}><TextInput inputMode="decimal" value={v.fiber} onChange={set('fiber')} /></Field>
      </div>
      {incoherent && <p className="rounded-2xl bg-warn/10 px-3 py-2 text-[12.5px] text-warn">Pelos macros (4/4/9), seriam ~{fmt0(macroK)} kcal. Confira os valores do rótulo.</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Peso de 1 porção (opcional)" error={errors.unitWeight} hint="ex.: 30 g"><TextInput inputMode="decimal" value={v.unitWeight} onChange={set('unitWeight')} /></Field>
        <Field label="Nome da porção" hint="ex.: unidade, fatia"><TextInput value={v.unitLabel} onChange={set('unitLabel')} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Grupo (substituições)"><Select value={v.group} onChange={set('group')}>{GROUPS.map((g) => <option key={g.v} value={g.v}>{g.l}</option>)}</Select></Field>
        <Field label="Categoria de compra"><Select value={v.category} onChange={set('category')}>{CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</Select></Field>
      </div>
      {(!initial || initial.custom) && (
        <Field label="Fonte dos dados" hint="ex.: rótulo da marca X, TACO, receita própria"><TextInput value={v.sourceRef} onChange={set('sourceRef')} /></Field>
      )}
      <Button className="w-full" onClick={submit}>{submitLabel}</Button>
    </div>
  );
}

export function FoodFormSheet({ food, open, onClose }: { food: Food | null; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={food ? 'Editar alimento' : 'Novo alimento'}>
      <FoodForm initial={food} onSaved={onClose} />
    </Sheet>
  );
}
