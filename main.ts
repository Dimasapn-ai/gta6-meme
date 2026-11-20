// main.ts — the gta6-meme-x-01 entry program.
//
// The entry itself is a post on X; this program's whole job is to carry the
// post's address from the repository to the grader: it copies POST.json
// (which sits next to this file) into the output directory as POST.json.
// Node standard library only.

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const botDir = process.env.MAKEFUN_BOT_DIR ?? here;
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

const src = join(botDir, "POST.json");
if (!existsSync(src)) {
  throw new Error(`POST.json not found next to main.ts (looked in ${botDir})`);
}
mkdirSync(outDir, { recursive: true });
const dst = join(outDir, "POST.json");
copyFileSync(src, dst);
console.log(`main.ts: copied ${src} -> ${dst}`);
