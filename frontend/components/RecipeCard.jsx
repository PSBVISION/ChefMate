import Link from "next/link";
import React from "react";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import Image from "next/image";
import { Button } from "./ui/button";
import { ChefHat, Clock, UtensilsCrossed, Users } from "lucide-react";
import { Badge } from "./ui/badge";

const RecipeCard = ({ recipe, variant = "default" }) => {
  const getRecipeData = () => {
    if (recipe.strMeal) {
      return {
        title: recipe.strMeal,
        image: recipe.strMealThumb,
        href: `/recipe?cook=${encodeURIComponent(recipe.strMeal)}`,
        showImage: true,
      };
    }
     // For AI-generated pantry recipes
    if (recipe.matchPercentage) {
      return {
        title: recipe.title,
        description: recipe.description,
        category: recipe.category,
        cuisine: recipe.cuisine,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        matchPercentage: recipe.matchPercentage,
        missingIngredients: recipe.missingIngredients || [],
        image: recipe.imageUrl, // Add image support
        href: `/recipe?cook=${encodeURIComponent(recipe.title)}`,
        showImage: !!recipe.imageUrl, // Show if image exists
      };
    }

    return {};
  };
  const data = getRecipeData();

  if (variant === "grid") {
    return (
      <Link href={data.href}>
        <Card className="rounded-none overflow-hidden border-stone-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group pt-0">
          {data.showImage ? (
            <div className="relative aspect-square">
              <Image
                src={data.image}
                alt={data.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              {/* hover overlay */}
              <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white text-sm font-medium">
                    Click to view recipe
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="aspect-square bg-stone-200 animate-pulse" />
          )}
          <CardHeader>
            <CardTitle className="text-lg font-bold text-stone-900 group-hover:text-orange-600 transition-colors line-clamp-2">
              {data.title}
            </CardTitle>
          </CardHeader>
        </Card>
      </Link>
    );
  }

  if (variant === "pantry") {
    return (
      <Card className="rounded-none border-stone-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
        {/* Image / Placeholder at top */}
        <div className="relative aspect-video">
          {data.showImage ? (
            data.image.startsWith("data:") ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={data.image}
                alt={data.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <Image
                src={data.image}
                alt={data.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            )
          ) : (
            <div className="w-full h-full bg-linear-to-br from-stone-100 to-orange-50 flex flex-col items-center justify-center">
              <UtensilsCrossed className="w-12 h-12 text-orange-300 mb-2" />
              <span className="text-sm text-stone-400 font-medium">No image available</span>
            </div>
          )}
          {/* Match Percentage Badge */}
          {data.matchPercentage && (
            <div className="absolute top-4 right-4">
              <Badge
                className={`${
                  data.matchPercentage >= 90
                    ? "bg-green-600"
                    : data.matchPercentage >= 75
                    ? "bg-orange-600"
                    : "bg-stone-600"
                } text-white text-lg px-3 py-1.5 shadow-lg`}
              >
                {data.matchPercentage}% Match
              </Badge>
            </div>
          )}
          {/* Cuisine & Category badges on image */}
          {(data.cuisine || data.category) && (
            <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
              {data.cuisine && (
                <Badge className="bg-white/90 text-orange-600 backdrop-blur-sm capitalize">
                  {data.cuisine}
                </Badge>
              )}
              {data.category && (
                <Badge className="bg-white/90 text-stone-600 backdrop-blur-sm capitalize">
                  {data.category}
                </Badge>
              )}
            </div>
          )}
        </div>

        <CardHeader>
          <CardTitle className="text-2xl font-serif font-bold text-stone-900">
            {data.title}
          </CardTitle>

          {data.description && (
            <CardDescription className="text-stone-600 leading-relaxed mt-2">
              {data.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-4 flex-1">
          {/* Time & Servings */}
          {(data.prepTime || data.cookTime || data.servings) && (
            <div className="flex gap-4 text-sm text-stone-500">
              {(data.prepTime || data.cookTime) && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>
                    {parseInt(data.prepTime || 0) +
                      parseInt(data.cookTime || 0)}{" "}
                    mins
                  </span>
                </div>
              )}
              {data.servings && (
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{data.servings} servings</span>
                </div>
              )}
            </div>
          )}

          {/* Missing Ingredients */}
          {data.missingIngredients && data.missingIngredients.length > 0 && (
            <div className="p-4 bg-orange-50 border border-orange-100">
              <h4 className="text-sm font-semibold text-orange-900 mb-2">
                You&apos;ll need:
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.missingIngredients.map((ingredient, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-orange-700 border-orange-200 bg-white"
                  >
                    {ingredient}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter>
          <Link href={data.href} className="w-full">
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white gap-2">
              <ChefHat className="w-4 h-4" />
              View Full Recipe
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }
  return <div>RecipeCard</div>;
};

export default RecipeCard;
