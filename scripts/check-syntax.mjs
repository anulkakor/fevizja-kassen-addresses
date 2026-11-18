import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const targets = ["src", "scripts"];
const files = [];
for (const directory of targets) {
  for (const name of await readdir(directory)) {
    if (name.endsWith(".js") || name.endsWith(".mjs")) files.push(join(directory, name));
  }
}
let failed = false;
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) failed = true;
}
if (failed) process.exitCode = 1;
else console.log(`Syntax OK: ${files.length} JavaScript modules checked.`);
