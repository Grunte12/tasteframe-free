#!/usr/bin/env node
// Print only the numbered "## N." sections of a reference file, so a phase never loads the whole file.
// usage: node scripts/section.mjs <file> <n> [n...]
//        node scripts/section.mjs <file> "### <heading>"   (one entry, up to the next heading of the same level)
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [file, ...nums] = process.argv.slice(2);
if (!file || !nums.length) {
  console.error("usage: node scripts/section.mjs <file> <n> [n...]");
  process.exit(1);
}
const lines = readFileSync(path.join(ROOT, file), "utf8").split("\n");
if (nums[0].startsWith("#")) {
  const head = nums.join(" ").trim();
  const level = head.split(" ")[0];
  const start = lines.findIndex((line) => line.trim() === head);
  if (start < 0) {
    console.error(`section.mjs: no heading "${head}" in ${file}`);
    process.exit(1);
  }
  const stop = lines.findIndex((line, i) => i > start && /^#+ /.test(line) && line.split(" ")[0].length <= level.length);
  console.log(lines.slice(start, stop < 0 ? undefined : stop).join("\n"));
  process.exit(0);
}
const want = new Set(nums.map(String));
let on = false;
let found = 0;
for (const line of lines) {
  const m = /^## (\d+)\./.exec(line);
  if (m) {
    on = want.has(m[1]);
    if (on) found++;
  } else if (/^## /.test(line)) on = false;
  if (on) console.log(line);
}
if (found < want.size) {
  console.error(`section.mjs: found ${found} of ${want.size} sections in ${file}`);
  process.exit(1);
}
