import { env } from '@server/lib/env';
import { DEMO_ADDRESS } from './swiggy-fixtures';
import { DEMO_IMPORT_URL, DEMO_RECIPE_IMAGE_KEY, demoStructuredRecipe } from './recipe';

export function isDemoMode(): boolean {
  return env.DEMO_MODE;
}

export async function demoDelay(ms = 180): Promise<void> {
  if (!isDemoMode() || ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export { DEMO_ADDRESS, DEMO_IMPORT_URL, DEMO_RECIPE_IMAGE_KEY, demoStructuredRecipe };
