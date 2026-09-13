#!/usr/bin/env node
/**
 * Restores binary art from text `.b64` sidecars.
 * Safe to run repeatedly. Skips a target if it already exists and matches.
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

async function walk(dir, acc = []) {
  let ents;
  try {
    ents = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of ents) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, acc);
    else if (e.name.endsWith(".b64")) acc.push(p);
  }
  return acc;
}

const roots = ["public", "attachments", "assets"];
const files = [];
for (const r of roots) files.push(...(await walk(r)));

if (!files.length) {
  console.log("decode-assets: no .b64 files found");
  process.exit(0);
}

for (const f of files) {
  const out = f.slice(0, -4);
  const b64 = (await readFile(f, "utf8")).replace(/\s+/g, "");
  const buf = Buffer.from(b64, "base64");
  try {
    const existing = await readFile(out);
    if (existing.equals(buf)) continue;
  } catch {
    /* missing — write */
  }
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, buf);
  console.log("decoded", out);
}
