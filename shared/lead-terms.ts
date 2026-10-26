export const LEAD_NEEDS = ["Rumah", "Bisnis", "Sekolah", "Other"] as const;
export const COLLATERALS = ["SHM", "Non-SHM"] as const;
export const LEAD_MARGIN = 8;
export const MIN_DP = 15;
export const DEFAULT_TENOR_YEARS = 3;

export function dpRupiah(rab: number, percent: number): number {
  return Math.round((rab * percent) / 100);
}
export function dpPercent(rab: number, amount: number): number {
  return rab > 0 ? (amount / rab) * 100 : 0;
}
export function leadDpAmount(lead: any): number {
  return typeof lead.dpAmount === "number" && Number.isFinite(lead.dpAmount)
    ? lead.dpAmount
    : dpRupiah(Number(lead.estRab) || 0, Number(lead.dp) || 0);
}
export function leadNeedLabel(lead: any): string {
  if (!lead.need) return "-";
  const category = leadNeedCategory(lead),
    detail = leadNeedDetail(lead);
  return category === "Other" && detail ? `Other — ${detail}` : category;
}
export function leadNeedCategory(lead: any): string {
  const value = String(lead.need || "").trim();
  return (
    LEAD_NEEDS.find((need) => need.toLowerCase() === value.toLowerCase()) ||
    (value ? "Other" : "Rumah")
  );
}
export function leadNeedDetail(lead: any): string {
  const original = String(lead.need || ""),
    detail = String(lead.needDetail || "");
  const known = LEAD_NEEDS.some(
    (need) => need.toLowerCase() === original.trim().toLowerCase(),
  );
  if (known || !original) return detail;
  return detail && detail !== original ? `${original} — ${detail}` : original;
}
export function leadTermsError(lead: any, previous?: any): string | null {
  if (
    !Number.isFinite(lead.estRab) ||
    lead.estRab < 0 ||
    lead.estRab > Number.MAX_SAFE_INTEGER
  )
    return "Estimasi RAB harus berupa nominal rupiah yang valid.";
  if (!Number.isFinite(lead.dp) || lead.dp < MIN_DP - 1e-9 || lead.dp > 100)
    return `DP minimal ${MIN_DP}% dan maksimal 100% dari Est. RAB.`;
  if (lead.margin !== LEAD_MARGIN) return "Margin harus tetap 8%.";
  if (!Number.isSafeInteger(lead.dpAmount) || lead.dpAmount < 0)
    return "Nominal DP harus berupa rupiah utuh yang valid.";
  if (lead.dpAmount !== dpRupiah(lead.estRab, lead.dp))
    return "Nominal DP dan persentase DP harus sesuai dengan Est. RAB.";
  if (
    !Number.isInteger(lead.tenorYears) ||
    lead.tenorYears < 1 ||
    lead.tenorYears > 15
  )
    return "Tenor harus berupa tahun penuh antara 1–15 tahun.";
  if (!COLLATERALS.includes(lead.collateral))
    return "Pilih jaminan SHM atau Non-SHM.";
  if (!LEAD_NEEDS.includes(lead.need) && lead.need !== previous?.need)
    return "Pilih kebutuhan Rumah, Bisnis, Sekolah, atau Other.";
  return null;
}
