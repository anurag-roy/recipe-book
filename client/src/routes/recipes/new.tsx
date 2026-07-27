import { AppShell } from '@client/components/app-shell';
import { RecipeForm, formToPayload } from '@client/components/recipe-form';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { createRecipe } from '@client/lib/recipes';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
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
    <AppShell title='New recipe'>
      <Card className='mx-auto max-w-3xl'>
        <CardHeader>
          <CardTitle>Create recipe</CardTitle>
        </CardHeader>
        <CardContent>
          <RecipeForm submitting={mutation.isPending} onSubmit={(form) => mutation.mutate(formToPayload(form))} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
