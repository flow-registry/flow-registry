import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const yaml = require("js-yaml");

const registry = JSON.parse(readFileSync("community-flows.json", "utf8"));
const errors = [];

for (const entry of registry) {
  // Only flows hosted in this repo are filesystem-checked; external repos are
  // the entry author's responsibility.
  if (entry.repo !== "qedmi/flow-list" || !entry.path) continue;
  const dir = entry.path;
  const manifestPath = join(dir, "manifest.yaml");
  if (!existsSync(manifestPath)) {
    errors.push(`${entry.id}: ${manifestPath} missing`);
    continue;
  }
  let manifest;
  try {
    manifest = yaml.load(readFileSync(manifestPath, "utf8"));
  } catch (e) {
    errors.push(`${entry.id}: manifest.yaml does not parse — ${e.message}`);
    continue;
  }
  if (!manifest || manifest.flow !== "1")
    errors.push(`${entry.id}: manifest must declare flow: "1"`);
  if (!manifest.name || !manifest.description)
    errors.push(`${entry.id}: manifest needs name + description`);
  if (!manifest.trigger || typeof manifest.trigger !== "object")
    errors.push(`${entry.id}: manifest needs a trigger object`);
  const steps = manifest.steps;
  if (!Array.isArray(steps) || steps.length === 0)
    errors.push(`${entry.id}: manifest needs at least one step`);
  for (const [i, s] of (steps || []).entries()) {
    if (typeof s !== "object" || s === null || ("tool" in s) === ("js" in s))
      errors.push(`${entry.id}: steps[${i}] must carry exactly one of tool:/js:`);
    if (s.js && !/^[a-zA-Z_$][\w$]*\.[a-zA-Z_$][\w$]*$/.test(s.js))
      errors.push(`${entry.id}: steps[${i}] js must be "<module>.<function>"`);
  }
  for (const mod of manifest.import || []) {
    if (!existsSync(join(dir, mod))) errors.push(`${entry.id}: import ${mod} missing`);
  }
  const view = manifest.flowView || {};
  for (const k of ["cell", "detail"]) {
    if (view[k] && !existsSync(join(dir, view[k])))
      errors.push(`${entry.id}: flowView.${k} ${view[k]} missing`);
  }
  if (!existsSync(join(dir, "README.md")))
    errors.push(`${entry.id}: README.md missing (detail page body)`);
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log("hosted flows OK");
