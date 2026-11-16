import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Fish, Pill, Plus, ShieldAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, cx, EmptyState, Field, SectionTitle, Sheet, TextInput, Toggle, useConfirm, useToast } from '../components/ui';
import { NUTRIENTS } from '../data/nutrients';
import { addDays, todayKey, WEEKDAYS_SHORT } from '../lib/dates';
import { fmt0, fmt1 } from '../lib/format';
import { MICRO_KEYS } from '../lib/nutrition';
import { useStore } from '../store/useStore';
import type { NutrientKey, Supplement } from '../types';

export function Nutrients() {
  const s = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<Supplement> | null>(null);
  const { ask, node } = useConfirm();
  const toast = useToast();
  const today = todayKey();

  const intake = useMemo(() => {
    const from = addDays(today, -6);
    const entries = s.log.filter((e) => e.date >= from && e.date <= today);
    const days = new Set(entries.map((e) => e.date));
    const n = days.size || 1;
    const quick = entries.filter((e) => !e.foodId && !e.macros.fiber).length;
    const daysWith = (k: NutrientKey) => new Set(entries.filter((e) => e.foodId && s.foods[e.foodId]?.nutrients?.includes(k)).map((e) => e.date)).size;
    // micronutrientes (TACO): média por dia e cobertura (% das calorias registradas que têm o dado)
    const totalK = entries.reduce((a, e) => a + e.macros.kcal, 0) || 1;
    const micro = Object.fromEntries(MICRO_KEYS.map((k) => {
      const withData = entries.filter((e) => e.micro && e.micro[k] !== null);
      return [k, { avg: withData.reduce((a, e) => a + (e.micro![k] as number), 0) / n, coverage: withData.reduce((a, e) => a + e.macros.kcal, 0) / totalK }];
    })) as Record<(typeof MICRO_KEYS)[number], { avg: number; coverage: number }>;
    return {
      days: days.size, quick, micro,
      p: entries.reduce((a, e) => a + e.macros.p, 0) / n,
      fiber: entries.reduce((a, e) => a + e.macros.fiber, 0) / n,
      daysWith,
    };
  }, [s.log, s.foods, today]);

  const planSources = useMemo(() => {
    const map: Record<string, { names: Set<string>; days: Set<number> }> = {};
    s.plan.forEach((day, di) => day.forEach((m) => m.items.forEach((it) => {
      const f = s.foods[it.foodId];
      f?.nutrients?.forEach((k) => {
        map[k] ??= { names: new Set(), days: new Set() };
        map[k].names.add(f.name);
        map[k].days.add(di);
      });
    })));
    return map;
  }, [s.plan, s.foods]);

  const fishMeals = useMemo(() => {
    let total = 0, tuna = 0;
    const kinds = new Set<string>();
    s.plan.forEach((d) => d.forEach((m) => {
      const fish = m.items.map((i) => s.foods[i.foodId]).filter((f) => f?.shopping.category === 'peixes');
      if (fish.length) total++;
      fish.forEach((f) => { kinds.add(f!.shopping.name); if (f!.id.includes('atum')) tuna++; });
    }));
    return { total, tuna, kinds: [...kinds] };
  }, [s.plan, s.foods]);

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-[28px] font-bold tracking-tight">Nutrientes</h1>
        <p className="text-[13px] text-muted">Atenção especial na alimentação pescetariana</p>
      </header>

      <div className="mb-4 flex gap-3 rounded-3xl border border-line bg-surface p-4 text-[13px] leading-relaxed text-muted">
        <ShieldAlert size={18} className="mt-0.5 shrink-0 text-water" />
        <p>Conteúdo educativo e geral. O app não diagnostica deficiências nem recomenda suplementos. Se suspeitar de alguma deficiência, procure um(a) nutricionista ou médico(a) para avaliação e exames.</p>
      </div>

      <SectionTitle>Estimativa dos últimos 7 dias</SectionTitle>
      <Card className="mb-2">
        {intake.days === 0 ? <p className="text-sm text-muted">Registre refeições para ver estimativas.</p> : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[12px] text-muted">Proteína · média/dia</p><p className="tnum text-[22px] font-semibold">{fmt0(intake.p)} <span className="text-[13px] font-normal text-faint">/ {fmt0(s.goals.p)} g</span></p></div>
              <div><p className="text-[12px] text-muted">Fibras · média/dia</p><p className="tnum text-[22px] font-semibold">{fmt0(intake.fiber)} <span className="text-[13px] font-normal text-faint">/ {fmt0(s.goals.fiber)} g</span></p></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line/60 pt-3 sm:grid-cols-3">
              {MICRO_REF.map(({ k, label, ref, unit, kind }) => {
                const m = intake.micro[k];
                const pct = (m.avg / ref) * 100;
                return (
                  <div key={k}>
                    <p className="text-[12px] text-muted">{label}</p>
                    <p className="tnum text-[17px] font-semibold">≈ {m.avg >= 100 ? fmt0(m.avg) : fmt1(m.avg)} <span className="text-[12px] font-normal text-faint">{unit}</span></p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-raised">
                      <div className={cx('h-full rounded-full', kind === 'limite' ? (pct > 100 ? 'bg-warn' : 'bg-water') : 'bg-accent')} style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                    <p className="tnum mt-0.5 text-[11px] text-faint">{kind === 'limite' ? 'limite' : 'ref.'} {fmt0(ref)} {unit}{m.coverage < 0.8 ? ` · dados de ${fmt0(m.coverage * 100)}% das kcal` : ''}</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[11.5px] leading-snug text-faint">Média de {intake.days} dia(s) com registros. Micronutrientes vêm da TACO e só contam alimentos com esse dado (registros rápidos, rótulos e IA não têm); quando a cobertura é baixa, o valor real tende a ser maior. Referências: ingestão recomendada para homens de 19–30 anos (IOM/DRI) e limite de sódio da OMS. B12, vitamina D e ômega-3 não constam na TACO — para eles o app mostra só as fontes.{intake.quick ? ` ${intake.quick} registro(s) rápido(s) sem fibras informadas.` : ''}</p>
          </>
        )}
      </Card>

      <Card className="mb-2">
        <div className="flex items-start gap-3">
          <Fish size={18} className="mt-0.5 shrink-0 text-protein" />
          <div className="text-[13.5px] leading-relaxed">
            <p className="font-semibold">Peixes no cardápio: {fishMeals.total} refeições por semana</p>
            <p className="text-muted">{fishMeals.kinds.join(', ') || '—'}.</p>
            <p className="mt-1 text-muted">Variar espécies é uma boa prática. Sardinha, salmão, tilápia e camarão têm teor de mercúrio mais baixo; atum deve ser consumido com moderação{fishMeals.tuna > 2 ? ' — seu plano tem atum em várias refeições, considere alternar' : ''}. Evite depender de grandes predadores (ex.: cação, peixe-espada).</p>
          </div>
        </div>
      </Card>

      <SectionTitle>Nutrientes</SectionTitle>
      <div className="space-y-2">
        {NUTRIENTS.map((n) => {
          const isOpen = open === n.key;
          const src = planSources[n.key];
          const logged = n.key !== 'proteina' && n.key !== 'fibras' ? intake.daysWith(n.key as NutrientKey) : null;
          return (
            <Card key={n.key} className="p-0 sm:p-0">
              <button onClick={() => setOpen(isOpen ? null : n.key)} aria-expanded={isOpen} className="flex w-full items-center gap-3 p-4 text-left">
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-semibold">{n.name}</p>
                  <p className="truncate text-[12.5px] text-muted">{n.role}</p>
                </div>
                {logged !== null && intake.days > 0 && <Badge tone={logged ? 'accent' : 'neutral'}>{logged}/{intake.days} dias</Badge>}
                <ChevronDown size={18} className={cx('shrink-0 text-faint transition-transform', isOpen && 'rotate-180')} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                    <div className="space-y-3 px-4 pb-4 text-[13.5px] leading-relaxed">
                      <Block title="Função">{n.role}</Block>
                      <Block title="Principais fontes">{n.sources.join(' · ')}</Block>
                      {src && (
                        <Block title="No seu cardápio">
                          {[...src.names].join(', ')}
                          <span className="mt-1 block text-[12px] text-faint">Presente em: {[...src.days].sort().map((d) => WEEKDAYS_SHORT[d]).join(', ')}</span>
                        </Block>
                      )}
                      {logged !== null && <Block title="Nos seus registros">{intake.days ? `Fontes registradas em ${logged} de ${intake.days} dia(s) recentes (presença, não quantidade).` : 'Sem registros recentes.'}</Block>}
                      <Block title="Observação">{n.pescNote}</Block>
                      {n.signs !== '—' && <Block title="Sinais possíveis (não diagnósticos)">{n.signs}</Block>}
                      {n.exams !== '—' && <Block title="Exames para conversar com um profissional">{n.exams}</Block>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>

      <SectionTitle action={<Button size="sm" variant="subtle" icon={<Plus size={15} />} onClick={() => setEdit({ active: true })}>Adicionar</Button>}>Suplementos que você usa</SectionTitle>
      <Card className="p-2 sm:p-2">
        {s.supplements.length === 0 ? (
          <EmptyState icon={<Pill size={22} />} title="Nenhum suplemento registrado" text="Registre aqui apenas o que você já usa, com a dose que foi orientada. O app não sugere suplementos nem doses." />
        ) : s.supplements.map((x) => (
          <button key={x.id} onClick={() => setEdit(x)} className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-raised/60">
            <span className="min-w-0">
              <span className={cx('block text-[15px] font-medium', !x.active && 'text-faint line-through')}>{x.name}</span>
              <span className="block truncate text-[12.5px] text-muted">{[x.dose, x.frequency, x.time].filter(Boolean).join(' · ')}{x.note ? ` · ${x.note}` : ''}</span>
            </span>
            {!x.active && <Badge>pausado</Badge>}
          </button>
        ))}
      </Card>
      <p className="mt-2 px-1 text-[12px] text-faint">Lembretes: não use ferro ou doses elevadas de vitamina D sem avaliação profissional; um multivitamínico não é necessário por padrão.</p>

      <SupplementSheet entry={edit} onClose={() => setEdit(null)} onDelete={(id) => ask('Excluir suplemento?', 'O registro será removido.', () => { s.removeSupplement(id); setEdit(null); toast('Suplemento excluído'); }, 'Excluir')} />
      {node}
    </div>
  );
}

const MICRO_REF: { k: (typeof MICRO_KEYS)[number]; label: string; ref: number; unit: string; kind: 'meta' | 'limite' }[] = [
  { k: 'fe', label: 'Ferro', ref: 8, unit: 'mg', kind: 'meta' },
  { k: 'zn', label: 'Zinco', ref: 11, unit: 'mg', kind: 'meta' },
  { k: 'ca', label: 'Cálcio', ref: 1000, unit: 'mg', kind: 'meta' },
  { k: 'mg', label: 'Magnésio', ref: 400, unit: 'mg', kind: 'meta' },
  { k: 'vitc', label: 'Vitamina C', ref: 90, unit: 'mg', kind: 'meta' },
  { k: 'na', label: 'Sódio', ref: 2000, unit: 'mg', kind: 'limite' },
];

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div><p className="mb-0.5 text-[11.5px] font-semibold uppercase tracking-wider text-faint">{title}</p><div className="text-ink/85">{children}</div></div>
);

function SupplementSheet({ entry, onClose, onDelete }: { entry: Partial<Supplement> | null; onClose: () => void; onDelete: (id: string) => void }) {
  const s = useStore();
  const toast = useToast();
  const [v, setV] = useState({ name: '', dose: '', time: '', frequency: '', note: '', active: true });
  const [err, setErr] = useState('');
  useEffect(() => {
    if (entry) setV({ name: entry.name ?? '', dose: entry.dose ?? '', time: entry.time ?? '', frequency: entry.frequency ?? '', note: entry.note ?? '', active: entry.active ?? true });
    setErr('');
  }, [entry]);
  return (
    <Sheet open={!!entry} onClose={onClose} title={entry?.id ? 'Editar suplemento' : 'Registrar suplemento'}
      footer={<div className="flex gap-2">{entry?.id && <Button variant="danger" onClick={() => onDelete(entry.id!)}>Excluir</Button>}<Button className="flex-1" onClick={() => {
        if (!v.name.trim()) return setErr('Informe o nome.');
        s.upsertSupplement({ id: entry?.id, ...v, name: v.name.trim(), note: v.note.trim() || undefined }); toast('Suplemento salvo'); onClose();
      }}>Salvar</Button></div>}>
      <div className="space-y-4">
        <Field label="Nome" error={err}><TextInput value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="ex.: Creatina, Ômega-3" invalid={!!err} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dose (como orientado)"><TextInput value={v.dose} onChange={(e) => setV({ ...v, dose: e.target.value })} placeholder="ex.: 1 cápsula" /></Field>
          <Field label="Horário"><TextInput type="time" value={v.time} onChange={(e) => setV({ ...v, time: e.target.value })} /></Field>
        </div>
        <Field label="Frequência"><TextInput value={v.frequency} onChange={(e) => setV({ ...v, frequency: e.target.value })} placeholder="ex.: diária, 3×/semana" /></Field>
        <Field label="Observações"><TextInput value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} placeholder="ex.: orientado pela nutricionista em março" /></Field>
        <div className="flex items-center justify-between rounded-2xl bg-raised/60 px-4 py-3"><span className="text-[14px]">Em uso</span><Toggle checked={v.active} onChange={(a) => setV({ ...v, active: a })} label="Em uso" /></div>
      </div>
    </Sheet>
  );
}
