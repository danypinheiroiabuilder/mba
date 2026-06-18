"use client";

import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";

import { getSupabase } from "@/services/supabase/client";

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

    const supabase = getSupabase();
    if (!supabase) {
      set({ ready: true, session: null, user: null, configOk: false, error: "Supabase not configured" });
      return;
    }

    _unsubscribe?.();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session: session ?? null, user: session?.user ?? null, ready: true, error: null, configOk: true });
    });
    _unsubscribe = () => subscription.unsubscribe();
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

