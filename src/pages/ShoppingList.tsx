import { AnimatePresence, motion } from 'framer-motion';
import { Check, Info, Plus, RotateCcw, ShoppingBasket, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge, Button, Card, cx, EmptyState, Field, Select, Sheet, TextInput, useConfirm, useToast } from '../components/ui';
import { fmt0 } from '../lib/format';
import { buildShopping, CATEGORY_LABEL, CATEGORY_ORDER, PANTRY_EXTRAS } from '../lib/shopping';
import { useStore } from '../store/useStore';
import type { ShoppingCategory } from '../types';

interface Row { key: string; name: string; qty: string; sub?: string; checked: boolean; manual?: boolean; overridden?: boolean }

export function ShoppingList() {
  const s = useStore();
  const toast = useToast();
  const { ask, node } = useConfirm();
  const [adding, setAdding] = useState(false);
  const [editKey, setEditKey] = useState<{ key: string; name: string; qty: string } | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const lines = useMemo(() => buildShopping(s.plan, s.foods), [s.plan, s.foods]);
  const sh = s.shopping;

  const grouped = useMemo(() => {
    const g = new Map<ShoppingCategory, Row[]>();
    const push = (c: ShoppingCategory, r: Row) => g.set(c, [...(g.get(c) ?? []), r]);
    for (const l of lines) {
      if (sh.removed[l.key]) continue;
      push(l.category, { key: l.key, name: l.name, qty: sh.overrides[l.key] ?? l.buy, overridden: !!sh.overrides[l.key], checked: !!sh.checked[l.key],
        sub: `${fmt0(l.planned)} ${l.unit} no cardápio (pronto) · ${l.uses}×${l.note ? ` · ${l.note}` : ''}` });
    }
    for (const x of PANTRY_EXTRAS) if (!sh.removed[x.key]) push(x.category, { key: x.key, name: x.name, qty: sh.overrides[x.key] ?? 'a gosto', checked: !!sh.checked[x.key] });
    for (const m of sh.manual) push(m.category, { key: m.id, name: m.name, qty: m.qty, checked: m.checked, manual: true });
    return CATEGORY_ORDER.filter((c) => g.has(c)).map((c) => ({ c, rows: g.get(c)! }));
  }, [lines, sh]);

  const total = grouped.reduce((a, g) => a + g.rows.length, 0);
  const done = grouped.reduce((a, g) => a + g.rows.filter((r) => r.checked).length, 0);
  const removedCount = Object.keys(sh.removed).length;

  return (
    <div>
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Compras</h1>
          <p className="text-[13px] text-muted">Gerada do cardápio semanal · atualiza sozinha</p>
        </div>
        <Button size="sm" icon={<Plus size={16} />} onClick={() => setAdding(true)}>Item</Button>
      </header>

      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <p className="tnum text-[15px] font-semibold">{done} de {total} itens</p>
          <button onClick={() => setShowInfo(true)} className="flex items-center gap-1 text-[13px] text-muted"><Info size={14} /> Como calculamos</button>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-raised">
          <motion.div className="h-full rounded-full bg-accent" animate={{ width: `${total ? (done / total) * 100 : 0}%` }} transition={{ duration: 0.5 }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="subtle" size="sm" disabled={!done && !sh.manual.length} onClick={() => ask('Limpar lista?', 'Desmarca todos os itens e remove os adicionados manualmente. Os itens do cardápio continuam na lista.', () => { s.clearShopping(); toast('Lista limpa'); }, 'Limpar')}>Finalizar compras e limpar</Button>
          {removedCount > 0 && <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={() => s.restoreShop()}>Restaurar {removedCount} removido(s)</Button>}
        </div>
      </Card>

      {total === 0 ? (
        <EmptyState icon={<ShoppingBasket size={22} />} title="Lista vazia" text="Adicione alimentos ao cardápio ou itens manualmente." />
      ) : (
        <div className="space-y-4">
          {grouped.map(({ c, rows }) => (
            <section key={c}>
              <h2 className="mb-2 flex items-center justify-between px-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
                {CATEGORY_LABEL[c]} <span className="tnum font-normal normal-case tracking-normal text-faint">{rows.filter((r) => r.checked).length}/{rows.length}</span>
              </h2>
              <Card className="p-1.5 sm:p-1.5">
                <ul>
                  <AnimatePresence initial={false}>
                    {rows.map((r) => (
                      <motion.li key={r.key} layout exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2">
                        <button
                          onClick={() => (r.manual ? s.toggleShopManual(r.key) : s.toggleShop(r.key))}
                          className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition hover:bg-raised/60"
                          aria-pressed={r.checked}
                        >
                          <span className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition', r.checked ? 'border-accent bg-accent text-accent-ink' : 'border-line')}>
                            {r.checked && <Check size={13} strokeWidth={3} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={cx('block truncate text-[15px] transition', r.checked && 'text-faint line-through')}>{r.name}</span>
                            {r.sub && <span className="block truncate text-[11.5px] text-faint">{r.sub}</span>}
                            {r.manual && <span className="block text-[11.5px] text-faint">adicionado por você</span>}
                          </span>
                        </button>
                        <button onClick={() => !r.manual && setEditKey({ key: r.key, name: r.name, qty: r.qty })} disabled={r.manual}
                          className={cx('tnum shrink-0 rounded-xl px-2 py-1 text-[13.5px] font-semibold', r.overridden ? 'text-accent' : 'text-ink/80', !r.manual && 'hover:bg-raised')}
                          aria-label={`Editar quantidade de ${r.name}`}>
                          {r.qty}
                        </button>
                        <button aria-label={`Remover ${r.name}`} onClick={() => (r.manual ? s.removeShopManual(r.key) : s.removeShop(r.key))} className="mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-faint transition hover:text-danger">
                          <Trash2 size={15} />
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}

      <AddItemSheet open={adding} onClose={() => setAdding(false)} />
      <Sheet open={!!editKey} onClose={() => setEditKey(null)} title={editKey?.name ?? ''}
        footer={<div className="flex gap-2">
          <Button variant="subtle" className="flex-1" onClick={() => { s.setShopOverride(editKey!.key, ''); setEditKey(null); }}>Usar cálculo</Button>
          <Button className="flex-1" onClick={() => { s.setShopOverride(editKey!.key, editKey!.qty); setEditKey(null); }}>Salvar</Button>
        </div>}>
        <Field label="Quantidade a comprar" hint="Texto livre, ex.: 2 kg, 1 pacote, 12 unidades">
          <TextInput value={editKey?.qty ?? ''} onChange={(e) => setEditKey({ ...editKey!, qty: e.target.value })} />
        </Field>
      </Sheet>
      <Sheet open={showInfo} onClose={() => setShowInfo(false)} title="Como a lista é calculada">
        <div className="space-y-3 text-[14px] leading-relaxed text-muted">
          <p>Somamos todas as porções do cardápio de segunda a domingo e agrupamos alimentos iguais (ex.: “ovo mexido” e “ovo cozido” viram <b className="text-ink">Ovos</b>, contados em unidades de 50 g).</p>
          <p>Os pesos do cardápio são de alimentos <b className="text-ink">prontos</b>. Para arroz, feijão, lentilha, grão-de-bico e macarrão, a lista converte para peso <b className="text-ink">seco</b>; para peixes e camarão, para peso <b className="text-ink">cru</b>. Essas conversões são aproximadas <Badge tone="warn">≈</Badge> e variam com o preparo.</p>
          <p>Ao editar o cardápio, a lista se atualiza. Quantidades que você editou manualmente (em verde) são mantidas até você tocar em “Usar cálculo”.</p>
        </div>
      </Sheet>
      {node}
    </div>
  );
}

function AddItemSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore();
  const toast = useToast();
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [cat, setCat] = useState<ShoppingCategory>('outros');
  const [err, setErr] = useState('');
  return (
    <Sheet open={open} onClose={onClose} title="Adicionar item"
      footer={<Button className="w-full" onClick={() => {
        if (!name.trim()) return setErr('Informe o nome do item.');
        s.addShopManual(name.trim(), qty.trim() || '1', cat); toast('Item adicionado'); setName(''); setQty(''); setErr(''); onClose();
      }}>Adicionar</Button>}>
      <div className="space-y-4">
        <Field label="Item" error={err}><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="ex.: Papel-toalha, limões extras" invalid={!!err} /></Field>
        <Field label="Quantidade"><TextInput value={qty} onChange={(e) => setQty(e.target.value)} placeholder="ex.: 1 pacote" /></Field>
        <Field label="Categoria"><Select value={cat} onChange={(e) => setCat(e.target.value as ShoppingCategory)}>{CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}</Select></Field>
      </div>
    </Sheet>
  );
}
