"use client";

import {
  getOrGenerateRecipe,
  removeRecipeFromCollection,
  saveRecipeToCollection,
} from "@/actions/recipe.action";
import { Button } from "@/components/ui/button";
import useFetch from "@/hooks/use-fetch";
import { AlertCircle, ArrowLeft, Loader } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import { ClockLoader } from "react-spinners";
import { toast } from "sonner";

function RecipeContent() {
  const searchParams = useSearchParams();
  const recipeName = searchParams.get("cook");
  const router = useRouter();

  const [recipe, setRecipe] = useState(null);
  const [recipeId, setRecipeId] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  //Get or Generate recipe data
  const {
    loading: loadingRecipe,
    data: recipeData,
    fn: fetchRecipe,
  } = useFetch(getOrGenerateRecipe);

  //save to collection
  const {
    loading: saving,
    data: saveData,
    fn: saveToCollection,
  } = useFetch(saveRecipeToCollection);

  //Remove to collection
  const {
    loading: removing,
    data: removeData,
    fn: removeFromCollection,
  } = useFetch(removeRecipeFromCollection);

  //fetch recipe data when component mounts
  useFetch(() => {
    if (recipeName && !recipe) {
      const formData = new FormData();
      formData.append("recipeName", recipeName);
      fetchRecipe(formData);
    }
  }, [recipeName]);

  //update state when recipe data is fetched
  useEffect(() => {
    if (recipeData?.success) {
      setRecipe(recipeData.recipe);
      setRecipeId(recipeData.recipeId);
      setIsSaved(recipeData.isSaved);

      if (recipeData.fromDatabase) {
        toast.success("Recipe loaded from your collection!");
      } else {
        toast.success("Recipe generated and saved successfully!");
      }
    }
  }, [recipeData]);

  if (!recipeName) {
    return (
      <div className="min-h-screen bg-stone-50 pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl text-center py-20">
          <div className="bg-orange-50 w-20 h-20 border-2 border-orange-200 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="size-10 text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-2">
            No Recipe Specified
          </h2>
          <p className="text-stone-600 mb-6 font-light">Go to Dashboard.</p>
          <Link href="/dashboard">
            <Button className="bg-orange-600 hover:bg-orange-700">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loadingRecipe === null || loadingRecipe) {
    return (
      <div className="min-h-screen bg-stone-50 pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl text-center py-20">
          <ClockLoader className=" mx-auto mb-6" color="#dc6300" />
          <h1 className="text-3xl font-bold text-stone-900 mb-2 tracking-tight">
            Preparing Your Recipe
          </h1>
          <p className="text-stone-600 font-light">
            Our AI chef is crafting detailed instructions for{" "}
            <span className="font-bold text-orange-600">{recipeName}</span>...
          </p>
          <div className="mt-8 max-w-md mx-auto">
            <div className="flex items-center gap-3 text-sm text-stone-500">
              <div className="flex-1 h-1 bg-stone-200 overflow-hidden relative">
                <div className="absolute left-0 top-0 h-full bg-orange-600 animate-slow-fill" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  //Error state
  if (loadingRecipe === false && !recipeData) {
    return (
      <div className="min-h-screen bg-stone-50 pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl text-center py-20">
          <div className="bg-red-50 w-20 h-20 border-2 border-red-200 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-2">
            Failed to load recipe
          </h2>
          <p className="text-stone-600 mb-6 font-light">
            Something went wrong while loading the recipe. Please try again.
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="border-2 border-stone-900 hover:bg-stone-900 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button
              onClick={() => window.location.reload()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-stone-50 pt-24 pb-16 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-stone-600 hover:text-orange-600 transition-colors mb-6 font-medium">
            <ArrowLeft className="size-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

const RecipePage = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-50 pt-24 pb-16 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <Loader className="size-16 text-orange-600 animate-spin mx-auto mb-6" />
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
