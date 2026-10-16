import { createMiddleware } from "hono/factory";
import type { ApiEnv } from "../env";
import { authService } from "../../modules/auth/auth.service";
import { json } from "../utils/api-response";
// Only these method/path combinations bypass Bearer. Refresh has its own cookie,
// explicit-header and origin checks; portal routes validate their project token.
const isPublic = (method: string, path: string) =>
  (method === "GET" &&
    (path === "/api/health" ||
      path === "/api/client/project" ||
      path.startsWith("/api/client/file/"))) ||
  (method === "POST" &&
    ["/api/auth/login", "/api/auth/refresh"].includes(path));
export const requireAuth = createMiddleware<ApiEnv>(async (c, next) => {
  if (isPublic(c.req.method, c.req.path)) {
    await next();
    return;
  }
  const user = await authService.sessionUser(c.req.raw, c.env);
  c.set("currentUser", user);
  if (!user && c.req.path !== "/api/auth/me")
    return json({ error: "UNAUTHENTICATED" }, 401);
  await next();
});
export const requireRole = (roles: ReadonlySet<string>) =>
  createMiddleware<ApiEnv>(async (c, next) => {
    const user = c.get("currentUser");
    if (!user || !roles.has(user.role))
      return json({ error: "FORBIDDEN" }, 403);
    await next();
  });
