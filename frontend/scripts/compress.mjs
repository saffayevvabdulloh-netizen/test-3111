// After `vite build`: write .gz and .br next to every text asset. WhiteNoise serves them automatically
// (JS/CSS become ~3-4x smaller, so the site opens fast even on weak mobile internet).
import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";

const DIST = new URL("../dist", import.meta.url).pathname;
const TEXT = new Set([".js", ".css", ".html", ".svg", ".json", ".webmanifest", ".txt", ".map"]);
let files = 0, before = 0, after = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!TEXT.has(extname(p))) continue;
    const buf = readFileSync(p);
    if (buf.length < 800) continue;
    const br = brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } });
    const gz = gzipSync(buf, { level: 9 });
    if (br.length < buf.length) writeFileSync(p + ".br", br);
    if (gz.length < buf.length) writeFileSync(p + ".gz", gz);
    files++; before += buf.length; after += Math.min(br.length, gz.length, buf.length);
  }
}
walk(DIST);
console.log(`compressed ${files} files: ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB`);
