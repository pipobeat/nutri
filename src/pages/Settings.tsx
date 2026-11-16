import { Bell, Database, KeyRound, Download, Moon, Share, Smartphone, Sun, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, Field, Segmented, SectionTitle, Select, TextInput, Toggle, useConfirm, useToast } from '../components/ui';
import { FOOD_SOURCES_INFO } from '../data/foods';
import { fmt0, parseNum } from '../lib/format';
import { bmr, kcalFromMacros, tdee } from '../lib/nutrition';
import { exportJSON, useStore } from '../store/useStore';
import { AI_MODEL, getApiKey, setApiKey } from '../lib/aiDish';
import { STORAGE_KEY } from '../store/storage';
import { useUI } from '../store/ui';

const ACTIVITY = [
  { f: 1.2, l: 'Sedentário' },
  { f: 1.375, l: 'Leve (1–3×/semana)' },
  { f: 1.5, l: 'Moderado (3–4×/semana, 30–60 min)' },
  { f: 1.55, l: 'Moderado+ (3–5×/semana)' },
  { f: 1.725, l: 'Intenso (6–7×/semana)' },
];

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function Settings() {
  const s = useStore();
  const toast = useToast();
  const go = useUI((x) => x.go);
  const { ask, node } = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);

  const [p, setP] = useState({ ...s.profile, age: String(s.profile.age), height: String(s.profile.height), weight: String(s.profile.weight).replace('.', ',') });
  const [g, setG] = useState({ kcal: String(s.goals.kcal), p: String(s.goals.p), c: String(s.goals.c), f: String(s.goals.f), fiber: String(s.goals.fiber), water: String(s.goals.water) });
  const [pe, setPe] = useState<Record<string, string>>({});
  const [ge, setGe] = useState<Record<string, string>>({});
  const [newTerm, setNewTerm] = useState('');
  useEffect(() => setP((x) => ({ ...x, weight: String(s.profile.weight).replace('.', ',') })), [s.profile.weight]);

  const prof = { ...s.profile, age: parseNum(p.age) || s.profile.age, height: parseNum(p.height) || s.profile.height, weight: parseNum(p.weight) || s.profile.weight, activityFactor: p.activityFactor, sex: p.sex };
  const b = bmr(prof), t = tdee(prof);
  const goalK = parseNum(g.kcal) || s.goals.kcal;
  const macroK = kcalFromMacros({ p: parseNum(g.p) || 0, c: parseNum(g.c) || 0, f: parseNum(g.f) || 0 });

  const saveProfile = () => {
    const e: Record<string, string> = {};
    const age = parseNum(p.age), h = parseNum(p.height), w = parseNum(p.weight);
    if (!Number.isFinite(age) || age < 14 || age > 100) e.age = 'Idade entre 14 e 100.';
    if (!Number.isFinite(h) || h < 120 || h > 230) e.height = 'Altura entre 120 e 230 cm.';
    if (!Number.isFinite(w) || w < 30 || w > 300) e.weight = 'Peso entre 30 e 300 kg.';
    setPe(e);
    if (Object.keys(e).length) return;
    s.setProfile({ name: p.name.trim(), sex: p.sex, age, height: h, weight: w, activity: ACTIVITY.find((a) => a.f === p.activityFactor)?.l ?? p.activity, activityFactor: p.activityFactor, goal: p.goal, diet: p.diet, budget: p.budget });
    toast('Perfil salvo');
  };
  const saveGoals = () => {
    const e: Record<string, string> = {};
    const lim: Record<string, [number, number]> = { kcal: [1000, 6000], p: [20, 400], c: [20, 800], f: [10, 300], fiber: [5, 100], water: [500, 8000] };
    const out: Record<string, number> = {};
    for (const k of Object.keys(lim)) {
      const n = parseNum((g as Record<string, string>)[k]);
      if (!Number.isFinite(n) || n < lim[k][0] || n > lim[k][1]) e[k] = `Entre ${fmt0(lim[k][0])} e ${fmt0(lim[k][1])}.`;
      else out[k] = n;
    }
    setGe(e);
    if (Object.keys(e).length) return;
    s.setGoals(out);
    toast('Metas salvas');
  };

  const enableNotifications = async (on: boolean) => {
    if (!on) return s.setSettings({ notificationsEnabled: false });
    if (!('Notification' in window)) return toast('Este navegador não suporta notificações. No iPhone, instale o app na Tela de Início (iOS 16.4+).', { tone: 'err' });
    const perm = await Notification.requestPermission();
    if (perm === 'granted') { s.setSettings({ notificationsEnabled: true }); toast('Notificações ativadas'); }
    else toast('Permissão de notificação negada', { tone: 'err' });
  };

  const csv = () => {
    const rows = [['data', 'refeicao', 'alimento', 'quantidade', 'unidade', 'kcal', 'proteina_g', 'carbo_g', 'gordura_g', 'fibras_g', 'origem']];
    for (const e of [...s.log].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt))
      rows.push([e.date, e.meal, e.name, String(e.qty), e.unit, e.macros.kcal.toFixed(0), e.macros.p.toFixed(1), e.macros.c.toFixed(1), e.macros.f.toFixed(1), e.macros.fiber.toFixed(1), e.origin]);
    download(`nutri-registros-${new Date().toISOString().slice(0, 10)}.csv`, rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(';')).join('\n'), 'text/csv;charset=utf-8');
  };

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-[28px] font-bold tracking-tight">Ajustes</h1>
        <p className="text-[13px] text-muted">Perfil, metas e preferências</p>
      </header>

      <SectionTitle>Perfil</SectionTitle>
      <Card className="space-y-4">
        <Field label="Como quer ser chamado (opcional)"><TextInput value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} placeholder="Seu nome" /></Field>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Sexo"><Select value={p.sex} onChange={(e) => setP({ ...p, sex: e.target.value as 'm' | 'f' })}><option value="m">Masculino</option><option value="f">Feminino</option></Select></Field>
          <Field label="Idade" error={pe.age}><TextInput inputMode="numeric" value={p.age} onChange={(e) => setP({ ...p, age: e.target.value })} invalid={!!pe.age} /></Field>
          <Field label="Altura (cm)" error={pe.height}><TextInput inputMode="numeric" value={p.height} onChange={(e) => setP({ ...p, height: e.target.value })} invalid={!!pe.height} /></Field>
          <Field label="Peso (kg)" error={pe.weight} hint="Atualiza com a última medição"><TextInput inputMode="decimal" value={p.weight} onChange={(e) => setP({ ...p, weight: e.target.value })} invalid={!!pe.weight} /></Field>
        </div>
        <Field label="Nível de atividade"><Select value={p.activityFactor} onChange={(e) => setP({ ...p, activityFactor: Number(e.target.value) })}>{ACTIVITY.map((a) => <option key={a.f} value={a.f}>{a.l} · ×{a.f}</option>)}</Select></Field>
        <Field label="Objetivo"><TextInput value={p.goal} onChange={(e) => setP({ ...p, goal: e.target.value })} /></Field>
        <Field label="Preferência alimentar"><TextInput value={p.diet} onChange={(e) => setP({ ...p, diet: e.target.value })} /></Field>
        <Field label="Orçamento"><Select value={p.budget} onChange={(e) => setP({ ...p, budget: e.target.value })}><option>Econômico</option><option>Intermediário</option><option>Flexível</option></Select></Field>
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-raised/60 p-3 text-center">
          <div><p className="text-[11.5px] text-muted">Basal (estim.)</p><p className="tnum font-semibold">{fmt0(b)} kcal</p></div>
          <div><p className="text-[11.5px] text-muted">Gasto total (estim.)</p><p className="tnum font-semibold">{fmt0(t)} kcal</p></div>
          <div><p className="text-[11.5px] text-muted">Déficit da meta</p><p className="tnum font-semibold">{fmt0(t - goalK)} kcal</p></div>
        </div>
        <p className="text-[12px] text-faint">Fórmula de Mifflin-St Jeor × fator de atividade. São estimativas populacionais — o gasto real pode variar ±10–15%. Acompanhe a média do peso por 3–4 semanas e ajuste.</p>
        <Button className="w-full" onClick={saveProfile}>Salvar perfil</Button>
      </Card>

      <SectionTitle>Metas diárias</SectionTitle>
      <Card className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Calorias (kcal)" error={ge.kcal}><TextInput inputMode="numeric" value={g.kcal} onChange={(e) => setG({ ...g, kcal: e.target.value })} invalid={!!ge.kcal} /></Field>
          <Field label="Proteínas (g)" error={ge.p}><TextInput inputMode="numeric" value={g.p} onChange={(e) => setG({ ...g, p: e.target.value })} invalid={!!ge.p} /></Field>
          <Field label="Carboidratos (g)" error={ge.c}><TextInput inputMode="numeric" value={g.c} onChange={(e) => setG({ ...g, c: e.target.value })} invalid={!!ge.c} /></Field>
          <Field label="Gorduras (g)" error={ge.f}><TextInput inputMode="numeric" value={g.f} onChange={(e) => setG({ ...g, f: e.target.value })} invalid={!!ge.f} /></Field>
          <Field label="Fibras (g)" error={ge.fiber}><TextInput inputMode="numeric" value={g.fiber} onChange={(e) => setG({ ...g, fiber: e.target.value })} invalid={!!ge.fiber} /></Field>
          <Field label="Água (ml)" error={ge.water}><TextInput inputMode="numeric" value={g.water} onChange={(e) => setG({ ...g, water: e.target.value })} invalid={!!ge.water} /></Field>
        </div>
        <p className="tnum text-[12.5px] text-muted">Pelos macros (4/4/9 kcal/g): <b className="text-ink">{fmt0(macroK)} kcal</b>{Math.abs(macroK - goalK) > 60 && <span className="text-warn"> — {fmt0(Math.abs(macroK - goalK))} kcal {macroK > goalK ? 'acima' : 'abaixo'} da meta de calorias</span>}.</p>
        <p className="rounded-2xl bg-warn/10 px-3 py-2 text-[12.5px] text-warn">Metas são estimativas iniciais, não prescrição médica. O ideal é ajustá-las com acompanhamento profissional, conforme a evolução real. Evite déficits muito grandes.</p>
        <Button className="w-full" onClick={saveGoals}>Salvar metas</Button>
      </Card>

      <SectionTitle>Alimentos</SectionTitle>
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-raised/60 px-4 py-3">
          <span><span className="block text-[14px] font-medium">Incluir frango</span><span className="block text-[12px] text-faint">Peito de frango grelhado, consumo ocasional</span></span>
          <Toggle checked={s.settings.allowChicken} onChange={(allowChicken) => s.setSettings({ allowChicken })} label="Incluir frango" />
        </div>
        <Field label="Termos excluídos" hint="Alimentos com estes termos somem da busca e não podem ser cadastrados. Carnes bovina, suína e outras carnes terrestres já são bloqueadas sempre.">
          <div className="flex gap-2">
            <TextInput value={newTerm} onChange={(e) => setNewTerm(e.target.value)} placeholder="ex.: atum, lactose" onKeyDown={(e) => { if (e.key === 'Enter' && newTerm.trim()) { s.setSettings({ excludedTerms: [...s.settings.excludedTerms, newTerm.trim()] }); setNewTerm(''); } }} />
            <Button variant="subtle" disabled={!newTerm.trim()} onClick={() => { s.setSettings({ excludedTerms: [...s.settings.excludedTerms, newTerm.trim()] }); setNewTerm(''); }}>Adicionar</Button>
          </div>
        </Field>
        {s.settings.excludedTerms.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {s.settings.excludedTerms.map((t) => (
              <button key={t} onClick={() => s.setSettings({ excludedTerms: s.settings.excludedTerms.filter((x) => x !== t) })} className="flex items-center gap-1 rounded-full bg-raised px-3 py-1.5 text-[13px]">{t} <X size={13} /></button>
            ))}
          </div>
        )}
        <Button variant="subtle" className="w-full" onClick={() => go('alimentos')}>Gerenciar base de alimentos e preferidos</Button>
      </Card>

      <SectionTitle>Cálculo de pratos com IA (opcional)</SectionTitle>
      <AiKeyCard />

      <SectionTitle>Interface</SectionTitle>
      <Card className="space-y-4">
        <div>
          <p className="mb-2 px-1 text-[13px] font-medium text-muted">Tema</p>
          <Segmented value={s.settings.theme} onChange={(theme) => s.setSettings({ theme })} options={[{ value: 'dark', label: 'Escuro' }, { value: 'light', label: 'Claro' }, { value: 'system', label: 'Sistema' }]} />
        </div>
        <Row label="Reduzir animações" icon={s.settings.theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}><Toggle checked={s.settings.reduceMotion} onChange={(reduceMotion) => s.setSettings({ reduceMotion })} label="Reduzir animações" /></Row>
        <Field label="Tamanho do copo de água (ml)">
          <Select value={s.settings.glassMl} onChange={(e) => s.setSettings({ glassMl: Number(e.target.value) })}>{[150, 200, 250, 300, 350, 500].map((x) => <option key={x} value={x}>{x} ml</option>)}</Select>
        </Field>
        <p className="px-1 text-[12px] text-faint">Unidades: sistema métrico (kg, cm, g, ml), números e datas no formato brasileiro.</p>
      </Card>

      <SectionTitle>Lembretes</SectionTitle>
      <Card className="space-y-3">
        <Row label="Notificações" icon={<Bell size={16} />}><Toggle checked={s.settings.notificationsEnabled} onChange={enableNotifications} label="Ativar notificações" /></Row>
        {s.settings.reminders.map((r) => (
          <div key={r.id} className="flex items-center gap-3">
            <span className="flex-1 text-[14px]">{r.label}</span>
            <input type="time" value={r.time} aria-label={`Horário: ${r.label}`} onChange={(e) => s.setSettings({ reminders: s.settings.reminders.map((x) => (x.id === r.id ? { ...x, time: e.target.value } : x)) })} className="h-10 rounded-xl bg-raised px-3 text-ink" />
            <Toggle checked={r.enabled} onChange={(enabled) => s.setSettings({ reminders: s.settings.reminders.map((x) => (x.id === r.id ? { ...x, enabled } : x)) })} label={`Lembrete ${r.label}`} />
          </div>
        ))}
        <p className="text-[12px] leading-relaxed text-faint">Os lembretes disparam enquanto o app está aberto ou em segundo plano recente. Notificações com o app fechado exigiriam um servidor de push (não incluído nesta versão).</p>
      </Card>

      <SectionTitle>Seus dados</SectionTitle>
      <Card className="space-y-3">
        <div className="flex items-start gap-3 text-[13px] text-muted">
          <Database size={16} className="mt-0.5 shrink-0" />
          <p>Tudo fica salvo automaticamente <b className="text-ink">neste aparelho</b> (armazenamento local do navegador, chave <code className="text-[12px]">{STORAGE_KEY}</code>). Nada é enviado para servidores. Faça backups de vez em quando.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="subtle" icon={<Download size={16} />} onClick={() => { download(`nutri-backup-${new Date().toISOString().slice(0, 10)}.json`, exportJSON(), 'application/json'); toast('Backup exportado'); }}>Backup (JSON)</Button>
          <Button variant="subtle" icon={<Download size={16} />} onClick={csv}>Registros (CSV)</Button>
          <Button variant="subtle" icon={<Upload size={16} />} onClick={() => fileRef.current?.click()}>Importar backup</Button>
          <Button variant="danger" onClick={() => ask('Apagar todos os dados?', 'Registros, medições, treinos, edições do cardápio e configurações voltam ao estado inicial. Faça um backup antes, se quiser.', () => { s.resetAll(); toast('Dados apagados'); }, 'Apagar tudo')}>Apagar tudo</Button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            const text = await f.text();
            ask('Importar backup?', 'Os dados atuais deste aparelho serão substituídos pelos do arquivo.', () => { try { s.importData(text); toast('Backup importado'); } catch (err) { toast((err as Error).message, { tone: 'err' }); } }, 'Importar');
          } finally { e.target.value = ''; }
        }} />
      </Card>

      <SectionTitle>Instalar no iPhone</SectionTitle>
      <Card className="space-y-2 text-[14px] leading-relaxed text-muted">
        <p className="flex items-center gap-2 font-semibold text-ink"><Smartphone size={16} /> Usar como app</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Abra o endereço do app no <b className="text-ink">Safari</b>.</li>
          <li>Toque em <Share size={14} className="inline -translate-y-0.5" /> <b className="text-ink">Compartilhar</b> → <b className="text-ink">Adicionar à Tela de Início</b>.</li>
          <li>Abra pelo ícone: tela cheia, funciona offline e mantém os dados.</li>
        </ol>
        <p className="text-[12px] text-faint">Os dados ficam no app instalado. Se apagar o ícone ou limpar dados do Safari, eles podem ser perdidos — use o backup.</p>
      </Card>

      <SectionTitle>Fontes e responsabilidade</SectionTitle>
      <Card className="space-y-2 text-[13px] leading-relaxed text-muted">
        {Object.entries(FOOD_SOURCES_INFO).map(([k, v]) => <p key={k} className="flex items-start gap-2"><Badge tone={k === 'TACO' ? 'accent' : k === 'USDA' || k === 'Open Food Facts' ? 'info' : k === 'Personalizado' ? 'neutral' : 'warn'}>{k}</Badge><span>{v}</span></p>)}
        <p className="pt-2">Este app é uma ferramenta de organização e acompanhamento. Não substitui nutricionista ou médico, não diagnostica e não prescreve tratamentos.</p>
      </Card>
      <div className="h-4" />
      {node}
    </div>
  );
}

function Row({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-[14px]"><span className="text-muted">{icon}</span>{label}</span>{children}</div>;
}

function AiKeyCard() {
  const toast = useToast();
  const [saved, setSaved] = useState(!!getApiKey());
  const [v, setV] = useState('');
  const [err, setErr] = useState('');
  return (
    <Card className="space-y-3">
      <div className="flex items-start gap-3 text-[13px] leading-relaxed text-muted">
        <KeyRound size={16} className="mt-0.5 shrink-0" />
        <p>A aba <b className="text-ink">Prato</b> funciona offline com a base do app. Com uma chave da API da Anthropic, ela usa o Claude para entender qualquer prato ou receita. Crie a chave em <b className="text-ink">platform.claude.com</b> (o uso da API é cobrado à parte, normalmente centavos por cálculo).</p>
      </div>
      {saved ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-raised/60 px-4 py-3">
          <span className="text-[14px]"><span className="text-accent">●</span> Chave configurada <span className="text-faint">· modelo {AI_MODEL}</span></span>
          <Button variant="danger" size="sm" onClick={() => { setApiKey(''); setSaved(false); toast('Chave removida'); }}>Remover</Button>
        </div>
      ) : (
        <Field label="Chave da API" error={err} hint="Fica salva só neste aparelho e é enviada apenas para api.anthropic.com. Não entra no backup.">
          <div className="flex gap-2">
            <TextInput type="password" autoComplete="off" value={v} onChange={(e) => setV(e.target.value)} placeholder="sk-ant-…" invalid={!!err} />
            <Button disabled={!v.trim()} onClick={() => {
              if (!/^sk-ant-/.test(v.trim())) return setErr('A chave começa com "sk-ant-".');
              setApiKey(v.trim()); setSaved(true); setV(''); setErr(''); toast('Chave salva');
            }}>Salvar</Button>
          </div>
        </Field>
      )}
    </Card>
  );
}
