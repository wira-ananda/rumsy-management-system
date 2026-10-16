import { Hono } from "hono";
import type { ApiEnv } from "./shared/env";
import { json } from "./shared/utils/api-response";
import { requireAuth } from "./shared/middlewares/require-auth";
import { maintenance } from "./shared/middlewares/maintenance";
import { authRoute } from "./modules/auth/auth.route";
import { healthRoute } from "./modules/health/health.route";
import { directoryRoute } from "./modules/directory/directory.route";
import { adminUserRoute } from "./modules/user/user.admin.route";
import { stateRoute } from "./modules/state/state.route";
import { fileRoute } from "./modules/file/file.route";
import { publicClientRoute } from "./modules/client/client.public.route";
import {
  notificationRoute,
  adminEmailRoute,
} from "./modules/notification/notification.route";
export const app = new Hono<ApiEnv>().basePath("/api");
app.use("*", maintenance);
app.use("*", requireAuth);
// Hono dispatches HEAD through GET handlers; retain the legacy method contract.
app.use("*", async (c, next) => {
  if (c.req.method === "HEAD" && c.req.path !== "/api/auth/me")
    return json({ error: "NOT_FOUND" }, 404);
  await next();
});
app.route("/", healthRoute);
app.route("/auth", authRoute);
app.route("/directory", directoryRoute);
app.route("/admin/users", adminUserRoute);
app.route("/state", stateRoute);
app.route("/files", fileRoute);
app.route("/client", publicClientRoute);
app.route("/notify", notificationRoute);
app.route("/admin/email", adminEmailRoute);
app.notFound(() => json({ error: "NOT_FOUND" }, 404));
app.onError((error) => {
  console.error(error);
  return json(
    { error: "INTERNAL_ERROR", message: error.message || String(error) },
    500,
  );
});
