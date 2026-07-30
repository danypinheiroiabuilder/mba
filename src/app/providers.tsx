"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";

import { useAuthStore } from "@/stores/auth";
import { useThemeStore } from "@/stores/theme";

export function Providers({ children }: { children: React.ReactNode }) {
  const resolvedTheme = useThemeStore((s) => s.resolved);

  useEffect(() => {
    // O tema já foi aplicado no <head> pelo themeInitScript; aqui o store
    // apenas assume o controle e passa a ouvir mudanças do sistema.
    useThemeStore.getState().init();

    // inicializa Auth (Supabase) uma vez no client
    void useAuthStore.getState().init();
  }, []);

  return (
    <>
      {children}
      <Toaster
        theme={resolvedTheme}
        position="bottom-right"
        expand
        richColors
        closeButton
      />
    </>
  );
}

