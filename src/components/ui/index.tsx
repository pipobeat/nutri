import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { DataSource } from '../../types';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
export const spring = { type: 'spring', stiffness: 380, damping: 34, mass: 0.9 } as const;

export function Card({ children, className, onClick, as = 'div' }: { children: ReactNode; className?: string; onClick?: () => void; as?: 'div' | 'button' | 'section' }) {
  const Tag = as as any;
  return (
    <Tag
      onClick={onClick}
      className={cx(
        'rounded-3xl bg-surface border border-line/70 p-4 sm:p-5 text-left',
        onClick && 'w-full transition active:scale-[0.985] hover:border-line',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2.5 mt-6 flex items-center justify-between px-1 first:mt-0">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">{children}</h2>
      {action}
    </div>
  );
}

type BtnVariant = 'primary' | 'subtle' | 'ghost' | 'danger';
export function Button({
  children, onClick, variant = 'primary', className, type = 'button', disabled, icon, size = 'md', ariaLabel,
}: {
  children?: ReactNode; onClick?: () => void; variant?: BtnVariant; className?: string; type?: 'button' | 'submit';
  disabled?: boolean; icon?: ReactNode; size?: 'sm' | 'md' | 'lg'; ariaLabel?: string;
}) {
  const v: Record<BtnVariant, string> = {
    primary: 'bg-accent text-accent-ink hover:brightness-105',
    subtle: 'bg-raised text-ink hover:bg-line/80',
    ghost: 'text-muted hover:text-ink hover:bg-raised',
    danger: 'bg-danger/15 text-danger hover:bg-danger/25',
  };
  const s = { sm: 'h-9 px-3 text-[13px] rounded-xl', md: 'h-11 px-4 text-[15px] rounded-2xl', lg: 'h-12 px-5 text-base rounded-2xl' }[size];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cx('inline-flex select-none items-center justify-center gap-2 font-semibold transition duration-200 ease-soft active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40', v[variant], s, className)}
    >
      {icon}
      {children}
    </button>
  );
}

export function IconButton({ children, onClick, label, className, active }: { children: ReactNode; onClick?: () => void; label: string; className?: string; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-full transition active:scale-90', active ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-raised hover:text-ink', className)}
    >
      {children}
    </button>
  );
}

export function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block px-1 text-[13px] font-medium text-muted">{label}</label>
      {children}
      {error ? <p className="px-1 text-[12.5px] text-danger" role="alert">{error}</p> : hint ? <p className="px-1 text-[12.5px] text-faint">{hint}</p> : null}
    </div>
  );
}

export const inputCls =
  'w-full h-12 rounded-2xl bg-raised border border-transparent px-4 text-ink placeholder:text-faint outline-none transition focus:border-accent/60 focus:bg-surface';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const { invalid, className, ...rest } = props;
  return <input {...rest} className={cx(inputCls, invalid && 'border-danger/70', className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props;
  return <select {...rest} className={cx(inputCls, 'appearance-none pr-8', className)} />;
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  const id = useId();
  return (
    <div role="tablist" className={cx('relative flex rounded-2xl bg-raised p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx('relative z-10 h-9 flex-1 rounded-xl px-2 text-[13px] font-semibold transition-colors', value === o.value ? 'text-ink' : 'text-muted')}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${id}`} transition={spring} className="absolute inset-0 -z-10 rounded-xl bg-surface shadow-sm ring-1 ring-line" />
          )}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300', checked ? 'bg-accent' : 'bg-line')}
    >
      <motion.span layout transition={spring} className={cx('absolute top-1 h-5 w-5 rounded-full bg-white shadow', checked ? 'right-1' : 'left-1')} />
    </button>
  );
}

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'warn' | 'info'; className?: string }) {
  const t = { neutral: 'bg-raised text-muted', accent: 'bg-accent/15 text-accent', warn: 'bg-warn/15 text-warn', info: 'bg-water/15 text-water' }[tone];
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', t, className)}>{children}</span>;
}

export function SourceBadge({ source }: { source: DataSource }) {
  const tone = source === 'TACO' ? 'accent' : source === 'USDA' || source === 'Open Food Facts' ? 'info' : source === 'Personalizado' ? 'neutral' : 'warn';
  const label = source === 'Rótulo' ? 'Rótulo ≈' : source === 'Estimado' ? 'Estimado ≈' : source === 'Open Food Facts' ? 'OFF' : source;
  return <Badge tone={tone}>{label}</Badge>;
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-raised text-muted">{icon}</div>
      <p className="font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Folha inferior (bottom sheet) no celular, diálogo centralizado no desktop. */
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => ref.current?.focus(), 50);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" exit={{ pointerEvents: 'none' }}>
          <motion.div
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={ref}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative flex max-h-[92dvh] w-full flex-col rounded-t-[28px] border border-line bg-surface outline-none sm:max-w-lg sm:rounded-[28px]"
            initial={reduce ? { opacity: 0 } : { y: '100%' }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: '100%', transition: { duration: 0.24, ease: [0.4, 0, 1, 1] } }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
            drag={reduce ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            dragListener={false}
            onDragEnd={(_, i) => (i.offset.y > 120 || i.velocity.y > 600) && onClose()}
          >
            <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-3">
              <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-line sm:hidden" />
              <h3 className="mt-2 text-lg font-semibold">{title}</h3>
              <IconButton label="Fechar" onClick={onClose} className="mt-1"><X size={20} /></IconButton>
            </div>
            <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-4">{children}</div>
            {footer && <div className="border-t border-line/70 px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-3">{footer}</div>}
            {!footer && <div className="pb-[env(safe-area-inset-bottom)]" />}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------- Toasts ----------
type Toast = { id: number; text: string; tone: 'ok' | 'err'; action?: { label: string; run: () => void } };
const ToastCtx = createContext<(text: string, opts?: { tone?: 'ok' | 'err'; action?: Toast['action'] }) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, opts?: { tone?: 'ok' | 'err'; action?: Toast['action'] }) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x.slice(-2), { id, text, tone: opts?.tone ?? 'ok', action: opts?.action }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3600);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),12px)] z-[60] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={spring}
              className={cx('pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur-xl', t.tone === 'ok' ? 'border-line bg-raised/95' : 'border-danger/40 bg-raised/95 text-danger')}
            >
              <span>{t.text}</span>
              {t.action && (
                <button className="font-semibold text-accent" onClick={() => { t.action!.run(); setItems((x) => x.filter((y) => y.id !== t.id)); }}>
                  {t.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- Confirmação ----------
export function useConfirm() {
  const [state, setState] = useState<{ title: string; text: string; confirm: string; run: () => void } | null>(null);
  const ask = (title: string, text: string, run: () => void, confirm = 'Confirmar') => setState({ title, text, run, confirm });
  const node = (
    <Sheet
      open={!!state}
      onClose={() => setState(null)}
      title={state?.title ?? ''}
      footer={
        <div className="flex gap-2">
          <Button variant="subtle" className="flex-1" onClick={() => setState(null)}>Cancelar</Button>
          <Button variant="danger" className="flex-1" onClick={() => { state?.run(); setState(null); }}>{state?.confirm}</Button>
        </div>
      }
    >
      <p className="text-[15px] text-muted">{state?.text}</p>
    </Sheet>
  );
  return { ask, node };
}

export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.045, delayChildren: 0.02 } } }}
    >
      {children}
    </motion.div>
  );
}
export function Item({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } } }}
    >
      {children}
    </motion.div>
  );
}
