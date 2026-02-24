# deepfakedetection-tests-poc

Deepfake detection API test framework built on Playwright. Uses the detection service SDK to validate classification accuracy, evasion robustness, and false-positive sensitivity against real media files.

## Quick Start

```bash
npm install
cp .env.example .env        # add your API key
npm test                    # run full suite (9 successful detection credits)
```

Get an API key at `https://app.realitydefender.ai` → Settings → API Keys.

## Project Structure

```
.
├── detect.ts               SDK usage demo — 3 calling patterns
├── evasion.ts              Evasion attack runner (generates fake variants)
├── falsepositives.ts       False-positive attack runner (generates real variants)
├── data/
│   ├── fake.jpeg           Known fake — GAN-generated face
│   ├── real.jpg            Known real — authentic photograph
│   └── variants/           Pre-generated adversarial variants
└── tests/
    ├── specs/              Test files (4 suites, 13 tests)
    ├── aom/                API Object Model — SDK wrapper
    ├── fixtures/           Typed test data with known baselines
    └── support/            Config, assertions, @step() decorator
```

## Test Suites

| Suite                    | Tests | Successful Detection Credits | What it covers                                   |
| ------------------------ | ----- | ---------------------------- | ------------------------------------------------ |
| `detection.spec.ts`      | 4     | 4                            | Core classification + all 3 SDK method contracts |
| `evasion.spec.ts`        | 3     | 3                            | Detector stability under image transforms        |
| `falsepositives.spec.ts` | 2     | 2                            | Decision boundary on manipulated real images     |
| `edge.spec.ts`           | 4     | 0                            | Error handling, auth failures, invalid inputs    |

Full suite: **9 successful detection credits** (+ 1 unauthorized network attempt in `edge.spec.ts`).
Free tier allows 50/month.

## Commands

```bash
npm test                        # all 13 tests
npm run test:detection          # 4 successful detection credits
npm run test:evasion            # 3 successful detection credits
npm run test:falsepositives     # 2 successful detection credits
npm run test:edge               # 0 successful detection credits (1 unauthorized network attempt)
npm run test:report             # open HTML report
```

## Exploratory Scripts

```bash
npm run detect                  # run all 3 SDK detection patterns
npm run evasion                 # generate + test fake image variants
npm run falsepositives          # generate + test real image variants
```

## Known Baselines

| File                                     | Status      | Score |
| ---------------------------------------- | ----------- | ----- |
| `data/fake.jpeg`                         | MANIPULATED | 0.95  |
| `data/real.jpg`                          | AUTHENTIC   | 0.18  |
| `data/variants/fake_hflip.jpg`           | MANIPULATED | 0.95  |
| `data/variants/fake_jpeg_recompress.jpg` | MANIPULATED | 0.95  |
| `data/variants/fake_resize_down_up.jpg`  | MANIPULATED | 0.95  |
| `data/variants/real_skin_smooth.jpg`     | SUSPICIOUS  | 0.54  |
| `data/variants/real_freq_inject.jpg`     | AUTHENTIC   | 0.07  |

See `TESTING.md` for full test documentation, architecture decisions, and threshold rationale.
