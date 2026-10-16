import { Hono } from "hono";
import type { ApiEnv } from "../../shared/env";
import { requireRole } from "../../shared/middlewares/require-auth";
import { userService } from "./user.service";
const adminOnly = requireRole(new Set(["SUPER_ADMIN"]));
export const adminUserRoute = new Hono<ApiEnv>()
  .get("/", adminOnly, (c) => userService.list(c.env))
  .post("/", adminOnly, async (c) =>
    userService.create(
      c.req.raw,
      c.env,
      c.get("currentUser")!,
      await c.req.json().catch(() => ({})),
    ),
  )
  .patch("/:id{.*}", adminOnly, async (c) =>
    userService.update(
      c.req.raw,
      c.env,
      c.get("currentUser")!,
      decodeURIComponent(
        new URL(c.req.url).pathname.slice("/api/admin/users/".length),
      ),
      await c.req.json().catch(() => ({})),
    ),
  );
