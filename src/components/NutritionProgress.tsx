import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { useEffect, useState } from 'react';
import { fmt0 } from '../lib/format';
import type { Goals, Macros } from '../types';
import { cx } from './ui';

export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (reduce) return setShown(value);
    const c = animate(mv, value, { duration: 0.7, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setShown(v) });
    return () => c.stop();
  }, [value, reduce, mv]);
  return <span className={cx('tnum', className)}>{fmt0(shown)}</span>;
}

/** Anel de progresso. Ao ultrapassar 100%, mostra o excedente em uma segunda volta mais clara. */
export function Ring({ value, goal, size = 200, stroke = 16, color = 'rgb(var(--accent))', children, label }: {
  value: number; goal: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode; label: string;
}) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const pct = goal > 0 ? value / goal : 0;
  const main = Math.min(pct, 1);
  const over = Math.min(Math.max(pct - 1, 0), 1);
  const progress = useMotionValue(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    const c = animate(progress, main, { duration: reduce ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop();
  }, [main, progress, reduce]);
  const dash = useTransform(progress, (p) => `${p * C} ${C}`);
  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${fmt0(value)} de ${fmt0(goal)} (${fmt0(pct * 100)}%)`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--raised))" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" style={{ strokeDasharray: dash }} />
        {over > 0 && (
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--warn))" strokeOpacity={0.9} strokeWidth={stroke / 2.2} strokeLinecap="round"
            initial={{ strokeDasharray: `0 ${C}` }} animate={{ strokeDasharray: `${over * C} ${C}` }} transition={{ duration: 0.9, delay: 0.5 }}
          />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function MacroBar({ label, value, goal, color, unit = 'g' }: { label: string; value: number; goal: number; color: string; unit?: string }) {
  const pct = goal > 0 ? value / goal : 0;
  const left = goal - value;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        <span className="tnum text-[13px] text-faint">
          <span className="font-semibold text-ink">{fmt0(value)}</span> / {fmt0(goal)} {unit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-raised" role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={Math.round(goal)}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct, 1) * 100}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <p className="tnum mt-1 text-[12px] text-faint">{left >= 0 ? `faltam ${fmt0(left)} ${unit}` : `${fmt0(-left)} ${unit} acima da meta`}</p>
    </div>
  );
}

export const MACRO_COLORS = { p: 'rgb(var(--protein))', c: 'rgb(var(--carb))', f: 'rgb(var(--fat))' };

/** Visão completa: anel de calorias + barras de macros com "faltam / acima" */
export function NutritionProgress({ totals, goals }: { totals: Macros; goals: Goals }) {
  const left = goals.kcal - totals.kcal;
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
      <Ring value={totals.kcal} goal={goals.kcal} size={208} stroke={18} label="Calorias">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-muted">{left >= 0 ? 'Restantes' : 'Acima da meta'}</p>
          <p className="text-[44px] font-semibold leading-none tracking-tight"><AnimatedNumber value={Math.abs(left)} /></p>
          <p className="mt-1.5 text-[13px] text-faint"><AnimatedNumber value={totals.kcal} /> de {fmt0(goals.kcal)} kcal</p>
        </div>
      </Ring>
      <div className="w-full flex-1 space-y-4">
        <MacroBar label="Proteínas" value={totals.p} goal={goals.p} color={MACRO_COLORS.p} />
        <MacroBar label="Carboidratos" value={totals.c} goal={goals.c} color={MACRO_COLORS.c} />
        <MacroBar label="Gorduras" value={totals.f} goal={goals.f} color={MACRO_COLORS.f} />
      </div>
    </div>
  );
}

export function MacroLine({ m, className }: { m: Macros; className?: string }) {
  return (
    <div className={cx('tnum flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted', className)}>
      <span className="font-semibold text-ink">{fmt0(m.kcal)} kcal</span>
      <span><Dot c={MACRO_COLORS.p} />P {fmt0(m.p)} g</span>
      <span><Dot c={MACRO_COLORS.c} />C {fmt0(m.c)} g</span>
      <span><Dot c={MACRO_COLORS.f} />G {fmt0(m.f)} g</span>
    </div>
  );
}
const Dot = ({ c }: { c: string }) => <span className="mr-1 inline-block h-1.5 w-1.5 -translate-y-px rounded-full align-middle" style={{ background: c }} />;
