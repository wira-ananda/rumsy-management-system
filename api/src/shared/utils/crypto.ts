const enc = new TextEncoder();
export function hex(buf: ArrayBuffer | Uint8Array) {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function fromHex(s: string) {
  const a = new Uint8Array(s.length / 2);
  for (let i = 0; i < a.length; i++)
    a[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return a;
}

export async function sha256(s: string) {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
}

export async function hashPassword(
  password: string,
  saltHex: string,
  iterations: number,
) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: fromHex(saltHex), iterations },
    key,
    256,
  );
  return hex(bits);
}

export function randomToken(bytes = 32) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
