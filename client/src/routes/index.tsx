import { AppShell } from '@client/components/app-shell';
import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Input } from '@client/components/ui/input';
import { Skeleton } from '@client/components/ui/skeleton';
import { recipeImageUrl, recipesQueryOptions, toggleFavorite } from '@client/lib/recipes';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { HeartIcon, PlusIcon, SearchIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(recipesQueryOptions()),
  component: RecipesPage,
});

function RecipesPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const params = useMemo(() => ({ q: q.trim() || undefined, favorite: favoriteOnly || undefined }), [q, favoriteOnly]);
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
      title='Your recipes'
      actions={
        <div className='flex gap-2'>
          <Button render={<Link to='/recipes/new' />} size='sm'>
            <PlusIcon />
            New
          </Button>
          <Button render={<Link to='/imports' />} size='sm' variant='secondary'>
            Import
          </Button>
        </div>
      }
    >
      <div className='mb-6 flex flex-col gap-3 sm:flex-row'>
        <div className='relative flex-1'>
          <SearchIcon className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder='Search titles, ingredients, tags'
            className='pl-9'
          />
        </div>
        <Button
          type='button'
          variant={favoriteOnly ? 'default' : 'outline'}
          onClick={() => setFavoriteOnly((value) => !value)}
        >
          <HeartIcon />
          Favorites
        </Button>
      </div>

      {recipes.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center gap-3 py-12 text-center'>
            <p className='text-muted-foreground'>No recipes yet. Import a blog URL or create one manually.</p>
            <div className='flex gap-2'>
              <Button render={<Link to='/imports' />}>Import recipe</Button>
              <Button render={<Link to='/recipes/new' />} variant='outline'>
                Create manually
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {recipes.map((recipe) => {
            const imageUrl = recipeImageUrl(recipe.imageObjectKey);
            return (
              <Card key={recipe.id} className='overflow-hidden pt-0'>
                <Link to='/recipes/$recipeId' params={{ recipeId: String(recipe.id) }} className='block'>
                  <div className='aspect-[4/3] bg-muted'>
                    {imageUrl ? (
                      <img src={imageUrl} alt='' className='size-full object-cover object-center' />
                    ) : (
                      <div className='flex size-full items-center justify-center text-sm text-muted-foreground'>
                        No image
                      </div>
                    )}
                  </div>
                </Link>
                <CardHeader className='space-y-2'>
                  <div className='flex items-start justify-between gap-2'>
                    <CardTitle className='text-base leading-snug'>
                      <Link to='/recipes/$recipeId' params={{ recipeId: String(recipe.id) }}>
                        {recipe.title}
                      </Link>
                    </CardTitle>
                    <Button
                      type='button'
                      size='icon-sm'
                      variant='ghost'
                      aria-label={recipe.favorite ? 'Unfavorite' : 'Favorite'}
                      onClick={() => favoriteMutation.mutate(recipe.id)}
                    >
                      <HeartIcon className={recipe.favorite ? 'fill-primary text-primary' : ''} />
                    </Button>
                  </div>
                  {recipe.description ? (
                    <p className='line-clamp-2 text-sm text-muted-foreground'>{recipe.description}</p>
                  ) : null}
                  <div className='flex flex-wrap gap-1'>
                    {recipe.tags.slice(0, 4).map((tag) => (
                      <Badge key={tag} variant='secondary'>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

export function RecipesSkeleton() {
  return (
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className='h-64 rounded-xl' />
      ))}
    </div>
  );
}
