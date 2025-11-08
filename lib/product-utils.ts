/**
 * Validates and converts a string to EcommerceCategory enum
 * @param category - The category string from request
 * @returns The validated enum value or null if invalid/empty
 * @throws Error if category is provided but invalid
 */
export function validateCategory(category: string | null | undefined): string | null {
  if (!category || category.trim() === "") {
    return null;
  }

  try {
    // Try to import EcommerceCategory from Prisma client
    const { EcommerceCategory } = require("@prisma/client");
    
    // Convert string to enum key format (e.g., "home_garden" -> "home_garden")
    const normalizedCategory = category.trim().toLowerCase();
    
    // Check if the value exists in the enum
    if (Object.values(EcommerceCategory).includes(normalizedCategory as any)) {
      return normalizedCategory;
    }
  } catch (error) {
    // If Prisma client doesn't have the enum yet, use fallback validation
    console.warn("EcommerceCategory enum not found in Prisma client, using fallback validation");
  }

  // Fallback: validate against known enum values
  const normalizedCategory = category.trim().toLowerCase();
  const validCategories = [
    "electronics", "clothing", "accessories", "home_garden",
    "beauty_personal_care", "sports_outdoors", "books_media",
    "toys_games", "automotive", "health_wellness", "food_beverages",
    "pet_supplies", "baby_kids", "jewelry_watches", "shoes",
    "bags_luggage", "furniture", "appliances", "office_supplies",
    "art_crafts", "musical_instruments", "industrial_scientific", "other"
  ];
  
  if (validCategories.includes(normalizedCategory)) {
    return normalizedCategory;
  }

  // Try to map common variations to enum values
  const categoryMap: Record<string, string> = {
    "electronics": "electronics",
    "clothing": "clothing",
    "accessories": "accessories",
    "home & garden": "home_garden",
    "home_garden": "home_garden",
    "beauty": "beauty_personal_care",
    "beauty & personal care": "beauty_personal_care",
    "beauty_personal_care": "beauty_personal_care",
    "sports": "sports_outdoors",
    "sports & outdoors": "sports_outdoors",
    "sports_outdoors": "sports_outdoors",
    "books": "books_media",
    "books & media": "books_media",
    "books_media": "books_media",
    "toys": "toys_games",
    "toys & games": "toys_games",
    "toys_games": "toys_games",
    "automotive": "automotive",
    "health": "health_wellness",
    "health & wellness": "health_wellness",
    "health_wellness": "health_wellness",
    "food": "food_beverages",
    "food & beverages": "food_beverages",
    "food_beverages": "food_beverages",
    "pet": "pet_supplies",
    "pet supplies": "pet_supplies",
    "pet_supplies": "pet_supplies",
    "baby": "baby_kids",
    "baby & kids": "baby_kids",
    "baby_kids": "baby_kids",
    "jewelry": "jewelry_watches",
    "jewelry & watches": "jewelry_watches",
    "jewelry_watches": "jewelry_watches",
    "shoes": "shoes",
    "bags": "bags_luggage",
    "bags & luggage": "bags_luggage",
    "bags_luggage": "bags_luggage",
    "furniture": "furniture",
    "appliances": "appliances",
    "office": "office_supplies",
    "office supplies": "office_supplies",
    "office_supplies": "office_supplies",
    "art": "art_crafts",
    "art & crafts": "art_crafts",
    "art_crafts": "art_crafts",
    "musical instruments": "musical_instruments",
    "musical_instruments": "musical_instruments",
    "industrial": "industrial_scientific",
    "industrial & scientific": "industrial_scientific",
    "industrial_scientific": "industrial_scientific",
    "other": "other",
  };

  const mappedCategory = categoryMap[normalizedCategory];
  if (mappedCategory && validCategories.includes(mappedCategory)) {
    return mappedCategory;
  }

  // Try to get valid categories from Prisma enum if available
  let validCategoriesList: string[] = [];
  try {
    const { EcommerceCategory } = require("@prisma/client");
    validCategoriesList = Object.values(EcommerceCategory) as string[];
  } catch {
    validCategoriesList = [
      "electronics", "clothing", "accessories", "home_garden",
      "beauty_personal_care", "sports_outdoors", "books_media",
      "toys_games", "automotive", "health_wellness", "food_beverages",
      "pet_supplies", "baby_kids", "jewelry_watches", "shoes",
      "bags_luggage", "furniture", "appliances", "office_supplies",
      "art_crafts", "musical_instruments", "industrial_scientific", "other"
    ];
  }

  throw new Error(`Invalid category: "${category}". Valid categories are: ${validCategoriesList.join(", ")}`);
}

/**
 * Gets all available category enum values
 */
export function getAvailableCategories(): string[] {
  try {
    const { EcommerceCategory } = require("@prisma/client");
    return Object.values(EcommerceCategory) as string[];
  } catch (error) {
    // Fallback to hardcoded list if Prisma client doesn't have the enum
    console.warn("EcommerceCategory enum not found in Prisma client, using fallback list");
    return [
      "electronics", "clothing", "accessories", "home_garden",
      "beauty_personal_care", "sports_outdoors", "books_media",
      "toys_games", "automotive", "health_wellness", "food_beverages",
      "pet_supplies", "baby_kids", "jewelry_watches", "shoes",
      "bags_luggage", "furniture", "appliances", "office_supplies",
      "art_crafts", "musical_instruments", "industrial_scientific", "other"
    ];
  }
}

