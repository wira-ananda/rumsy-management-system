import type { Bindings } from "../../shared/env";
import type { AuthUser } from "../../shared/types/auth.type";
import type { StateRow, RmsState } from "../../shared/types/state.type";
import { queryFirst, execute } from "../../shared/db/d1";
import { ESCALATION_EDIT } from "../../shared/constants/roles";
import { deepClone } from "../../shared/utils/collection";
import { json } from "../../shared/utils/api-response";
import { audit } from "../../shared/utils/audit";
import { enforceSensitive } from "./state.permissions";
import type { SaveStateInput } from "./state.schema";
import { validateLeadChanges } from "./lead-validation";
import {
  normalized,
  readNormalized,
  saveNormalized,
} from "../storage/storage.service";
const read = async (env: Bindings, user: AuthUser) => {
  const row = normalized(env)
    ? await readNormalized(env)
    : (await queryFirst<StateRow>(
        env,
        "SELECT version,data,updated_at FROM app_state WHERE id=1",
      ))!;
  const state: RmsState =
    typeof row.data === "string" ? JSON.parse(row.data) : row.data;
  if (!ESCALATION_EDIT.has(user.role)) state.escalations = [];
  return json({ version: row.version, data: state, updatedAt: row.updated_at });
};
const save = async (
  request: Request,
  env: Bindings,
  user: AuthUser,
  input: SaveStateInput | null,
) => {
  if (!input) return json({ error: "Payload tidak valid." }, 400);
  const row = normalized(env)
    ? await readNormalized(env)
    : (await queryFirst<StateRow>(
        env,
        "SELECT version,data FROM app_state WHERE id=1",
      ))!;
  if (Number(input.version) !== Number(row.version))
    return json({ error: "CONFLICT", version: row.version }, 409);
  const oldState =
      typeof row.data === "string" ? JSON.parse(row.data) : row.data,
    incoming = input.data;
  if (!ESCALATION_EDIT.has(user.role))
    incoming.escalations = deepClone(oldState.escalations || []);
  const next = enforceSensitive(oldState, incoming, user),
    nextVersion = row.version + 1;
  const leadError = validateLeadChanges(oldState, next);
  if (leadError)
    return json({ error: "LEAD_VALIDATION", message: leadError }, 400);
  const result = normalized(env)
    ? {
        meta: {
          changes: (await saveNormalized(
            env,
            row as Awaited<ReturnType<typeof readNormalized>>,
            next,
          ))
            ? 1
            : 0,
        },
      }
    : await execute(
        env,
        "UPDATE app_state SET data=?,version=?,updated_at=CURRENT_TIMESTAMP WHERE id=1 AND version=?",
        JSON.stringify(next),
        nextVersion,
        row.version,
      );
  if (!result.meta.changes)
    return json({ error: "CONFLICT", version: row.version }, 409);
  await audit(
    env,
    user,
    request,
    "STATE_WRITE",
    `version ${row.version} -> ${nextVersion}`,
  );
  return json({ ok: true, version: nextVersion });
};
export const stateService = { read, save };
