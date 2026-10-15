/**
 * Shared browser state. Keys and snapshots intentionally match /api/state.
 * No seed, localStorage, database migration, or alternate data source is used.
 * @type {import('../types/rms').RuntimeState}
 */
export const runtime = {
  data: null,
  session: null,
  stateVersion: 0,
  saveChain: Promise.resolve(),
  salesDirectory: [],
  userDirectory: [],
};
