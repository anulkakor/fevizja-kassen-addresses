import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const staging = JSON.parse(fs.readFileSync(path.join(root, "data", "research-staging.json"), "utf8"));

test("verified categories cannot carry compiled-only verification metadata", () => {
  const violations = [];
  for (const record of staging.records) {
    for (const [category, item] of Object.entries(record.categories ?? {})) {
      if (item.status !== "verified") continue;
      if (!item.sourceVerifiedAt) violations.push(`${record.insurerId}/${category}: sourceVerifiedAt missing`);
      if (!item.checkedAtMeaning || item.checkedAtMeaning === "record_compiled_not_source_reverified") {
        violations.push(`${record.insurerId}/${category}: source re-verification meaning missing`);
      }
    }
  }
  assert.deepEqual(violations, []);
});

test("the nine Widerspruch corrections carry the same re-verification date and meaning", () => {
  const expected = new Set([
    "bkk-wurth",
    "energie-betriebskrankenkasse",
    "ikk-gesund-plus",
    "kaufmannische-krankenkasse-kkh",
    "knappschaft",
    "novitas-bkk",
    "sozialversicherung-fur-landwirtschaft-forsten-und-gartenbau-svlfg",
    "bkk-pfalz",
    "securvita-bkk",
  ]);
  const found = new Set();
  for (const record of staging.records) {
    if (!expected.has(record.insurerId)) continue;
    const item = record.categories.widerspruch;
    assert.equal(item.status, "verified", record.insurerId);
    assert.equal(item.checkedAt, "2026-11-18", record.insurerId);
    assert.equal(item.sourceVerifiedAt, "2026-11-18", record.insurerId);
    assert.equal(item.checkedAtMeaning, "official_widerspruch_source_reverified_2026-11-18", record.insurerId);
    found.add(record.insurerId);
  }
  assert.deepEqual(found, expected);
});

test("changelog latest entry follows the Polish versioned format", () => {
  const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
  assert.match(changelog, /^## v0\.2\.65 — 2026-11-18/m);
  assert.match(changelog, /\n\n## v0\.2\.64 — 2026-11-18\n/);
  assert.doesNotMatch(changelog, /^## 0\.2\.65/m);
});
