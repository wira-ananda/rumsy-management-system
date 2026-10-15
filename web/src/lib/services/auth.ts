import { apiCall, fetchState } from "./api.js";
import { runtime } from "../stores/runtime.js";
import type { Session } from "../types/rms";

type BackendUser = Omit<Session, "scopeName"> & { scopeName?: string };
function setSession(user: BackendUser): Session {
  runtime.session = { ...user, scopeName: user.scopeName || user.name };
  return runtime.session;
}
async function loadDirectories() {
  try {
    runtime.salesDirectory =
      (await apiCall("/api/directory/sales")).sales || [];
  } catch {
    runtime.salesDirectory = [];
  }
  try {
    runtime.userDirectory = (await apiCall("/api/directory/users")).users || [];
  } catch {
    runtime.userDirectory = [];
  }
}
export async function restoreSession(): Promise<Session | null> {
  try {
    const me = await apiCall("/api/auth/me");
    if (!me?.user) throw new Error("Session user tidak ditemukan");
    setSession(me.user);
    await loadDirectories();
    await fetchState();
    return runtime.session;
  } catch {
    runtime.session = null;
    runtime.data = null;
    runtime.salesDirectory = [];
    runtime.userDirectory = [];
    return null;
  }
}
export async function authenticate(
  email: string,
  password: string,
): Promise<Session> {
  const response = await apiCall("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: email.trim(), password }),
  });
  setSession(response.user);
  await loadDirectories();
  await fetchState();
  return runtime.session!;
}
export async function logout(): Promise<void> {
  try {
    await apiCall("/api/auth/logout", { method: "POST", body: "{}" });
  } catch {}
  runtime.session = null;
  runtime.data = null;
}
