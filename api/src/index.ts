import { app } from "./app";
import type { Bindings } from "./shared/env";
import { json } from "./shared/utils/api-response";
// One Pages deployment continues to serve both the API and built Svelte assets.
export default {
  async fetch(
    request: Request,
    env: Bindings,
    context?: ExecutionContext,
  ): Promise<Response> {
    try {
      if (new URL(request.url).pathname.startsWith("/api/"))
        return await app.fetch(request, env, context);
      return await env.ASSETS.fetch(request);
    } catch (error) {
      console.error(error);
      return json(
        {
          error: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  },
};
