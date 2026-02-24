import { test, expect } from '@playwright/test';
import { DetectionClient } from '~aom/DetectionClient.aom';
import { TEST_IMAGES } from '~fixtures/images.data';
import {
  toHaveStatus,
  toHaveScoreInRange,
  toHaveEnsembleModel,
  toHaveValidModels,
  toHaveValidStatus,
  toHaveValidScoreShape,
  config,
} from '~support/index';

/**
 * Core detection correctness suite.
 *
 * Verifies the API correctly classifies ground-truth images and that
 * all three SDK calling patterns (detect, upload+getResult, pollForResults)
 * produce equivalent, valid results.
 *
 * API credits: 4
 */
test.describe('Core Detection | Authentic vs Manipulated Classification', () => {
  let client: DetectionClient;

  test.beforeEach(() => {
    client = new DetectionClient();
  });

  test(
    'Known fake is classified as MANIPULATED (score >= fakeMinScore)',
    { tag: ['@detection', '@fake'] },
    async () => {
      await test.step('Upload and detect', async () => {
        const result = await client.detectFile(TEST_IMAGES.fake.path);

        await test.step('Verify classification', () => {
          toHaveStatus(result, 'MANIPULATED');
          toHaveScoreInRange(result, config.thresholds.fakeMinScore, 1.0);
        });

        await test.step('Verify result structure', () => {
          toHaveEnsembleModel(result);
          toHaveValidModels(result);
          toHaveValidScoreShape(result);
          expect(result.requestId, 'requestId must be a non-empty string').toBeTruthy();
        });
      });
    }
  );

  test(
    'Known real is classified as AUTHENTIC (score <= realMaxScore)',
    { tag: ['@detection', '@real'] },
    async () => {
      await test.step('Upload and detect', async () => {
        const result = await client.detectFile(TEST_IMAGES.real.path);

        await test.step('Verify classification', () => {
          toHaveStatus(result, 'AUTHENTIC');
          toHaveScoreInRange(result, 0, config.thresholds.realMaxScore);
        });

        await test.step('Verify result structure', () => {
          toHaveEnsembleModel(result);
          toHaveValidModels(result);
          toHaveValidScoreShape(result);
          expect(result.requestId, 'requestId must be a non-empty string').toBeTruthy();
        });
      });
    }
  );

  test(
    'upload + getResult matches detect verdict for known fake',
    { tag: ['@detection', '@sdk-contract'] },
    async () => {
      await test.step('Upload then poll via getResult()', async () => {
        const result = await client.uploadAndGetResult(TEST_IMAGES.fake.path);

        await test.step('Verify verdict matches detect() baseline', () => {
          toHaveStatus(result, 'MANIPULATED');
          toHaveScoreInRange(result, config.thresholds.fakeMinScore, 1.0);
          toHaveValidStatus(result);
          toHaveEnsembleModel(result);
          toHaveValidScoreShape(result);
        });
      });
    }
  );

  test(
    'pollForResults returns AUTHENTIC verdict for known real',
    { tag: ['@detection', '@sdk-contract'] },
    async () => {
      await test.step('Upload then receive result via event emitter', async () => {
        const result = await client.uploadAndPollEvents(TEST_IMAGES.real.path);

        await test.step('Verify verdict and structure', () => {
          toHaveStatus(result, 'AUTHENTIC');
          toHaveScoreInRange(result, 0, config.thresholds.realMaxScore);
          toHaveValidStatus(result);
          toHaveEnsembleModel(result);
          toHaveValidScoreShape(result);
        });
      });
    }
  );
});
