import 'dotenv/config';
import sharp from 'sharp';
import { RealityDefender } from '@realitydefender/realitydefender';
import * as fs from 'fs';

// ---------------------------------------------------------------------------
// Main — exactly 1 API call: horizontal flip of fake.jpeg
// Baseline already known: MANIPULATED, score 0.9500
// ---------------------------------------------------------------------------

const BASELINE = { status: 'MANIPULATED', score: 0.95 };

async function main(): Promise<void> {
  const apiKey = process.env.REALITY_DEFENDER_API_KEY;
  if (!apiKey) {
    console.error('REALITY_DEFENDER_API_KEY not set');
    process.exit(1);
  }

  const srcPath = './data/fake.jpeg';
  const outPath = './data/variants/fake_hflip.jpg';
  fs.mkdirSync('./data/variants', { recursive: true });

  // Generate flipped image
  await sharp(srcPath).flop().jpeg({ quality: 92 }).toFile(outPath);
  console.log(`Generated: ${outPath}`);

  // 1 API call
  const rd = new RealityDefender({ apiKey });
  process.stdout.write('Detecting fake_hflip ...');
  const result = await rd.detect({ filePath: outPath });
  const status = result.status ?? 'UNKNOWN';
  const score = result.score ?? null;
  const fmt = (s: number | null) => (s != null ? s.toFixed(4) : 'N/A');
  process.stdout.write(` ${status} (${fmt(score)})\n`);

  // Print comparison
  const delta = (score ?? 0) - BASELINE.score;
  const tag = status === 'AUTHENTIC' ? '  << EVADED' : '';
  console.log('\n' + '='.repeat(60));
  console.log('  Horizontal flip test — fake.jpeg');
  console.log('='.repeat(60));
  console.log(`  ${'Variant'.padEnd(20)} ${'Status'.padEnd(14)} ${'Score'.padEnd(8)} Delta`);
  console.log(`  ${'─'.repeat(58)}`);
  console.log(
    `  ${'baseline (known)'.padEnd(20)} ${BASELINE.status.padEnd(14)} ${fmt(BASELINE.score).padEnd(8)} —`
  );
  console.log(
    `  ${'hflip'.padEnd(20)} ${status.padEnd(14)} ${fmt(score).padEnd(8)} ${(delta >= 0 ? '+' : '') + delta.toFixed(4)}${tag}`
  );
  console.log('');
}

main().catch(console.error);
