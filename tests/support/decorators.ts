import { test } from '@playwright/test';

/**
 * Wraps an async AOM class method in a Playwright trace step.
 * Adapted from the UI POM @step() pattern for API Object Model use.
 *
 * Handles both TC39 Stage 3 decorators (Playwright's transform) and
 * legacy experimentalDecorators. The method name is used as the step
 * label unless a custom label is provided.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function step(label?: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (originalOrTarget: any, contextOrKey: any, descriptor?: any) {
    // TC39 Stage 3: first arg is the original method, second is ClassMethodDecoratorContext
    if (typeof originalOrTarget === 'function' && typeof contextOrKey === 'object') {
      const original = originalOrTarget;
      const stepLabel = label ?? String(contextOrKey.name);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return function (this: unknown, ...args: any[]) {
        return test.step(stepLabel, () => original.apply(this, args));
      };
    }

    // Legacy experimentalDecorators: descriptor is provided
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const original = descriptor.value as (...args: any[]) => Promise<unknown>;
    const stepLabel =
      label ?? (typeof contextOrKey === 'string' ? contextOrKey : String(contextOrKey));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptor.value = function (this: unknown, ...args: any[]) {
      return test.step(stepLabel, () => original.apply(this, args));
    };
    return descriptor;
  };
}
