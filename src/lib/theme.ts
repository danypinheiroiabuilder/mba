/**
 * Constantes de tema compartilhadas entre server e client.
 *
 * Mora aqui, e não em `src/stores/theme.ts`, porque aquele módulo é
 * `"use client"`: importar dele no `layout.tsx` (server) devolveria uma
 * referência de cliente em vez do valor, e a chave entraria no script de
 * pré-pintura como texto inválido.
 */

/** Chave do localStorage onde a preferência de tema é salva. */
export const THEME_STORAGE_KEY = "fluxo-theme";

/** "auto" segue o sistema; "light"/"dark" são escolha explícita da pessoa. */
export type ThemeMode = "auto" | "light" | "dark";

export type ResolvedTheme = "light" | "dark";
