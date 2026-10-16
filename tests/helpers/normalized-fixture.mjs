import { readFile } from "node:fs/promises";
import { models, encode, sqlValue } from "../../api/build/record-codec.mjs";
export async function normalizeFixture(f) {
  const snapshot = f.db.prepare("SELECT * FROM app_state WHERE id=1").get();
  const encoded = await encode(JSON.parse(snapshot.data));
  f.db.exec(
    await readFile(
      new URL(
        "../../api/prisma/migrations/202610160001_normalized_storage/migration.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  f.db.exec("PRAGMA foreign_keys=ON");
  for (const model of models)
    for (const row of encoded.records[model.name]) {
      const fields = Object.keys(row);
      f.db
        .prepare(
          `INSERT INTO "${model.table}" (${fields.map((f) => '"' + f + '"').join(",")}) VALUES (${fields.map(() => "?").join(",")})`,
        )
        .run(
          ...fields.map((field) => sqlValue(row[field], model.fields[field])),
        );
    }
  for (const [key, value] of Object.entries(encoded.root))
    f.db
      .prepare("INSERT INTO rms_root_fields(key,value) VALUES(?,?)")
      .run(key, JSON.stringify(value));
  f.db
    .prepare(
      "INSERT INTO rms_storage_meta(id,version,format,updatedAt,sourceHash,writeToken,rootShape) VALUES(1,?,1,?,?,?,?)",
    )
    .run(
      snapshot.version,
      snapshot.updated_at,
      "fixture",
      "initial",
      JSON.stringify(encoded.rootShape),
    );
  f.env.RMS_STORAGE = "normalized";
}
