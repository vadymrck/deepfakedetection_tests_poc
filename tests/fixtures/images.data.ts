import path from 'path';
import type { ValidStatus } from '~support/config';

const ROOT = path.resolve(__dirname, '..', '..');
const DATA = path.join(ROOT, 'data');
const VARIANTS = path.join(DATA, 'variants');

export type ImageFixture = {
  readonly path: string;
  readonly description: string;
  readonly expectedStatus: ValidStatus;
  readonly baselineScore: number;
  readonly expectedScoreMin?: number;
  readonly expectedScoreMax?: number;
};

export const TEST_IMAGES = {
  fake: {
    path: path.join(DATA, 'fake.jpeg'),
    description: 'GAN-generated face — known fake',
    expectedStatus: 'MANIPULATED',
    baselineScore: 0.95,
    expectedScoreMin: 0.85,
  },
  real: {
    path: path.join(DATA, 'real.jpg'),
    description: 'Real photograph — known authentic',
    expectedStatus: 'AUTHENTIC',
    baselineScore: 0.18,
    expectedScoreMax: 0.3,
  },
  variants: {
    fakeHflip: {
      path: path.join(VARIANTS, 'fake_hflip.jpg'),
      description: 'Horizontally flipped fake — evasion attempt via .flop()',
      expectedStatus: 'MANIPULATED',
      baselineScore: 0.95,
      expectedScoreMin: 0.85,
    },
    fakeRecompress: {
      path: path.join(VARIANTS, 'fake_jpeg_recompress.jpg'),
      description: 'Double JPEG-recompressed fake — evasion via q55→q85',
      expectedStatus: 'MANIPULATED',
      baselineScore: 0.95,
      expectedScoreMin: 0.85,
    },
    fakeResizeDownUp: {
      path: path.join(VARIANTS, 'fake_resize_down_up.jpg'),
      description: 'Resize 50% down then back up — evasion via interpolation',
      expectedStatus: 'MANIPULATED',
      baselineScore: 0.95,
      expectedScoreMin: 0.85,
    },
    realSkinSmooth: {
      path: path.join(VARIANTS, 'real_skin_smooth.jpg'),
      description: 'Real with σ=4 face-region blur — false-positive attack via skin smoothing',
      expectedStatus: 'SUSPICIOUS',
      baselineScore: 0.54,
      expectedScoreMin: 0.5,
    },
    realFreqInject: {
      path: path.join(VARIANTS, 'real_freq_inject.jpg'),
      description: 'Real with 15% GAN residual injection — paradoxical frequency-domain attack',
      expectedStatus: 'AUTHENTIC',
      baselineScore: 0.07,
      expectedScoreMax: 0.3,
    },
  },
} as const satisfies {
  fake: ImageFixture;
  real: ImageFixture;
  variants: Record<string, ImageFixture>;
};
