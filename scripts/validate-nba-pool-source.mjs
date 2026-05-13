/**
 * Validates `nbaComparisonPool.source.json`: 60 entries, unique ids, required fields.
 *
 * Run: node scripts/validate-nba-pool-source.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const jsonPath = path.join(
  root,
  "src/features/dashboards/basketball/nbaComparisonPool.source.json",
);

const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
if (!Array.isArray(raw)) {
  console.error("Expected top-level array");
  process.exit(1);
}

const ids = new Set();
for (const e of raw) {
  if (!e || typeof e !== "object") {
    console.error("Bad entry", e);
    process.exit(1);
  }
  for (const k of [
    "id",
    "displayName",
    "primeWindow",
    "statsPrime",
    "narrative",
  ]) {
    if (!(k in e)) {
      console.error("Missing", k, "on", e.id);
      process.exit(1);
    }
  }
  if (ids.has(e.id)) {
    console.error("Duplicate id", e.id);
    process.exit(1);
  }
  ids.add(e.id);
}

if (raw.length !== 60) {
  console.error("Expected 60 entries, got", raw.length);
  process.exit(1);
}

console.log("OK:", raw.length, "pool source entries in", jsonPath);
