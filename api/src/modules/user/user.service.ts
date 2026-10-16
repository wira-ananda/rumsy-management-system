import type { Bindings } from "../../shared/env";
import type { AuthUser } from "../../shared/types/auth.type";
import { queryAll, execute } from "../../shared/db/d1";
import { hex, hashPassword } from "../../shared/utils/crypto";
import { json } from "../../shared/utils/api-response";
import { audit } from "../../shared/utils/audit";
import { userSchema } from "./user.schema";
const list = async (env: Bindings) =>
  json({
    users: await queryAll(
      env,
      "SELECT id,email,full_name,role,scope_name,active,must_change_password,created_at FROM users ORDER BY full_name",
    ),
  });
const create = async (
  request: Request,
  env: Bindings,
  user: AuthUser,
  body: any,
) => {
  const input = userSchema.create(body);
  if (!input.valid)
    return json(
      { error: "Data user tidak valid. Password minimal 10 karakter." },
      400,
    );
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const saltHex = hex(saltBytes),
    hash = await hashPassword(input.password, saltHex, 100000);
  try {
    await execute(
      env,
      "INSERT INTO users(email,full_name,role,scope_name,password_hash,password_salt,password_iterations,active,must_change_password) VALUES(?,?,?,?,?,?,100000,1,1)",
      input.email,
      input.name,
      input.role,
      input.scope,
      hash,
      saltHex,
    );
  } catch {
    return json(
      { error: "Email sudah digunakan atau data gagal disimpan." },
      400,
    );
  }
  await audit(
    env,
    user,
    request,
    "USER_CREATED",
    `${input.email} ${input.role}`,
  );
  return json({ ok: true });
};
const update = async (
  request: Request,
  env: Bindings,
  user: AuthUser,
  id: string,
  body: any,
) => {
  const input = userSchema.update(body);
  if (!input.valid) return json({ error: "Data user tidak valid." }, 400);
  const result = await execute(
    env,
    "UPDATE users SET full_name=?,role=?,scope_name=?,active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
    input.name,
    input.role,
    input.scope,
    input.active,
    id,
  );
  if (!result.meta?.changes)
    return json({ error: "User tidak ditemukan." }, 404);
  await audit(
    env,
    user,
    request,
    "USER_UPDATED",
    `${id} ${input.role} ${input.scope}`,
  );
  return json({ ok: true });
};
export const userService = { list, create, update };
