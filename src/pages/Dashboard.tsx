import { motion } from 'framer-motion';
import { Activity, ChevronRight, Droplet, GlassWater, Info, Minus, Plus, Scale, Sparkles, UtensilsCrossed } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EntrySheet } from '../components/EntrySheet';
import { usePlanEntries } from '../components/MealCard';
import { MacroLine, NutritionProgress } from '../components/NutritionProgress';
import { Badge, Button, Card, cx, Item, SectionTitle, Sheet, Stagger, TextInput, useToast } from '../components/ui';
import { addDays, greeting, longDate, weekdayIndex, WEEKDAYS_SHORT } from '../lib/dates';
import { fmt0, fmt1, parseNum } from '../lib/format';
import { useDayLog, useToday } from '../lib/hooks';
import { logTotals, MEAL_HOUR, MEAL_LABEL, MEAL_ORDER, mealMacros, metGoal } from '../lib/nutrition';
import { useStore } from '../store/useStore';
import { useUI } from '../store/ui';
import type { LogEntry, MealType } from '../types';

export function Dashboard() {
  const today = useToday();
  const s = useStore();
  const go = useUI((x) => x.go);
  const toast = useToast();
  const { entries, totals } = useDayLog(today);
  const planEntries = usePlanEntries(today);
  const [editing, setEditing] = useState<LogEntry | null>(null);
  const [waterOpen, setWaterOpen] = useState(false);
  const plan = s.plan[weekdayIndex(today)];

  // próxima refeição: a primeira ainda não registrada, a partir do horário atual
  const next = useMemo(() => {
    const h = new Date().getHours();
    const pending = MEAL_ORDER.filter((m) => !entries.some((e) => e.meal === m));
    const upcoming = pending.find((m) => MEAL_HOUR[m] + 2 > h);
    return upcoming ? plan.find((m) => m.type === upcoming)! : null;
  }, [entries, plan]);

  const weekly = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
    const per = days.map((d) => ({ d, t: logTotals(s.log.filter((e) => e.date === d)) }));
    const logged = per.filter((x) => x.t.kcal > 0);
    const avg = (k: 'kcal' | 'p') => (logged.length ? logged.reduce((a, x) => a + x.t[k], 0) / logged.length : 0);
    const met = logged.filter((x) => metGoal(x.t, s.goals)).length;
    const wAvg = (from: string, to: string) => {
      const w = s.weights.filter((x) => x.date >= from && x.date <= to);
      return w.length ? w.reduce((a, x) => a + x.weight, 0) / w.length : null;
    };
    const thisW = wAvg(addDays(today, -6), today);
    const prevW = wAvg(addDays(today, -13), addDays(today, -7));
    return { per, logged: logged.length, avgK: avg('kcal'), avgP: avg('p'), met, thisW, prevW };
  }, [s.log, s.weights, s.goals, today]);

  const water = s.water[today] ?? 0;
  const weekEx = s.exercises.filter((e) => e.date > addDays(today, -7) && e.date <= today);
  const todayEx = s.exercises.filter((e) => e.date === today);
  const name = s.profile.name.trim().split(' ')[0];

  const tip = useMemo(() => {
    if (!entries.length) return 'Comece registrando sua primeira refeição — marcar uma refeição do cardápio leva um toque.';
    if (totals.p < s.goals.p * 0.5 && new Date().getHours() >= 15) return 'Ainda dá tempo de incluir uma fonte de proteína no lanche ou jantar, como iogurte, ovos ou peixe.';
    if (water < s.goals.water * 0.4 && new Date().getHours() >= 14) return 'Que tal um copo d’água agora? Pequenos goles ao longo do dia ajudam.';
    if (totals.fiber >= 25) return 'Boa variedade de fibras hoje — leguminosas, frutas e verduras fazem diferença.';
    return 'Constância vale mais que perfeição. Um dia fora do plano não define sua semana.';
  }, [entries.length, totals, water, s.goals]);

  return (
    <Stagger className="space-y-3">
      <Item>
        <header className="mb-2 flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium first-letter:uppercase text-muted">{longDate(today)}</p>
            <h1 className="text-[28px] font-bold tracking-tight">{greeting()}{name ? `, ${name}` : ''}</h1>
          </div>
          <button onClick={() => go('evolucao')} className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-2 text-[13px] font-semibold ring-1 ring-line/70 transition active:scale-95">
            <Scale size={15} className="text-muted" /> <span className="tnum">{fmt1(s.profile.weight)} kg</span>
          </button>
        </header>
      </Item>

      <Item>
        <Card className="overflow-hidden">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[15px] font-semibold">Hoje</p>
            <p className="tnum text-[13px] text-muted">Meta {fmt0(s.goals.kcal)} kcal</p>
          </div>
          <NutritionProgress totals={totals} goals={s.goals} />
          <button onClick={() => go('ajustes')} className="mt-4 flex items-center gap-1.5 text-[11.5px] text-faint">
            <Info size={12} /> Metas são estimativas iniciais, não prescrição. Ajuste conforme sua evolução real.
          </button>
        </Card>
      </Item>

      {next && (
        <Item>
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-accent">Próxima refeição</p>
                <p className="mt-0.5 text-[18px] font-semibold">{MEAL_LABEL[next.type]}</p>
              </div>
              <Badge>{fmt0(mealMacros(s.foods, next).kcal)} kcal</Badge>
            </div>
            <ul className="mt-2 space-y-1">
              {next.items.slice(0, 5).map((it) => (
                <li key={it.id} className="flex justify-between gap-3 text-[14px]">
                  <span className="truncate text-ink/90">{s.foods[it.foodId]?.name ?? '—'}</span>
                  <span className="tnum shrink-0 text-muted">{fmt0(it.qty)} {s.foods[it.foodId]?.unit ?? 'g'}</span>
                </li>
              ))}
              {next.items.length > 5 && <li className="text-[13px] text-faint">+{next.items.length - 5} itens</li>}
            </ul>
            <div className="mt-4 flex gap-2">
              <Button className="flex-1" onClick={() => { s.toggleMealDone(today, next.type); toast(`${MEAL_LABEL[next.type]} registrado`); }}>Marcar como realizada</Button>
              <Button variant="subtle" onClick={() => { useUI.getState().setMenuDay(today); go('cardapio'); }}>Ver</Button>
            </div>
          </Card>
        </Item>
      )}

      <Item>
        <SectionTitle action={<button onClick={() => go('historico')} className="text-[13px] font-semibold text-accent">Histórico</button>}>Refeições de hoje</SectionTitle>
        <Card className="p-2 sm:p-2">
          {MEAL_ORDER.map((m) => (
            <MealSummary key={m} meal={m} entries={entries.filter((e) => e.meal === m)} fromPlan={planEntries.some((e) => e.meal === m)} onEdit={setEditing} onAdd={() => go('registrar', { date: today, meal: m })} />
          ))}
        </Card>
      </Item>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Item>
          <Card className="h-full">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-[15px] font-semibold"><Droplet size={17} className="text-water" /> Água</p>
              <button onClick={() => setWaterOpen(true)} className="text-[13px] font-semibold text-accent">Ajustar</button>
            </div>
            <p className="tnum mt-2 text-[28px] font-semibold">{fmt1(water / 1000)} <span className="text-[14px] font-normal text-muted">de {fmt1(s.goals.water / 1000)} L</span></p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-raised">
              <motion.div className="h-full rounded-full bg-water" animate={{ width: `${Math.min(1, water / s.goals.water) * 100}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="subtle" size="sm" ariaLabel="Remover um copo" onClick={() => s.addWater(today, -s.settings.glassMl)} icon={<Minus size={16} />} />
              <Button variant="subtle" size="sm" className="flex-1" onClick={() => s.addWater(today, s.settings.glassMl)} icon={<GlassWater size={16} />}>+ copo {fmt0(s.settings.glassMl)} ml</Button>
              <Button variant="subtle" size="sm" onClick={() => s.addWater(today, 500)}>+500</Button>
            </div>
          </Card>
        </Item>
        <Item>
          <Card className="h-full" as="button" onClick={() => go('treinos')}>
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-[15px] font-semibold"><Activity size={17} className="text-accent" /> Atividade</p>
              <ChevronRight size={18} className="text-faint" />
            </div>
            {weekEx.length ? (
              <>
                <p className="tnum mt-2 text-[28px] font-semibold">{new Set(weekEx.map((e) => e.date)).size} <span className="text-[14px] font-normal text-muted">dias nos últimos 7</span></p>
                <p className="tnum text-[13px] text-muted">{fmt0(weekEx.reduce((a, e) => a + e.minutes, 0))} min no total{todayEx.length ? ` · hoje: ${todayEx.map((e) => e.type).join(', ')}` : ''}</p>
              </>
            ) : (
              <p className="mt-2 text-[14px] text-muted">Nenhum treino registrado nos últimos 7 dias. Toque para registrar.</p>
            )}
          </Card>
        </Item>
      </div>

      <Item>
        <SectionTitle>Últimos 7 dias</SectionTitle>
        <Card>
          {weekly.logged === 0 ? (
            <p className="text-[14px] text-muted">O resumo semanal aparece assim que houver refeições registradas.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Média de calorias" value={`${fmt0(weekly.avgK)}`} unit="kcal" />
                <Stat label="Média de proteína" value={`${fmt0(weekly.avgP)}`} unit="g" />
                <Stat label="Dias na meta" value={`${weekly.met}`} unit={`de ${weekly.logged}`} />
              </div>
              <WeekBars per={weekly.per} goal={s.goals.kcal} />
              <p className="mt-2 text-[11.5px] text-faint">Médias consideram só os dias com registros. “Na meta”: calorias entre 90% e 105% e proteína ≥ 90% da meta.</p>
            </>
          )}
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-raised/60 px-3 py-2.5 text-[13px]">
            <span className="text-muted">Peso (média semanal)</span>
            <span className="tnum font-semibold">
              {weekly.thisW ? `${fmt1(weekly.thisW)} kg` : '—'}
              {weekly.thisW && weekly.prevW ? <span className="ml-2 font-normal text-muted">{weekly.thisW - weekly.prevW >= 0 ? '+' : ''}{fmt1(weekly.thisW - weekly.prevW)} vs semana anterior</span> : null}
            </span>
          </div>
        </Card>
      </Item>

      <Item>
        <div className="flex items-start gap-3 rounded-3xl border border-accent/20 bg-accent/[0.06] p-4">
          <Sparkles size={18} className="mt-0.5 shrink-0 text-accent" />
          <p className="text-[14px] leading-relaxed text-ink/85">{tip}</p>
        </div>
      </Item>

      <EntrySheet entry={editing} onClose={() => setEditing(null)} />
      <WaterSheet open={waterOpen} onClose={() => setWaterOpen(false)} date={today} />
    </Stagger>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <p className="text-[11.5px] leading-tight text-muted">{label}</p>
      <p className="tnum mt-1 text-[22px] font-semibold leading-none">{value}</p>
      <p className="text-[12px] text-faint">{unit}</p>
    </div>
  );
}

function WeekBars({ per, goal }: { per: { d: string; t: { kcal: number } }[]; goal: number }) {
  const max = Math.max(goal * 1.2, ...per.map((x) => x.t.kcal));
  return (
    <div className="mt-4">
      <div className="relative flex h-24 items-end gap-2" role="img" aria-label="Calorias por dia nos últimos 7 dias">
        <div className="absolute inset-x-0 border-t border-dashed border-accent/40" style={{ bottom: `${(goal / max) * 100}%` }} />
        {per.map(({ d, t }, i) => (
          <div key={d} className="flex flex-1 flex-col items-center justify-end">
            <motion.div
              className={cx('w-full max-w-[28px] rounded-lg', t.kcal > goal * 1.05 ? 'bg-warn/80' : 'bg-accent/85')}
              initial={{ height: 0 }} animate={{ height: `${(t.kcal / max) * 96}px` }} transition={{ duration: 0.7, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              title={`${fmt0(t.kcal)} kcal`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2">
        {per.map(({ d }) => <span key={d} className="flex-1 text-center text-[11px] text-faint">{WEEKDAYS_SHORT[weekdayIndex(d)]}</span>)}
      </div>
    </div>
  );
}

function MealSummary({ meal, entries, fromPlan, onEdit, onAdd }: { meal: MealType; entries: LogEntry[]; fromPlan: boolean; onEdit: (e: LogEntry) => void; onAdd: () => void }) {
  const [open, setOpen] = useState(false);
  const t = logTotals(entries);
  return (
    <div className="rounded-2xl">
      <div className="flex items-center gap-2">
        <button onClick={() => entries.length && setOpen(!open)} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-raised/60" aria-expanded={open}>
          <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl', entries.length ? 'bg-accent/15 text-accent' : 'bg-raised text-faint')}>
            <UtensilsCrossed size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium">{MEAL_LABEL[meal]}</span>
            <span className="tnum block truncate text-[12.5px] text-muted">
              {entries.length ? `${entries.length} ${entries.length === 1 ? 'item' : 'itens'} · P ${fmt0(t.p)} · C ${fmt0(t.c)} · G ${fmt0(t.f)}${fromPlan ? ' · do cardápio' : ''}` : 'Nada registrado'}
            </span>
          </span>
          <span className="tnum text-[15px] font-semibold">{entries.length ? fmt0(t.kcal) : ''}</span>
        </button>
        <button onClick={onAdd} aria-label={`Adicionar ao ${MEAL_LABEL[meal]}`} className="mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-raised text-ink transition active:scale-90"><Plus size={17} /></button>
      </div>
      {open && (
        <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-2 ml-14 mr-3 space-y-0.5 overflow-hidden">
          {entries.map((e) => (
            <li key={e.id}>
              <button onClick={() => onEdit(e)} className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-left text-[13.5px] hover:bg-raised/60">
                <span className="min-w-0 truncate">{e.name} <span className="text-faint">· {e.unit === 'porção' ? 'porção' : `${fmt0(e.qty)} ${e.unit}`}</span>{e.estimated && <span className="ml-1 text-warn" title="valor estimado">≈</span>}{e.origin === 'fora' && <span className="ml-1 text-[11px] text-water">fora</span>}</span>
                <span className="tnum shrink-0 text-muted">{fmt0(e.macros.kcal)}</span>
              </button>
            </li>
          ))}
          <li><MacroLine m={t} className="px-2 pt-1" /></li>
        </motion.ul>
      )}
    </div>
  );
}

function WaterSheet({ open, onClose, date }: { open: boolean; onClose: () => void; date: string }) {
  const s = useStore();
  const [v, setV] = useState('');
  const n = parseNum(v);
  const ok = Number.isFinite(n) && n >= 0 && n <= 10000;
  return (
    <Sheet open={open} onClose={onClose} title="Água de hoje"
      footer={<div className="flex gap-2">
        <Button variant="subtle" className="flex-1" disabled={!ok || !v} onClick={() => { s.addWater(date, n); setV(''); onClose(); }}>Somar {v ? `${v} ml` : ''}</Button>
        <Button className="flex-1" disabled={!ok || !v} onClick={() => { s.setWater(date, n); setV(''); onClose(); }}>Definir total</Button>
      </div>}>
      <p className="mb-3 text-[14px] text-muted">Total atual: <b className="tnum text-ink">{fmt0(s.water[date] ?? 0)} ml</b>. Informe uma quantidade em ml.</p>
      <TextInput inputMode="numeric" placeholder="ex.: 350" value={v} onChange={(e) => setV(e.target.value)} invalid={!!v && !ok} aria-label="Quantidade de água em ml" />
      <div className="mt-3 flex flex-wrap gap-2">
        {[200, 300, 500, 750].map((x) => <Button key={x} variant="subtle" size="sm" onClick={() => setV(String(x))}>{x} ml</Button>)}
      </div>
    </Sheet>
  );
}
