import { Hono } from "hono";
import type { ApiEnv } from "../../shared/env";
import { authService } from "./auth.service";
import { parseLoginInput, parseChangePasswordInput } from "./auth.schema";
import { requireAuthOrigin } from "../../shared/middlewares/require-auth-origin";
export const authRoute = new Hono<ApiEnv>()
  .post("/login", requireAuthOrigin, async (c) =>
    authService.login(
      c.req.raw,
      c.env,
      parseLoginInput(await c.req.json().catch(() => ({}))),
    ),
  )
  .post("/refresh", requireAuthOrigin, (c) =>
    authService.refresh(c.req.raw, c.env),
  )
  .all("/me", (c) => authService.me(c.get("currentUser")))
  .post("/logout", (c) =>
    authService.logout(c.req.raw, c.env, c.get("currentUser")!),
  )
  .post("/change-password", async (c) =>
    authService.changePassword(
      c.req.raw,
      c.env,
      c.get("currentUser")!,
      parseChangePasswordInput(await c.req.json().catch(() => ({}))),
    ),
  );
