import { closeDb } from '@server/db';
import { logger } from '@server/lib/logger';
import { createRecipe, listRecipes } from '@server/services/recipes/repository';

const existing = await listRecipes({});
if (existing.length > 0) {
  logger.info('Database already has recipes; skipping seed');
  closeDb();
  process.exit(0);
}

logger.info('Seeding sample recipe...');
await createRecipe({
  title: 'Weeknight Tomato Pasta',
  description: 'A simple pantry pasta with garlic, tomatoes, and olive oil.',
  yieldText: '2 servings',
  servings: 2,
  prepTimeMinutes: 10,
  cookTimeMinutes: 20,
  totalTimeMinutes: 30,
  cuisine: 'Italian',
  dishName: 'Tomato Pasta',
  searchAliases: ['pasta', 'tomato pasta', 'aglio e olio tomato'],
  tags: ['weeknight', 'pasta', 'vegetarian'],
  notes: 'Sample recipe for local development.',
  ingredients: [
    {
      originalText: '200 g spaghetti',
      name: 'spaghetti',
      amount: 200,
      unit: 'g',
      optional: false,
      pantryDefault: false,
    },
    {
      originalText: '3 garlic cloves, sliced',
      name: 'garlic',
      amount: 3,
      unit: 'clove',
      preparation: 'sliced',
      optional: false,
      pantryDefault: false,
    },
    {
      originalText: '400 g crushed tomatoes',
      name: 'crushed tomatoes',
      amount: 400,
      unit: 'g',
      optional: false,
      pantryDefault: false,
    },
    {
      originalText: '2 tbsp olive oil',
      name: 'olive oil',
      amount: 2,
      unit: 'tbsp',
      optional: false,
      pantryDefault: true,
    },
    {
      originalText: 'salt to taste',
      name: 'salt',
      qualitative: 'to taste',
      optional: false,
      pantryDefault: true,
    },
  ],
  instructions: [
    { text: 'Boil salted water and cook spaghetti until al dente.' },
    { text: 'Warm olive oil and gently cook garlic until fragrant.' },
    { text: 'Add crushed tomatoes, simmer 10 minutes, then toss with pasta.' },
  ],
});

logger.info('Seed complete');
closeDb();
