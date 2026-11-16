import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { logTotals } from './nutrition';
import { todayKey } from './dates';

export function useDayLog(date: string) {
  const log = useStore((s) => s.log);
  return useMemo(() => {
    const entries = log.filter((e) => e.date === date).sort((a, b) => a.createdAt - b.createdAt);
    return { entries, totals: logTotals(entries) };
  }, [log, date]);
}

/** Data de hoje que se atualiza à meia-noite (app aberto o dia todo no iPhone) */
export function useToday() {
  const [k, setK] = useState(todayKey());
  useEffect(() => {
    const id = setInterval(() => setK(todayKey()), 60_000);
    const vis = () => setK(todayKey());
    document.addEventListener('visibilitychange', vis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', vis);
    };
  }, []);
  return k;
}
