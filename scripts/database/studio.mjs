import { localPaths } from "./local-paths.mjs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
const { root, development } = await localPaths();
const child = spawn(
  process.execPath,
  [
    resolve(root, "api/node_modules/prisma/build/index.js"),
    "studio",
    "--config",
    resolve(root, "api/prisma.config.ts"),
    "--url",
    "file:" + development,
    ...process.argv.slice(2),
  ],
  { stdio: "inherit", cwd: resolve(root, "api") },
);
child.on("exit", (code) => process.exit(code ?? 1));
