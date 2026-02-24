# Deepfake Detection API — Test Suite

## Overview

Playwright API test framework using an **API Object Model (AOM)** pattern — the API
equivalent of the Page Object Model. Tests run against the live detection API with no
mocks. Total budget: 9 successful detection credits per full run
(plus 1 unauthorized network attempt in edge tests).

---

## What Is Tested and Why

### Core Detection (`tests/specs/detection.spec.ts`) — 4 successful detection credits

Verifies the fundamental correctness guarantee: a GAN-generated face scores as
MANIPULATED and a real photograph scores as AUTHENTIC. Also validates that all three
SDK calling patterns produce equivalent, structurally valid results.

| Test                                    | Credit | Rationale                                     |
| --------------------------------------- | ------ | --------------------------------------------- |
| Known fake → MANIPULATED, score ≥ 0.85  | 1      | Happy path: detector works on clear fake      |
| Known real → AUTHENTIC, score ≤ 0.30    | 1      | Happy path: detector works on clear real      |
| `upload()` + `getResult()` same verdict | 1      | SDK method contract: two-step equals one-shot |
| `pollForResults()` event-driven verdict | 1      | SDK event emitter contract                    |

### Evasion Robustness (`tests/specs/evasion.spec.ts`) — 3 successful detection credits

Verifies the detector is stable against low-effort adversarial transforms. Each test
asserts both the classification (MANIPULATED) and numeric stability (score delta from
known baseline ≤ 0.05). All variant images are pre-generated — zero setup credits.

| Test               | Transform                | Credit |
| ------------------ | ------------------------ | ------ |
| Horizontal flip    | `.flop()` — geometric    | 1      |
| JPEG recompression | q55 → q85 double pass    | 1      |
| Resize down + up   | 50% → 100% interpolation | 1      |

All three transforms produced zero score movement in the PoC run (Δ = 0.00), confirming
the ensemble operates on semantic/structural features not pixel-level artifacts.

### False-Positive Sensitivity (`tests/specs/falsepositives.spec.ts`) — 2 successful detection credits

Probes the decision boundary by injecting GAN-like characteristics into a real image.

| Test                 | Attack                                        | Result            | Credit |
| -------------------- | --------------------------------------------- | ----------------- | ------ |
| Face-region blur σ=4 | `skin_smooth` — eliminates skin micro-texture | SUSPICIOUS (0.54) | 1      |
| GAN residual 15%     | `freq_inject` — injects frequency fingerprint | AUTHENTIC (0.07)  | 1      |

The skin-smoothing result documents a real detector limitation: aggressive post-processing
on authentic content can cross the SUSPICIOUS threshold. This is expected behavior for a
detector trained on GAN smooth-skin artifacts — not a bug.

### Edge Cases (`tests/specs/edge.spec.ts`) — 0 successful detection credits

Tests that the SDK fails at the correct layer with the correct error code.

| Test                                | Layer                               | Credit |
| ----------------------------------- | ----------------------------------- | ------ |
| Empty API key                       | Constructor (synchronous throw)     | 0      |
| Empty key error code `unauthorized` | Constructor                         | 0      |
| Invalid file path `invalid_file`    | Local filesystem check, pre-network | 0      |
| Valid-format but unauthorized key   | HTTP 401 from API                   | 0 successful detection credits (1 network attempt) |

---

## Credit Usage

| Suite                  | Tests  | Successful Detection Credits |
| ---------------------- | ------ | ---------------------------- |
| detection.spec.ts      | 4      | 4                            |
| evasion.spec.ts        | 3      | 3                            |
| falsepositives.spec.ts | 2      | 2                            |
| edge.spec.ts           | 4      | 0                            |
| **Total**              | **13** | **9**                        |

---

## How to Run

```bash
# Prerequisites
npm install
cp .env.example .env          # add REALITY_DEFENDER_API_KEY

# Full suite (9 successful detection credits)
npm test

# Individual suites
npm run test:detection         # 4 successful detection credits
npm run test:evasion           # 3 successful detection credits
npm run test:falsepositives    # 2 successful detection credits
npm run test:edge              # 0 successful detection credits (1 unauthorized network attempt)

# HTML report (after any run)
npm run test:report
```

---

## Test Data

All files are pre-generated. No API calls are made during test setup.

| File                                     | Description                   | Known Result            |
| ---------------------------------------- | ----------------------------- | ----------------------- |
| `data/fake.jpeg`                         | GAN-generated face            | MANIPULATED, score 0.95 |
| `data/real.jpg`                          | Real photograph               | AUTHENTIC, score 0.18   |
| `data/variants/fake_hflip.jpg`           | Horizontally flipped fake     | MANIPULATED, score 0.95 |
| `data/variants/fake_jpeg_recompress.jpg` | Double JPEG-recompressed fake | MANIPULATED, score 0.95 |
| `data/variants/fake_resize_down_up.jpg`  | Resize 50% down then up       | MANIPULATED, score 0.95 |
| `data/variants/real_skin_smooth.jpg`     | Real with face-region blur    | SUSPICIOUS, score 0.54  |
| `data/variants/real_freq_inject.jpg`     | Real with 15% GAN residual    | AUTHENTIC, score 0.07   |

Variants were generated by `evasion.ts` and `falsepositives.ts` using Sharp (no API calls).
To regenerate: `npm run evasion` and `npm run falsepositives`.

---

## Architecture

This framework uses an **API Object Model (AOM)**: Page Object Model principles applied
to API boundaries through a typed client layer.

`tests/aom/DetectionClient.aom.ts` is the single integration boundary for SDK calls, while
spec files focus only on behavior and assertions.

Key properties:

- Single SDK import point to reduce coupling and simplify future SDK changes
- Reusable client methods (`detectFile`, `uploadAndGetResult`, `uploadAndPollEvents`)
- `@step()` instrumentation on client methods for traceable Playwright reports
- Centralized async/event handling logic kept out of test specs

---

## Thresholds

| Threshold             | Value     | Rationale                                     |
| --------------------- | --------- | --------------------------------------------- |
| `fakeMinScore`        | 0.85      | Baseline 0.95 — 10pp buffer for model drift   |
| `realMaxScore`        | 0.30      | Baseline 0.18 — 12pp buffer                   |
| `suspiciousThreshold` | 0.50      | API boundary; `real_skin_smooth` scored 0.54  |
| `maxBaselineDelta`    | 0.05      | All evasion transforms showed Δ = 0.00 in PoC |
| Polling interval      | 3 000 ms  | Below SDK default (5 000 ms) for faster runs  |
| Test timeout          | 90 000 ms | Covers 18 polling rounds at 5 s each          |

---

## Configuration

All thresholds, model names, and polling settings are centralised in
`tests/support/config.ts`. Spec files never hardcode values.

`playwright.config.ts` enforces:

- `workers: 1` — serial execution for deterministic credit spend
- `retries: 0` — no retries; each retry consumes an additional API credit
- `timeout: 90_000` — matches maximum expected polling duration
