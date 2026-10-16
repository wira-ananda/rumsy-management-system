import type { Bindings } from "../../shared/env";
import { queryAll } from "../../shared/db/d1";
const sales = async (env: Bindings) =>
  (
    await queryAll<any>(
      env,
      "SELECT id,email,full_name,scope_name FROM users WHERE role='SALES_EXECUTIVE' AND active=1 ORDER BY full_name",
    )
  ).map((u) => ({
    id: u.id,
    email: u.email,
    name: u.full_name,
    scopeName: u.scope_name || u.full_name,
  }));
const users = async (env: Bindings) =>
  (
    await queryAll<any>(
      env,
      "SELECT id,email,full_name,role,scope_name FROM users WHERE active=1 ORDER BY full_name",
    )
  ).map((u) => ({
    id: u.id,
    email: u.email,
    name: u.full_name,
    role: u.role,
    scopeName: u.scope_name || u.full_name,
  }));
export const directoryService = { sales, users };
