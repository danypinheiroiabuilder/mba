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
  signOut: () => Promise<void>;
};

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

    try {
      const timeoutPromise = new Promise<{ data: { session: null }; error: Error }>((resolve) =>
        setTimeout(
          () => resolve({ data: { session: null }, error: new Error("getSession timeout") }),
          8000
        )
      );
      const { data, error } = await Promise.race([supabase.auth.getSession(), timeoutPromise]);

      if (error) throw error;
      set({ session: data.session ?? null, user: data.session?.user ?? null, ready: true, error: null, configOk: true });

      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session: session ?? null, user: session?.user ?? null, ready: true });
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to initialize auth";
      console.error("[Auth] Init error:", message, e);
      set({ ready: true, error: message, configOk: false });
    }
  },

  signOut: async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ session: null, user: null, error: null });
  },
}));

