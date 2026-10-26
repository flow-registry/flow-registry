// community-flows.json is generated.
//   official entries  ← flow-package/catalog.json (manifest + registry.yaml + zip hash)
//   everything else   ← external-flows.json (hand-written)
// Usage:
//   node .github/scripts/sync-index.mjs [--check] [path/to/catalog.json]
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const args = process.argv.slice(2).filter((a) => a !== "--check");
const check = process.argv.includes("--check");
const catalogPath = args[0] || fileURLToPath(new URL("../../../flow-package/catalog.json", import.meta.url));
const OFFICIAL = "flow-registry/flow-package";

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const external = JSON.parse(readFileSync(join(ROOT, "external-flows.json"), "utf8"));
if (!Array.isArray(catalog)) throw new Error("catalog root must be an array");
if (!Array.isArray(external)) throw new Error("external-flows.json root must be an array");

const seen = new Set();
for (const entry of catalog) {
  if (seen.has(entry.id)) throw new Error(`duplicate catalog id ${entry.id}`);
  seen.add(entry.id);
  if (entry.repo !== OFFICIAL) throw new Error(`${entry.id}: catalog entry must be ${OFFICIAL}`);
}
for (const entry of external) {
  if (seen.has(entry.id)) throw new Error(`external id collides with catalog: ${entry.id}`);
  seen.add(entry.id);
  if (entry.repo === OFFICIAL) {
    throw new Error(`${entry.id}: official packages belong in flow-package, not external-flows.json`);
  }
}

const merged = JSON.stringify([...catalog, ...external], null, 2) + "\n";
const dest = join(ROOT, "community-flows.json");
if (check) {
  const cur = readFileSync(dest, "utf8");
  if (cur !== merged) {
    console.error("community-flows.json is stale. Run: node .github/scripts/sync-index.mjs");
    process.exit(1);
  }
  console.log(`community-flows.json matches catalog (${catalog.length} official, ${external.length} external)`);
} else {
  writeFileSync(dest, merged);
  console.log(`wrote community-flows.json (${catalog.length} official, ${external.length} external)`);
}
