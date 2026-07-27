import { AppShell } from '@client/components/app-shell';
import { RecipeForm, formToPayload } from '@client/components/recipe-form';
import { Button } from '@client/components/ui/button';
import { createRecipe } from '@client/lib/recipes';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeftIcon } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/recipes/new')({
  component: NewRecipePage,
});

function NewRecipePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createRecipe,
    onSuccess: async (recipe) => {
      await queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast.success('Recipe created');
      await navigate({ to: '/recipes/$recipeId', params: { recipeId: String(recipe.id) } });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <AppShell
      title='New recipe'
      subtitle='Add a dish to your library'
      back={
        <Button render={<Link to='/' />} size='icon-sm' variant='ghost' aria-label='Back' className='-ml-1'>
          <ArrowLeftIcon />
        </Button>
      }
    >
      <section className='mx-auto max-w-3xl rounded-[1.75rem] bg-card p-4 shadow-sm ring-1 ring-foreground/5 sm:p-6'>
        <RecipeForm submitting={mutation.isPending} onSubmit={(form) => mutation.mutate(formToPayload(form))} />
      </section>
    </AppShell>
  );
}
