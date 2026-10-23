import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// dist/index.json: machine-generated download manifest. The registry is
// human-authored; integrity data lives here so contributors never hand-edit
// hashes. Consumers verify a .flow against sha256 before importing.
const ROOT = new URL("../../", import.meta.url).pathname;
const DIST = join(ROOT, "dist");
const BASE = "https://qedmi.github.io/flow-registry/dist";
const packages = {};
for (const file of readdirSync(DIST).filter((f) => f.endsWith(".flow")).sort()) {
  const bytes = readFileSync(join(DIST, file));
  const id = file.replace(/\.flow$/, "");
  packages[id] = {
    url: `${BASE}/${file}`,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: statSync(join(DIST, file)).size,
  };
}
writeFileSync(
  join(DIST, "index.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), packages }, null, 2) + "\n",
);
console.log(`dist/index.json: ${Object.keys(packages).length} packages`);
