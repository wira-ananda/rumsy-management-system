import { Hono } from "hono";
import type { ApiEnv } from "../../shared/env";
import { json } from "../../shared/utils/api-response";
import { directoryService } from "./directory.service";
export const directoryRoute = new Hono<ApiEnv>()
  .get("/sales", async (c) =>
    json({ sales: await directoryService.sales(c.env) }),
  )
  .get("/users", async (c) =>
    json({ users: await directoryService.users(c.env) }),
  );
