"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import {
  LayoutDashboard,
  BookOpen,
  BarChart2,
  ListPlus,
  Tag,
} from "lucide-react";

import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/Button";

function LoadingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="h-[60vh] w-full animate-pulse rounded-3xl border border-border bg-surface/55" />
    </div>
  );
}

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/extrato", label: "Extrato", icon: BookOpen },
  { href: "/resumo", label: "Resumo Anual", icon: BarChart2 },
  { href: "/transacoes", label: "Lançamentos", icon: ListPlus },
  { href: "/categorias", label: "Categorias", icon: Tag },
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
    // Mostra página de auth (login/reset)
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
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
                <div className="rounded-3xl border border-border bg-surface/70 p-4 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-muted">Fluxo</div>
                    <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_0_6px_rgba(110,123,255,0.12)]" />
                  </div>
                  <div className="mt-1 text-lg font-semibold tracking-tight text-text">
                    Caixa mensal
                  </div>
                  <div className="mt-3 text-xs text-muted">
                    {user?.email ?? "—"}
                  </div>
                </div>

                <nav aria-label="Navegação principal" className="rounded-3xl border border-border bg-surface/60 p-2 backdrop-blur">
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
                            className="absolute inset-0 rounded-2xl bg-card shadow-[0_10px_30px_-18px_rgba(0,0,0,0.65)]"
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

                <div className="rounded-3xl border border-border bg-surface/60 p-2 backdrop-blur">
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
              <header className="mb-4 flex items-center justify-between sm:hidden">
                <div className="text-base font-semibold tracking-tight text-text">
                  {nav.find((item) => isActive(pathname, item.href))?.label ?? "Fluxo de Caixa"}
                </div>
              </header>

              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="rounded-3xl border border-border bg-surface/55 p-4 backdrop-blur sm:p-6"
                >
                  <main role="main">
                    {children}
                  </main>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="fixed bottom-4 left-0 right-0 z-40 sm:hidden">
            <nav aria-label="Navegação mobile" className="mx-auto flex w-[min(100%,calc(100%-32px))] items-center justify-between gap-1 rounded-3xl border border-border bg-surface/70 p-1 backdrop-blur">
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
                      "relative flex flex-1 items-center justify-center rounded-2xl px-2 py-2 text-xs font-medium transition-colors",
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
                    <Icon className="relative h-5 w-5" />
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
    </div>
  );
}

