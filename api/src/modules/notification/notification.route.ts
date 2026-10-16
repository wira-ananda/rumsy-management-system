import { Hono } from "hono";
import type { ApiEnv } from "../../shared/env";
import { SETTINGS_EDIT } from "../../shared/constants/roles";
import { requireRole } from "../../shared/middlewares/require-auth";
import { notificationService } from "./notification.service";
export const notificationRoute = new Hono<ApiEnv>().post("/task", async (c) =>
  notificationService.task(
    c.req.raw,
    c.env,
    c.get("currentUser")!,
    await c.req.json().catch(() => ({})),
  ),
);
export const adminEmailRoute = new Hono<ApiEnv>()
  .get("/status", requireRole(SETTINGS_EDIT), (c) =>
    notificationService.status(c.env, new URL(c.req.url).origin),
  )
  .post("/test", requireRole(SETTINGS_EDIT), async (c) =>
    notificationService.test(
      c.req.raw,
      c.env,
      c.get("currentUser")!,
      await c.req.json().catch(() => ({})),
    ),
  );
