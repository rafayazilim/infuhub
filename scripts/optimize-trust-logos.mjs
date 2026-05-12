/**
 * Trust / referans şeridi logolarını WebP'ye dönüştürür; oranları korur (içine sığdırır, bozmaz).
 * Çıktı: public/pics/NEW/*.webp + src/data/trustLogoMeta.json + manifest.json
 *
 * Çalıştır: node scripts/optimize-trust-logos.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const TRUST_LOGO_DIR = path.join(ROOT, "public", "pics", "NEW");
const META_OUT = path.join(ROOT, "src", "data", "trustLogoMeta.json");

/** Retina için yeterli üst sınır (CSS logo yüksekliği ~92px) */
const DEFAULT_MAX_W = 560;
const DEFAULT_MAX_H = 260;
const MAX_BYTES = 150 * 1024;

function buildPipeline(inputBuf, maxW, maxH) {
  return sharp(inputBuf).rotate().resize({
    width: maxW,
    height: maxH,
    fit: "inside",
    withoutEnlargement: true,
  });
}

async function encodeWebp(inputBuf, maxW, maxH, quality) {
  return buildPipeline(inputBuf, maxW, maxH)
    .webp({
      quality,
      effort: 6,
      smartSubsample: true,
      alphaQuality: Math.min(100, quality + 5),
    })
    .toBuffer();
}

async function optimizeOne(inputPng, index) {
  const baseName = path.basename(inputPng, path.extname(inputPng));
  const outWebp = path.join(TRUST_LOGO_DIR, `${baseName}.webp`);
  const inputBuf = await fs.readFile(inputPng);

  let maxW = DEFAULT_MAX_W;
  let maxH = DEFAULT_MAX_H;
  let quality = 92;
  let buf = await encodeWebp(inputBuf, maxW, maxH, quality);

  while (buf.byteLength > MAX_BYTES && quality > 66) {
    quality -= 5;
    buf = await encodeWebp(inputBuf, maxW, maxH, quality);
  }

  while (buf.byteLength > MAX_BYTES && (maxW > 360 || maxH > 180)) {
    maxW = Math.floor(maxW * 0.9);
    maxH = Math.floor(maxH * 0.9);
    quality = Math.max(72, quality - 2);
    buf = await encodeWebp(inputBuf, maxW, maxH, quality);
  }

  await fs.writeFile(outWebp, buf);

  const dims = await sharp(buf).metadata();
  return {
    id: index,
    file: `${baseName}.webp`,
    width: dims.width ?? 0,
    height: dims.height ?? 0,
    bytes: buf.byteLength,
  };
}

async function main() {
  const entries = await fs.readdir(TRUST_LOGO_DIR, { withFileTypes: true });
  const pngFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".png"))
    .map((entry) => entry.name)
    .sort((a, b) => {
      const an = Number.parseInt(path.basename(a, path.extname(a)), 10);
      const bn = Number.parseInt(path.basename(b, path.extname(b)), 10);
      if (Number.isFinite(an) && Number.isFinite(bn) && an !== bn) return an - bn;
      return a.localeCompare(b, "tr");
    });

  if (!pngFiles.length) {
    throw new Error(`Kaynak PNG bulunamadı: ${TRUST_LOGO_DIR}`);
  }

  const results = [];
  for (const name of pngFiles) {
    const index = Number.parseInt(path.basename(name, path.extname(name)), 10);
    const id = Number.isFinite(index) ? index : results.length + 1;
    const r = await optimizeOne(path.join(TRUST_LOGO_DIR, name), id);
    results.push(r);
    console.log(`${r.file} → ${(r.bytes / 1024).toFixed(1)} KB  (${r.width}×${r.height})`);
    if (r.bytes > MAX_BYTES) {
      console.warn(`  warning: still over ${MAX_BYTES / 1024} KB`);
    }
  }

  await fs.mkdir(path.dirname(META_OUT), { recursive: true });
  const meta = {
    version: 1,
    maxDisplayBox: { w: DEFAULT_MAX_W, h: DEFAULT_MAX_H },
    logos: results.map((r) => ({
      id: r.id,
      file: r.file,
      width: r.width,
      height: r.height,
      bytes: r.bytes,
    })),
  };
  await fs.writeFile(META_OUT, JSON.stringify(meta, null, 2) + "\n", "utf8");

  await fs.writeFile(
    path.join(TRUST_LOGO_DIR, "manifest.json"),
    JSON.stringify(results.map((r) => r.file), null, 2) + "\n",
    "utf8",
  );

  console.log(`\nmeta → ${path.relative(ROOT, META_OUT)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
