import { leadTermsError } from "../../../../shared/lead-terms";

// Historical records can still receive chat/milestone updates without changing
// their original commercial values or requiring missing qualification fields.
const terms = [
  "estRab",
  "dp",
  "dpAmount",
  "margin",
  "tenorYears",
  "collateral",
  "need",
  "needDetail",
];
export function validateLeadChanges(previous: any, next: any): string | null {
  const old = new Map(
    (previous.leads || []).map((lead: any) => [lead.id, lead]),
  );
  for (const lead of next.leads || []) {
    const before: any = old.get(lead.id);
    if (
      before &&
      terms.every(
        (key) => JSON.stringify(before[key]) === JSON.stringify(lead[key]),
      )
    )
      continue;
    const error = leadTermsError(lead, before);
    if (error) return `${lead.client || "Lead"}: ${error}`;
  }
  return null;
}
