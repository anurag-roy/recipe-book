import { AppShell } from '@client/components/app-shell';
import { CommercePanels } from '@client/components/commerce-panels';
import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { deleteRecipe, recipeImageUrl, recipeQueryOptions, toggleFavorite } from '@client/lib/recipes';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { HeartIcon, PencilIcon, Trash2Icon } from 'lucide-react';
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
      actions={
        <div className='flex gap-2'>
          <Button
            type='button'
            size='icon-sm'
            variant='ghost'
            aria-label='Favorite'
            onClick={() => favoriteMutation.mutate()}
          >
            <HeartIcon className={recipe.favorite ? 'fill-primary text-primary' : ''} />
          </Button>
          <Button size='sm' variant='outline' nativeButton={false} render={<Link to='/recipes/$recipeId/edit' params={{ recipeId }} />}>
            <PencilIcon />
            Edit
          </Button>
          <Button
            type='button'
            size='sm'
            variant='destructive'
            onClick={() => {
              if (window.confirm('Delete this recipe?')) {
                deleteMutation.mutate();
              }
            }}
          >
            <Trash2Icon />
            Delete
          </Button>
        </div>
      }
    >
      <div className='space-y-6'>
        <Card className='overflow-hidden py-0'>
          <div className='grid md:grid-cols-[280px_1fr]'>
            <div className='aspect-[4/3] bg-muted md:aspect-auto md:min-h-64'>
              {imageUrl ? (
                <img src={imageUrl} alt='' className='size-full object-cover object-center' />
              ) : (
                <div className='flex size-full items-center justify-center text-sm text-muted-foreground'>No image</div>
              )}
            </div>
            <div className='p-6'>
              <h1 className='text-2xl font-semibold tracking-tight'>{recipe.title}</h1>
              {recipe.description ? <p className='mt-2 text-muted-foreground'>{recipe.description}</p> : null}
              <div className='mt-4 flex flex-wrap gap-2'>
                {recipe.tags.map((tag) => (
                  <Badge key={tag} variant='secondary'>
                    {tag}
                  </Badge>
                ))}
              </div>
              <dl className='mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4'>
                <div>
                  <dt className='text-muted-foreground'>Servings</dt>
                  <dd>{recipe.servings ?? recipe.yieldText ?? '—'}</dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>Cuisine</dt>
                  <dd>{recipe.cuisine ?? '—'}</dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>Dish</dt>
                  <dd>{recipe.dishName ?? '—'}</dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>Source</dt>
                  <dd className='truncate'>
                    {recipe.source?.sourceUrl ? (
                      <a className='underline' href={recipe.source.sourceUrl} target='_blank' rel='noreferrer'>
                        Original
                      </a>
                    ) : (
                      'Manual'
                    )}
                  </dd>
                </div>
              </dl>
              {recipe.image?.warning ? (
                <p className='mt-3 text-sm text-destructive'>Image warning: {recipe.image.warning}</p>
              ) : null}
            </div>
          </div>
        </Card>

        <div className='grid gap-4 lg:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>Ingredients</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className='space-y-2 text-sm'>
                {recipe.ingredients.map((ingredient) => (
                  <li key={ingredient.id ?? ingredient.originalText} className='rounded-xl bg-muted/40 px-3 py-2'>
                    <div>{ingredient.originalText}</div>
                    <div className='text-xs text-muted-foreground'>
                      {[
                        ingredient.optional ? 'optional' : null,
                        ingredient.pantryDefault ? 'pantry' : null,
                        ingredient.group,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className='list-decimal space-y-3 pl-5 text-sm'>
                {recipe.instructions.map((instruction) => (
                  <li key={instruction.id ?? instruction.text}>{instruction.text}</li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <CommercePanels recipe={recipe} />
      </div>
    </AppShell>
  );
}
