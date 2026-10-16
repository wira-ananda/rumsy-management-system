import type { RmsState } from "../../shared/types/state.type";
export interface SaveStateInput {
  version: unknown;
  data: RmsState;
}
export const parseSaveStateInput = (body: any): SaveStateInput | null =>
  body && body.data ? body : null;
