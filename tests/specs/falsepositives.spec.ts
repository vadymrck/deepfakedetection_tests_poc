import { test, expect } from '@playwright/test';
import { DetectionClient } from '~aom/DetectionClient.aom';
import { TEST_IMAGES } from '~fixtures/images.data';
import {
  toHaveStatus,
  toHaveScoreInRange,
  toHaveValidStatus,
  toHaveValidScoreShape,
  config,
} from '~support/index';

/**
 * False-positive sensitivity suite.
 *
 * Probes the detector's decision boundary by applying manipulations to a
 * known-real image that inject GAN-like visual characteristics.
 *
 * skin_smooth: aggressive face-region blur (σ=4) eliminates natural skin
 *   micro-texture, pushing the score above the 0.50 SUSPICIOUS threshold.
 *   This documents a real detector limitation: heavy post-processing
 *   can trigger a SUSPICIOUS classification on authentic content.
 *
 * freq_inject: GAN high-frequency residual at 15% weight paradoxically
 *   makes the image score MORE authentic (0.07 vs baseline 0.18),
 *   demonstrating low-amplitude frequency attacks are ineffective.
 *
 * API credits: 2 (one per variant)
 */
test.describe('False-Positive Sensitivity | Manipulated Real Inputs', () => {
  let client: DetectionClient;

  test.beforeEach(() => {
    client = new DetectionClient();
  });

  test(
    'Skin smoothing pushes real image into SUSPICIOUS range',
    { tag: ['@falsepositives', '@spatial'] },
    async () => {
      const img = TEST_IMAGES.variants.realSkinSmooth;

      await test.step(`Detect: ${img.description}`, async () => {
        const result = await client.detectFile(img.path);

        await test.step('Verify SUSPICIOUS classification', () => {
          toHaveStatus(result, 'SUSPICIOUS');
          toHaveScoreInRange(result, config.thresholds.suspiciousThreshold, 1.0);
        });

        await test.step('Verify SUSPICIOUS is a recognised valid status', () => {
          toHaveValidStatus(result);
          toHaveValidScoreShape(result);
          expect(
            config.validStatuses as readonly string[],
            'SUSPICIOUS must be in the valid status set'
          ).toContain('SUSPICIOUS');
        });
      });
    }
  );

  test(
    '15% GAN residual injection is flagged as SUSPICIOUS or MANIPULATED',
    { tag: ['@falsepositives', '@frequency'] },
    async () => {
      const img = TEST_IMAGES.variants.realFreqInject;

      await test.step(`Detect: ${img.description}`, async () => {
        const result = await client.detectFile(img.path);

        await test.step('Verify manipulated media is flagged as non-authentic', () => {
          expect(
            ['SUSPICIOUS', 'MANIPULATED'],
            `Expected SUSPICIOUS or MANIPULATED but got ${result.status} (score: ${result.score})`
          ).toContain(result.status);
          toHaveScoreInRange(result, config.thresholds.suspiciousThreshold, 1.0);
          toHaveValidStatus(result);
        });

        await test.step('Verify score shape', () => {
          toHaveValidScoreShape(result);
        });
      });
    }
  );
});
