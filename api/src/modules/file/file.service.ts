import type { Bindings } from "../../shared/env";
import type { AuthUser } from "../../shared/types/auth.type";
import type { FileRow } from "../../shared/types/state.type";
import { queryFirst, execute } from "../../shared/db/d1";
import { json } from "../../shared/utils/api-response";
import { audit } from "../../shared/utils/audit";
import { safeFileName } from "../../shared/utils/file";
import { MAX_UPLOAD_BYTES, parseFileMetadata } from "./file.schema";
const upload = async (request: Request, env: Bindings, user: AuthUser) => {
  const form = await request.formData(),
    file = form.get("file");
  if (!(file instanceof File))
    return json({ error: "File wajib diunggah." }, 400);
  if (file.size > MAX_UPLOAD_BYTES)
    return json({ error: "Ukuran file maksimum 25 MB." }, 413);
  const { entityType, entityId } = parseFileMetadata(form),
    id = crypto.randomUUID(),
    key = `${entityType}/${entityId || "general"}/${Date.now()}-${id}-${safeFileName(file.name)}`;
  await env.FILES.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
    customMetadata: { uploadedBy: String(user.id), originalName: file.name },
  });
  await execute(
    env,
    "INSERT INTO files(id,object_key,original_name,content_type,size,entity_type,entity_id,uploaded_by) VALUES(?,?,?,?,?,?,?,?)",
    id,
    key,
    file.name,
    file.type || "",
    file.size,
    entityType,
    entityId,
    user.id,
  );
  await audit(
    env,
    user,
    request,
    "FILE_UPLOAD",
    `${entityType}/${entityId} ${file.name}`,
  );
  return json({ id, name: file.name, size: file.size, type: file.type });
};
const read = async (env: Bindings, id: string, download = false) => {
  const meta = await queryFirst<FileRow>(
    env,
    "SELECT * FROM files WHERE id=?",
    id,
  );
  if (!meta) return new Response("Not found", { status: 404 });
  const object = await env.FILES.get(meta.object_key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", "private, no-store");
  headers.set(
    "content-disposition",
    `${download ? "attachment" : "inline"}; filename="${String(meta.original_name).replaceAll('"', "")}"`,
  );
  return new Response(object.body, { headers });
};
const remove = async (
  request: Request,
  env: Bindings,
  user: AuthUser,
  id: string,
) => {
  const meta = await queryFirst<FileRow>(
    env,
    "SELECT * FROM files WHERE id=?",
    id,
  );
  if (!meta) return json({ error: "FILE_NOT_FOUND" }, 404);
  await env.FILES.delete(meta.object_key);
  await execute(env, "DELETE FROM files WHERE id=?", id);
  await audit(
    env,
    user,
    request,
    "FILE_DELETE",
    `${meta.entity_type || ""}/${meta.entity_id || ""} ${meta.original_name || ""}`,
  );
  return json({ ok: true });
};
export const fileService = { upload, read, remove };
