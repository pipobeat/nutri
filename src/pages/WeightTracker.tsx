import { Plus, Ruler, Scale, Target } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis, Bar, BarChart, Cell } from 'recharts';
import { Button, Card, EmptyState, Field, Segmented, SectionTitle, Sheet, TextInput, useConfirm, useToast } from '../components/ui';
import { addDays, fromKey, mediumDate, mondayOf, shortDate, todayKey } from '../lib/dates';
import { fmt1, parseNum } from '../lib/format';
import { useStore } from '../store/useStore';
import type { WeightEntry } from '../types';

const axis = { stroke: 'rgb(var(--faint))', fontSize: 11, tickLine: false, axisLine: false } as const;
const tooltipStyle = { contentStyle: { background: 'rgb(var(--raised))', border: '1px solid rgb(var(--line))', borderRadius: 14, color: 'rgb(var(--ink))', fontSize: 13 }, labelStyle: { color: 'rgb(var(--muted))' } };

function movingAvg(entries: WeightEntry[], key: 'weight' | 'waist', days = 7) {
  return entries.map((e) => {
    const from = addDays(e.date, -(days - 1));
    const win = entries.filter((x) => x.date >= from && x.date <= e.date && x[key] != null);
    return win.length ? win.reduce((a, x) => a + (x[key] as number), 0) / win.length : null;
  });
}

export function WeightTracker() {
  const s = useStore();
  const toast = useToast();
  const { ask, node } = useConfirm();
  const [range, setRange] = useState<'30' | '90' | 'all'>('90');
  const [edit, setEdit] = useState<Partial<WeightEntry> | null>(null);
  const [targetOpen, setTargetOpen] = useState(false);
  const list = s.weights;

  const data = useMemo(() => {
    const ma = movingAvg(list, 'weight');
    const from = range === 'all' ? '0000' : addDays(todayKey(), -Number(range));
    return list.map((e, i) => ({ date: e.date, t: fromKey(e.date).getTime(), peso: e.weight, media: ma[i] ? +ma[i]!.toFixed(2) : null, cintura: e.waist ?? null })).filter((d) => d.date >= from);
  }, [list, range]);

  const weekly = useMemo(() => {
    const m = new Map<string, number[]>();
    list.forEach((e) => m.set(mondayOf(e.date), [...(m.get(mondayOf(e.date)) ?? []), e.weight]));
    return [...m.entries()].sort().slice(-12).map(([wk, ws]) => ({ wk, label: shortDate(wk), avg: ws.reduce((a, b) => a + b, 0) / ws.length, n: ws.length }));
  }, [list]);

  const monthly = useMemo(() => {
    const m = new Map<string, number[]>();
    list.forEach((e) => m.set(e.date.slice(0, 7), [...(m.get(e.date.slice(0, 7)) ?? []), e.weight]));
    const arr = [...m.entries()].sort().map(([mo, ws]) => ({ mo, avg: ws.reduce((a, b) => a + b, 0) / ws.length }));
    return arr.map((x, i) => ({ ...x, label: fromKey(`${x.mo}-01`).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), diff: i ? x.avg - arr[i - 1].avg : 0 })).slice(-6);
  }, [list]);

  const waistData = data.filter((d) => d.cintura != null);
  const first = list[0];
  const lastAvg = weekly.length ? weekly[weekly.length - 1].avg : null;
  const firstWeek = weekly[0];
  const target = s.goals.weightTarget;

  const msg = useMemo(() => {
    if (list.length < 3) return 'Registre o peso 2–3 vezes por semana, de preferência ao acordar. A tendência aparece com o tempo.';
    if (weekly.length >= 2) {
      const d = weekly[weekly.length - 1].avg - weekly[weekly.length - 2].avg;
      if (d < -0.1) return 'A média semanal está em queda. Ritmos de 0,25–1% do peso por semana costumam ser mais sustentáveis.';
      if (Math.abs(d) <= 0.1) return 'Média estável nesta semana. Variações diárias de água e sal são normais; observe a tendência de algumas semanas.';
      return 'A média subiu um pouco. Oscilações acontecem — olhe a tendência de 3–4 semanas antes de mudar algo.';
    }
    return 'Bom começo. Variações de um dia para o outro não representam ganho ou perda real de gordura.';
  }, [list.length, weekly]);

  return (
    <div>
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Evolução</h1>
          <p className="text-[13px] text-muted">Peso e medidas</p>
        </div>
        <Button size="sm" icon={<Plus size={16} />} onClick={() => setEdit({ date: todayKey() })}>Medição</Button>
      </header>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <Card className="p-3 sm:p-4"><p className="text-[11.5px] text-muted">Inicial</p><p className="tnum mt-1 text-[20px] font-semibold">{first ? fmt1(first.weight) : '—'}<span className="text-[12px] font-normal text-faint"> kg</span></p></Card>
        <Card className="p-3 sm:p-4"><p className="text-[11.5px] text-muted">Média 7 dias</p><p className="tnum mt-1 text-[20px] font-semibold">{lastAvg ? fmt1(lastAvg) : '—'}<span className="text-[12px] font-normal text-faint"> kg</span></p>
          {lastAvg && firstWeek && weekly.length > 1 && <p className="tnum text-[11.5px] text-muted">{lastAvg - firstWeek.avg >= 0 ? '+' : ''}{fmt1(lastAvg - firstWeek.avg)} kg</p>}</Card>
        <Card className="p-3 sm:p-4" as="button" onClick={() => setTargetOpen(true)}><p className="flex items-center gap-1 text-[11.5px] text-muted"><Target size={12} /> Meta</p><p className="tnum mt-1 text-[20px] font-semibold">{target ? fmt1(target) : <span className="text-[14px] text-accent">Definir</span>}{target ? <span className="text-[12px] font-normal text-faint"> kg</span> : null}</p></Card>
      </div>

      <Card className="mb-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="font-semibold">Peso</p>
          <Segmented value={range} onChange={setRange} className="w-56" options={[{ value: '30', label: '30 d' }, { value: '90', label: '90 d' }, { value: 'all', label: 'Tudo' }]} />
        </div>
        {data.length < 1 ? (
          <EmptyState icon={<Scale size={22} />} title="Sem medições no período" />
        ) : (
          <div className="h-56" role="img" aria-label="Gráfico de evolução do peso com média móvel de 7 dias">
            <ResponsiveContainer>
              <ComposedChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 6" vertical={false} />
                <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(t) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} {...axis} />
                <YAxis domain={[(m: number) => Math.floor(Math.min(m, target ?? m) - 1), (m: number) => Math.ceil(m + 1)]} tickFormatter={(v) => fmt1(v)} {...axis} />
                <Tooltip {...tooltipStyle} labelFormatter={(t) => mediumDate(new Date(t as number).toISOString().slice(0, 10))} formatter={(v: number, n) => [`${fmt1(v)} kg`, n === 'media' ? 'Média 7 dias' : 'Peso']} />
                <Scatter dataKey="peso" fill="rgb(var(--muted))" r={3} />
                <Line dataKey="media" stroke="rgb(var(--accent))" strokeWidth={2.5} dot={false} type="monotone" connectNulls isAnimationActive animationDuration={900} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-2 flex items-center gap-4 text-[11.5px] text-faint">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted" /> medições</span>
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-accent" /> média móvel 7 dias</span>
        </div>
      </Card>

      <p className="mb-3 rounded-3xl border border-accent/20 bg-accent/[0.06] p-4 text-[14px] leading-relaxed text-ink/85">{msg}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <p className="mb-3 font-semibold">Média semanal</p>
          {weekly.length ? (
            <ul className="space-y-1.5">
              {weekly.slice().reverse().slice(0, 6).map((w, i, arr) => {
                const prev = arr[i + 1];
                return (
                  <li key={w.wk} className="tnum flex justify-between text-[14px]">
                    <span className="text-muted">sem. de {w.label}</span>
                    <span><b>{fmt1(w.avg)} kg</b>{prev && <span className="ml-2 text-[12.5px] text-faint">{w.avg - prev.avg >= 0 ? '+' : ''}{fmt1(w.avg - prev.avg)}</span>}</span>
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-sm text-muted">—</p>}
        </Card>
        <Card>
          <p className="mb-3 font-semibold">Variação mensal</p>
          {monthly.length > 1 ? (
            <div className="h-36">
              <ResponsiveContainer>
                <BarChart data={monthly.slice(1)} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <XAxis dataKey="label" {...axis} />
                  <YAxis tickFormatter={(v) => fmt1(v)} {...axis} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: 'rgb(var(--raised))' }} formatter={(v: number) => [`${v >= 0 ? '+' : ''}${fmt1(v)} kg`, 'vs mês anterior']} />
                  <Bar dataKey="diff" radius={[6, 6, 6, 6]}>
                    {monthly.slice(1).map((m) => <Cell key={m.mo} fill={m.diff <= 0 ? 'rgb(var(--accent))' : 'rgb(var(--warn))'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-muted">Aparece a partir do segundo mês de registros (média mensal vs mês anterior).</p>}
        </Card>
      </div>

      <Card className="mt-3">
        <p className="mb-3 flex items-center gap-2 font-semibold"><Ruler size={16} className="text-muted" /> Circunferência abdominal</p>
        {waistData.length < 1 ? (
          <p className="text-sm text-muted">Inclua a medida da cintura ao registrar uma medição (na altura do umbigo, ao final da expiração).</p>
        ) : (
          <div className="h-44">
            <ResponsiveContainer>
              <ComposedChart data={waistData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 6" vertical={false} />
                <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(t) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} {...axis} />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} tickFormatter={(v) => fmt1(v)} {...axis} />
                <Tooltip {...tooltipStyle} labelFormatter={(t) => mediumDate(new Date(t as number).toISOString().slice(0, 10))} formatter={(v: number) => [`${fmt1(v)} cm`, 'Cintura']} />
                <Line dataKey="cintura" stroke="rgb(var(--protein))" strokeWidth={2.5} dot={{ r: 3, fill: 'rgb(var(--protein))' }} type="monotone" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <SectionTitle>Medições</SectionTitle>
      <Card className="p-2 sm:p-2">
        {list.length === 0 ? <p className="p-3 text-sm text-muted">Nenhuma medição.</p> : list.slice().reverse().map((e) => (
          <button key={e.id} onClick={() => setEdit(e)} className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-raised/60">
            <span className="min-w-0">
              <span className="block text-[15px]">{mediumDate(e.date)}</span>
              {e.note && <span className="block truncate text-[12.5px] text-faint">{e.note}</span>}
            </span>
            <span className="tnum text-right"><b>{fmt1(e.weight)} kg</b>{e.waist ? <span className="block text-[12.5px] text-muted">{fmt1(e.waist)} cm</span> : null}</span>
          </button>
        ))}
      </Card>

      <WeightSheet entry={edit} onClose={() => setEdit(null)} onDelete={(id) => ask('Excluir medição?', 'Essa ação não pode ser desfeita.', () => { s.removeWeight(id); setEdit(null); toast('Medição excluída'); }, 'Excluir')} />
      <TargetSheet open={targetOpen} onClose={() => setTargetOpen(false)} />
      {node}
    </div>
  );
}

function WeightSheet({ entry, onClose, onDelete }: { entry: Partial<WeightEntry> | null; onClose: () => void; onDelete: (id: string) => void }) {
  const s = useStore();
  const toast = useToast();
  const [v, setV] = useState({ date: '', weight: '', waist: '', note: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!entry) return;
    setV({ date: entry.date ?? todayKey(), weight: entry.weight ? String(entry.weight).replace('.', ',') : '', waist: entry.waist ? String(entry.waist).replace('.', ',') : '', note: entry.note ?? '' });
    setErr({});
  }, [entry]);
  const save = () => {
    const e: Record<string, string> = {};
    const w = parseNum(v.weight);
    const c = v.waist ? parseNum(v.waist) : undefined;
    if (!v.date) e.date = 'Informe a data.';
    else if (v.date > todayKey()) e.date = 'A data não pode ser no futuro.';
    if (!Number.isFinite(w) || w < 30 || w > 300) e.weight = 'Informe um peso entre 30 e 300 kg.';
    if (c !== undefined && (!Number.isFinite(c) || c < 40 || c > 200)) e.waist = 'Medida entre 40 e 200 cm.';
    setErr(e);
    if (Object.keys(e).length) return;
    s.upsertWeight({ id: entry?.id, date: v.date, weight: w, waist: c, note: v.note.trim() || undefined });
    toast(entry?.id ? 'Medição atualizada' : 'Medição registrada');
    onClose();
  };
  return (
    <Sheet open={!!entry} onClose={onClose} title={entry?.id ? 'Editar medição' : 'Nova medição'}
      footer={<div className="flex gap-2">{entry?.id && <Button variant="danger" onClick={() => onDelete(entry.id!)}>Excluir</Button>}<Button className="flex-1" onClick={save}>Salvar</Button></div>}>
      <div className="space-y-4">
        <Field label="Data" error={err.date}><TextInput type="date" max={todayKey()} value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} invalid={!!err.date} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Peso (kg)" error={err.weight}><TextInput inputMode="decimal" placeholder="78,0" value={v.weight} onChange={(e) => setV({ ...v, weight: e.target.value })} invalid={!!err.weight} /></Field>
          <Field label="Cintura (cm, opcional)" error={err.waist}><TextInput inputMode="decimal" placeholder="85" value={v.waist} onChange={(e) => setV({ ...v, waist: e.target.value })} invalid={!!err.waist} /></Field>
        </div>
        <Field label="Observações (opcional)"><TextInput value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} placeholder="ex.: após treino, jantar mais salgado" /></Field>
      </div>
    </Sheet>
  );
}

function TargetSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore();
  const [v, setV] = useState('');
  const n = parseNum(v);
  return (
    <Sheet open={open} onClose={onClose} title="Meta de peso"
      footer={<div className="flex gap-2">
        <Button variant="subtle" className="flex-1" onClick={() => { s.setGoals({ weightTarget: undefined }); onClose(); }}>Sem meta</Button>
        <Button className="flex-1" disabled={!Number.isFinite(n) || n < 40 || n > 250} onClick={() => { s.setGoals({ weightTarget: n }); onClose(); }}>Salvar</Button>
      </div>}>
      <p className="mb-3 text-[14px] text-muted">Defina uma meta só se fizer sentido para você — de preferência com orientação profissional. O app não sugere um peso ideal.</p>
      <TextInput inputMode="decimal" placeholder={s.goals.weightTarget ? fmt1(s.goals.weightTarget) : 'ex.: 74'} value={v} onChange={(e) => setV(e.target.value)} aria-label="Meta de peso em kg" />
    </Sheet>
  );
}
