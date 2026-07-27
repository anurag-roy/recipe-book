import { AppShell } from '@client/components/app-shell';
import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import { Input } from '@client/components/ui/input';
import { Skeleton } from '@client/components/ui/skeleton';
import { recipeImageUrl, recipesQueryOptions, toggleFavorite } from '@client/lib/recipes';
import { cn } from '@client/lib/utils';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { HeartIcon, PlusIcon, SearchIcon, UploadIcon } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(recipesQueryOptions()),
  component: RecipesPage,
});

function RecipesPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const deferredQ = useDeferredValue(q);
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const params = useMemo(
    () => ({ q: deferredQ.trim() || undefined, favorite: favoriteOnly || undefined }),
    [deferredQ, favoriteOnly]
  );
  const { data: recipes } = useSuspenseQuery(recipesQueryOptions(params));

  const favoriteMutation = useMutation({
    mutationFn: toggleFavorite,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <AppShell
      title='Recipes'
      subtitle={recipes.length === 1 ? '1 recipe' : `${recipes.length} recipes`}
      actions={
        <div className='flex gap-1.5'>
          <Button render={<Link to='/imports' />} size='icon-sm' variant='secondary' aria-label='Import recipe'>
            <UploadIcon />
          </Button>
          <Button render={<Link to='/recipes/new' />} size='sm'>
            <PlusIcon />
            <span className='hidden sm:inline'>New</span>
          </Button>
        </div>
      }
    >
      <div className='mb-5 space-y-3'>
        <div className='relative'>
          <SearchIcon className='pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder='Search titles, ingredients, tags'
            className='h-11 rounded-2xl pl-10'
            inputMode='search'
            enterKeyHint='search'
          />
        </div>
        <div className='flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
          <Button
            type='button'
            size='sm'
            variant={!favoriteOnly ? 'default' : 'outline'}
            className='shrink-0'
            onClick={() => setFavoriteOnly(false)}
          >
            All
          </Button>
          <Button
            type='button'
            size='sm'
            variant={favoriteOnly ? 'default' : 'outline'}
            className='shrink-0'
            onClick={() => setFavoriteOnly(true)}
          >
            <HeartIcon className={favoriteOnly ? 'fill-current' : undefined} />
            Favorites
          </Button>
        </div>
      </div>

      {recipes.length === 0 ? (
        <section className='flex flex-col items-center rounded-[2rem] bg-card/70 px-6 py-14 text-center shadow-sm ring-1 ring-foreground/5'>
          <div className='mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground'>
            <PlusIcon className='size-6' />
          </div>
          <h2 className='font-heading text-lg font-semibold tracking-tight'>No recipes yet</h2>
          <p className='mt-2 max-w-sm text-sm text-muted-foreground'>
            Import a blog URL or create one manually to start your kitchen library.
          </p>
          <div className='mt-6 flex w-full max-w-xs flex-col gap-2 sm:max-w-none sm:flex-row sm:justify-center'>
            <Button render={<Link to='/imports' />} className='w-full sm:w-auto'>
              Import recipe
            </Button>
            <Button render={<Link to='/recipes/new' />} variant='outline' className='w-full sm:w-auto'>
              Create manually
            </Button>
          </div>
        </section>
      ) : (
        <ul className='stagger-in grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {recipes.map((recipe) => {
            const imageUrl = recipeImageUrl(recipe.imageObjectKey);
            return (
              <li key={recipe.id}>
                <article className='group relative overflow-hidden rounded-[1.75rem] bg-card shadow-sm ring-1 ring-foreground/5 transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.985] [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-md'>
                  <Link
                    to='/recipes/$recipeId'
                    params={{ recipeId: String(recipe.id) }}
                    className='absolute inset-0 z-0'
                    aria-label={recipe.title}
                  />
                  <div className='flex gap-3 p-3 sm:block sm:p-0'>
                    <div className='aspect-square w-24 shrink-0 overflow-hidden rounded-2xl bg-muted sm:aspect-[4/3] sm:w-full sm:rounded-none'>
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt=''
                          className='size-full object-cover object-center transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.03]'
                        />
                      ) : (
                        <div className='flex size-full items-center justify-center text-xs text-muted-foreground'>
                          No image
                        </div>
                      )}
                    </div>
                    <div className='relative z-10 flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-0.5 pr-1 sm:gap-2 sm:p-4'>
                      <div className='flex items-start justify-between gap-2'>
                        <h2 className='line-clamp-2 font-heading text-[0.95rem] leading-snug font-semibold tracking-tight sm:text-base'>
                          {recipe.title}
                        </h2>
                        <Button
                          type='button'
                          size='icon-sm'
                          variant='ghost'
                          className='relative z-20 -mr-1 shrink-0'
                          aria-label={recipe.favorite ? 'Unfavorite' : 'Favorite'}
                          tooltip={recipe.favorite ? 'Unfavorite' : 'Favorite'}
                          isLoading={favoriteMutation.isPending && favoriteMutation.variables === recipe.id}
                          loadingText={recipe.favorite ? 'Unfavoriting…' : 'Favoriting…'}
                          onClick={() => favoriteMutation.mutate(recipe.id)}
                        >
                          <HeartIcon className={cn(recipe.favorite && 'fill-primary text-primary')} />
                        </Button>
                      </div>
                      {recipe.description ? (
                        <p className='line-clamp-1 text-sm text-muted-foreground sm:line-clamp-2'>
                          {recipe.description}
                        </p>
                      ) : null}
                      {recipe.tags.length > 0 ? (
                        <div className='hidden flex-wrap gap-1 sm:flex'>
                          {recipe.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant='secondary'>
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}

export function RecipesSkeleton() {
  return (
    <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className='h-28 rounded-[1.75rem] sm:h-64' />
      ))}
    </div>
  );
}
