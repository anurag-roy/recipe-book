import { ActionSheet } from '@client/components/action-sheet';
import { AppShell } from '@client/components/app-shell';
import { CommercePanels } from '@client/components/commerce-panels';
import { ConfirmSheet } from '@client/components/confirm-sheet';
import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import { deleteRecipe, recipeImageUrl, recipeQueryOptions, toggleFavorite } from '@client/lib/recipes';
import { cn } from '@client/lib/utils';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeftIcon, HeartIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/recipes/$recipeId/')({
  component: RecipeDetailPage,
});

function RecipeDetailPage() {
  const { recipeId } = Route.useParams();
  const id = Number(recipeId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: recipe } = useSuspenseQuery(recipeQueryOptions(id));
  const imageUrl = recipeImageUrl(recipe.image?.objectKey);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const favoriteMutation = useMutation({
    mutationFn: () => toggleFavorite(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recipe', id] });
      await queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteRecipe(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast.success('Recipe deleted');
      await navigate({ to: '/' });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <AppShell
      title={recipe.title}
      subtitle={[recipe.cuisine, recipe.dishName].filter(Boolean).join(' · ') || undefined}
      back={
        <Button
          render={<Link to='/' />}
          size='icon-sm'
          variant='ghost'
          aria-label='Back to recipes'
          className='-ml-1'
        >
          <ArrowLeftIcon />
        </Button>
      }
      actions={
        <div className='flex gap-1'>
          <Button
            type='button'
            size='icon-sm'
            variant='ghost'
            aria-label={recipe.favorite ? 'Unfavorite' : 'Favorite'}
            tooltip={recipe.favorite ? 'Unfavorite' : 'Favorite'}
            isLoading={favoriteMutation.isPending}
            loadingText={recipe.favorite ? 'Unfavoriting…' : 'Favoriting…'}
            onClick={() => favoriteMutation.mutate()}
          >
            <HeartIcon className={cn(recipe.favorite && 'fill-primary text-primary')} />
          </Button>
          <Button
            size='icon-sm'
            variant='ghost'
            className='hidden sm:inline-flex'
            nativeButton={false}
            render={<Link to='/recipes/$recipeId/edit' params={{ recipeId }} />}
            aria-label='Edit recipe'
            tooltip='Edit'
          >
            <PencilIcon />
          </Button>
          <Button
            type='button'
            size='icon-sm'
            variant='ghost'
            aria-label='More actions'
            tooltip='More'
            onClick={() => setActionsOpen(true)}
          >
            <MoreHorizontalIcon />
          </Button>
        </div>
      }
    >
      <div className='space-y-6'>
        <section className='overflow-hidden rounded-[1.75rem] bg-card shadow-sm ring-1 ring-foreground/5'>
          <div className='aspect-[16/10] bg-muted sm:aspect-[21/9]'>
            {imageUrl ? (
              <img src={imageUrl} alt='' className='size-full object-cover object-center' />
            ) : (
              <div className='flex size-full items-center justify-center text-sm text-muted-foreground'>No image</div>
            )}
          </div>
          <div className='space-y-4 p-4 sm:p-6'>
            {recipe.description ? <p className='text-sm leading-relaxed text-muted-foreground'>{recipe.description}</p> : null}
            {recipe.tags.length > 0 ? (
              <div className='flex flex-wrap gap-1.5'>
                {recipe.tags.map((tag) => (
                  <Badge key={tag} variant='secondary'>
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
            <dl className='grid grid-cols-2 gap-3 text-sm sm:grid-cols-4'>
              <MetaItem label='Servings' value={recipe.servings ?? recipe.yieldText ?? '—'} />
              <MetaItem label='Cuisine' value={recipe.cuisine ?? '—'} />
              <MetaItem label='Dish' value={recipe.dishName ?? '—'} />
              <div className='rounded-2xl bg-muted/50 px-3 py-2.5'>
                <dt className='text-xs text-muted-foreground'>Source</dt>
                <dd className='mt-0.5 truncate font-medium'>
                  {recipe.source?.sourceUrl ? (
                    <a className='underline decoration-border underline-offset-2' href={recipe.source.sourceUrl} target='_blank' rel='noreferrer'>
                      Original
                    </a>
                  ) : (
                    'Manual'
                  )}
                </dd>
              </div>
            </dl>
            {recipe.image?.warning ? (
              <p className='rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive'>
                Image warning: {recipe.image.warning}
              </p>
            ) : null}
          </div>
        </section>

        <div className='grid gap-4 lg:grid-cols-2'>
          <section className='rounded-[1.75rem] bg-card p-4 shadow-sm ring-1 ring-foreground/5 sm:p-5'>
            <h2 className='font-heading text-base font-semibold tracking-tight'>Ingredients</h2>
            <ul className='mt-3 space-y-2 text-sm'>
              {recipe.ingredients.map((ingredient) => (
                <li key={ingredient.id ?? ingredient.originalText} className='rounded-2xl bg-muted/45 px-3 py-2.5'>
                  <div className='leading-snug'>{ingredient.originalText}</div>
                  {(ingredient.optional || ingredient.pantryDefault || ingredient.group) && (
                    <div className='mt-1 text-xs text-muted-foreground'>
                      {[ingredient.optional ? 'optional' : null, ingredient.pantryDefault ? 'pantry' : null, ingredient.group]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className='rounded-[1.75rem] bg-card p-4 shadow-sm ring-1 ring-foreground/5 sm:p-5'>
            <h2 className='font-heading text-base font-semibold tracking-tight'>Instructions</h2>
            <ol className='mt-3 space-y-3 text-sm'>
              {recipe.instructions.map((instruction, index) => (
                <li key={instruction.id ?? instruction.text} className='flex gap-3'>
                  <span className='mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground'>
                    {index + 1}
                  </span>
                  <span className='leading-relaxed'>{instruction.text}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <CommercePanels recipe={recipe} />
      </div>

      <ActionSheet
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        title='Recipe actions'
        items={[
          {
            key: 'edit',
            label: 'Edit recipe',
            description: 'Update ingredients, steps, and details',
            icon: <PencilIcon className='size-4' />,
            onSelect: () => {
              void navigate({ to: '/recipes/$recipeId/edit', params: { recipeId } });
            },
          },
          {
            key: 'favorite',
            label: recipe.favorite ? 'Remove from favorites' : 'Add to favorites',
            icon: <HeartIcon className={cn('size-4', recipe.favorite && 'fill-primary text-primary')} />,
            onSelect: () => favoriteMutation.mutate(),
          },
          {
            key: 'delete',
            label: 'Delete recipe',
            description: 'This cannot be undone',
            icon: <Trash2Icon className='size-4' />,
            destructive: true,
            onSelect: () => setDeleteOpen(true),
          },
        ]}
      />

      <ConfirmSheet
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title='Delete this recipe?'
        description='The recipe, ingredients, and related baskets will be removed. This cannot be undone.'
        confirmLabel='Delete recipe'
        destructive
        isLoading={deleteMutation.isPending}
        loadingText='Deleting…'
        onConfirm={() => deleteMutation.mutate()}
      />
    </AppShell>
  );
}

function MetaItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className='rounded-2xl bg-muted/50 px-3 py-2.5'>
      <dt className='text-xs text-muted-foreground'>{label}</dt>
      <dd className='mt-0.5 truncate font-medium'>{value}</dd>
    </div>
  );
}
