import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import React from "react";

const RecipeGrid = ({ type, value, fetchAction, backLink }) => {
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
        </div>
      </div>
    </div>
  );
};

export default RecipeGrid;
