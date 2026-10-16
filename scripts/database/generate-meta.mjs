import { readFile, writeFile, mkdir } from "node:fs/promises";
import { getDMMF } from "../../api/node_modules/@prisma/internals/dist/index.js";
const schema = await readFile(
  new URL("../../api/prisma/schema.prisma", import.meta.url),
  "utf8",
);
const { datamodel } = await getDMMF({ datamodel: schema });
const models = datamodel.models
  .filter((m) => m.documentation?.includes("@rms "))
  .map((m) => {
    const spec = JSON.parse(m.documentation.split("@rms ")[1].split("\n")[0]);
    return {
      name: m.name,
      delegate: m.name[0].toLowerCase() + m.name.slice(1),
      table: m.dbName,
      ...spec,
      fields: Object.fromEntries(
        m.fields
          .filter(
            (f) =>
              f.kind !== "object" &&
              ![
                "storageKey",
                "sortOrder",
                "legacyShape",
                "extra",
                "parentKey",
              ].includes(f.name),
          )
          .map((f) => {
            if (f.dbName)
              throw new Error(
                `Mapped field ${m.name}.${f.name} requires explicit codec support`,
              );
            if (!["String", "Int", "Float", "Boolean", "Json"].includes(f.type))
              throw new Error(
                `Unsupported storage type ${m.name}.${f.name}: ${f.type}`,
              );
            return [f.name, f.type];
          }),
      ),
    };
  });
await mkdir(new URL("../../api/src/generated/", import.meta.url), {
  recursive: true,
});
await writeFile(
  new URL("../../api/src/generated/record-meta.ts", import.meta.url),
  "// Generated from prisma/schema.prisma. Run bun run db:generate after editing the schema.\nexport const recordModels = " +
    JSON.stringify(models, null, 2) +
    " as const;\n",
);
console.log(`Storage codec: ${models.length} models from schema.prisma`);
