import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import worker, { CATEGORIES, validateRecord, mailingAllowed, authorized, listAll, FeVizjaUpdateCoordinator } from "../src/index.js";

test("entry point re-exports the modular Worker API", () => {
  assert.equal(typeof worker.fetch, "function");
  assert.equal(typeof validateRecord, "function");
  assert.equal(typeof mailingAllowed, "function");
  assert.equal(typeof authorized, "function");
  assert.equal(typeof listAll, "function");
  assert.equal(typeof FeVizjaUpdateCoordinator, "function");
  assert.equal(CATEGORIES.length, 5);
});

test("index.js remains a thin entry point", async () => {
  const source = await readFile(new URL("../src/index.js", import.meta.url), "utf8");
  assert.ok(source.split("\n").length <= 12);
  assert.match(source, /from ".\/routes\.js"/);
});


test("routes extract audit, PUT and admin raw-read handlers", async () => {
  const source = await readFile(new URL("../src/routes.js", import.meta.url), "utf8");
  assert.match(source, /async function handleAudit\(/);
  assert.match(source, /async function handlePut\(/);
  assert.match(source, /async function handleAdminRead\(/);
});

test("all source modules keep lines at or below 200 characters", async () => {
  const { readdir } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const sourceDirectory = new URL("../src/", import.meta.url);
  const filenames = (await readdir(sourceDirectory))
    .filter((filename) => filename.endsWith(".js"))
    .sort();

  assert.ok(filenames.length > 0, "source directory should contain JavaScript modules");

  for (const filename of filenames) {
    const source = await readFile(new URL(filename, sourceDirectory), "utf8");
    const longLines = source
      .split("\n")
      .map((line, index) => ({ line: index + 1, length: line.length }))
      .filter((entry) => entry.length > 200);

    assert.deepEqual(
      longLines,
      [],
      `${filename} contains lines longer than 200 characters`,
    );
  }
});
