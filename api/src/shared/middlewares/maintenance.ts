import { createMiddleware } from "hono/factory";
import type { ApiEnv } from "../env";
import { json } from "../utils/api-response";

// Installed before authentication so even login/refresh cannot write sessions
// while a database backup or cutover is in progress. Reads remain available.
export const maintenance = createMiddleware<ApiEnv>(async (c, next) => {
  if (
    c.env.RMS_MAINTENANCE === "1" &&
    !["GET", "HEAD", "OPTIONS"].includes(c.req.method)
  ) {
    return json(
      {
        error: "MAINTENANCE",
        message:
          "RMS sedang dalam pemeliharaan data. Penyimpanan dan login dihentikan sementara. Silakan coba lagi setelah pemeliharaan selesai.",
      },
      503,
      { "retry-after": "60" },
    );
  }
  await next();
});
