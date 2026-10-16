import { recordModels } from "../../generated/record-meta";
export type Row = Record<string, any>;
export type Model = {
  name: string;
  delegate: string;
  table: string;
  collection?: string;
  parent?: string;
  field?: string;
  kind: string;
  fields: Record<string, string>;
};
export const models: readonly Model[] = recordModels;
export type Records = Record<string, Row[]>;
const own = (o: any, k: string) => Object.prototype.hasOwnProperty.call(o, k);
const object = (o: any) =>
  o !== null && typeof o === "object" && !Array.isArray(o);
export function canonical(value: any): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (object(value))
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + canonical(value[k]))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
export async function digest(value: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
function scalar(value: any, type: string) {
  if (value === null || value === undefined) return null;
  if (type === "Json") return value;
  if (type === "String")
    return typeof value === "string"
      ? value
      : typeof value === "number" || typeof value === "boolean"
        ? String(value)
        : null;
  if (type === "Boolean") return typeof value === "boolean" ? value : null;
  return typeof value === "number" &&
    Number.isFinite(value) &&
    (type !== "Int" ||
      (Number.isInteger(value) && value >= -2147483648 && value <= 2147483647))
    ? value
    : null;
}
// legacyShape records presence and exceptional legacy types, not a second snapshot.
// Unknown extension fields are retained in extra so migration never silently drops data.
export async function encode(
  state: Row,
): Promise<{ records: Records; root: Row; rootShape: Row }> {
  const records: Records = Object.fromEntries(models.map((m) => [m.name, []]));
  const root = { ...state },
    rootShape: Row = {};
  async function walk(model: Model, values: any[], parentKey?: string) {
    const occurrences = new Map<string, number>();
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      if (!object(value))
        throw new Error(
          `Invalid ${model.name} record at ${i}; migration stopped without dropping it`,
        );
      const identity =
        value.id !== undefined && value.id !== null && value.id !== ""
          ? "id:" + canonical(value.id)
          : "value:" + (await digest(canonical(value)));
      const nth = occurrences.get(identity) || 0;
      occurrences.set(identity, nth + 1);
      const storageKey = await digest(
        canonical([parentKey || "", model.name, identity, nth]),
      );
      const extra = { ...value },
        shape: Row = {
          present: Object.keys(value).sort(),
          overrides: {},
          children: {},
        };
      const row: Row = { storageKey, sortOrder: i, legacyShape: shape, extra };
      if (parentKey) row.parentKey = parentKey;
      for (const [field, type] of Object.entries(model.fields)) {
        const stored = scalar(value[field], type);
        row[field] = stored;
        delete extra[field];
        if (own(value, field) && canonical(value[field]) !== canonical(stored))
          shape.overrides[field] = { original: value[field], stored };
      }
      for (const child of models.filter((c) => c.parent === model.name)) {
        const field = child.field!;
        if (Array.isArray(value[field]) && child.kind === "array") {
          shape.children[field] = "array";
          delete extra[field];
          await walk(child, value[field], storageKey);
        } else if (object(value[field]) && child.kind === "object") {
          shape.children[field] = "object";
          delete extra[field];
          await walk(child, [value[field]], storageKey);
        }
      }
      records[model.name].push(row);
    }
  }
  for (const model of models.filter((m) => m.collection)) {
    const key = model.collection!;
    if (Array.isArray(state[key])) {
      rootShape[key] = "array";
      delete root[key];
      await walk(model, state[key]);
    }
  }
  return { records, root, rootShape };
}
export function fromSql(model: Model, raw: Row): Row {
  const row = { ...raw };
  for (const field of [
    "legacyShape",
    "extra",
    ...Object.entries(model.fields)
      .filter(([, t]) => t === "Json")
      .map(([f]) => f),
  ])
    if (typeof row[field] === "string") row[field] = JSON.parse(row[field]);
  for (const [field, type] of Object.entries(model.fields))
    if (type === "Boolean" && row[field] !== null && row[field] !== undefined)
      row[field] = !!row[field];
  return row;
}
export function sqlValue(value: any, type?: string) {
  if (value === undefined || value === null) return null;
  if (type === "Json" || typeof value === "object")
    return JSON.stringify(value);
  return typeof value === "boolean" ? Number(value) : value;
}
export function decode(records: Records, root: Row, rootShape: Row): Row {
  const childRows = new Map<string, Row[]>();
  for (const model of models.filter((m) => m.parent))
    for (const raw of records[model.name] || []) {
      const row = fromSql(model, raw),
        key = model.name + ":" + row.parentKey;
      if (!childRows.has(key)) childRows.set(key, []);
      childRows.get(key)!.push(row);
    }
  function walk(model: Model, rows: Row[]): Row[] {
    return [...rows]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((raw) => {
        const row = fromSql(model, raw),
          shape = row.legacyShape || {
            present: [],
            overrides: {},
            children: {},
          },
          value = { ...row.extra };
        for (const [field] of Object.entries(model.fields)) {
          const stored = row[field] ?? null,
            override = shape.overrides?.[field];
          // A newly promoted schema column may still have its legacy value in extra.
          if (stored === null && own(value, field)) continue;
          if (override && canonical(stored) === canonical(override.stored))
            value[field] = override.original;
          else if (stored !== null || shape.present.includes(field))
            value[field] = stored;
        }
        for (const child of models.filter((m) => m.parent === model.name)) {
          const values = walk(
            child,
            childRows.get(child.name + ":" + row.storageKey) || [],
          );
          if (shape.children?.[child.field!] || values.length)
            value[child.field!] =
              child.kind === "object" ? (values[0] ?? {}) : values;
        }
        return value;
      });
  }
  const state = { ...root };
  for (const model of models.filter((m) => m.collection)) {
    const values = walk(model, records[model.name] || []);
    if (rootShape[model.collection!] || values.length)
      state[model.collection!] = values;
  }
  return state;
}
