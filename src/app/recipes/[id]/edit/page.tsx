import RecipeForm from '@/components/RecipeForm';

export default function EditRecipePage({ params }: { params: { id: string } }) {
  return <RecipeForm recipeId={params.id} />;
}
