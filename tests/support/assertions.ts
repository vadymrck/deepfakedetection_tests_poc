import { expect } from '@playwright/test';
import type { DetectionResult } from '@realitydefender/realitydefender';
import config, { type ValidStatus } from './config';

export function toHaveStatus(result: DetectionResult, expected: ValidStatus): void {
  expect(
    result.status,
    `Expected status "${expected}" but got "${result.status}" (score: ${result.score})`
  ).toBe(expected);
}

export function toHaveScoreInRange(result: DetectionResult, min: number, max: number): void {
  expect(result.score, 'Score must not be null — result may still be processing').not.toBeNull();

  const score = result.score as number;
  expect(score, `Score ${score} is below minimum ${min}`).toBeGreaterThanOrEqual(min);
  expect(score, `Score ${score} exceeds maximum ${max}`).toBeLessThanOrEqual(max);
}

export function toHaveValidScoreShape(result: DetectionResult): void {
  if (result.score !== null) {
    expect(result.score, 'Score must be >= 0').toBeGreaterThanOrEqual(0);
    expect(result.score, 'Score must be <= 1').toBeLessThanOrEqual(1);
  }
}

export function toHaveEnsembleModel(result: DetectionResult): void {
  const names = result.models.map((m) => m.name);
  expect(names, `Expected "rd-img-ensemble" in models. Got: [${names.join(', ')}]`).toContain(
    'rd-img-ensemble'
  );
}

export function toHaveValidModels(result: DetectionResult): void {
  expect(result.models.length, 'Expected at least one model in result.models').toBeGreaterThan(0);

  for (const model of result.models) {
    expect(typeof model.name, `Model name must be a string`).toBe('string');
    expect(model.name.length, `Model name must not be empty`).toBeGreaterThan(0);

    if (model.score !== null) {
      expect(model.score, `Model "${model.name}" score must be >= 0`).toBeGreaterThanOrEqual(0);
      expect(model.score, `Model "${model.name}" score must be <= 1`).toBeLessThanOrEqual(1);
    }
  }
}

export function toHaveValidStatus(result: DetectionResult): void {
  expect(
    config.validStatuses as readonly string[],
    `Status "${result.status}" is not a known valid status`
  ).toContain(result.status);
}

export function toHaveStableScore(result: DetectionResult, baseline: number, label: string): void {
  const score = result.score as number;
  const delta = Math.abs(score - baseline);
  expect(
    delta,
    `${label}: score ${score.toFixed(4)} drifted ${delta.toFixed(4)} from baseline ${baseline} — max allowed: ${config.thresholds.maxBaselineDelta}`
  ).toBeLessThanOrEqual(config.thresholds.maxBaselineDelta);
}
