import { test, expect } from '@playwright/test';
import {
  DetectionClient,
  RealityDefenderError,
  createClientWithInvalidKey,
} from '~aom/DetectionClient.aom';
import { TEST_IMAGES } from '~fixtures/images.data';

/**
 * Edge cases and error handling suite.
 *
 * Tests that the SDK fails gracefully and at the right layer:
 *   - Empty API key → synchronous constructor throw (0 credits)
 *   - Invalid file path → local file-system check, pre-network (0 credits)
 *   - Invalid API key → HTTP 401 from the API (0 successful detection credits; 1 network attempt)
 *
 * Successful detection credits: 0
 * Network attempts: 1 (only the unauthorized key test reaches the network)
 */
test.describe('Edge Cases | Validation and Error Semantics', () => {
  test(
    'Empty API key throws RealityDefenderError at client construction',
    { tag: ['@edge', '@auth', '@ci'] },
    () => {
      expect(
        () => new DetectionClient(''),
        'Empty API key must throw RealityDefenderError synchronously'
      ).toThrow(RealityDefenderError);
    }
  );

  test(
    'Empty API key error exposes code unauthorized',
    { tag: ['@edge', '@auth', '@ci'] },
    () => {
      let caught: unknown;
      try {
        new DetectionClient('');
      } catch (err) {
        caught = err;
      }

      expect(caught, 'Must throw an instance of RealityDefenderError').toBeInstanceOf(
        RealityDefenderError
      );
      expect((caught as RealityDefenderError).code, 'Error code must be "unauthorized"').toBe(
        'unauthorized'
      );
    }
  );

  test(
    'Invalid file path fails locally with invalid_file',
    { tag: ['@edge', '@filesystem'] },
    async () => {
      const client = new DetectionClient();
      const nonExistent = '/tmp/deepfakedetection-tests-nonexistent-file.jpg';

      await expect(
        client.detectInvalidPath(nonExistent),
        'Must carry error code "invalid_file" — thrown locally before any network call'
      ).rejects.toMatchObject({ code: 'invalid_file' });
    }
  );

  test(
    'Unauthorized API key fails with unauthorized',
    { tag: ['@edge', '@auth', '@network'] },
    async () => {
      const client = createClientWithInvalidKey('deepfakedetection-invalid-key-edge-test');

      await expect(
        client.detectFile(TEST_IMAGES.fake.path),
        'Must carry error code "unauthorized" for an invalid API key'
      ).rejects.toMatchObject({ code: 'unauthorized' });
    }
  );
});
