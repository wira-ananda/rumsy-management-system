import type { Bindings } from "../env";

export function emailEsc(v: unknown) {
  return String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '\"': "&quot;",
        "'": "&#039;",
      })[c]!,
  );
}

export function emailShell(
  title: string,
  body: string,
  ctaUrl = "",
  ctaLabel = "Buka RMS",
) {
  const cta = ctaUrl
    ? `<div style="margin:24px 0"><a href="${emailEsc(ctaUrl)}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">${emailEsc(ctaLabel)}</a></div>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#18212f"><div style="max-width:640px;margin:0 auto;padding:28px 14px"><div style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden"><div style="padding:18px 24px;background:#111827;color:#fff"><div style="font-size:13px;opacity:.75">RUMSY INTERNAL MANAGEMENT SYSTEM</div><div style="font-size:22px;font-weight:800;margin-top:4px">${emailEsc(title)}</div></div><div style="padding:24px;font-size:15px;line-height:1.65">${body}${cta}<div style="margin-top:28px;padding-top:16px;border-top:1px solid #eef0f2;color:#6b7280;font-size:12px">Email otomatis dari RMS Rumsy. Jangan membalas email ini.</div></div></div></div></body></html>`;
}

export async function sendEmail(
  env: Bindings,
  to: string,
  subject: string,
  text: string,
  html = "",
) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM)
    return { sent: false, reason: "EMAIL_NOT_CONFIGURED" };
  const recipient = String(to || "").trim();
  if (!recipient || !recipient.includes("@"))
    return { sent: false, reason: "INVALID_RECIPIENT" };
  try {
    const payload: {
      from: string;
      to: string[];
      subject: string;
      text: string;
      html?: string;
    } = {
      from: env.EMAIL_FROM,
      to: [recipient],
      subject: String(subject || "RMS Rumsy"),
      text: String(text || ""),
    };
    if (html) payload.html = html;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
        "idempotency-key": crypto.randomUUID(),
      },
      body: JSON.stringify(payload),
    });
    const out: any = await r.json().catch(() => ({}));
    if (!r.ok)
      return { sent: false, reason: out?.message || `EMAIL_HTTP_${r.status}` };
    return { sent: true, id: out.id || "" };
  } catch (e) {
    return {
      sent: false,
      reason: e instanceof Error ? e.message : "EMAIL_SEND_FAILED",
    };
  }
}
