"use server";

const MEALDB_BASE_URL = "https://www.themealdb.com/api/json/v1/1";

export async function getRecipeOfTheDay() {
  try {
    const response = await fetch(`${MEALDB_BASE_URL}/random.php`, {
      next: { revalidate: 60 * 60 * 24 }, // Revalidate every 24 hours
    });
    if (!response.ok) {
      throw new Error("Failed to fetch recipe of the day");
    }

    const data = await response.json();
    return {
      success: true,
      recipe: data.meals[0],
    };
  } catch (error) {
    console.error("Error fetching recipe of the day:", error);
    throw new Error(
      error.message || "An error occurred while fetching the recipe of the day",
    );
  }
}

export async function getCategories() {
  try {
    const response = await fetch(`${MEALDB_BASE_URL}/list.php?c=list`, {
      next: { revalidate: 60 * 60 * 24 * 7 }, // Revalidate every 1 Week
    });

    if (!response.ok) {
      throw new Error("Failed to fetch categories");
    }

    const data = await response.json();
    return {
      success: true,
      categories: data.meals || [],
    };
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw new Error(
      error.message || "An error occurred while fetching categories",
    );
  }
}

export async function getAreas() {
  try {
    const response = await fetch(`${MEALDB_BASE_URL}/list.php?a=list`, {
      next: { revalidate: 60 * 60 * 24 * 7 }, // Revalidate every 1 Week
    });

    if (!response.ok) {
      throw new Error("Failed to fetch areas");
    }

    const data = await response.json();
    return {
      success: true,
      areas: data.meals || [],
    };
  } catch (error) {
    console.error("Error fetching areas:", error);
    throw new Error(error.message || "An error occurred while fetching areas");
  }
}

export async function getMealsByCategory(category) {
  try {
    const response = await fetch(
      `${MEALDB_BASE_URL}/filter.php?c=${encodeURIComponent(category)}`,
      {
        next: { revalidate: 60 * 60 * 24 }, // Revalidate every 24 hours
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch meals by category");
    }

    const data = await response.json();
    return {
      success: true,
      meals: data.meals || [],
      category,
    };
  } catch (error) {
    console.error("Error fetching meals by category:", error);
    throw new Error(
      error.message || "An error occurred while fetching meals by category",
    );
  }
}

export async function getMealsByArea(area) {
  try {
    const response = await fetch(
      `${MEALDB_BASE_URL}/filter.php?a=${encodeURIComponent(area)}`,
      {
        next: { revalidate: 60 * 60 * 24 * 7 }, // Revalidate every 1 Weeks
      },
    );
    if (!response.ok) {
      throw new Error("Failed to fetch meals by area");
    }
    const data = await response.json();
    return {
      success: true,
      meals: data.meals || [],
      area,
    };
  } catch (error) {
    console.error("Error fetching meals by area:", error);
    throw new Error(
      error.message || "An error occurred while fetching meals by area",
    );
  }
}
