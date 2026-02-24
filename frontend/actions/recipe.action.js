"use server";

import { freeMealRecommendations, proTierLimit } from "@/lib/arcjet";
import { checkUser } from "@/lib/checkUser";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { request } from "@arcjet/next";

const STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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
async function fetchRecipeImage(recipeName) {}

//get or generate recipe details
export async function getOrGenerateRecipeDetails(formData) {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error("User not authenticated");
    }
    const recipeName = formData.get("recipeName");
    if (!recipeName) {
      throw new Error("Recipe name is required");
    }

    //Normalize the title (e.g., "apple cake" -> "Apple Cake") for better matching
    const normalizedTitle = normalizedTitle(recipeName);
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
  } catch (error) {}
}

//remove recipe from user's collection(bookmark)
export async function removeRecipeFromCollection(formData) {}
