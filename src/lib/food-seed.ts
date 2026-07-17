import { getDb } from "~/lib/db";

interface FoodSeed {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: string;
  category: string;
}

const FOODS: FoodSeed[] = [
  // --- Breakfast ---
  { name: "Eggs (2 large)", calories: 140, protein: 12, carbs: 1, fat: 10, serving_size: "100g", category: "breakfast" },
  { name: "Scrambled Eggs", calories: 180, protein: 14, carbs: 2, fat: 13, serving_size: "120g", category: "breakfast" },
  { name: "Omelette (2 eggs)", calories: 200, protein: 14, carbs: 2, fat: 15, serving_size: "130g", category: "breakfast" },
  { name: "Oatmeal (cooked)", calories: 150, protein: 5, carbs: 27, fat: 3, serving_size: "240g", category: "breakfast" },
  { name: "Granola", calories: 220, protein: 6, carbs: 32, fat: 8, serving_size: "60g", category: "breakfast" },
  { name: "Greek Yogurt", calories: 100, protein: 17, carbs: 6, fat: 0.5, serving_size: "170g", category: "breakfast" },
  { name: "Whole Milk", calories: 150, protein: 8, carbs: 12, fat: 8, serving_size: "240ml", category: "breakfast" },
  { name: "Banana", calories: 105, protein: 1.3, carbs: 27, fat: 0.4, serving_size: "118g", category: "breakfast" },
  { name: "Toast (white bread, 2 slices)", calories: 160, protein: 5, carbs: 30, fat: 2, serving_size: "60g", category: "breakfast" },
  { name: "Whole Wheat Toast (2 slices)", calories: 180, protein: 7, carbs: 33, fat: 3, serving_size: "70g", category: "breakfast" },
  { name: "Peanut Butter", calories: 190, protein: 8, carbs: 6, fat: 16, serving_size: "32g", category: "breakfast" },
  { name: "Pancakes (2 medium)", calories: 220, protein: 6, carbs: 36, fat: 6, serving_size: "120g", category: "breakfast" },
  { name: "Cereal (corn flakes)", calories: 130, protein: 2, carbs: 30, fat: 0.5, serving_size: "35g", category: "breakfast" },
  { name: "Avocado Toast", calories: 250, protein: 7, carbs: 30, fat: 13, serving_size: "120g", category: "breakfast" },

  // --- Protein / Meat ---
  { name: "Chicken Breast (grilled)", calories: 165, protein: 31, carbs: 0, fat: 3.6, serving_size: "150g", category: "protein" },
  { name: "Chicken Thigh (roasted)", calories: 210, protein: 24, carbs: 0, fat: 12, serving_size: "120g", category: "protein" },
  { name: "Salmon Fillet (baked)", calories: 280, protein: 25, carbs: 0, fat: 19, serving_size: "150g", category: "protein" },
  { name: "Tuna (canned in water)", calories: 100, protein: 22, carbs: 0, fat: 1, serving_size: "113g", category: "protein" },
  { name: "Ground Beef (85% lean)", calories: 250, protein: 25, carbs: 0, fat: 16, serving_size: "113g", category: "protein" },
  { name: "Steak (sirloin, grilled)", calories: 270, protein: 30, carbs: 0, fat: 16, serving_size: "150g", category: "protein" },
  { name: "Turkey Breast (sliced)", calories: 120, protein: 22, carbs: 2, fat: 2, serving_size: "100g", category: "protein" },
  { name: "Pork Chop (grilled)", calories: 230, protein: 28, carbs: 0, fat: 12, serving_size: "120g", category: "protein" },
  { name: "Shrimp (boiled)", calories: 100, protein: 24, carbs: 0, fat: 1, serving_size: "113g", category: "protein" },
  { name: "Tofu (firm)", calories: 80, protein: 8, carbs: 2, fat: 5, serving_size: "100g", category: "protein" },

  // --- Carbs / Grains ---
  { name: "White Rice (cooked)", calories: 200, protein: 4, carbs: 44, fat: 0.5, serving_size: "150g", category: "carbs" },
  { name: "Brown Rice (cooked)", calories: 215, protein: 5, carbs: 45, fat: 1.6, serving_size: "150g", category: "carbs" },
  { name: "Pasta (cooked)", calories: 200, protein: 7, carbs: 42, fat: 1, serving_size: "140g", category: "carbs" },
  { name: "Whole Wheat Pasta", calories: 210, protein: 8, carbs: 44, fat: 1.5, serving_size: "140g", category: "carbs" },
  { name: "Quinoa (cooked)", calories: 180, protein: 6, carbs: 32, fat: 3, serving_size: "140g", category: "carbs" },
  { name: "Sweet Potato (baked)", calories: 180, protein: 4, carbs: 41, fat: 0.3, serving_size: "200g", category: "carbs" },
  { name: "White Potato (baked)", calories: 160, protein: 4, carbs: 37, fat: 0.2, serving_size: "173g", category: "carbs" },
  { name: "Bread Roll (white)", calories: 150, protein: 5, carbs: 28, fat: 2, serving_size: "55g", category: "carbs" },

  // --- Vegetables ---
  { name: "Broccoli (steamed)", calories: 55, protein: 4, carbs: 11, fat: 0.5, serving_size: "150g", category: "vegetables" },
  { name: "Spinach (raw)", calories: 23, protein: 3, carbs: 3.6, fat: 0.4, serving_size: "100g", category: "vegetables" },
  { name: "Mixed Salad", calories: 35, protein: 2, carbs: 6, fat: 0.5, serving_size: "150g", category: "vegetables" },
  { name: "Carrots (raw)", calories: 50, protein: 1, carbs: 12, fat: 0.3, serving_size: "120g", category: "vegetables" },
  { name: "Bell Pepper (raw)", calories: 30, protein: 1, carbs: 6, fat: 0.3, serving_size: "119g", category: "vegetables" },
  { name: "Tomato (raw)", calories: 22, protein: 1, carbs: 5, fat: 0.2, serving_size: "123g", category: "vegetables" },
  { name: "Cucumber", calories: 16, protein: 0.7, carbs: 3.6, fat: 0.1, serving_size: "100g", category: "vegetables" },
  { name: "Asparagus (steamed)", calories: 40, protein: 4, carbs: 8, fat: 0.2, serving_size: "134g", category: "vegetables" },

  // --- Fruits ---
  { name: "Apple (medium)", calories: 95, protein: 0.5, carbs: 25, fat: 0.3, serving_size: "182g", category: "fruits" },
  { name: "Orange (medium)", calories: 62, protein: 1.2, carbs: 15, fat: 0.2, serving_size: "131g", category: "fruits" },
  { name: "Blueberries", calories: 85, protein: 1, carbs: 21, fat: 0.5, serving_size: "148g", category: "fruits" },
  { name: "Strawberries", calories: 50, protein: 1, carbs: 12, fat: 0.5, serving_size: "150g", category: "fruits" },
  { name: "Grapes (1 cup)", calories: 100, protein: 1, carbs: 27, fat: 0.2, serving_size: "151g", category: "fruits" },
  { name: "Pineapple", calories: 80, protein: 0.5, carbs: 20, fat: 0.2, serving_size: "165g", category: "fruits" },
  { name: "Mango", calories: 100, protein: 1, carbs: 25, fat: 0.5, serving_size: "165g", category: "fruits" },

  // --- Dairy ---
  { name: "Cheddar Cheese", calories: 115, protein: 7, carbs: 0.5, fat: 9, serving_size: "28g", category: "dairy" },
  { name: "Mozzarella", calories: 85, protein: 6, carbs: 1, fat: 6, serving_size: "28g", category: "dairy" },
  { name: "Cottage Cheese", calories: 90, protein: 13, carbs: 3, fat: 2.5, serving_size: "113g", category: "dairy" },
  { name: "Butter", calories: 100, protein: 0, carbs: 0, fat: 11, serving_size: "14g", category: "dairy" },
  { name: "Almond Milk", calories: 30, protein: 1, carbs: 1, fat: 2.5, serving_size: "240ml", category: "dairy" },

  // --- Snacks / Other ---
  { name: "Protein Bar", calories: 200, protein: 20, carbs: 22, fat: 6, serving_size: "60g", category: "snacks" },
  { name: "Almonds (28g)", calories: 160, protein: 6, carbs: 6, fat: 14, serving_size: "28g", category: "snacks" },
  { name: "Mixed Nuts", calories: 170, protein: 5, carbs: 6, fat: 15, serving_size: "28g", category: "snacks" },
  { name: "Dark Chocolate (70%)", calories: 170, protein: 2, carbs: 13, fat: 12, serving_size: "28g", category: "snacks" },
  { name: "Protein Shake (whey + water)", calories: 120, protein: 25, carbs: 3, fat: 1, serving_size: "300ml", category: "snacks" },
  { name: "Hummus", calories: 100, protein: 4, carbs: 10, fat: 5, serving_size: "60g", category: "snacks" },
  { name: "Rice Cakes (2)", calories: 70, protein: 1, carbs: 15, fat: 0.5, serving_size: "18g", category: "snacks" },
  { name: "Popcorn (air-popped)", calories: 110, protein: 3, carbs: 22, fat: 1, serving_size: "30g", category: "snacks" },

  // --- Beverages ---
  { name: "Orange Juice", calories: 110, protein: 2, carbs: 26, fat: 0.5, serving_size: "240ml", category: "beverages" },
  { name: "Coffee (black)", calories: 2, protein: 0.3, carbs: 0, fat: 0, serving_size: "240ml", category: "beverages" },
  { name: "Latte (whole milk)", calories: 180, protein: 10, carbs: 15, fat: 7, serving_size: "360ml", category: "beverages" },
  { name: "Green Tea", calories: 0, protein: 0, carbs: 0, fat: 0, serving_size: "240ml", category: "beverages" },
];

export function seedFoods(): number {
  const db = getDb();

  // Check if already seeded
  const existing = db.query("SELECT COUNT(*) as count FROM foods").get() as any;
  if (existing && existing.count > 0) {
    return existing.count as number;
  }

  const insert = db.prepare(
    "INSERT INTO foods (name, calories, protein, carbs, fat, serving_size, category) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );

  const insertMany = db.transaction((foods: FoodSeed[]) => {
    for (const f of foods) {
      insert.run(f.name, f.calories, f.protein, f.carbs, f.fat, f.serving_size, f.category);
    }
  });

  insertMany(FOODS);
  return FOODS.length;
}

export function getFoodCategories(): string[] {
  return ["breakfast", "protein", "carbs", "vegetables", "fruits", "dairy", "snacks", "beverages"];
}
