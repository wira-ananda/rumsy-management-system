import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { unstable_splitSqlQuery } from "../api/node_modules/wrangler/wrangler-dist/cli.js";

test("migration SQL preserves blank lines, quoted semicolons and Unicode across batches", () => {
  const source = new DatabaseSync(":memory:"),
    imported = new DatabaseSync(":memory:");
  const notes =
    "Penawaran 👷\n\nDP: 25%; tenor 12 tahun\n\n\nCatatan: rumah 'A'\n\nTerima kasih🙏";
  try {
    source.exec("CREATE TABLE records(id INTEGER PRIMARY KEY, notes TEXT)");
    source.prepare("INSERT INTO records VALUES(?,?)").run(1, notes);
    const literal = "'" + notes.replaceAll("'", "''") + "'";
    const sql =
      "-- migration\nCREATE TABLE records(id INTEGER PRIMARY KEY, notes TEXT);\nINSERT INTO records VALUES(1," +
      literal +
      ");\n";
    const statements = unstable_splitSqlQuery(sql);
    assert.equal(statements.length, 2);
    for (const statement of statements) imported.exec(statement);
    assert.deepEqual(
      imported.prepare("SELECT * FROM records").all(),
      source.prepare("SELECT * FROM records").all(),
    );
  } finally {
    source.close();
    imported.close();
  }
});
