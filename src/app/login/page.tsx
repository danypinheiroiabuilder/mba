"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { getSupabase } from "@/services/supabase/client";
import { useAuthStore } from "@/stores/auth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const { ready, user, configOk, init } = useAuthStore();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user) router.replace("/");
  }, [ready, user, router]);

  function go(next: "signin" | "signup" | "forgot") {
    setMessage(null);
    setMode(next);
    setShowPassword(false);
    if (next === "forgot") setPassword("");
  }

  async function sendResetEmail() {
    setLoading(true);
    setMessage(null);
    try {
      const supabase = getSupabase();
      if (!supabase) {
        setMessage("Configure as variáveis de ambiente do Supabase para continuar.");
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        setMessage("Informe seu e-mail.");
        return;
      }

      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset`
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        redirectTo ? { redirectTo } : undefined,
      );
      if (error) throw error;

      setMessage("Enviamos um link para redefinir sua senha. Verifique seu e-mail.");
    } catch (e: unknown) {
      let errorMsg = e instanceof Error ? e.message : "Erro ao enviar e-mail de recuperação.";
      if (errorMsg.toLowerCase().includes("fetch")) {
        errorMsg = "Não foi possível conectar ao servidor. Verifique sua conexão ou tente novamente.";
      }
      setMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    setLoading(true);
    setMessage(null);
    try {
      const supabase = getSupabase();
      if (!supabase) {
        setMessage("Configure as variáveis de ambiente do Supabase para continuar.");
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || !password) {
        setMessage("Informe e-mail e senha.");
        return;
      }

      const { error } =
        mode === "signup"
          ? await supabase.auth.signUp({ email: normalizedEmail, password })
          : await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error) throw error;

      if (mode === "signup") {
        setMessage("Conta criada. Agora você já pode entrar.");
        setMode("signin");
        return;
      }

      await init();
      router.replace("/");
    } catch (e: unknown) {
      let errorMsg = e instanceof Error ? e.message : "Erro ao autenticar.";
      if (errorMsg.toLowerCase().includes("fetch")) {
        errorMsg = "Não foi possível conectar ao servidor. Verifique sua conexão ou tente novamente.";
      }
      setMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 items-center justify-center px-4 py-10 sm:px-0 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="w-full"
      >
        <Card className="p-6">
          <div>
            <div className="text-sm font-medium text-muted">Fluxo de Caixa</div>
            <div className="mt-2 text-sm text-muted">
              {mode === "forgot"
                ? "Informe seu e-mail para receber o link de redefinição."
                : "Acesse seu dashboard financeiro."}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {!configOk && (
              <div className="rounded-2xl border border-border bg-card/30 px-3 py-2 text-sm text-muted">
                Defina <span className="text-text">NEXT_PUBLIC_SUPABASE_URL</span> e{" "}
                <span className="text-text">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> no
                ambiente (local e na Vercel).
              </div>
            )}
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted">E-mail</div>
              <Input
                type="email"
                placeholder="teste@teste.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={!configOk}
              />
            </div>
            {mode !== "forgot" ? (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted">Senha</div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    disabled={!configOk}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted hover:text-text disabled:opacity-50"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={!configOk}
                    tabIndex={-1}
                  >
                    {showPassword ? "◐" : "●"}
                  </button>
                </div>
                  {mode === "signin" && (
                    <div className="flex items-center justify-between pt-1">
                      <div className="text-xs text-muted">Problemas para entrar?</div>
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:brightness-110"
                        onClick={() => go("forgot")}
                        disabled={!configOk}
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                  )}
                </div>
              ) : (
              <div className="rounded-2xl border border-border bg-card/20 px-3 py-2 text-xs text-muted">
                Você receberá um link para definir uma nova senha.
              </div>
            )}
          </div>

          {message && (
            <div className="mt-4 rounded-2xl border border-border bg-card/30 px-3 py-2 text-sm text-muted">
              {message}
            </div>
          )}

          <div className="mt-6">
            {mode === "forgot" ? (
              <div className="space-y-3">
                <Button
                  variant="primary"
                  className="w-full"
                  disabled={loading || !configOk}
                  onClick={() => void sendResetEmail()}
                >
                  {loading ? "Enviando..." : "Enviar link de recuperação"}
                </Button>
                <button
                  type="button"
                  className="w-full text-center text-sm font-medium text-muted hover:text-text"
                  onClick={() => go("signin")}
                >
                  Voltar para entrar
                </button>
              </div>
            ) : (
              <Button
                variant="primary"
                className="w-full"
                disabled={loading || !configOk}
                onClick={() => void submit()}
              >
                {loading ? "Aguarde..." : mode === "signup" ? "Criar conta" : "Entrar"}
              </Button>
            )}
          </div>

          {mode === "signin" && (
            <div className="mt-4 text-center text-sm text-muted">
              Não tem conta?{" "}
              <button
                type="button"
                className="font-medium text-primary hover:brightness-110"
                onClick={() => go("signup")}
              >
                Criar conta
              </button>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}

