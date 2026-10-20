import { useSyncExternalStore } from 'react';
import { it } from './it';
import { en } from './en';

// Italian by default, English on request. A module-level store (no provider):
// any component calls useT() and re-renders when the language changes.
export type Lang = 'it' | 'en';
export type Dict = typeof it;

const STORAGE_KEY = 'ps-lang';
const dictionaries: Record<Lang, Dict> = { it, en };

const readStored = (): Lang => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'it';
  } catch {
    return 'it';
  }
};

let current: Lang = typeof window === 'undefined' ? 'it' : readStored();
const listeners = new Set<() => void>();

export const getLang = () => current;

export const setLang = (lang: Lang) => {
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch { /* storage blocked: the choice lasts this visit */ }
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useLang = () => useSyncExternalStore(subscribe, getLang, getLang);

export const useT = (): Dict => dictionaries[useLang()];

// For code outside components (toasts fired from callbacks, services)
export const t = (): Dict => dictionaries[current];

// Prices: "€ 34,99" in Italian, "€34.99" in English
export const formatPrice = (value: number, lang: Lang = current) =>
  new Intl.NumberFormat(lang === 'it' ? 'it-IT' : 'en-IE', { style: 'currency', currency: 'EUR' }).format(value);
