import type { StructuredRecipeLlm } from '@shared/types';
import { env } from '@server/lib/env';
import { structuredRecipeLlmSchema } from '@shared/schemas';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

function createClient() {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

function validateCompleteness(recipe: StructuredRecipeLlm): string[] {
  const errors: string[] = [];
  if (!recipe.title.trim()) {
    errors.push('title is required');
  }
  if (recipe.ingredients.length < 1) {
    errors.push('at least one ingredient is required');
  }
  if (recipe.instructions.length < 1) {
    errors.push('at least one instruction is required');
  }
  return errors;
}

const systemPrompt = `You convert recipe evidence into structured recipe JSON.
Rules:
- Prefer explicit source facts from cleaned article text and JSON-LD.
- Never invent ingredients, instructions, times, yield, or nutrition.
- If a field is missing from the source, set it null/empty.
- You may infer only clearly labeled metadata: tags, searchAliases, dishName, cuisine. List those in inferredFields.
- Mark pantry staples (salt, water, common oils/spices when ubiquitous) with pantryDefault=true.
- Preserve original ingredient lines in originalText.
- Extract imageUrl only if explicitly present in the evidence.`;

export async function parseRecipeFromEvidence(input: {
  cleanedText: string;
  jsonLd: unknown;
  sourceUrl?: string | null;
}): Promise<StructuredRecipeLlm> {
  const openai = createClient();
  const evidence = JSON.stringify(
    {
      sourceUrl: input.sourceUrl ?? null,
      cleanedText: input.cleanedText.slice(0, 60_000),
      jsonLd: input.jsonLd,
    },
    null,
    2
  );

  let feedback: string | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const userContent = feedback
      ? `Previous output failed validation:\n${feedback}\n\nFix the structured recipe using only source-backed facts.\n\nEvidence:\n${evidence}`
      : `Evidence:\n${evidence}`;

    const response = await openai.responses.parse({
      model: env.OPENAI_MODEL,
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      text: {
        format: zodTextFormat(structuredRecipeLlmSchema, 'recipe'),
      },
    });

    const parsed = response.output_parsed;
    if (!parsed) {
      feedback = 'Model returned no parsed recipe object';
      continue;
    }

    const recipe = structuredRecipeLlmSchema.parse(parsed);
    const errors = validateCompleteness(recipe);
    if (errors.length > 0) {
      feedback = errors.join('; ');
      continue;
    }

    if (recipe.imageUrl) {
      try {
        const parsedUrl = new URL(recipe.imageUrl);
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
          recipe.imageUrl = null;
        }
      } catch {
        recipe.imageUrl = null;
      }
    }

    return recipe;
  }

  throw new Error(feedback ?? 'Failed to parse recipe with OpenAI');
}
