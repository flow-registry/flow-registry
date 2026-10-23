import { readFileSync } from "node:fs";

const entries = JSON.parse(readFileSync("community-flows.json", "utf8"));
const errors = [];
const seen = new Set();
const ID = /^[a-z0-9]([a-z0-9-]{0,62})$/;
const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

if (!Array.isArray(entries)) {
  errors.push("registry root must be an array");
} else {
  for (const [i, e] of entries.entries()) {
    const where = `entry[${i}] (${e?.id ?? "?"})`;
    if (typeof e !== "object" || e === null) { errors.push(`${where}: not an object`); continue; }
    if (!ID.test(e.id ?? "")) errors.push(`${where}: bad id "${e.id}" — [a-z0-9-] only`);
    if (seen.has(e.id)) errors.push(`${where}: duplicate id`);
    seen.add(e.id);
    for (const k of ["name", "author", "description", "repo"]) {
      if (typeof e[k] !== "string" || !e[k].trim()) errors.push(`${where}: missing ${k}`);
    }
    if (e.description && e.description.length > 200)
      errors.push(`${where}: description > 200 chars`);
    if (e.repo && !REPO.test(e.repo)) errors.push(`${where}: bad repo "${e.repo}"`);
    if (e.path && /(^\/|\.\.|\/$)/.test(e.path))
      errors.push(`${where}: bad path "${e.path}"`);
    if (e.tags && !Array.isArray(e.tags)) errors.push(`${where}: tags must be an array`);
    for (const k of ["version", "minApp"]) {
      if (e[k] !== undefined && !/^\d+\.\d+\.\d+$/.test(e[k]))
        errors.push(`${where}: ${k} "${e[k]}" must be semver x.y.z`);
    }
    if (e.distUrl !== undefined && !/^https:\/\/\S+$/.test(e.distUrl))
      errors.push(`${where}: distUrl must be an https URL`);
    if (e.capabilities !== undefined &&
        (!Array.isArray(e.capabilities) ||
          !e.capabilities.every((c) => /^[a-z_][a-z0-9_.]*$/.test(c))))
      errors.push(`${where}: capabilities must be a tool-name list`);
    if (e.seed !== undefined && typeof e.seed !== "boolean")
      errors.push(`${where}: seed must be boolean`);
  }
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log(`community-flows.json: ${entries.length} entries OK`);
