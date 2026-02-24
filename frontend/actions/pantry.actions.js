"use server";

import { freePantryScans, proTierLimit } from "@/lib/arcjet";
import { checkUser } from "@/lib/checkUser";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { request } from "@arcjet/next";

const STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function scanPantryImage(formData) {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error("User is not authorized");
    }
    const isPro = user.subscriptionTier === "pro";
    // Apply rate limiting based on subscription tier
    const arcjetClient = isPro ? proTierLimit : freePantryScans;
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
    const imageFile = formData.get("image");
    if (!imageFile) {
      throw new Error("No image file provided");
    }

    // Convert the image file to base64 for processing
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `You are a professional chef and ingredient recognition expert. Analyze this image of a pantry/fridge and identify all visible food ingredients.

Return ONLY a valid JSON array with this exact structure (no markdown, no explanations):
[
  {
    "name": "ingredient name",
    "quantity": "estimated quantity with unit",
    "confidence": 0.95
  }
]

Rules:
- Only identify food ingredients (not containers, utensils, or packaging)
- Be specific (e.g., "Cheddar Cheese" not just "Cheese")
- Estimate realistic quantities (e.g., "3 eggs", "1 cup milk", "2 tomatoes")
- Confidence should be 0.7-1.0 (omit items below 0.7)
- Maximum 20 items
- Common pantry staples are acceptable (salt, pepper, oil)
`;
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: imageFile.type,
          data: base64Image,
        },
      },
    ]);
    const response = result.response;
    const text = response.text();

    let ingredients;
    try {
      const cleanText = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      ingredients = JSON.parse(cleanText);
    } catch (error) {
      console.error("Error parsing AI response:", error);
      throw new Error("Failed to parse AI response");
    }

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      throw new Error(
        "No ingredients identified in image. Please try a clearer image",
      );
    }
    return {
      success: true,
      ingredients: ingredients.slice(0, 20), // Limit to 20 items
      scansLimit: isPro ? "unlimited" : 10,
      message: `Found ${ingredients.length} ingredients !`,
    };
  } catch (error) {
    console.error("Error in scanPantryImage:", error);
    throw new Error(
      error.message || "An error occurred while scanning the pantry image",
    );
  }
}

export async function saveToPantry(formData) {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error("User is not authorized");
    }
    const ingredientsJson = formData.get("ingredients");
    const ingredients = JSON.parse(ingredientsJson);

    if(!ingredients || ingredients.length === 0) {
      throw new Error("No ingredients to save");
    }
    const savedItems = [];
    for (const ingredient of ingredients) {
      const response = await fetch (`${STRAPI_URL}/api/pantry-items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            name: ingredient.name,
            quantity: ingredient.quantity,
            imageUrl: "",
            owner: user.id,}})
      })
      if (response.ok) {
        const data = await response.json();
        savedItems.push(data.data);
      }
    }

    return {
      success: true,
      savedItems,
      message: `Saved ${savedItems.length} items to pantry!`,
    };
  } catch (error) {
    console.error("Error in saveToPantry:", error);
    throw new Error(
      error.message || "An error occurred while saving items to the pantry",
    );
  }
}


export async function addPantryItemManually(formData) {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error("User is not authorized");
    }

    const name = formData.get("name");
    const quantity = formData.get("quantity");

    if (!name || !quantity) {
      throw new Error("Name and quantity are required");
    }
    const response = await fetch(`${STRAPI_URL}/api/pantry-items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
      body: JSON.stringify({
        data: {
          name: name.trim(),
          quantity: quantity.trim(),
          imageUrl: "",
          owner: user.id,
        },
      }),
    });
    if (!response.ok) {
      const errorText = await response.json();
      console.error("Error response from Strapi:", errorText);
      throw new Error(errorText.message || "Failed to add item to pantry");
    }
    const data = await response.json();

    return {
      success: true,
      item: data.data,
      message: "Pantry item added successfully",
    };
  } catch (error) {
    console.error("Error in add Pantry Item Manually:", error);
    throw new Error(
      error.message || "An error occurred while adding the pantry item",
    );
  }
}


/**
 * Get TheMealDB ingredient image URL for a given ingredient name.
 * Strips adjectives/qualifiers and normalizes to match TheMealDB's naming.
 */
function getIngredientImageUrl(name) {
  const nameMap = {
    "all-purpose flour": "Plain Flour",
    "all purpose flour": "Plain Flour",
    "ap flour": "Plain Flour",
    "white flour": "Plain Flour",
    "macaroni and cheese": "Macaroni",
    "mac and cheese": "Macaroni",
    "peppercorns": "Pepper",
    "black peppercorns": "Pepper",
    "mixed peppercorns": "Pepper",
    "black pepper": "Pepper",
    "sea salt": "Salt",
    "coarse salt": "Salt",
    "coarse sea salt": "Salt",
    "kosher salt": "Salt",
    "table salt": "Salt",
    "white sugar": "Sugar",
    "granulated sugar": "Sugar",
    "white granulated sugar": "Sugar",
    "caster sugar": "Sugar",
    "limes": "Lime",
    "lemons": "Lemon",
    "eggs": "Eggs",
    "tomatoes": "Tomatoes",
    "onions": "Onion",
    "potatoes": "Potatoes",
    "carrots": "Carrots",
    "cloves": "Cloves",
    "whole cloves": "Cloves",
    "sesame seeds": "Sesame Seed",
    "sesame seed": "Sesame Seed",
    "garlic cloves": "Garlic",
    "garlic clove": "Garlic",
    "grapefruit": "Grapefruit",
    "green cabbage": "Cabbage",
    "red cabbage": "Red Cabbage",
    "green apple": "Apples",
    "green apples": "Apples",
    "broccoli florets": "Broccoli",
    "broccoli": "Broccoli",
    "hazelnuts": "Hazelnuts",
    "green chili peppers": "Green Chilli",
    "green chili pepper": "Green Chilli",
    "green chilies": "Green Chilli",
    "green chilli": "Green Chilli",
    "chili peppers": "Red Pepper",
    "flax seeds": "Flax Seed",
    "flax seed": "Flax Seed",
    "flaxseed": "Flax Seed",
    "salmon fillet": "Salmon",
    "salmon fillets": "Salmon",
    "chicken breast": "Chicken Breast",
    "chicken breasts": "Chicken Breast",
    "chicken thighs": "Chicken Thighs",
    "bell pepper": "Red Pepper",
    "bell peppers": "Red Pepper",
    "green bell pepper": "Green Pepper",
    "red bell pepper": "Red Pepper",
    "yellow bell pepper": "Yellow Pepper",
    "cherry tomatoes": "Cherry Tomatoes",
    "spring onions": "Spring Onions",
    "green onions": "Spring Onions",
    "olive oil": "Olive Oil",
    "vegetable oil": "Vegetable Oil",
    "soy sauce": "Soy Sauce",
    "brown sugar": "Brown Sugar",
    "powdered sugar": "Icing Sugar",
    "confectioners sugar": "Icing Sugar",
    "baking soda": "Bicarbonate Of Soda",
    "baking powder": "Baking Powder",
    "heavy cream": "Heavy Cream",
    "sour cream": "Sour Cream",
    "cream cheese": "Cream Cheese",
    "cheddar cheese": "Cheddar Cheese",
    "feta cheese": "Feta",
    "parmesan cheese": "Parmesan",
    "mozzarella cheese": "Mozzarella",
  };

  const stripWords = [
    "fresh", "dried", "dry", "whole", "ground", "coarse", "fine",
    "raw", "organic", "pure", "extra", "virgin", "large", "small",
    "medium", "thick", "thin", "light", "dark", "sweet", "unsalted",
    "salted", "smoked", "roasted", "toasted", "crushed", "minced",
    "chopped", "sliced", "diced", "frozen", "canned", "packed",
    "florets", "fillet", "fillets", "boneless", "skinless", "peeled",
    "grated", "shredded", "cubed", "halved", "pitted", "deseeded",
    "trimmed", "ripe", "firm", "tender", "baby", "mini", "jumbo",
  ];

  const lower = name.trim().toLowerCase();

  if (nameMap[lower]) {
    return `https://www.themealdb.com/images/ingredients/${encodeURIComponent(nameMap[lower])}.png`;
  }

  let words = lower.split(/\s+/);
  words = words.filter((w) => !stripWords.includes(w));

  const stripped = words.join(" ");
  if (nameMap[stripped]) {
    return `https://www.themealdb.com/images/ingredients/${encodeURIComponent(nameMap[stripped])}.png`;
  }

  const formatted = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return `https://www.themealdb.com/images/ingredients/${encodeURIComponent(formatted)}.png`;
}


export async function getPantryItems() {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const response = await fetch(
      `${STRAPI_URL}/api/pantry-items?filters[owner][id][$eq]=${user.id}&sort=createdAt:desc&pagination[pageSize]=100`,
      {
        headers: {
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch pantry items");
    }

    const data = await response.json();
    const isPro = user.subscriptionTier === "pro";

    // Attach ingredient image URL to each item
    const items = (data.data || []).map((item) => ({
      ...item,
      imageUrl: getIngredientImageUrl(item.name),
    }));

    return {
      success: true,
      items,
      scansLimit: isPro ? "unlimited" : 10,
    };
  } catch (error) {
    console.error("Error fetching pantry:", error);
    throw new Error(error.message || "Failed to load pantry");
  }
}

export async function deletePantryItem(formData) {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const itemId = formData.get("itemId");

    const response = await fetch(`${STRAPI_URL}/api/pantry-items/${itemId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to delete item");
    }

    return {
      success: true,
      message: "Item removed from pantry",
    };
  } catch (error) {
    console.error("Error deleting item:", error);
    throw new Error(error.message || "Failed to delete item");
  }
}

export async function updatePantryItem(formData) {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const itemId = formData.get("itemId");
    const name = formData.get("name");
    const quantity = formData.get("quantity");

    const response = await fetch(`${STRAPI_URL}/api/pantry-items/${itemId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      },
      body: JSON.stringify({
        data: {
          name,
          quantity,
        },
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update item");
    }

    const data = await response.json();

    return {
      success: true,
      item: data.data,
      message: "Item updated successfully",
    };
  } catch (error) {
    console.error("Error updating item:", error);
    throw new Error(error.message || "Failed to update item");
  }
}