"use server";

import { freeMealRecommendations, proTierLimit } from "@/lib/arcjet";
import { checkUser } from "@/lib/checkUser";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { request } from "@arcjet/next";

const STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

function normalizeTitle(title) {
  return title
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
/**
 * Discover which image-generation model is available for this API key.
 * Caches the result in a module-level variable.
 */
let _cachedImageModel = undefined; // undefined = not checked yet, null = none found

async function discoverImageModel() {
  if (_cachedImageModel !== undefined) return _cachedImageModel;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}&pageSize=200`,
    );
    if (!res.ok) {
      _cachedImageModel = null;
      return null;
    }
    const data = await res.json();
    const models = data.models || [];

    // Strategy 1: find a generateContent model that supports image output
    // (names typically contain "image-generation")
    for (const m of models) {
      if (
        m.supportedGenerationMethods?.includes("generateContent") &&
        (m.name?.includes("image") ||
          m.description?.toLowerCase()?.includes("image generation"))
      ) {
        const name = m.name.replace("models/", "");
        _cachedImageModel = { name, method: "generateContent" };
        return _cachedImageModel;
      }
    }

    // Strategy 2: find an Imagen model (uses predict endpoint)
    for (const m of models) {
      if (m.name?.includes("imagen")) {
        const name = m.name.replace("models/", "");
        const method = m.supportedGenerationMethods?.includes("predict")
          ? "predict"
          : "generateImages";
        console.log(`Discovered Imagen model: ${name} (method: ${method})`);
        _cachedImageModel = { name, method };
        return _cachedImageModel;
      }
    }

    console.warn(
      "No image generation models found. Available models:",
      models.map((m) => m.name).join(", "),
    );
    _cachedImageModel = null;
    return null;
  } catch (err) {
    console.error("Failed to list models:", err.message);
    _cachedImageModel = null;
    return null;
  }
}

/**
 * Generate a food image using the best available Gemini image model.
 * Returns a base64 data URL or null on failure.
 */
async function generateRecipeImage(title, cuisine) {
  const imageModel = await discoverImageModel();
  if (!imageModel) return null;

  const prompt = `Professional food photography of "${title}" (${cuisine || "international"} cuisine). Beautifully plated, soft natural lighting, top-down or 45 degree angle, no text, no watermarks.`;

  try {
    if (imageModel.method === "generateContent") {
      // Gemini-style model with inline image response
      const model = genAI.getGenerativeModel({
        model: imageModel.name,
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      });
      const result = await model.generateContent(prompt);
      const parts = result.response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    } else {
      // Imagen-style model using REST predict/generateImages endpoint
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${imageModel.name}:${imageModel.method}?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: { sampleCount: 1, aspectRatio: "16:9" },
          }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        const prediction = data.predictions?.[0];
        if (prediction?.bytesBase64Encoded) {
          return `data:${prediction.mimeType || "image/png"};base64,${prediction.bytesBase64Encoded}`;
        }
      } else {
        console.error(`Imagen ${imageModel.method} failed:`, await res.text());
      }
    }
  } catch (error) {
    console.error("Image generation error for", title, ":", error.message);
  }

  return null;
}

export async function getRecipesByPantryIngredients(formData) {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error("User not authenticated");
    }
    const isPro = user.subscriptionTier === "pro";
    // Apply rate limiting based on subscription tier
    const arcjetClient = isPro ? proTierLimit : freeMealRecommendations;
    const req = await request();
    const decision = await arcjetClient.protect(req, {
      userId: user.clerkId,
      requested: 1,
    });
    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        throw new Error(
          `Monthly scan limit reached. ${isPro ? "Please contact support if you need more scans." : "Upgrade to Pro for unlimited scans!"}`,
        );
      }
      throw new Error("Request denied by security system");
    }
    const pantryResponse = await fetch(
      `${STRAPI_URL}/api/pantry-items?filters[owner][id][$eq]=${user.id}&sort=createdAt:desc&pagination[pageSize]=100`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      },
    );
    if (!pantryResponse.ok) {
      throw new Error("Failed to fetch pantry items");
    }

    const pantryData = await pantryResponse.json();
    if (!pantryData.data || pantryData.data.length === 0) {
      return {
        success: false,
        message: "No pantry items found. Please scan your pantry first!",
      };
    }
    const ingredients = pantryData.data.map((item) => item.name).join(", ");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
You are a professional chef. Given these available ingredients: ${ingredients}

Suggest 5 recipes that can be made primarily with these ingredients. It's okay if the recipes need 1-2 common pantry staples (salt, pepper, oil, etc.) that aren't listed.

Return ONLY a valid JSON array (no markdown, no explanations):
[
  {
    "title": "Recipe name",
    "description": "Brief 1-2 sentence description",
    "matchPercentage": 85,
    "missingIngredients": ["ingredient1", "ingredient2"],
    "category": "breakfast|lunch|dinner|snack|dessert",
    "cuisine": "italian|chinese|mexican|etc",
    "prepTime": 20,
    "cookTime": 30,
    "servings": 4
  }
]

Rules:
- matchPercentage should be 70-100% (how many listed ingredients are used)
- missingIngredients should be common items or optional additions
- Sort by matchPercentage descending
- Make recipes realistic and delicious
`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    let recipeSuggestions;
    try {
      const cleanText = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      recipeSuggestions = JSON.parse(cleanText);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", text);
      throw new Error(
        "Failed to generate recipe suggestions. Please try again.",
      );
    }

    // Generate food images using Gemini in parallel for all recipe suggestions
    const recipesWithImages = await Promise.all(
      recipeSuggestions.map(async (recipe) => {
        const imageUrl = await generateRecipeImage(
          recipe.title,
          recipe.cuisine,
        );
        return { ...recipe, imageUrl };
      }),
    );

    return {
      success: true,
      recipes: recipesWithImages,
      ingredientsUsed: ingredients,
      recommendationsLimit: isPro ? "unlimited" : 5,
      message: `Found ${recipeSuggestions.length} recipes you can make!`,
    };
  } catch (error) {
    console.error("Error in getRecipesByPantryIngredients:", error);
    return {
      success: false,
      message: error.message || "An error occurred while fetching recipes.",
    };
  }
}

//helper function to fetch image from unsplash
async function fetchRecipeImage(recipeName) {
  try {
    if (!UNSPLASH_ACCESS_KEY) {
      console.warn("UNSPLASH_ACCESS_KEY not set, skipping image fetch");
      return "";
    }

    const searchQuery = `${recipeName}`;
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
        searchQuery
      )}&per_page=1&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Unsplash API error:", response.statusText);
      return "";
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const photo = data.results[0];
      console.log("Found Unsplash image:", photo.urls.regular);
      return photo.urls.regular;
    }

    return "";
  } catch (error) {
    console.error("Error fetching Unsplash image:", error);
    return "";
  }
}

//get or generate recipe details
export async function getOrGenerateRecipe(formData) {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error("User not authenticated");
    }
    const isPro = user.subscriptionTier === "pro";

    const recipeName = formData.get("recipeName");
    if (!recipeName) {
      throw new Error("Recipe name is required");
    }

    //Normalize the title (e.g., "apple cake" -> "Apple Cake") for better matching
    const normalizedTitle = normalizeTitle(recipeName);

    //Check if recipe already exists in DB
    const searchResponse = await fetch(
      `${STRAPI_URL}/api/recipes?filters[title][$eqi]=${encodeURIComponent(
        normalizedTitle
      )}&populate=*`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

if (searchResponse.ok) {
      const searchData = await searchResponse.json();

      if (searchData.data && searchData.data.length > 0) {
        console.log("Recipe found in database:", searchData.data[0].id);

        // Check if user has saved this recipe
        const savedRecipeResponse = await fetch(
          `${STRAPI_URL}/api/saved-recipes?filters[user][id][$eq]=${user.id}&filters[recipe][id][$eq]=${searchData.data[0].id}`,
          {
            headers: {
              Authorization: `Bearer ${STRAPI_API_TOKEN}`,
            },
            cache: "no-store",
          }
        );

        let isSaved = false;
        if (savedRecipeResponse.ok) {
          const savedData = await savedRecipeResponse.json();
          isSaved = savedData.data && savedData.data.length > 0;
        }

        return {
          success: true,
          recipe: searchData.data[0],
          recipeId: searchData.data[0].id,
          isSaved: isSaved,
          fromDatabase: true,
          isPro,
          message: "Recipe loaded from database",
        };
      }
    }
    
 //Recipe not found, generate new one
 const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const prompt = `
You are a professional chef and recipe expert. Generate a detailed recipe for: "${normalizedTitle}"

CRITICAL: The "title" field MUST be EXACTLY: "${normalizedTitle}" (no changes, no additions like "Classic" or "Easy")

Return ONLY a valid JSON object with this exact structure (no markdown, no explanations):
{
  "title": "${normalizedTitle}",
  "description": "Brief 2-3 sentence description of the dish",
  "category": "Must be ONE of these EXACT values: breakfast, lunch, dinner, snack, dessert",
  "cuisine": "Must be ONE of these EXACT values: italian, chinese, mexican, indian, american, thai, japanese, mediterranean, french, korean, vietnamese, spanish, greek, turkish, moroccan, brazilian, caribbean, middle-eastern, british, german, portuguese, other",
  "prepTime": "Time in minutes (number only)",
  "cookTime": "Time in minutes (number only)",
  "servings": "Number of servings (number only)",
  "ingredients": [
    {
      "item": "ingredient name",
      "amount": "quantity with unit",
      "category": "Protein|Vegetable|Spice|Dairy|Grain|Other"
    }
  ],
  "instructions": [
    {
      "step": 1,
      "title": "Brief step title",
      "instruction": "Detailed step instruction",
      "tip": "Optional cooking tip for this step"
    }
  ],
  "nutrition": {
    "calories": "calories per serving",
    "protein": "grams",
    "carbs": "grams",
    "fat": "grams"
  },
  "tips": [
    "General cooking tip 1",
    "General cooking tip 2",
    "General cooking tip 3"
  ],
  "substitutions": [
    {
      "original": "ingredient name",
      "alternatives": ["substitute 1", "substitute 2"]
    }
  ]
}

IMPORTANT RULES FOR CATEGORY:
- Breakfast items (pancakes, eggs, cereal, etc.) → "breakfast"
- Main meals for midday (sandwiches, salads, pasta, etc.) → "lunch"
- Main meals for evening (heavier dishes, roasts, etc.) → "dinner"
- Light items between meals (chips, crackers, fruit, etc.) → "snack"
- Sweet treats (cakes, cookies, ice cream, etc.) → "dessert"

IMPORTANT RULES FOR CUISINE:
- Use lowercase only
- Pick the closest match from the allowed values
- If uncertain, use "other"

Guidelines:
- Make ingredients realistic and commonly available
- Instructions should be clear and beginner-friendly
- Include 6-10 detailed steps
- Provide practical cooking tips
- Estimate realistic cooking times
- Keep total instructions under 12 steps
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    let recipeData;
    try {
      const cleanText = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      recipeData = JSON.parse(cleanText);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", text);
      throw new Error("Failed to generate recipe. Please try again.");
    }

    // FORCE the title to be our normalized version
    recipeData.title = normalizedTitle;

    // Validate and sanitize category
    const validCategories = [
      "breakfast",
      "lunch",
      "dinner",
      "snack",
      "dessert",
    ];
    const category = validCategories.includes(
      recipeData.category?.toLowerCase()
    )
      ? recipeData.category.toLowerCase()
      : "dinner";

    // Validate and sanitize cuisine
    const validCuisines = [
      "italian",
      "chinese",
      "mexican",
      "indian",
      "american",
      "thai",
      "japanese",
      "mediterranean",
      "french",
      "korean",
      "vietnamese",
      "spanish",
      "greek",
      "turkish",
      "moroccan",
      "brazilian",
      "caribbean",
      "middle-eastern",
      "british",
      "german",
      "portuguese",
      "other",
    ];
    const cuisine = validCuisines.includes(recipeData.cuisine?.toLowerCase())
      ? recipeData.cuisine.toLowerCase()
      : "other";


      // Fetch an image from Unsplash based on the recipe title
      const imageUrl = await fetchRecipeImage(normalizedTitle);

      // Save the new recipe to Strapi
      const strapiRecipeData = {
      data: {
        title: normalizedTitle,
        description: recipeData.description,
        cuisine,
        category,
        ingredients: recipeData.ingredients,
        instructions: recipeData.instructions,
        prepTime: Number(recipeData.prepTime),
        cookTime: Number(recipeData.cookTime),
        servings: Number(recipeData.servings),
        nutrition: recipeData.nutrition,
        tips: recipeData.tips,
        substitutions: recipeData.substitutions,
        imageUrl: imageUrl || "",
        isPublic: true,
        author: user.id,
      },
    };
    console.log(
      "Saving new recipe to database with title:",
      normalizedTitle
    );

    const createRecipeResponse = await fetch(`${STRAPI_URL}/api/recipes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
      body: JSON.stringify(strapiRecipeData),
    });

    if (!createRecipeResponse.ok) {
      const errorText = await createRecipeResponse.text();
      console.error("Failed to save recipe:", errorText);
      throw new Error("Failed to save recipe to database");
    }

    const createdRecipe = await createRecipeResponse.json();
    console.log("Recipe saved to database:", createdRecipe.data.id);

    return {
      success: true,
      recipe: {
        ...recipeData,
        title: normalizedTitle,
        category,
        cuisine,
        imageUrl: imageUrl || "",
      },
      recipeId: createdRecipe.data.id,
      isSaved: false,
      fromDatabase: false,
      recommendationsLimit: isPro ? "unlimited" : 5,
      isPro,
      message: "Recipe generated and saved successfully!",
    };
  } catch (error) {
    console.error("Error in getOrGenerateRecipeDetails:", error);
    throw new Error(
      error.message || "An error occurred while fetching recipe details.",
    );
  }
}

//save recipe to user's collection(bookmark)
export async function saveRecipeToCollection(formData) {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error("User not authenticated");
    }
    const recipeId = formData.get("recipeId");
    if (!recipeId) {
      throw new Error("Recipe ID is required");
    }
    //check if recipe already exists in user's collection
    const existingResponse = await fetch(
      `${STRAPI_URL}/api/saved-recipes?filters[user][id][$eq]=${user.id}&filters[recipe][id][$eq]=${recipeId}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      },
    );
    if (existingResponse.ok) {
      const existingData = await existingResponse.json();
      if (existingData.data && existingData.data.length > 0) {
        return {
          success: true,
          alreadySaved: true,
          message: "Recipe already in your collection",
        };
      }
    }

    //save recipe to strapi
    const saveResponse = await fetch(`${STRAPI_URL}/api/saved-recipes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
      body: JSON.stringify({
        data: {
          user: user.id,
          recipe: recipeId,
          savedAt: new Date().toISOString(),
        },
      }),
    });
    if (!saveResponse.ok) {
      const errorText = await saveResponse.text();
      console.error("Failed to save recipe:", errorText);
      throw new Error("Failed to save recipe. Please try again.");
    }
    const saveData = await saveResponse.json();

    return {
      success: true,
      alreadySaved: false,
      savedRecipe: savedRecipe.data,
      message: "Recipe saved to your collection",
    };
  } catch (error) {
    console.error("Error in saving Recipe to Collection:", error);
    throw new Error(
      error.message || "An error occurred while saving the recipe.",
    );
  }
}

//remove recipe from user's collection(bookmark)
export async function removeRecipeFromCollection(formData) {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error("User not authenticated");
    }
    const recipeId = formData.get("recipeId");
    if (!recipeId) {
      throw new Error("Recipe ID is required");
    }
    //find saved recipe entry
    const searchResponse = await fetch(
      `${STRAPI_URL}/api/saved-recipes?filters[user][id][$eq]=${user.id}&filters[recipe][id][$eq]=${recipeId}`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      },
    );
    if (!searchResponse.ok) {
      throw new Error("Failed to find saved recipe");
    }
    const searchData = await searchResponse.json();
    if (!searchData.data || searchData.data.length === 0) {
      return {
        success: true,
        message: "Recipe not found in your collection",
      };
    }
    const savedRecipeId = searchData.data[0].id;
    const deleteResponse = await fetch(
      `${STRAPI_URL}/api/saved-recipes/${savedRecipeId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${STRAPI_API_TOKEN}` },
      },
    );
    if(!deleteResponse.ok){
      throw new Error("Failed to remove recipe from collection");
    }
    return {
      success: true,
      message: "Recipe removed from your collection",
    }
  } catch (error) {
    console.error("Error in removing Recipe from Collection:", error);
    throw new Error(
      error.message || "An error occurred while removing the recipe.",
    );
  }
}
