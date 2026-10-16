import { Hono } from "hono";
import type { ApiEnv } from "../../shared/env";
import { clientService } from "./client.service";
export const publicClientRoute = new Hono<ApiEnv>()
  .get("/project", (c) =>
    clientService.project(
      c.env,
      String(new URL(c.req.url).searchParams.get("token") || ""),
    ),
  )
  .get("/file/:id{.*}", (c) =>
    clientService.file(
      c.env,
      decodeURIComponent(
        new URL(c.req.url).pathname.slice("/api/client/file/".length),
      ),
      String(new URL(c.req.url).searchParams.get("token") || ""),
    ),
  );
