// Behavior retained from RMS V14.4 FIX77. See baseline/original/app.js.
import { render } from "./app-events.js";
import { runtime } from "../stores/runtime.js";
import { clone } from "../utils/format.js";
import { authenticatedFetch } from "./auth-token.js";

export async function apiCall(path, options = {}) {
  const r = await authenticatedFetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "content-type": "application/json" }),
      ...(options.headers || {}),
    },
  });
  let b = null;
  try {
    b = await r.json();
  } catch {}
  if (!r.ok) {
    const msg =
      b?.error === "INTERNAL_ERROR" && b?.message
        ? `${b.error}: ${b.message}`
        : b?.error || `HTTP ${r.status}`;
    const e = new Error(msg);
    e.status = r.status;
    e.payload = b;
    throw e;
  }
  return b;
}

export async function fetchState() {
  const r = await apiCall("/api/state");
  runtime.data = r.data;
  runtime.stateVersion = r.version;
  return runtime.data;
}

export function save() {
  const snapshot = clone(runtime.data);
  runtime.saveChain = runtime.saveChain.then(async () => {
    try {
      const r = await apiCall("/api/state", {
        method: "PUT",
        body: JSON.stringify({ version: runtime.stateVersion, data: snapshot }),
      });
      runtime.stateVersion = r.version;
    } catch (e) {
      if (e.status === 409) {
        alert(
          "Data berubah dari perangkat lain. RMS akan memuat ulang data terbaru.",
        );
        await fetchState();
        render();
      } else {
        console.error("Gagal menyimpan RMS", e);
        alert(
          "Gagal menyimpan ke database Cloudflare. Periksa koneksi lalu coba lagi.",
        );
      }
    }
  });
  return runtime.saveChain;
}

export async function uploadFile(file, entityType, entityId) {
  if (!file) return null;
  const fd = new FormData();
  fd.append("file", file);
  fd.append("entityType", entityType);
  fd.append("entityId", entityId || "");
  return apiCall("/api/files", { method: "POST", body: fd });
}

export async function removeFile(id) {
  if (!id) return;
  return apiCall("/api/files/" + encodeURIComponent(id), { method: "DELETE" });
}

export async function sendTaskEmail(kind, t, toUserId) {
  try {
    let r = await apiCall("/api/notify/task", {
      method: "POST",
      body: JSON.stringify({
        kind,
        toUserId,
        task: {
          id: t.id,
          title: t.title,
          projectId: t.projectId || "",
          description: t.description || "",
          startDate: t.startDate || "",
          due: t.due || "",
          status: t.status || "",
          reviewNote: t.reviewNote || "",
          creator: t.creator || "",
          pic: t.pic || "",
          reviewerName: t.reviewerName || "",
        },
      }),
    });
    t.emailStatus = r.sent ? "SENT" : r.reason || "NOT_SENT";
    return r;
  } catch (e) {
    t.emailStatus = "ERROR";
    console.warn("Email task gagal", e);
    return { sent: false, reason: e.message };
  }
}
