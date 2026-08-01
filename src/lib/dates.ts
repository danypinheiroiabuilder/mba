import { addMonths, format, parseISO, startOfMonth } from "date-fns";
import { pt } from "date-fns/locale";

export function monthLabelFromKey(key: string) {
  // key: YYYY-MM
  const iso = `${key}-01`;
  return format(parseISO(iso), "MMMM yyyy", { locale: pt });
}

export function formatDateBR(isoDate: string) {
  // isoDate: YYYY-MM-DD -> DD/MM/AAAA
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  return format(parseISO(isoDate), "dd/MM/yyyy");
}

export function clampMonthKey(key: string) {
  return /^\d{4}-\d{2}$/.test(key) ? key : format(new Date(), "yyyy-MM");
}

export function shiftMonthKey(key: string, deltaMonths: number) {
  const iso = `${clampMonthKey(key)}-01`;
  return format(addMonths(startOfMonth(parseISO(iso)), deltaMonths), "yyyy-MM");
}

