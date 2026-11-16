import type { StateStorage } from 'zustand/middleware';

/**
 * Camada de persistência. Hoje: localStorage do navegador.
 * Para migrar a um backend (Supabase, Firebase, API própria), basta implementar
 * esta mesma interface (getItem/setItem/removeItem) chamando o servidor.
 */
const memory = new Map<string, string>();

export const localAdapter: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return memory.get(name) ?? null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      memory.set(name, value);
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      memory.delete(name);
    }
  },
};

export const STORAGE_KEY = 'nutri-pessoal:v1';
