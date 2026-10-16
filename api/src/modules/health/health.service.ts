import type { Bindings } from "../../shared/env";
import { json } from "../../shared/utils/api-response";
const check = async (env: Bindings) => {
  try {
    const db = await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
    return json({ ok: true, db: db?.ok === 1, r2: !!env.FILES });
  } catch (error) {
    return json(
      {
        ok: false,
        error: "HEALTHCHECK_FAILED",
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
};
export const healthService = { check };
