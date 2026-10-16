// Access tokens live only in this tab's memory, never in URLs or browser storage.
let accessToken = null;
let expiresAt = 0;
let refreshPending = null;
let epoch = 0;

export function clearAccessToken() {
  accessToken = null;
  expiresAt = 0;
  epoch += 1;
}

export function acceptAuthentication(body) {
  if (
    body?.tokenType !== "Bearer" ||
    !body.accessToken ||
    !(body.expiresIn > 0)
  ) {
    throw new Error(
      "Backend belum mendukung Bearer token. Jalankan backend terbaru atau deploy paket terbaru terlebih dahulu.",
    );
  }
  accessToken = body.accessToken;
  expiresAt = Date.now() + body.expiresIn * 1000;
}

async function refreshAccessToken(force = false) {
  if (!force && accessToken && Date.now() < expiresAt - 30000)
    return accessToken;
  if (refreshPending) return refreshPending;
  const startedAt = epoch;
  const pending = (async () => {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json", "x-rms-refresh": "1" },
      body: "{}",
    });
    const body = await response.json().catch(() => ({}));
    if (startedAt !== epoch)
      throw new Error("Sesi berubah. Silakan masuk kembali.");
    if (!response.ok) {
      clearAccessToken();
      const error = new Error(body.error || `HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    acceptAuthentication(body);
    return accessToken;
  })();
  refreshPending = pending;
  try {
    return await pending;
  } finally {
    if (refreshPending === pending) refreshPending = null;
  }
}

export async function authenticatedFetch(path, options = {}) {
  if (!path.startsWith("/api/"))
    throw new Error("API URL harus berada di origin RMS.");
  const pathname = path.split("?")[0];
  if (pathname === "/api/auth/login")
    return fetch(path, { ...options, credentials: "same-origin" });
  const token = await refreshAccessToken();
  const send = (value) => {
    const headers = new Headers(options.headers);
    headers.set("authorization", `Bearer ${value}`);
    return fetch(path, { ...options, credentials: "same-origin", headers });
  };
  let response = await send(token);
  if (response.status === 401) {
    const refreshed =
      accessToken && accessToken !== token
        ? accessToken
        : await refreshAccessToken(true);
    response = await send(refreshed);
    if (response.status === 401 && accessToken === refreshed)
      clearAccessToken();
  }
  return response;
}
