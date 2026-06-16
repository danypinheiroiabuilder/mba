"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";

import { useAuthStore } from "@/stores/auth";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.theme = "dark";

    // inicializa Auth (Supabase) uma vez no client
    void useAuthStore.getState().init();
  }, []);

  return (
    <>
      {children}
      <Toaster
        theme="dark"
        position="bottom-right"
        expand
        richColors
        closeButton
      />
    </>
  );
}

