const months = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const short = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
export function calendarDate(year: number, month: number, day: number): Date {
  const date = new Date(2000, 0, 1, 12);
  date.setFullYear(year, month, day);
  return date;
}
export function isoDay(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function dayLabel(value: string, compact = false): string {
  return `${Number(value.slice(8))} ${(compact ? short : months)[Number(value.slice(5, 7)) - 1]} ${value.slice(0, 4)}`;
}
export function calendarDays(year: number, month: number) {
  const first = calendarDate(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => {
    const date = calendarDate(year, month, index - offset + 1);
    return {
      value: isoDay(date),
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
    };
  });
}
export function matchesDate(
  value: unknown,
  month: string,
  day: string,
): boolean {
  const date = String(value || "").slice(0, 10);
  return (!month || date.startsWith(month + "-")) && (!day || date === day);
}
