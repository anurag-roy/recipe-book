import { recipeQueryOptions } from '@client/lib/recipes';
import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/recipes/$recipeId')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(recipeQueryOptions(Number(params.recipeId))),
  component: RecipeLayout,
});

function RecipeLayout() {
  return <Outlet />;
}
