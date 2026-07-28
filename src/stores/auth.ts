"use client";

import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";

import { getSupabase } from "@/services/supabase/client";
import { useDataStore } from "@/stores/data";

type AuthState = {
  ready: boolean;
  session: Session | null;
  user: User | null;
  configOk: boolean;
  error: string | null;
  init: () => Promise<void>;
  destroy: () => void;
  signOut: () => Promise<void>;
};

let _unsubscribe: (() => void) | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  ready: false,
  session: null,
  user: null,
  configOk: true,
  error: null,

  init: async () => {
    if (get().ready) return;

    try {
      const supabase = getSupabase();
      if (!supabase) {
        set({ ready: true, session: null, user: null, configOk: false, error: "Supabase not configured" });
        return;
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      set({ session: session ?? null, user: session?.user ?? null, ready: true, error: null, configOk: true });

      _unsubscribe?.();
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
        const previousUserId = get().user?.id ?? null;
        const nextUserId = newSession?.user?.id ?? null;
        if (previousUserId !== nextUserId) {
          useDataStore.getState().resetData();
        }
        set({ session: newSession ?? null, user: newSession?.user ?? null, error: null, configOk: true });
      });
      _unsubscribe = () => subscription.unsubscribe();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to initialize authentication";
      console.error("Auth init failed:", errorMsg);
      set({ ready: true, session: null, user: null, configOk: false, error: errorMsg });
    }
  },

  destroy: () => {
    _unsubscribe?.();
    _unsubscribe = null;
  },

  signOut: async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ session: null, user: null, error: null });
  },
}));

