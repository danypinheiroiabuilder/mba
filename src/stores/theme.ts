"use client";

import { create } from "zustand";

import {
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemeMode,
} from "@/lib/theme";

export type { ResolvedTheme, ThemeMode };

type ThemeState = {
  mode: ThemeMode;
  /** Tema efetivamente aplicado no HTML — "auto" já resolvido. */
  resolved: ResolvedTheme;
  ready: boolean;
  init: () => void;
  setMode: (mode: ThemeMode) => void;
};

function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "auto";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "auto") {
      return stored;
    }
  } catch {
    // localStorage pode estar bloqueado (modo privado, cookies restritos).
    // Nesse caso o tema simplesmente não persiste entre visitas.
  }
  return "auto";
}

function resolve(mode: ThemeMode): ResolvedTheme {
  return mode === "auto" ? systemTheme() : mode;
}

function apply(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = resolved;
}

let _unsubscribe: (() => void) | null = null;

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: "auto",
  resolved: "dark",
  ready: false,

  init: () => {
    if (get().ready) return;

    const mode = readStoredMode();
    const resolved = resolve(mode);
    apply(resolved);
    set({ mode, resolved, ready: true });

    // Em "auto", acompanha o sistema em tempo real: se a pessoa trocar o tema
    // do aparelho com o app aberto, o app troca junto.
    if (typeof window !== "undefined" && !_unsubscribe) {
      const query = window.matchMedia("(prefers-color-scheme: light)");
      const onChange = () => {
        if (get().mode !== "auto") return;
        const next = systemTheme();
        apply(next);
        set({ resolved: next });
      };
      query.addEventListener("change", onChange);
      _unsubscribe = () => query.removeEventListener("change", onChange);
    }
  },

  setMode: (mode) => {
    const resolved = resolve(mode);
    apply(resolved);
    set({ mode, resolved });

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Ver comentário em readStoredMode.
    }
  },
}));

/** Usado apenas em testes/hot reload — o listener é global e vive com a página. */
export function destroyThemeListener() {
  _unsubscribe?.();
  _unsubscribe = null;
}
