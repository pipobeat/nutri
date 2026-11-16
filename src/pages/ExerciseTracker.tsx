import { motion } from 'framer-motion';
import { Activity, ChevronLeft, ChevronRight, Flame, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button, Card, cx, EmptyState, Field, SectionTitle, Select, Sheet, TextInput, useConfirm, useToast } from '../components/ui';
import { addDays, fromKey, mediumDate, shortDate, todayKey, weekKeys, WEEKDAYS_SHORT } from '../lib/dates';
import { fmt0, parseNum } from '../lib/format';
import { EXERCISE_TYPES, exerciseKcal } from '../lib/nutrition';
import { useStore } from '../store/useStore';
import type { ExerciseEntry } from '../types';

export function ExerciseTracker() {
  const s = useStore();
  const toast = useToast();
  const { ask, node } = useConfirm();
  const [ref, setRef] = useState(todayKey());
  const [edit, setEdit] = useState<Partial<ExerciseEntry> | null>(null);
  const week = weekKeys(ref);
  const inWeek = useMemo(() => s.exercises.filter((e) => e.date >= week[0] && e.date <= week[6]), [s.exercises, week]);
  const days = new Set(inWeek.map((e) => e.date)).size;
  const minutes = inWeek.reduce((a, e) => a + e.minutes, 0);
  const kcalEst = inWeek.reduce((a, e) => a + exerciseKcal(e.type, e.minutes, s.profile.weight, e.rpe), 0);
  const perDay = week.map((d) => inWeek.filter((e) => e.date === d).reduce((a, e) => a + e.minutes, 0));
  const maxMin = Math.max(60, ...perDay);

  return (
    <div>
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Treinos</h1>
          <p className="text-[13px] text-muted">Frequência e duração</p>
        </div>
        <Button size="sm" icon={<Plus size={16} />} onClick={() => setEdit({ date: todayKey(), type: 'Corrida', minutes: 45, rpe: 6 })}>Treino</Button>
      </header>

      <Card className="mb-3">
        <div className="mb-3 flex items-center justify-between">
          <button aria-label="Semana anterior" onClick={() => setRef(addDays(ref, -7))} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-raised"><ChevronLeft size={18} /></button>
          <p className="text-[14px] font-semibold">Semana de {shortDate(week[0])} a {shortDate(week[6])}</p>
          <button aria-label="Próxima semana" disabled={week[6] >= todayKey()} onClick={() => setRef(addDays(ref, 7))} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-raised disabled:opacity-30"><ChevronRight size={18} /></button>
        </div>
        <div className="flex h-28 items-end gap-2">
          {week.map((d, i) => (
            <div key={d} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-20 w-full items-end justify-center">
                <motion.div className={cx('w-full max-w-[30px] rounded-lg', perDay[i] ? 'bg-accent' : 'bg-raised')} initial={{ height: 4 }} animate={{ height: perDay[i] ? Math.max(8, (perDay[i] / maxMin) * 80) : 4 }} transition={{ duration: 0.6, delay: i * 0.03 }} title={`${perDay[i]} min`} />
              </div>
              <span className={cx('text-[11px]', d === todayKey() ? 'font-semibold text-accent' : 'text-faint')}>{WEEKDAYS_SHORT[i]}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line/60 pt-4">
          <div><p className="text-[11.5px] text-muted">Dias treinados</p><p className="tnum text-[22px] font-semibold">{days}<span className="text-[13px] font-normal text-faint">/7</span></p></div>
          <div><p className="text-[11.5px] text-muted">Tempo total</p><p className="tnum text-[22px] font-semibold">{fmt0(minutes)}<span className="text-[13px] font-normal text-faint"> min</span></p></div>
          <div><p className="text-[11.5px] text-muted">Sessões</p><p className="tnum text-[22px] font-semibold">{inWeek.length}</p></div>
        </div>
      </Card>

      <Card className="mb-3">
        <div className="flex items-start gap-3">
          <Flame size={18} className="mt-0.5 shrink-0 text-carb" />
          <div>
            <p className="tnum text-[15px] font-semibold">≈ {fmt0(kcalEst)} kcal gastas na semana <span className="text-[12px] font-normal text-warn">(estimativa)</span></p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">Calculado com valores MET do Compêndio de Atividades Físicas, seu peso e a intensidade percebida. Estimativas assim podem errar bastante, por isso <b className="text-ink">não são descontadas</b> da sua meta de calorias.</p>
          </div>
        </div>
      </Card>

      <SectionTitle>Registros</SectionTitle>
      {s.exercises.length === 0 ? (
        <Card><EmptyState icon={<Activity size={22} />} title="Nenhum treino registrado" text="Registre cardio, esportes, musculação ou caminhadas para ver sua frequência semanal." action={<Button onClick={() => setEdit({ date: todayKey(), type: 'Corrida', minutes: 45, rpe: 6 })}>Registrar treino</Button>} /></Card>
      ) : (
        <Card className="p-2 sm:p-2">
          {s.exercises.slice(0, 60).map((e) => (
            <button key={e.id} onClick={() => setEdit(e)} className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-raised/60">
              <span className="min-w-0">
                <span className="block text-[15px] font-medium">{e.type}</span>
                <span className="block truncate text-[12.5px] text-faint">{mediumDate(e.date)} · intensidade {e.rpe}/10{e.note ? ` · ${e.note}` : ''}</span>
              </span>
              <span className="tnum shrink-0 text-right"><b>{e.minutes} min</b><span className="block text-[12px] text-faint">≈ {fmt0(exerciseKcal(e.type, e.minutes, s.profile.weight, e.rpe))} kcal</span></span>
            </button>
          ))}
        </Card>
      )}

      <ExerciseSheet entry={edit} onClose={() => setEdit(null)} onDelete={(id) => ask('Excluir treino?', 'Essa ação não pode ser desfeita.', () => { s.removeExercise(id); setEdit(null); toast('Treino excluído'); }, 'Excluir')} />
      {node}
    </div>
  );
}

const RPE_LABEL = ['', 'Muito leve', 'Muito leve', 'Leve', 'Leve', 'Moderada', 'Moderada', 'Intensa', 'Intensa', 'Muito intensa', 'Máxima'];

function ExerciseSheet({ entry, onClose, onDelete }: { entry: Partial<ExerciseEntry> | null; onClose: () => void; onDelete: (id: string) => void }) {
  const s = useStore();
  const toast = useToast();
  const [v, setV] = useState({ date: '', type: 'Corrida', custom: '', minutes: '', rpe: 6, note: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!entry) return;
    const known = EXERCISE_TYPES.some((t) => t.label === entry.type);
    setV({ date: entry.date ?? todayKey(), type: known ? entry.type! : 'Outro', custom: known ? '' : entry.type ?? '', minutes: entry.minutes ? String(entry.minutes) : '', rpe: entry.rpe ?? 6, note: entry.note ?? '' });
    setErr({});
  }, [entry]);
  const save = () => {
    const e: Record<string, string> = {};
    const m = parseNum(v.minutes);
    if (!v.date) e.date = 'Informe a data.';
    else if (v.date > todayKey()) e.date = 'A data não pode ser no futuro.';
    if (!Number.isFinite(m) || m < 1 || m > 600) e.minutes = 'Duração entre 1 e 600 minutos.';
    if (v.type === 'Outro' && !v.custom.trim()) e.custom = 'Descreva a atividade.';
    setErr(e);
    if (Object.keys(e).length) return;
    s.upsertExercise({ id: entry?.id, date: v.date, type: v.type === 'Outro' ? v.custom.trim() : v.type, minutes: Math.round(m), rpe: v.rpe, note: v.note.trim() || undefined });
    toast(entry?.id ? 'Treino atualizado' : 'Treino registrado');
    onClose();
  };
  return (
    <Sheet open={!!entry} onClose={onClose} title={entry?.id ? 'Editar treino' : 'Novo treino'}
      footer={<div className="flex gap-2">{entry?.id && <Button variant="danger" onClick={() => onDelete(entry.id!)}>Excluir</Button>}<Button className="flex-1" onClick={save}>Salvar</Button></div>}>
      <div className="space-y-4">
        <Field label="Tipo"><Select value={v.type} onChange={(e) => setV({ ...v, type: e.target.value })}>{EXERCISE_TYPES.map((t) => <option key={t.label}>{t.label}</option>)}</Select></Field>
        {v.type === 'Outro' && <Field label="Qual atividade?" error={err.custom}><TextInput value={v.custom} onChange={(e) => setV({ ...v, custom: e.target.value })} invalid={!!err.custom} /></Field>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data" error={err.date}><TextInput type="date" max={todayKey()} value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} invalid={!!err.date} /></Field>
          <Field label="Duração (min)" error={err.minutes}><TextInput inputMode="numeric" value={v.minutes} onChange={(e) => setV({ ...v, minutes: e.target.value })} invalid={!!err.minutes} /></Field>
        </div>
        <Field label={`Intensidade percebida: ${v.rpe}/10 · ${RPE_LABEL[v.rpe]}`} htmlFor="rpe">
          <input id="rpe" type="range" min={1} max={10} value={v.rpe} onChange={(e) => setV({ ...v, rpe: Number(e.target.value) })} className="w-full accent-[rgb(var(--accent))]" />
        </Field>
        <Field label="Observações (opcional)"><TextInput value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} placeholder="ex.: futebol com amigos" /></Field>
        {v.date && <p className="text-[12px] text-faint">{fromKey(v.date).toLocaleDateString('pt-BR', { weekday: 'long' })}</p>}
      </div>
    </Sheet>
  );
}
