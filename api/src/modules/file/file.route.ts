import { Hono } from "hono";
import type { ApiEnv } from "../../shared/env";
import { FILE_DELETE } from "../../shared/constants/roles";
import { requireRole } from "../../shared/middlewares/require-auth";
import { fileService } from "./file.service";
const fileId = (url: string) =>
  decodeURIComponent(new URL(url).pathname.slice("/api/files/".length));
export const fileRoute = new Hono<ApiEnv>()
  .post("/", (c) => fileService.upload(c.req.raw, c.env, c.get("currentUser")!))
  .get("/:id{.*}", (c) =>
    fileService.read(
      c.env,
      fileId(c.req.url),
      new URL(c.req.url).searchParams.get("download") === "1",
    ),
  )
  .delete("/:id{.*}", requireRole(FILE_DELETE), (c) =>
    fileService.remove(
      c.req.raw,
      c.env,
      c.get("currentUser")!,
      fileId(c.req.url),
    ),
  );
