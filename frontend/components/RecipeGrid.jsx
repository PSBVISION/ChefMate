import useFetch from "@/hooks/use-fetch";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import React from "react";

const RecipeGrid = ({ type, value, fetchAction, backLink }) => {
  const {data, loading, fn:fetchMeals}=useFetch(fetchAction);
  return (
    <div className="min-h-screen bg-stone-50 pt-14 pb-16 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <Link
            href={backLink}
            className="inline-flex items-center gap-2 text-stone-600 hover:text-orange-600 transition-colors mb-4"
          >
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-5xl md:text-6xl font-bold text-stone-900 capitalize tracking-tight leading-tight">
            {/* {displayName} */}
            <span className="text-orange-600">
              {type === "cuisine" ? "Cuisine" : "Recipes"}
            </span>
          </h1>
        </div>
      </div>
    </div>
  );
};

export default RecipeGrid;
