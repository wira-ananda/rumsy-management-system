import type { Bindings } from "../../shared/env";
import { queryFirst } from "../../shared/db/d1";
import { json } from "../../shared/utils/api-response";
import { publicProject } from "./client.serializer";
import { clientTokenValid } from "./client.schema";
import { fileService } from "../file/file.service";
import {
  normalized,
  normalizedPortalProject,
} from "../storage/storage.service";
const findProject = async (env: Bindings, token: string) => {
  if (normalized(env)) return normalizedPortalProject(env, token);
  const row = (await queryFirst<{ data: string }>(
    env,
    "SELECT data FROM app_state WHERE id=1",
  ))!;
  return (JSON.parse(row.data).projects || []).find(
    (p: any) => p.clientPortal?.enabled && p.clientPortal?.token === token,
  );
};
const project = async (env: Bindings, token: string) => {
  if (!clientTokenValid(token))
    return json({ error: "LINK_CLIENT_TIDAK_VALID" }, 404);
  const p = await findProject(env, token);
  if (!p) return json({ error: "LINK_CLIENT_TIDAK_AKTIF" }, 404);
  return json({ project: publicProject(p) });
};
const file = async (env: Bindings, id: string, token: string) => {
  if (!clientTokenValid(token))
    return new Response("Not found", { status: 404 });
  const p = await findProject(env, token);
  if (!p) return new Response("Not found", { status: 404 });
  const allowed = new Set(
    [
      ...(p.progressDaily || [])
        .filter((r: any) => r.published !== false)
        .flatMap((r: any) => [
          r.fileId,
          ...(r.photos || []).map((x: any) => x.id),
        ]),
      ...(p.progressWeekly || [])
        .filter((r: any) => r.published !== false)
        .flatMap((r: any) => [
          r.fileId,
          ...(r.photos || []).map((x: any) => x.id),
        ]),
    ].filter(Boolean),
  );
  if (!allowed.has(id)) return new Response("Not found", { status: 404 });
  return fileService.read(env, id);
};
export const clientService = { project, file };
