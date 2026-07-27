import { AppShell } from '@client/components/app-shell';
import { RecipeForm, formToPayload, recipeToForm } from '@client/components/recipe-form';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { recipeQueryOptions, updateRecipe } from '@client/lib/recipes';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
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
    <AppShell title='Edit recipe'>
      <Card className='mx-auto max-w-3xl'>
        <CardHeader>
          <CardTitle>{recipe.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <RecipeForm
            initial={recipeToForm(recipe)}
            submitting={mutation.isPending}
            onSubmit={(form) => mutation.mutate(formToPayload(form))}
          />
        </CardContent>
      </Card>
    </AppShell>
  );
}
