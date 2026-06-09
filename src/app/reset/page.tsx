"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { getSupabase } from "@/services/supabase/client";
import { useAuthStore } from "@/stores/auth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ResetPage() {
  const router = useRouter();
  const { ready, user, configOk } = useAuthStore();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const valid = useMemo(() => {
    if (!password || password.length < 6) return false;
    if (password !== confirm) return false;
    return true;
  }, [password, confirm]);

  useEffect(() => {
    // se o usuário abrir /reset sem o link de recuperação,
    // ele não terá sessão e vai ver instruções na UI.
    if (!ready) return;
  }, [ready]);

  async function updatePassword() {
    setLoading(true);
    setMessage(null);
    try {
      const supabase = getSupabase();
      if (!supabase) {
        setMessage("Configure as variáveis do Supabase para continuar.");
        return;
      }

      if (!valid) {
        setMessage("A senha deve ter 6+ caracteres e as duas senhas devem ser iguais.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setMessage("Senha atualizada com sucesso. Redirecionando…");
      setTimeout(() => router.replace("/"), 700);
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Erro ao atualizar senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 items-center justify-center py-12">
      <motion.div
        initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="w-full"
      >
        <Card className="p-6">
          <div>
            <div className="text-sm font-medium text-muted">Conta</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-text">
              Redefinir senha
            </div>
            <div className="mt-2 text-sm text-muted">
              Abra esta página a partir do link enviado por e-mail.
            </div>
          </div>

          {!configOk && (
            <div className="mt-4 rounded-2xl border border-border bg-card/30 px-3 py-2 text-sm text-muted">
              Defina <span className="text-text">NEXT_PUBLIC_SUPABASE_URL</span> e{" "}
              <span className="text-text">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>.
            </div>
          )}

          {ready && !user && (
            <div className="mt-4 rounded-2xl border border-border bg-card/30 px-3 py-2 text-sm text-muted">
              Nenhuma sessão de recuperação encontrada. Volte para{" "}
              <span className="text-text">/login</span> e solicite um novo link.
            </div>
          )}

          <div className="mt-6 space-y-3">
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted">Nova senha</div>
              <Input
                type="password"
                placeholder="mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!configOk}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted">Confirmar senha</div>
              <Input
                type="password"
                placeholder="repita a senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={!configOk}
              />
            </div>
          </div>

          {message && (
            <div className="mt-4 rounded-2xl border border-border bg-card/30 px-3 py-2 text-sm text-muted">
              {message}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => router.replace("/login")}
              disabled={loading}
            >
              Voltar
            </Button>
            <Button
              variant="primary"
              disabled={loading || !configOk || !user || !valid}
              onClick={() => void updatePassword()}
            >
              {loading ? "Aguarde..." : "Atualizar senha"}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

