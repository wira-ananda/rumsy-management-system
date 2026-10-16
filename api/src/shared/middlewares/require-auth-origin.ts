import { createMiddleware } from "hono/factory";
import type { ApiEnv } from "../env";
import { json } from "../utils/api-response";

// A browser must not log in or exchange its HttpOnly cookie from another site.
// Requests from API tools without browser Origin/Fetch Metadata remain usable.
export const requireAuthOrigin = createMiddleware<ApiEnv>(async (c, next) => {
  const origin = c.req.header("origin");
  const site = c.req.header("sec-fetch-site");
  if (
    (origin && origin !== new URL(c.req.url).origin) ||
    (site && !["same-origin", "none"].includes(site))
  )
    return json({ error: "FORBIDDEN_ORIGIN" }, 403);
  await next();
});
