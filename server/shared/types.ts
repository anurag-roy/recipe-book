import type { z } from 'zod';
import type {
  basketLineSchema,
  cartReviewSchema,
  dishOfferSchema,
  foodProposalSchema,
  importJobSchema,
  ingredientBasketSchema,
  ingredientSchema,
  instructionSchema,
  recipeSchema,
  structuredRecipeLlmSchema,
  swiggyAddressSchema,
} from './schemas';

export type Recipe = z.infer<typeof recipeSchema>;
export type Ingredient = z.infer<typeof ingredientSchema>;
export type Instruction = z.infer<typeof instructionSchema>;
export type StructuredRecipeLlm = z.infer<typeof structuredRecipeLlmSchema>;
export type ImportJob = z.infer<typeof importJobSchema>;
export type SwiggyAddress = z.infer<typeof swiggyAddressSchema>;
export type DishOffer = z.infer<typeof dishOfferSchema>;
export type FoodProposal = z.infer<typeof foodProposalSchema>;
export type IngredientBasket = z.infer<typeof ingredientBasketSchema>;
export type BasketLine = z.infer<typeof basketLineSchema>;
export type CartReview = z.infer<typeof cartReviewSchema>;

export type RecipeSummary = {
  id: number;
  title: string;
  description: string | null;
  dishName: string | null;
  favorite: boolean;
  tags: string[];
  imageObjectKey: string | null;
  imageWarning: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SwiggyConnectionStatus = {
  connected: boolean;
  expiresAt: string | null;
  preferredAddress: SwiggyAddress | null;
  privacyDisclosure: string;
};
