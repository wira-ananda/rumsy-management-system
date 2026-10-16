import type { Bindings } from "../../shared/env";
import type { AuthUser } from "../../shared/types/auth.type";
import { queryFirst } from "../../shared/db/d1";
import { json } from "../../shared/utils/api-response";
import { audit } from "../../shared/utils/audit";
import { sendEmail, emailShell, emailEsc } from "../../shared/utils/email";
import {
  taskNotificationInput,
  TASK_NOTIFICATION_KINDS,
} from "./notification.schema";
const task = async (
  request: Request,
  env: Bindings,
  user: AuthUser,
  body: any,
) => {
  const { kind, toUserId, task: t } = taskNotificationInput(body);
  if (!TASK_NOTIFICATION_KINDS.includes(kind) || !toUserId)
    return json({ error: "NOTIFY_INVALID" }, 400);
  const to = await queryFirst<{ id: number; email: string; full_name: string }>(
    env,
    "SELECT id,email,full_name FROM users WHERE id=? AND active=1",
    toUserId,
  );
  if (!to?.email) return json({ sent: false, reason: "USER_EMAIL_NOT_FOUND" });
  const label = (
      {
        ASSIGNED: "Tugas Baru",
        SUBMITTED: "Tugas Menunggu Pemeriksaan",
        APPROVED: "Tugas Sudah Di-ACC",
        REVISION: "Tugas Perlu Dikerjakan Ulang",
      } as Record<string, string>
    )[kind],
    base = env.RMS_URL || new URL(request.url).origin;
  const text = [
    `Halo ${to.full_name},`,
    ``,
    label + ":",
    String(t.title || "-"),
    t.projectId ? `Project: ${t.projectId}` : "",
    t.description ? `Deskripsi: ${t.description}` : "",
    t.startDate ? `Mulai: ${t.startDate}` : "",
    t.due ? `Target selesai: ${t.due}` : "",
    t.reviewerName ? `Reviewer: ${t.reviewerName}` : "",
    t.reviewNote ? `Catatan reviewer: ${t.reviewNote}` : "",
    ``,
    `Buka RMS: ${base}`,
    ``,
    `Pesan otomatis dari RMS Rumsy.`,
  ]
    .filter(Boolean)
    .join("\n");
  const rows = [
    ["Tugas", t.title || "-"],
    ["Project", t.projectId || "-"],
    ["Deskripsi", t.description || "-"],
    ["Mulai", t.startDate || "-"],
    ["Target selesai", t.due || "-"],
    ["Reviewer", t.reviewerName || "-"],
    ["Catatan reviewer", t.reviewNote || "-"],
  ];
  const content = `<p>Halo <b>${emailEsc(to.full_name)}</b>,</p><p>${emailEsc(label)}.</p><div style="margin:18px 0;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">${rows.map(([a, b]) => `<div style="display:flex;border-bottom:1px solid #eef0f2;padding:10px 12px"><div style="width:145px;color:#6b7280">${emailEsc(a)}</div><div style="flex:1;font-weight:600">${emailEsc(b)}</div></div>`).join("")}</div>${kind === "REVISION" ? '<p style="color:#b91c1c;font-weight:700">Silakan perbaiki tugas sesuai catatan reviewer lalu ajukan kembali.</p>' : ""}`;
  const html = emailShell(label, content, base, "Buka RMS & Lihat Tugas");
  const result = await sendEmail(
    env,
    to.email,
    `RMS • ${label} • ${String(t.title || "Task")}`,
    text,
    html,
  );
  await audit(
    env,
    user,
    request,
    "TASK_EMAIL",
    `${kind} ${to.email} ${result.sent ? "SENT" : result.reason}`,
  );
  return json(result);
};
const status = (env: Bindings, origin: string) =>
  json({
    provider: "Resend",
    configured: !!(env.RESEND_API_KEY && env.EMAIL_FROM),
    apiKeyConfigured: !!env.RESEND_API_KEY,
    fromConfigured: !!env.EMAIL_FROM,
    from: env.EMAIL_FROM || "",
    rmsUrl: env.RMS_URL || origin,
  });
const test = async (
  request: Request,
  env: Bindings,
  user: AuthUser,
  body: any,
) => {
  const to = String(body.to || user.email || "").trim();
  if (!to) return json({ error: "EMAIL_REQUIRED" }, 400);
  const base = env.RMS_URL || new URL(request.url).origin,
    html = emailShell(
      "Tes Email RMS",
      `<p>Halo,</p><p>Email ini menandakan bahwa <b>pengiriman email RMS Rumsy sudah aktif</b>.</p><p>Notifikasi Task akan otomatis dikirim ke PIC dan reviewer sesuai workflow.</p>`,
      base,
      "Buka RMS",
    );
  const result = await sendEmail(
    env,
    to,
    "RMS Rumsy • Tes Pengiriman Email",
    "Tes pengiriman email RMS Rumsy berhasil. " + base,
    html,
  );
  await audit(
    env,
    user,
    request,
    "EMAIL_TEST",
    `${to} ${result.sent ? "SENT" : result.reason}`,
  );
  return json(result);
};
export const notificationService = { task, status, test };
