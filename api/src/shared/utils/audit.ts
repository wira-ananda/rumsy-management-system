import type { Bindings } from "../env";
import type { AuthUser } from "../types/auth.type";

export async function audit(
  env: Bindings,
  user: Pick<AuthUser, "id"> | null,
  req: Request,
  action: string,
  detail = "",
) {
  try {
    await env.DB.prepare(
      "INSERT INTO server_audit(user_id,action,detail,ip) VALUES(?,?,?,?)",
    )
      .bind(
        user?.id || null,
        action,
        detail,
        req.headers.get("cf-connecting-ip") || "",
      )
      .run();
  } catch {}
}
