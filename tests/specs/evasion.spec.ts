import { test } from '@playwright/test';
import { DetectionClient } from '~aom/DetectionClient.aom';
import { TEST_IMAGES } from '~fixtures/images.data';
import {
  toHaveStatus,
  toHaveScoreInRange,
  toHaveStableScore,
  toHaveValidScoreShape,
  config,
} from '~support/index';

/**
 * Evasion robustness suite.
 *
 * Applies common adversarial image transforms to a known fake and asserts
 * the detector maintains both its classification and numeric stability.
 *
 * All variant images are pre-generated — zero setup credits consumed.
 * Score stability is asserted via toHaveStableScore (max delta: 0.05).
 *
 * API credits: 3 (one per variant)
 */
test.describe('Evasion Robustness | Transform Resistance on Known Fake', () => {
  let client: DetectionClient;

  test.beforeEach(() => {
    client = new DetectionClient();
  });

  test(
    'Horizontal flip preserves MANIPULATED classification',
    { tag: ['@evasion', '@geometric'] },
    async () => {
      const img = TEST_IMAGES.variants.fakeHflip;

      await test.step(`Detect: ${img.description}`, async () => {
        const result = await client.detectFile(img.path);

        await test.step('Verify detection maintained', () => {
          toHaveStatus(result, 'MANIPULATED');
          toHaveScoreInRange(result, config.thresholds.fakeMinScore, 1.0);
        });

        await test.step('Verify score stability vs baseline', () => {
          toHaveStableScore(result, img.baselineScore, 'hflip');
          toHaveValidScoreShape(result);
        });
      });
    }
  );

  test(
    'JPEG recompression (q55→q85) preserves MANIPULATED classification',
    { tag: ['@evasion', '@compression'] },
    async () => {
      const img = TEST_IMAGES.variants.fakeRecompress;

      await test.step(`Detect: ${img.description}`, async () => {
        const result = await client.detectFile(img.path);

        await test.step('Verify detection maintained', () => {
          toHaveStatus(result, 'MANIPULATED');
          toHaveScoreInRange(result, config.thresholds.fakeMinScore, 1.0);
        });

        await test.step('Verify score stability vs baseline', () => {
          toHaveStableScore(result, img.baselineScore, 'jpeg-recompress');
          toHaveValidScoreShape(result);
        });
      });
    }
  );

  test(
    'Downscale/upscale transform preserves MANIPULATED classification',
    { tag: ['@evasion', '@scaling'] },
    async () => {
      const img = TEST_IMAGES.variants.fakeResizeDownUp;

      await test.step(`Detect: ${img.description}`, async () => {
        const result = await client.detectFile(img.path);

        await test.step('Verify detection maintained', () => {
          toHaveStatus(result, 'MANIPULATED');
          toHaveScoreInRange(result, config.thresholds.fakeMinScore, 1.0);
        });

        await test.step('Verify score stability vs baseline', () => {
          toHaveStableScore(result, img.baselineScore, 'resize-down-up');
          toHaveValidScoreShape(result);
        });
      });
    }
  );
});
