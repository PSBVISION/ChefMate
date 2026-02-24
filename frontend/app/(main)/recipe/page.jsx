"use client";

import { Loader } from "lucide-react";
import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

function RecipeContent() {
  const searchParams = useSearchParams();
  const recipeName = searchParams.get("cook");
  return (
            <div className="min-h-screen bg-stone-50 pt-24 pb-16 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-3xl font-bold text-stone-900 mb-4">{recipeName}</h1>
            <p className="text-stone-600">This is the recipe page for {recipeName}</p>
          </div>
    </div>
  )
}

const RecipePage = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-50 pt-24 pb-16 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <Loader className="size-16 text-orange-600 animate-spin mx-auto mb-6"/>
            <p className="text-stone-600">Loading Recipe...</p>
          </div>
        </div>
      }
    >
      <RecipeContent />
    </Suspense>
  );
};

export default RecipePage;
