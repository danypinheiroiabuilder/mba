"use client";

import { Sun, Moon, MonitorSmartphone } from "lucide-react";

import { useThemeStore, type ThemeMode } from "@/stores/theme";

const options: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: "light", label: "Tema claro", icon: Sun },
  { mode: "dark", label: "Tema escuro", icon: Moon },
  { mode: "auto", label: "Seguir o sistema", icon: MonitorSmartphone },
];

/**
 * Alterna entre claro, escuro e automático. Em "auto" o app acompanha o
 * aparelho; nas outras opções a escolha fica salva para as próximas visitas.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const mode = useThemeStore((s) => s.mode);
  const ready = useThemeStore((s) => s.ready);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <div
      role="group"
      aria-label="Tema da interface"
      className={[
        "inline-flex items-center gap-1 rounded-2xl border border-border bg-card/50 p-1",
        className,
      ].join(" ")}
    >
      {options.map(({ mode: option, label, icon: Icon }) => {
        // Antes do store inicializar, `mode` é o padrão "auto" e ainda não
        // reflete o localStorage — não marcamos nada como selecionado para não
        // piscar a opção errada.
        const selected = ready && mode === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            aria-pressed={selected}
            aria-label={label}
            title={label}
            className={[
              "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "bg-surface text-text shadow-[0_8px_20px_-14px_var(--shadow)]"
                : "text-muted hover:text-text",
            ].join(" ")}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
