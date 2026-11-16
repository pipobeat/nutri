import { Activity, CalendarDays, ChevronRight, Leaf, Salad, Scale, Settings as Cog } from 'lucide-react';
import { Card, Item, Stagger } from '../components/ui';
import { useUI, type Route } from '../store/ui';

export const MORE_ITEMS: { r: Route; label: string; sub: string; icon: React.ReactNode }[] = [
  { r: 'evolucao', label: 'Evolução', sub: 'Peso, cintura e médias', icon: <Scale size={19} /> },
  { r: 'treinos', label: 'Treinos', sub: 'Frequência e duração semanal', icon: <Activity size={19} /> },
  { r: 'nutrientes', label: 'Nutrientes e suplementos', sub: 'B12, D, ferro, zinco, cálcio, ômega-3', icon: <Leaf size={19} /> },
  { r: 'historico', label: 'Histórico', sub: 'Refeições registradas por dia', icon: <CalendarDays size={19} /> },
  { r: 'alimentos', label: 'Base de alimentos', sub: 'Fontes, edição e preferidos', icon: <Salad size={19} /> },
  { r: 'ajustes', label: 'Ajustes', sub: 'Perfil, metas, tema, backup', icon: <Cog size={19} /> },
];

export function More() {
  const go = useUI((s) => s.go);
  return (
    <div>
      <header className="mb-4"><h1 className="text-[28px] font-bold tracking-tight">Mais</h1></header>
      <Stagger className="space-y-2">
        {MORE_ITEMS.map((i) => (
          <Item key={i.r}>
            <Card as="button" onClick={() => go(i.r)} className="flex items-center gap-4">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/12 text-accent">{i.icon}</span>
              <span className="min-w-0 flex-1"><span className="block text-[16px] font-semibold">{i.label}</span><span className="block truncate text-[13px] text-muted">{i.sub}</span></span>
              <ChevronRight size={18} className="text-faint" />
            </Card>
          </Item>
        ))}
      </Stagger>
    </div>
  );
}
