'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import RecipeForm from '@/components/RecipeForm';

function EditRecipeContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  return <RecipeForm recipeId={id || undefined} />;
}

export default function EditRecipePage() {
  return (
    <Suspense fallback={<div className="p-8">Загрузка...</div>}>
      <EditRecipeContent />
    </Suspense>
  );
}
