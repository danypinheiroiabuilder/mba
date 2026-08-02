"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import {
  LayoutDashboard,
  BarChart2,
  ListPlus,
  Tag,
} from "lucide-react";

import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ThemeToggle";

function LoadingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="h-[60vh] w-full animate-pulse rounded-3xl border border-border bg-panel" />
    </div>
  );
}

// `label` é o nome completo (sidebar desktop e cabeçalho mobile).
// `short` é o que cabe na barra inferior do celular, onde cada aba tem ~1/4 da
// largura da tela: "Fluxo de Caixa" não cabe, "Fluxo" cabe.
const nav = [
  { href: "/", label: "Início", short: "Início", icon: LayoutDashboard },
  { href: "/resumo", label: "Fluxo de Caixa", short: "Fluxo", icon: BarChart2 },
  { href: "/transacoes", label: "Lançamentos", short: "Lançamentos", icon: ListPlus },
  { href: "/categorias", label: "Categorias", short: "Categorias", icon: Tag },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, user, signOut, configOk } = useAuthStore();

  const isAuthPage = pathname === "/login" || pathname === "/reset";
  const isLogin = pathname === "/login";

  useEffect(() => {
    if (!ready) return;
    if (!configOk && !isAuthPage) router.replace("/login");
    if (!user && !isAuthPage) router.replace("/login");
    if (user && isLogin) router.replace("/");
  }, [ready, user, configOk, isAuthPage, isLogin, router]);

  // Páginas de autenticação podem ser renderizadas antes de `ready` ser true
  if (isAuthPage) {
    if (!ready) return <LoadingSkeleton />;
    // Se usuário logado tenta acessar login, redireciona
    if (user && isLogin) return <LoadingSkeleton />;
    // Mostra página de auth (login/reset). O seletor de tema fica disponível
    // aqui também, senão só daria para trocar depois de entrar.
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex justify-end">
          <ThemeToggle />
        </div>
        {children}
      </div>
    );
  }

  // Páginas protegidas precisam aguardar `ready` e autenticação
  if (!ready) return <LoadingSkeleton />;
  if (!user) return <LoadingSkeleton />;

  // Aqui só chegam páginas protegidas com usuário logado
  return (
    <div className="min-h-dvh w-full">
      <>
        <div className="mx-auto flex w-full max-w-6xl gap-4 px-4 pt-6 pb-24 sm:px-6 sm:py-6">
            <aside className="hidden w-64 shrink-0 sm:block">
              <div className="sticky top-6 space-y-4">
                <div className="rounded-3xl border border-border bg-panel-raised p-4 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-muted">Fluxo</div>
                    <div
                      className="h-2 w-2 rounded-full bg-primary shadow-[0_0_0_6px_var(--ring)]"
                      role="status"
                      aria-label="Sessão conectada"
                      title="Sessão conectada"
                    />
                  </div>
                  <div className="mt-1 text-lg font-semibold tracking-tight text-text">
                    Caixa mensal
                  </div>
                  <div className="mt-3 text-xs text-muted">
                    {user?.email ?? "—"}
                  </div>
                </div>

                <nav aria-label="Navegação principal" className="rounded-3xl border border-border bg-panel-quiet p-2 backdrop-blur">
                  {nav.map((item) => {
                    const active = isActive(pathname, item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={[
                          "relative flex items-center gap-2 rounded-2xl px-3 py-2 text-sm transition-colors",
                          active ? "text-text" : "text-muted hover:text-text",
                        ].join(" ")}
                      >
                        {active && (
                          <motion.div
                            layoutId="nav-pill"
                            className="absolute inset-0 rounded-2xl bg-card shadow-[0_10px_30px_-18px_var(--shadow)]"
                            transition={{
                              type: "spring",
                              stiffness: 420,
                              damping: 40,
                            }}
                          />
                        )}
                        <Icon className="relative h-4 w-4 shrink-0" />
                        <span className="relative">{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>

                <div className="space-y-2 rounded-3xl border border-border bg-panel-quiet p-2 backdrop-blur">
                  <div className="flex items-center justify-between gap-2 px-1">
                    <span className="text-xs text-muted">Tema</span>
                    <ThemeToggle />
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full justify-center"
                    onClick={() => void signOut().then(() => router.replace("/login"))}
                  >
                    Sair
                  </Button>
                </div>
              </div>
            </aside>

            <div className="min-w-0 flex-1">
              <header className="mb-4 flex items-center justify-between gap-2 sm:hidden">
                <div className="min-w-0 truncate text-base font-semibold tracking-tight text-text">
                  {nav.find((item) => isActive(pathname, item.href))?.label ?? "Fluxo de Caixa"}
                </div>
                <ThemeToggle className="shrink-0" />
              </header>

              {/* "popLayout" no lugar de "wait": a página nova entra junto com
                  a saída da antiga (que sai do fluxo, sem empurrar o layout),
                  em vez de esperar a saída terminar. E sem animar `filter:
                  blur`, que força repintura da tela inteira e pesa no celular. */}
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="rounded-3xl border border-border bg-panel p-4 backdrop-blur sm:p-6"
                >
                  <main role="main">
                    {children}
                  </main>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="fixed bottom-4 left-0 right-0 z-40 sm:hidden">
            <nav aria-label="Navegação mobile" className="mx-auto flex w-[min(100%,calc(100%-32px))] items-center justify-between gap-1 rounded-3xl border border-border bg-panel-raised p-1 backdrop-blur">
              {nav.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    aria-label={item.label}
                    className={[
                      // min-h-[44px]: alvo de toque confortável (o conteúdo
                      // empilhado mede menos que isso e encostaria no mínimo).
                      "relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 font-medium transition-colors",
                      active ? "text-text" : "text-muted hover:text-text",
                    ].join(" ")}
                    title={item.label}
                  >
                    {active && (
                      <motion.div
                        layoutId="nav-pill-mobile"
                        className="absolute inset-0 rounded-2xl bg-card"
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 40,
                        }}
                      />
                    )}
                    <Icon className="relative h-5 w-5" aria-hidden="true" />
                    {/* 11px + truncate: "Lançamentos" é o rótulo mais largo e
                        passa raspando em telas de 320px. */}
                    <span className="relative max-w-full truncate text-[11px] leading-tight">
                      {item.short}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
    </div>
  );
}

