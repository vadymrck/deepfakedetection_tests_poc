import 'dotenv/config';
import sharp from 'sharp';
import { RealityDefender, RealityDefenderError } from '@realitydefender/realitydefender';
import * as fs from 'fs';

// Baseline already known from previous run — no credit spent re-detecting
const BASELINE = { status: 'AUTHENTIC', score: 0.18 };

const SRC_REAL = './data/real.jpg';
const SRC_FAKE = './data/fake.jpeg';
const OUT_DIR = './data/variants';

// ---------------------------------------------------------------------------
// Variant 1: skin_smooth
// Blur only the face region (center ellipse) to eliminate natural skin
// micro-texture — the key signal GAN detectors use to flag over-smooth skin.
// ---------------------------------------------------------------------------

async function generateSkinSmooth(outPath: string): Promise<void> {
  const meta = await sharp(SRC_REAL).metadata();
  const w = meta.width!;
  const h = meta.height!;

  // Full image blurred at σ=4 (aggressive — destroys pores/texture)
  const blurredBuf = await sharp(SRC_REAL).blur(4).toBuffer();

  // RGBA mask: white ellipse (opaque) over black (transparent) = face area only
  const cx = Math.round(w * 0.5);
  const cy = Math.round(h * 0.42);
  const rx = Math.round(w * 0.34);
  const ry = Math.round(h * 0.4);
  const maskSvg = Buffer.from(
    `<svg width="${w}" height="${h}">` +
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="white"/>` +
      `</svg>`
  );

  // Masked blurred layer: blurred image * face-mask → only face area is blurred
  const maskedBlur = await sharp(blurredBuf)
    .composite([{ input: maskSvg, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // Composite masked blur over original: face becomes GAN-smooth, rest stays real
  await sharp(SRC_REAL)
    .composite([{ input: maskedBlur, blend: 'over' }])
    .jpeg({ quality: 92 })
    .toFile(outPath);
}

// ---------------------------------------------------------------------------
// Variant 2: freq_inject
// Extract the high-frequency GAN fingerprint from fake.jpeg (fake - blur(fake))
// and add it at 15% weight onto real.jpg. Invisible to the eye but injects
// the exact spectral signature that frequency-domain models look for.
// ---------------------------------------------------------------------------

async function generateFreqInject(outPath: string): Promise<void> {
  const meta = await sharp(SRC_REAL).metadata();
  const w = meta.width!;
  const h = meta.height!;
  const channels = 3;
  const pixels = w * h * channels;

  // Real image raw pixels
  const realRaw = await sharp(SRC_REAL).ensureAlpha(1).removeAlpha().raw().toBuffer();

  // Fake image resized to match real, raw pixels
  const fakeRaw = await sharp(SRC_FAKE).resize(w, h).ensureAlpha(1).removeAlpha().raw().toBuffer();

  // Blurred fake — used to isolate only the high-freq GAN fingerprint
  const fakeBlur = await sharp(SRC_FAKE)
    .resize(w, h)
    .blur(2)
    .ensureAlpha(1)
    .removeAlpha()
    .raw()
    .toBuffer();

  // Inject: real + (fake_hf_residual * 0.15)
  const out = Buffer.alloc(pixels);
  for (let i = 0; i < pixels; i++) {
    const residual = (fakeRaw[i] ?? 0) - (fakeBlur[i] ?? 0); // GAN fingerprint
    out[i] = Math.min(255, Math.max(0, (realRaw[i] ?? 0) + Math.round(residual * 0.15)));
  }

  await sharp(out, { raw: { width: w, height: h, channels } })
    .jpeg({ quality: 92 })
    .toFile(outPath);
}

// ---------------------------------------------------------------------------
// Detect + print
// ---------------------------------------------------------------------------

type DetectResult = { status: string; score: number | null };

async function detectFile(rd: RealityDefender, filePath: string): Promise<DetectResult> {
  const result = await rd.detect({ filePath });
  return { status: result.status ?? 'UNKNOWN', score: result.score ?? null };
}

function fmt(s: number | null): string {
  return s != null ? s.toFixed(4) : 'N/A   ';
}

function printTable(rows: Array<{ variant: string } & DetectResult>): void {
  console.log('\n' + '='.repeat(62));
  console.log('  False-positive attack — data/real.jpg');
  console.log('='.repeat(62));
  console.log(`  ${'Variant'.padEnd(20)} ${'Status'.padEnd(14)} ${'Score'.padEnd(8)} Delta`);
  console.log(`  ${'─'.repeat(60)}`);
  console.log(
    `  ${'baseline (known)'.padEnd(20)} ${BASELINE.status.padEnd(14)} ${fmt(BASELINE.score).padEnd(8)} —`
  );
  for (const row of rows) {
    const delta = (row.score ?? 0) - BASELINE.score;
    const tag =
      row.status === 'MANIPULATED'
        ? '  << FALSE POSITIVE!'
        : (row.score ?? 0) > 0.5
          ? '  << score crossed 0.5'
          : '';
    console.log(
      `  ${row.variant.padEnd(20)} ${row.status.padEnd(14)} ${fmt(row.score).padEnd(8)} ` +
        `${(delta >= 0 ? '+' : '') + delta.toFixed(4)}${tag}`
    );
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// Main — 2 API calls total
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const apiKey = process.env.REALITY_DEFENDER_API_KEY;
  if (!apiKey) {
    console.error('REALITY_DEFENDER_API_KEY not set');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const rd = new RealityDefender({ apiKey });

  const variants: Array<{ variant: string; outPath: string; generate: () => Promise<void> }> = [
    {
      variant: 'skin_smooth',
      outPath: `${OUT_DIR}/real_skin_smooth.jpg`,
      generate: () => generateSkinSmooth(`${OUT_DIR}/real_skin_smooth.jpg`),
    },
    {
      variant: 'freq_inject',
      outPath: `${OUT_DIR}/real_freq_inject.jpg`,
      generate: () => generateFreqInject(`${OUT_DIR}/real_freq_inject.jpg`),
    },
  ];

  console.log('Generating variants (no API calls yet)...');
  for (const v of variants) {
    process.stdout.write(`  Generating ${v.variant} ...`);
    await v.generate();
    process.stdout.write(` done → ${v.outPath}\n`);
  }

  const rows: Array<{ variant: string } & DetectResult> = [];
  console.log('\nDetecting (2 API calls):');
  for (const v of variants) {
    process.stdout.write(`  Detecting ${v.variant} ...`);
    try {
      const r = await detectFile(rd, v.outPath);
      rows.push({ variant: v.variant, ...r });
      process.stdout.write(` ${r.status} (${fmt(r.score)})\n`);
    } catch (err) {
      if (err instanceof RealityDefenderError) {
        process.stdout.write(` ERROR [${err.code}]: ${err.message}\n`);
        rows.push({ variant: v.variant, status: 'ERROR', score: null });
      } else {
        throw err;
      }
    }
  }

  printTable(rows);
}

main().catch(console.error);
