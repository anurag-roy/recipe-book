import { AppShell } from '@client/components/app-shell';
import { RecipeForm, formToPayload, recipeToForm } from '@client/components/recipe-form';
import { Button } from '@client/components/ui/button';
import { recipeQueryOptions, updateRecipe } from '@client/lib/recipes';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeftIcon } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/recipes/$recipeId/edit')({
  component: EditRecipePage,
});

function EditRecipePage() {
  const { recipeId } = Route.useParams();
  const id = Number(recipeId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: recipe } = useSuspenseQuery(recipeQueryOptions(id));

  const mutation = useMutation({
    mutationFn: (body: unknown) => updateRecipe(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recipes'] });
      await queryClient.invalidateQueries({ queryKey: ['recipe', id] });
      toast.success('Recipe saved');
      await navigate({ to: '/recipes/$recipeId', params: { recipeId } });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <AppShell
      title='Edit recipe'
      subtitle={recipe.title}
      back={
        <Button
          render={<Link to='/recipes/$recipeId' params={{ recipeId }} />}
          size='icon-sm'
          variant='ghost'
          aria-label='Back to recipe'
          className='-ml-1'
        >
          <ArrowLeftIcon />
        </Button>
      }
    >
      <section className='mx-auto max-w-3xl rounded-[1.75rem] bg-card p-4 shadow-sm ring-1 ring-foreground/5 sm:p-6'>
        <RecipeForm
          initial={recipeToForm(recipe)}
          submitting={mutation.isPending}
          onSubmit={(form) => mutation.mutate(formToPayload(form))}
        />
      </section>
    </AppShell>
  );
}
