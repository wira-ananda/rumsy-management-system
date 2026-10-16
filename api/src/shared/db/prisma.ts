import { PrismaClient } from "../../generated/prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import type { Bindings } from "../env";
const clients = new WeakMap<object, PrismaClient>();
export function prisma(env: Bindings) {
  let client = clients.get(env.DB);
  if (!client) {
    client = new PrismaClient({ adapter: new PrismaD1(env.DB) });
    clients.set(env.DB, client);
  }
  return client;
}
