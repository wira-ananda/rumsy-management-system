import { Hono } from "hono";
import type { ApiEnv } from "../../shared/env";
import { healthService } from "./health.service";
export const healthRoute = new Hono<ApiEnv>().get("/health", (c) =>
  healthService.check(c.env),
);
