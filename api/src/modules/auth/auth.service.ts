import type { Bindings } from "../../shared/env";
import type {
  AuthUser,
  SessionUser,
  UserRow,
} from "../../shared/types/auth.type";
import { queryFirst, execute } from "../../shared/db/d1";
import { getBearerToken } from "../../shared/utils/bearer-token";
import { cookieMap } from "../../shared/utils/cookie";
import {
  sha256,
  hashPassword,
  randomToken,
  hex,
} from "../../shared/utils/crypto";
import { json } from "../../shared/utils/api-response";
import { audit } from "../../shared/utils/audit";
import type { LoginInput, ChangePasswordInput } from "./auth.schema";
const toSessionUser = (user: AuthUser): SessionUser => ({
  id: user.id,
  email: user.email,
  name: user.full_name,
  role: user.role,
  scopeName: user.scope_name || user.full_name,
  mustChangePassword: !!user.must_change_password,
});
const ACCESS_PREFIX = "access:";
const ACCESS_LIFETIME_SECONDS = 15 * 60;
const SESSION_COLUMNS = `s.id session_id,s.expires_at,u.id,u.email,u.full_name,u.role,u.scope_name,u.active,u.must_change_password`;
const findSession = async (env: Bindings, token: string) =>
  queryFirst<AuthUser>(
    env,
    `SELECT ${SESSION_COLUMNS} FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND julianday(s.expires_at)>julianday('now') AND u.active=1`,
    await sha256(token),
  );

const sessionUser = async (
  request: Request,
  env: Bindings,
): Promise<AuthUser | null> => {
  // Cookies, query parameters and refresh tokens never authorize internal data.
  const token = getBearerToken(request.headers.get("authorization"));
  if (!token) return null;
  const user = await findSession(env, token);
  if (!user?.session_id?.startsWith(ACCESS_PREFIX)) return null;
  const parentId = user.session_id.slice(
    ACCESS_PREFIX.length,
    user.session_id.lastIndexOf(":"),
  );
  const parent = await queryFirst<{ id: string }>(
    env,
    "SELECT id FROM sessions WHERE id=? AND user_id=? AND julianday(expires_at)>julianday('now')",
    parentId,
    user.id,
  );
  return parent ? { ...user, refresh_session_id: parentId } : null;
};

const issueAccessToken = async (env: Bindings, parent: AuthUser) => {
  const accessToken = randomToken();
  const expiresAt = Math.min(
    Date.now() + ACCESS_LIFETIME_SECONDS * 1000,
    Date.parse(parent.expires_at!),
  );
  // Access sessions share the existing table. Their prefix separates them from
  // refresh sessions; the parent is checked on every protected request.
  await execute(
    env,
    "DELETE FROM sessions WHERE julianday(expires_at)<=julianday('now')",
  );
  await execute(
    env,
    "INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)",
    `${ACCESS_PREFIX}${parent.session_id}:${crypto.randomUUID()}`,
    parent.id,
    await sha256(accessToken),
    new Date(expiresAt).toISOString(),
  );
  return {
    user: toSessionUser(parent),
    accessToken,
    tokenType: "Bearer",
    expiresIn: Math.max(1, Math.floor((expiresAt - Date.now()) / 1000)),
  };
};

const refresh = async (request: Request, env: Bindings) => {
  // This non-simple header also prevents cookie-only form/navigation requests.
  if (request.headers.get("x-rms-refresh") !== "1")
    return json({ error: "REFRESH_HEADER_REQUIRED" }, 403);
  const token = cookieMap(request).rms_session;
  const parent = token ? await findSession(env, token) : null;
  if (!parent?.session_id || parent.session_id.startsWith(ACCESS_PREFIX))
    return json({ error: "UNAUTHENTICATED" }, 401);
  return json(await issueAccessToken(env, parent));
};
const login = async (request: Request, env: Bindings, input: LoginInput) => {
  const user = await queryFirst<UserRow>(
    env,
    "SELECT * FROM users WHERE email=? COLLATE NOCASE AND active=1",
    input.email,
  );
  if (!user) return json({ error: "Email atau password salah." }, 401);
  const got = await hashPassword(
    input.password,
    user.password_salt,
    user.password_iterations,
  );
  if (got !== user.password_hash) {
    await audit(env, user, request, "LOGIN_FAILED");
    return json({ error: "Email atau password salah." }, 401);
  }
  const token = randomToken(),
    hash = await sha256(token),
    sessionId = crypto.randomUUID(),
    expires = new Date(Date.now() + 12 * 3600 * 1000).toISOString();
  await execute(
    env,
    "INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)",
    sessionId,
    user.id,
    hash,
    expires,
  );
  await audit(env, user, request, "LOGIN");
  return json(
    await issueAccessToken(env, {
      ...user,
      session_id: sessionId,
      expires_at: expires,
    }),
    200,
    {
      "set-cookie": `rms_session=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=43200`,
    },
  );
};
const me = (user: AuthUser | null) =>
  user
    ? json({ user: toSessionUser(user) })
    : json({ error: "UNAUTHENTICATED" }, 401);
const logout = async (request: Request, env: Bindings, user: AuthUser) => {
  const parentId = user.refresh_session_id!;
  await execute(
    env,
    "DELETE FROM sessions WHERE user_id=? AND (id=? OR substr(id,1,length(?))=?)",
    user.id,
    parentId,
    `${ACCESS_PREFIX}${parentId}:`,
    `${ACCESS_PREFIX}${parentId}:`,
  );
  await audit(env, user, request, "LOGOUT");
  return json({ ok: true }, 200, {
    "set-cookie":
      "rms_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
  });
};
const changePassword = async (
  request: Request,
  env: Bindings,
  user: AuthUser,
  input: ChangePasswordInput,
) => {
  if (input.newPassword.length < 10)
    return json({ error: "Password baru minimal 10 karakter." }, 400);
  const row = await queryFirst<UserRow>(
    env,
    "SELECT * FROM users WHERE id=?",
    user.id,
  );
  const got = await hashPassword(
    input.oldPassword,
    row!.password_salt,
    row!.password_iterations,
  );
  if (got !== row!.password_hash)
    return json({ error: "Password lama salah." }, 400);
  const salt = randomToken(18)
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 32),
    saltHex = hex(new TextEncoder().encode(salt)),
    hash = await hashPassword(input.newPassword, saltHex, 100000);
  await execute(
    env,
    "UPDATE users SET password_hash=?,password_salt=?,password_iterations=100000,must_change_password=0,updated_at=CURRENT_TIMESTAMP WHERE id=?",
    hash,
    saltHex,
    user.id,
  );
  await audit(env, user, request, "PASSWORD_CHANGED");
  return json({ ok: true });
};
export const authService = {
  sessionUser,
  login,
  refresh,
  me,
  logout,
  changePassword,
};
