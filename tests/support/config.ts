import 'dotenv/config';

export type ValidStatus = 'AUTHENTIC' | 'MANIPULATED' | 'SUSPICIOUS' | 'UNKNOWN';

const config = {
  apiKey: process.env.REALITY_DEFENDER_API_KEY ?? '',

  thresholds: {
    fakeMinScore: 0.85,
    realMaxScore: 0.3,
    suspiciousThreshold: 0.5,
    maxBaselineDelta: 0.05,
  },

  polling: {
    interval: 3_000,
    timeout: 90_000,
    get maxAttempts(): number {
      return Math.ceil(this.timeout / this.interval);
    },
  },

  knownModels: [
    'rd-img-ensemble',
    'rd-pine-img',
    'rd-full-pine-img',
    'rd-full-elm-img',
    'rd-elm-img',
    'rd-context-img',
    'rd-full-cedar-img',
    'rd-cedar-img',
    'rd-oak-img',
    'rd-full-oak-img',
  ] as const,

  validStatuses: [
    'AUTHENTIC',
    'MANIPULATED',
    'SUSPICIOUS',
    'UNKNOWN',
  ] as const satisfies readonly ValidStatus[],

  expectedModelCount: 10,
} as const;

export default config;
