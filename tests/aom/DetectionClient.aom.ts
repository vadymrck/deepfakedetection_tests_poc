import { RealityDefender, RealityDefenderError } from '@realitydefender/realitydefender';
import type { DetectionResult } from '@realitydefender/realitydefender';
import { step } from '~support/decorators';
import config from '~support/config';

export type { DetectionResult };
export { RealityDefenderError };

/**
 * API Object Model for the deepfake detection service.
 *
 * Wraps the detection SDK so spec files never import it directly.
 * Every public method carries a @step() decorator for Playwright trace visibility.
 * All SDK method contracts are tested through this single boundary.
 */
export class DetectionClient {
  private readonly rd: RealityDefender;

  constructor(apiKey: string = config.apiKey) {
    this.rd = new RealityDefender({ apiKey });
  }

  // Actions

  /**
   * One-shot detection: SDK handles upload and polling internally.
   * Costs 1 API credit.
   */
  @step()
  async detectFile(filePath: string): Promise<DetectionResult> {
    return this.rd.detect(
      { filePath },
      {
        pollingInterval: config.polling.interval,
        maxAttempts: config.polling.maxAttempts,
      }
    );
  }

  /**
   * Two-step detection: explicit upload followed by polling via getResult().
   * Verifies the upload() + getResult() contract produces the same verdict as detect().
   * Costs 1 API credit.
   */
  @step()
  async uploadAndGetResult(filePath: string): Promise<DetectionResult> {
    const { requestId } = await this.rd.upload({ filePath });
    return this.rd.getResult(requestId, {
      pollingInterval: config.polling.interval,
      maxAttempts: config.polling.maxAttempts,
    });
  }

  /**
   * Event-driven detection: upload then receive result via the 'result' event.
   * Verifies the pollForResults() event emitter contract.
   * Costs 1 API credit.
   */
  @step()
  async uploadAndPollEvents(
    filePath: string,
    opts: { pollingInterval?: number; timeout?: number } = {}
  ): Promise<DetectionResult> {
    const pollingInterval = opts.pollingInterval ?? config.polling.interval;
    const timeout = opts.timeout ?? config.polling.timeout;

    const { requestId } = await this.rd.upload({ filePath });

    return new Promise<DetectionResult>((resolve, reject) => {
      const cleanup = () => {
        this.rd.removeAllListeners('result');
        this.rd.removeAllListeners('error');
      };

      this.rd.once('result', (result: DetectionResult) => {
        cleanup();
        resolve(result);
      });

      this.rd.once('error', (err: RealityDefenderError) => {
        cleanup();
        reject(err);
      });

      this.rd.pollForResults(requestId, { pollingInterval, timeout });
    });
  }

  /**
   * Attempt detection on an invalid file path.
   * Expected to throw RealityDefenderError with code 'invalid_file'
   * before any network call is made. Costs 0 API credits.
   */
  @step()
  async detectInvalidPath(filePath: string): Promise<never> {
    return this.rd.detect({ filePath }) as Promise<never>;
  }
}

/**
 * Creates a DetectionClient with a syntactically valid but unauthorized API key.
 * Used in edge case tests to exercise the HTTP 401 path.
 */
export function createClientWithInvalidKey(key: string): DetectionClient {
  return new DetectionClient(key);
}
