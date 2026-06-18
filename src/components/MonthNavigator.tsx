"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { shiftMonthKey } from "@/lib/dates";

interface MonthNavigatorProps {
  monthKey: string;
  setMonthKey: (monthKey: string) => void;
}

export function MonthNavigator({ monthKey, setMonthKey }: MonthNavigatorProps) {
  const currentMonth = format(new Date(), "yyyy-MM");
  const nextMonthKey = shiftMonthKey(monthKey, 1);
  const isNextDisabled = nextMonthKey > currentMonth;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="ghost"
        aria-label="Navegar para o mês anterior"
        onClick={() => setMonthKey(shiftMonthKey(monthKey, -1))}
      >
        Mês anterior
      </Button>
      <Button
        variant="ghost"
        aria-label="Retornar ao mês atual"
        onClick={() => setMonthKey(currentMonth)}
      >
        Hoje
      </Button>
      <Button
        variant="ghost"
        disabled={isNextDisabled}
        aria-label={isNextDisabled ? "Próximo mês desabilitado (futuro)" : "Navegar para o próximo mês"}
        onClick={() => setMonthKey(nextMonthKey)}
      >
        Próximo mês
      </Button>
    </div>
  );
}
