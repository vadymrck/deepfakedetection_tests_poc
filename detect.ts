import 'dotenv/config';
import { RealityDefender, RealityDefenderError } from '@realitydefender/realitydefender';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const apiKey = process.env.REALITY_DEFENDER_API_KEY;
if (!apiKey) {
  console.error('ERROR: REALITY_DEFENDER_API_KEY is not set.');
  console.error('Copy .env.example → .env and add your key from https://app.realitydefender.ai');
  process.exit(1);
}

const filePath = process.env.TEST_FILE_PATH ?? './sample.jpg';

const rd = new RealityDefender({ apiKey });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a minimal valid JPEG at the given path if it doesn't already exist.
 * This lets you run `npm run detect` out of the box without supplying a file.
 */
function ensureSampleFile(p: string): void {
  if (fs.existsSync(p)) return;

  // Smallest valid JPEG (1×1 white pixel)
  const minimalJpeg = Buffer.from(
    'ffd8ffe000104a46494600010100000100010000' +
      'ffdb004300080606070605080707070909080a0c' +
      '140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20' +
      '242e2720222c231c1c2837292c30313434341f27' +
      '39403d2e38' +
      '2e31343233' +
      'ffc0000b08000100010001011100' +
      'ffc4001f0000010501010101010100000000000000' +
      '000102030405060708090a0b' +
      'ffda00030101003f00fbd79fc0a0000fffd9',
    'hex'
  );
  fs.writeFileSync(p, minimalJpeg);
  console.log(`Created sample file: ${p}`);
}

function printResult(
  label: string,
  result: {
    status?: string;
    score?: number | null;
    models?: Array<{ name: string; status?: string; score?: number | null }>;
  }
): void {
  console.log(`\n--- ${label} ---`);
  console.log(`  Status : ${result.status ?? 'N/A'}`);
  console.log(
    `  Score  : ${result.score != null ? result.score.toFixed(4) : 'N/A'} (0 = real, 1 = fake)`
  );
  if (result.models && result.models.length > 0) {
    console.log('  Models :');
    for (const m of result.models) {
      const score = m.score != null ? m.score.toFixed(4) : 'N/A';
      console.log(`    • ${m.name} → ${m.status ?? 'N/A'} (${score})`);
    }
  }
}

// ---------------------------------------------------------------------------
// Method 1 — detect() — single call, SDK handles upload + polling internally
// ---------------------------------------------------------------------------

async function runDetect(): Promise<void> {
  console.log('\n[Method 1] detect() — one-shot upload + wait');
  try {
    const result = await rd.detect({ filePath });
    printResult('detect() result', result);
  } catch (err) {
    if (err instanceof RealityDefenderError) {
      console.error(`  RealityDefenderError [${err.code}]: ${err.message}`);
    } else {
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// Method 2 — upload() + getResult() — explicit two-step
// ---------------------------------------------------------------------------

async function runUploadThenGet(): Promise<void> {
  console.log('\n[Method 2] upload() + getResult() — two-step');
  try {
    const { requestId } = await rd.upload({ filePath });
    console.log(`  Uploaded. requestId: ${requestId}`);

    // Brief pause so the API has time to process before we poll once
    await new Promise((r) => setTimeout(r, 5000));

    const result = await rd.getResult(requestId);
    printResult('getResult() result', result);
  } catch (err) {
    if (err instanceof RealityDefenderError) {
      console.error(`  RealityDefenderError [${err.code}]: ${err.message}`);
    } else {
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// Method 3 — upload() + pollForResults() — event-driven async
// ---------------------------------------------------------------------------

async function runPollEvents(): Promise<void> {
  console.log('\n[Method 3] pollForResults() — event-driven polling');
  const { requestId } = await rd.upload({ filePath });
  console.log(`  Uploaded. requestId: ${requestId}`);

  return new Promise((resolve) => {
    let resolved = false;
    const done = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    rd.pollForResults(requestId, { pollingInterval: 3000, timeout: 60000 });

    rd.on(
      'result',
      (result: {
        status?: string;
        score?: number | null;
        models?: Array<{ name: string; status?: string; score?: number | null }>;
      }) => {
        printResult('pollForResults() result', result);
        done();
      }
    );

    rd.on('error', (err: Error) => {
      console.error(`  Poll error: ${err.message}`);
      done();
    });
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const absPath = path.resolve(filePath);
  ensureSampleFile(absPath);

  console.log('='.repeat(60));
  console.log('  Reality Defender — Deepfake Detection POC');
  console.log('='.repeat(60));
  console.log(`  File : ${absPath}`);
  console.log(`  Key  : ${apiKey!.slice(0, 8)}${'*'.repeat(Math.max(0, apiKey!.length - 8))}`);

  await runDetect();
  await runUploadThenGet();
  await runPollEvents();

  console.log('\n' + '='.repeat(60));
  console.log('  Done.');
  console.log('='.repeat(60));
}

main().catch(console.error);
