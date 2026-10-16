import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
export async function localPaths() {
  const root = resolve(import.meta.dirname, "../.."),
    current = JSON.parse(
      await readFile(resolve(root, "api/.local/current.json"), "utf8"),
    );
  const development = resolve(current.directory, "development.sqlite");
  try {
    await writeFile(development, await readFile(current.database), {
      mode: 0o600,
      flag: "wx",
    });
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
  }
  return { root, ...current, development };
}
