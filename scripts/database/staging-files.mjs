import { readFile, writeFile, unlink, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import {
  stageDir,
  stageBucket,
  stagingConfig,
  wrangler,
} from "./staging-cli.mjs";
await stagingConfig();
const files = JSON.parse(
  await readFile(resolve(stageDir, "files.json"), "utf8"),
);
const checked = resolve(stageDir, "checked-files");
await mkdir(checked, { recursive: true, mode: 0o700 });
let cursor = 0,
  done = 0;
const results = [];
async function worker() {
  while (cursor < files.length) {
    const file = files[cursor++];
    await wrangler(
      [
        "r2",
        "object",
        "put",
        stageBucket + "/" + file.object_key,
        "--remote",
        "--file",
        file.localPath,
        "--content-type",
        file.content_type || "application/octet-stream",
      ],
      { logName: "put-" + file.id },
    );
    const path = resolve(checked, file.id);
    await wrangler(
      [
        "r2",
        "object",
        "get",
        stageBucket + "/" + file.object_key,
        "--remote",
        "--file",
        path,
      ],
      { logName: "get-" + file.id },
    );
    const content = await readFile(path);
    assert.equal(content.length, file.size);
    assert.equal(
      createHash("sha256").update(content).digest("hex"),
      file.sha256,
    );
    await unlink(path);
    results.push({ id: file.id, size: file.size, sha256: file.sha256 });
    done++;
    if (done % 10 === 0 || done === files.length)
      console.log(
        `Staging R2 uploaded + SHA-256 verified: ${done}/${files.length}`,
      );
  }
}
const outcomes = await Promise.allSettled([worker(), worker(), worker()]);
await writeFile(
  resolve(stageDir, "file-verification.json"),
  JSON.stringify(
    {
      bucket: stageBucket,
      verified: results.length,
      total: files.length,
      bytes: results.reduce((s, f) => s + f.size, 0),
      objects: results,
      productionModified: false,
    },
    null,
    2,
  ),
  { mode: 0o600 },
);
const errors = outcomes.filter((r) => r.status === "rejected");
if (errors.length)
  throw new AggregateError(
    errors.map((r) => r.reason),
    "Staging R2 copy failed",
  );
