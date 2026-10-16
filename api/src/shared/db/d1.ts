import type { Bindings } from "../env";
export const queryFirst = <T>(
  env: Bindings,
  sql: string,
  ...values: unknown[]
) =>
  env.DB.prepare(sql)
    .bind(...values)
    .first<T>();
export const queryAll = async <T>(
  env: Bindings,
  sql: string,
  ...values: unknown[]
): Promise<T[]> =>
  (
    await env.DB.prepare(sql)
      .bind(...values)
      .all<T>()
  ).results;
export const execute = (env: Bindings, sql: string, ...values: unknown[]) =>
  env.DB.prepare(sql)
    .bind(...values)
    .run();
