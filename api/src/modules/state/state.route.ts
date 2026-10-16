import { Hono } from "hono";
import type { ApiEnv } from "../../shared/env";
import { stateService } from "./state.service";
import { parseSaveStateInput } from "./state.schema";
export const stateRoute = new Hono<ApiEnv>()
  .get("/", (c) => stateService.read(c.env, c.get("currentUser")!))
  .put("/", async (c) =>
    stateService.save(
      c.req.raw,
      c.env,
      c.get("currentUser")!,
      parseSaveStateInput(await c.req.json().catch(() => null)),
    ),
  );
