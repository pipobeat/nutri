import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { CalendarRange, Home, Leaf, MoreHorizontal, Plus, ShoppingBasket } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button, cx, Sheet, spring, ToastProvider, useToast } from './components/ui';
import { todayKey } from './lib/dates';
import { Dashboard } from './pages/Dashboard';
import { ExerciseTracker } from './pages/ExerciseTracker';
import { FoodLog } from './pages/FoodLog';
import { Foods } from './pages/Foods';
import { History } from './pages/History';
import { More, MORE_ITEMS } from './pages/More';
import { Nutrients } from './pages/Nutrients';
import { Settings } from './pages/Settings';
import { ShoppingList } from './pages/ShoppingList';
import { WeeklyMenu } from './pages/WeeklyMenu';
import { WeightTracker } from './pages/WeightTracker';
import { useStore } from './store/useStore';
import { useUI, type Route } from './store/ui';

const PAGES: Record<Route, () => JSX.Element> = {
  hoje: Dashboard, cardapio: WeeklyMenu, registrar: FoodLog, compras: ShoppingList, mais: More,
  evolucao: WeightTracker, treinos: ExerciseTracker, nutrientes: Nutrients, ajustes: Settings, historico: History, alimentos: Foods,
};
const MORE_ROUTES: Route[] = ['mais', 'evolucao', 'treinos', 'nutrientes', 'ajustes', 'historico', 'alimentos'];

const TABS: { r: Route; label: string; icon: typeof Home }[] = [
  { r: 'hoje', label: 'Hoje', icon: Home },
  { r: 'cardapio', label: 'Cardápio', icon: CalendarRange },
  { r: 'registrar', label: 'Registrar', icon: Plus },
  { r: 'compras', label: 'Compras', icon: ShoppingBasket },
  { r: 'mais', label: 'Mais', icon: MoreHorizontal },
];

function useTheme() {
  const theme = useStore((s) => s.settings.theme);
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: light)');
    const apply = () => {
      const t = theme === 'system' ? (mq.matches ? 'light' : 'dark') : theme;
      document.documentElement.dataset.theme = t;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#f4f5f7' : '#0b0c0e');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

/** Lembretes locais: verificados a cada 30 s enquanto o app está aberto. */
function useReminders() {
  const toast = useToast();
  const fired = useRef<Record<string, string>>({});
  useEffect(() => {
    const tick = () => {
      const { settings } = useStore.getState();
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const day = todayKey();
      for (const r of settings.reminders) {
        if (!r.enabled || r.time !== hhmm || fired.current[r.id] === day) continue;
        if (r.id === 'r6' && now.getDay() !== 1) continue;
        fired.current[r.id] = day;
        toast(`Lembrete: ${r.label}`);
        if (settings.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
          navigator.serviceWorker?.ready
            .then((reg) => reg.showNotification('Nutri', { body: r.label, icon: 'icons/icon-192.png', tag: r.id }))
            .catch(() => new Notification('Nutri', { body: r.label }));
        }
      }
    };
    const id = setInterval(tick, 30_000);
    tick();
    return () => clearInterval(id);
  }, [toast]);
}

function Shell() {
  const route = useUI((s) => s.route);
  const go = useUI((s) => s.go);
  const welcomed = useStore((s) => s.welcomed);
  const setWelcomed = useStore((s) => s.setWelcomed);
  useTheme();
  useReminders();
  const Page = PAGES[route];
  const activeTab = MORE_ROUTES.includes(route) ? 'mais' : route;

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl">
      {/* barra lateral (desktop) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-1 border-r border-line/60 px-4 py-8 lg:flex">
        <div className="mb-6 flex items-center gap-2.5 px-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-ink"><Leaf size={18} /></span>
          <span className="text-[17px] font-bold tracking-tight">Nutri</span>
        </div>
        {[...TABS.filter((t) => t.r !== 'mais'), ...MORE_ITEMS.map((m) => ({ r: m.r, label: m.label.split(' e ')[0], icon: null as any, node: m.icon }))].map((t: any) => {
          const active = route === t.r;
          const Icon = t.icon;
          return (
            <button key={t.r} onClick={() => go(t.r)} className={cx('relative flex h-11 items-center gap-3 rounded-2xl px-3 text-[14.5px] font-medium transition', active ? 'text-ink' : 'text-muted hover:text-ink')}>
              {active && <motion.span layoutId="side-active" transition={spring} className="absolute inset-0 -z-10 rounded-2xl bg-surface ring-1 ring-line" />}
              <span className={cx(active && 'text-accent')}>{Icon ? <Icon size={19} /> : t.node}</span>
              {t.label}
            </button>
          );
        })}
      </aside>

      <main className="min-w-0 flex-1 px-4 pb-32 pt-[max(env(safe-area-inset-top),20px)] sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
        <div className="mx-auto max-w-2xl">
          {MORE_ROUTES.includes(route) && route !== 'mais' && (
            <button onClick={() => go('mais')} className="mb-2 text-[14px] font-semibold text-accent lg:hidden">‹ Mais</button>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={route} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
              <Page />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* navegação inferior (celular) */}
      <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-line/60 bg-bg/80 backdrop-blur-2xl lg:hidden">
        <div className="mx-auto flex max-w-md items-end justify-around px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5">
          {TABS.map(({ r, label, icon: Icon }) => {
            const active = activeTab === r;
            if (r === 'registrar')
              return (
                <button key={r} onClick={() => go('registrar')} aria-label="Registrar alimento" className="-mt-5 flex flex-col items-center gap-1">
                  <motion.span whileTap={{ scale: 0.9 }} className={cx('grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-ink shadow-[0_8px_30px_-6px_rgb(var(--accent)/0.6)]', active && 'ring-4 ring-accent/25')}>
                    <Plus size={26} strokeWidth={2.4} />
                  </motion.span>
                  <span className={cx('text-[10.5px] font-medium', active ? 'text-accent' : 'text-muted')}>{label}</span>
                </button>
              );
            return (
              <button key={r} onClick={() => go(r)} aria-current={active ? 'page' : undefined} className="relative flex w-16 flex-col items-center gap-1 py-1.5">
                <Icon size={22} strokeWidth={active ? 2.3 : 1.8} className={cx('transition-colors', active ? 'text-accent' : 'text-muted')} />
                <span className={cx('text-[10.5px] font-medium transition-colors', active ? 'text-ink' : 'text-muted')}>{label}</span>
                {active && <motion.span layoutId="tab-dot" transition={spring} className="absolute -top-1.5 h-1 w-6 rounded-full bg-accent" />}
              </button>
            );
          })}
        </div>
      </nav>

      <Sheet open={!welcomed} onClose={setWelcomed} title="Bem-vindo ao seu Nutri" footer={<Button className="w-full" onClick={setWelcomed}>Começar</Button>}>
        <div className="space-y-3 text-[14.5px] leading-relaxed text-muted">
          <p>Seu acompanhamento pessoal de alimentação, macros, peso e treinos.</p>
          <ul className="space-y-2">
            <li>• O <b className="text-ink">cardápio semanal</b> começa com o plano que você informou (marcado como exemplo) — edite à vontade.</li>
            <li>• Seu padrão: pescetariano com <b className="text-ink">frango ocasional</b> (peito grelhado). Carne bovina e suína nunca entram.</li>
            <li>• Valores nutricionais vêm da <b className="text-ink">TACO</b> e, na falta, da <b className="text-ink">USDA</b>. Itens de rótulo ou estimados são sinalizados com <b className="text-warn">≈</b>.</li>
            <li>• Metas de 2.200 kcal e 145/250/70 g são <b className="text-ink">estimativas iniciais</b>, não prescrição. Ajuste com orientação profissional.</li>
            <li>• Seus dados ficam salvos <b className="text-ink">só neste aparelho</b>. Faça backups em Ajustes.</li>
          </ul>
        </div>
      </Sheet>
    </div>
  );
}

export default function App() {
  const reduce = useStore((s) => s.settings.reduceMotion);
  return (
    <MotionConfig reducedMotion={reduce ? 'always' : 'user'}>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </MotionConfig>
  );
}
