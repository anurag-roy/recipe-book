import type { Recipe } from '@shared/types';
import { Button } from '@client/components/ui/button';
import { Input } from '@client/components/ui/input';
import { Label } from '@client/components/ui/label';
import { Textarea } from '@client/components/ui/textarea';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';

export type RecipeFormValue = {
  title: string;
  description: string;
  yieldText: string;
  servings: string;
  cuisine: string;
  dishName: string;
  tags: string;
  notes: string;
  ingredients: Array<{
    originalText: string;
    name: string;
    amount: string;
    unit: string;
    qualitative: string;
    optional: boolean;
    pantryDefault: boolean;
  }>;
  instructions: Array<{ text: string }>;
};

export function emptyRecipeForm(): RecipeFormValue {
  return {
    title: '',
    description: '',
    yieldText: '',
    servings: '',
    cuisine: '',
    dishName: '',
    tags: '',
    notes: '',
    ingredients: [
      { originalText: '', name: '', amount: '', unit: '', qualitative: '', optional: false, pantryDefault: false },
    ],
    instructions: [{ text: '' }],
  };
}

export function recipeToForm(recipe: Recipe): RecipeFormValue {
  return {
    title: recipe.title,
    description: recipe.description ?? '',
    yieldText: recipe.yieldText ?? '',
    servings: recipe.servings?.toString() ?? '',
    cuisine: recipe.cuisine ?? '',
    dishName: recipe.dishName ?? '',
    tags: recipe.tags.join(', '),
    notes: recipe.notes ?? '',
    ingredients:
      recipe.ingredients.length > 0
        ? recipe.ingredients.map((ingredient) => ({
            originalText: ingredient.originalText,
            name: ingredient.name,
            amount: ingredient.quantity?.amount?.toString() ?? '',
            unit: ingredient.quantity?.unit ?? '',
            qualitative: ingredient.quantity?.qualitative ?? '',
            optional: ingredient.optional,
            pantryDefault: ingredient.pantryDefault,
          }))
        : emptyRecipeForm().ingredients,
    instructions:
      recipe.instructions.length > 0
        ? recipe.instructions.map((instruction) => ({ text: instruction.text }))
        : emptyRecipeForm().instructions,
  };
}

export function formToPayload(form: RecipeFormValue) {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    yieldText: form.yieldText.trim() || null,
    servings: form.servings ? Number(form.servings) : null,
    cuisine: form.cuisine.trim() || null,
    dishName: form.dishName.trim() || null,
    tags: form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    searchAliases: [],
    notes: form.notes.trim() || null,
    ingredients: form.ingredients
      .filter((ingredient) => ingredient.originalText.trim() || ingredient.name.trim())
      .map((ingredient, index) => ({
        originalText: ingredient.originalText.trim() || ingredient.name.trim(),
        name: ingredient.name.trim() || ingredient.originalText.trim(),
        quantity: {
          amount: ingredient.amount ? Number(ingredient.amount) : undefined,
          unit: ingredient.unit.trim() || undefined,
          qualitative: ingredient.qualitative.trim() || undefined,
        },
        optional: ingredient.optional,
        pantryDefault: ingredient.pantryDefault,
        position: index,
      })),
    instructions: form.instructions
      .filter((instruction) => instruction.text.trim())
      .map((instruction, index) => ({ text: instruction.text.trim(), position: index })),
  };
}

export function RecipeForm({
  initial,
  submitting,
  onSubmit,
}: {
  initial?: RecipeFormValue;
  submitting?: boolean;
  onSubmit: (value: RecipeFormValue) => void;
}) {
  const [form, setForm] = useState<RecipeFormValue>(initial ?? emptyRecipeForm());

  return (
    <form
      className='space-y-6'
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(form);
      }}
    >
      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='space-y-2 sm:col-span-2'>
          <Label htmlFor='title'>Title</Label>
          <Input
            id='title'
            required
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          />
        </div>
        <div className='space-y-2 sm:col-span-2'>
          <Label htmlFor='description'>Description</Label>
          <Textarea
            id='description'
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='dishName'>Dish name</Label>
          <Input
            id='dishName'
            value={form.dishName}
            onChange={(event) => setForm((current) => ({ ...current, dishName: event.target.value }))}
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='cuisine'>Cuisine</Label>
          <Input
            id='cuisine'
            value={form.cuisine}
            onChange={(event) => setForm((current) => ({ ...current, cuisine: event.target.value }))}
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='servings'>Servings</Label>
          <Input
            id='servings'
            type='number'
            min='0'
            step='any'
            value={form.servings}
            onChange={(event) => setForm((current) => ({ ...current, servings: event.target.value }))}
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='yieldText'>Yield text</Label>
          <Input
            id='yieldText'
            value={form.yieldText}
            onChange={(event) => setForm((current) => ({ ...current, yieldText: event.target.value }))}
          />
        </div>
        <div className='space-y-2 sm:col-span-2'>
          <Label htmlFor='tags'>Tags (comma separated)</Label>
          <Input
            id='tags'
            value={form.tags}
            onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
          />
        </div>
      </div>

      <section className='space-y-3'>
        <div className='flex items-center justify-between'>
          <h2 className='font-medium'>Ingredients</h2>
          <Button
            type='button'
            size='sm'
            variant='outline'
            onClick={() =>
              setForm((current) => ({
                ...current,
                ingredients: [
                  ...current.ingredients,
                  {
                    originalText: '',
                    name: '',
                    amount: '',
                    unit: '',
                    qualitative: '',
                    optional: false,
                    pantryDefault: false,
                  },
                ],
              }))
            }
          >
            <PlusIcon />
            Add
          </Button>
        </div>
        {form.ingredients.map((ingredient, index) => (
          <div key={index} className='grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-6'>
            <Input
              className='sm:col-span-3'
              placeholder='Original line'
              value={ingredient.originalText}
              onChange={(event) =>
                setForm((current) => {
                  const ingredients = [...current.ingredients];
                  ingredients[index] = { ...ingredient, originalText: event.target.value };
                  return { ...current, ingredients };
                })
              }
            />
            <Input
              className='sm:col-span-2'
              placeholder='Name'
              value={ingredient.name}
              onChange={(event) =>
                setForm((current) => {
                  const ingredients = [...current.ingredients];
                  ingredients[index] = { ...ingredient, name: event.target.value };
                  return { ...current, ingredients };
                })
              }
            />
            <Button
              type='button'
              size='icon'
              variant='ghost'
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  ingredients: current.ingredients.filter((_, itemIndex) => itemIndex !== index),
                }))
              }
            >
              <Trash2Icon />
            </Button>
            <Input
              placeholder='Amount'
              value={ingredient.amount}
              onChange={(event) =>
                setForm((current) => {
                  const ingredients = [...current.ingredients];
                  ingredients[index] = { ...ingredient, amount: event.target.value };
                  return { ...current, ingredients };
                })
              }
            />
            <Input
              placeholder='Unit'
              value={ingredient.unit}
              onChange={(event) =>
                setForm((current) => {
                  const ingredients = [...current.ingredients];
                  ingredients[index] = { ...ingredient, unit: event.target.value };
                  return { ...current, ingredients };
                })
              }
            />
            <Input
              className='sm:col-span-2'
              placeholder='Qualitative'
              value={ingredient.qualitative}
              onChange={(event) =>
                setForm((current) => {
                  const ingredients = [...current.ingredients];
                  ingredients[index] = { ...ingredient, qualitative: event.target.value };
                  return { ...current, ingredients };
                })
              }
            />
            <label className='flex items-center gap-2 text-sm'>
              <input
                type='checkbox'
                checked={ingredient.optional}
                onChange={(event) =>
                  setForm((current) => {
                    const ingredients = [...current.ingredients];
                    ingredients[index] = { ...ingredient, optional: event.target.checked };
                    return { ...current, ingredients };
                  })
                }
              />
              Optional
            </label>
            <label className='flex items-center gap-2 text-sm'>
              <input
                type='checkbox'
                checked={ingredient.pantryDefault}
                onChange={(event) =>
                  setForm((current) => {
                    const ingredients = [...current.ingredients];
                    ingredients[index] = { ...ingredient, pantryDefault: event.target.checked };
                    return { ...current, ingredients };
                  })
                }
              />
              Pantry
            </label>
          </div>
        ))}
      </section>

      <section className='space-y-3'>
        <div className='flex items-center justify-between'>
          <h2 className='font-medium'>Instructions</h2>
          <Button
            type='button'
            size='sm'
            variant='outline'
            onClick={() =>
              setForm((current) => ({
                ...current,
                instructions: [...current.instructions, { text: '' }],
              }))
            }
          >
            <PlusIcon />
            Add
          </Button>
        </div>
        {form.instructions.map((instruction, index) => (
          <div key={index} className='flex gap-2'>
            <Textarea
              value={instruction.text}
              onChange={(event) =>
                setForm((current) => {
                  const instructions = [...current.instructions];
                  instructions[index] = { text: event.target.value };
                  return { ...current, instructions };
                })
              }
            />
            <Button
              type='button'
              size='icon'
              variant='ghost'
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  instructions: current.instructions.filter((_, itemIndex) => itemIndex !== index),
                }))
              }
            >
              <Trash2Icon />
            </Button>
          </div>
        ))}
      </section>

      <div className='space-y-2'>
        <Label htmlFor='notes'>Notes</Label>
        <Textarea
          id='notes'
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
        />
      </div>

      <Button type='submit' disabled={submitting || !form.title.trim()}>
        Save recipe
      </Button>
    </form>
  );
}
