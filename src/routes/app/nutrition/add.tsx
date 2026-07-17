import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/nutrition/add")({
  component: AddFoodPage,
});

function AddFoodPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState<"search" | "custom">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [mealType, setMealType] = useState("lunch");
  const [servings, setServings] = useState(1);
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));

  // Custom food form
  const [customName, setCustomName] = useState("");
  const [customCalories, setCustomCalories] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customCarbs, setCustomCarbs] = useState("");
  const [customFat, setCustomFat] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("flexora_user");
    if (!stored) { navigate({ to: "/login" }); return; }
    setUser(JSON.parse(stored));
  }, []);

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const { searchFoods } = await import("~/lib/nutrition-actions");
      const results = await searchFoods({ data: { query: q } });
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (e) {
      console.error("Search failed", e);
    }
  }

  async function handleAddFood() {
    if (!user) return;
    try {
      const { addFoodLog } = await import("~/lib/nutrition-actions");

      if (tab === "search" && selectedFood) {
        await addFoodLog({
          data: {
            userId: user.id,
            foodId: selectedFood.id,
            mealType,
            servings,
            calories: selectedFood.calories,
            protein: selectedFood.protein,
            carbs: selectedFood.carbs,
            fat: selectedFood.fat,
            logDate,
          },
        });
      } else if (tab === "custom" && customName.trim()) {
        await addFoodLog({
          data: {
            userId: user.id,
            customName: customName.trim(),
            mealType,
            servings,
            calories: parseFloat(customCalories) || 0,
            protein: parseFloat(customProtein) || 0,
            carbs: parseFloat(customCarbs) || 0,
            fat: parseFloat(customFat) || 0,
            logDate,
          },
        });
      } else {
        return;
      }
      alert("Food added to log!");
      navigate({ to: "/app/nutrition" });
    } catch (e) {
      console.error("Failed to add food", e);
    }
  }

  function handleLogout() {
    localStorage.removeItem("flexora_token");
    localStorage.removeItem("flexora_user");
    document.cookie = "flexora_token=; path=/; max-age=0";
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <a href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#1A56DB]">Flexora</span>
            <span className="text-lg font-light text-gray-400">Fitnes</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/app/dashboard" className="text-sm text-gray-600 hover:text-[#1A56DB]">Dashboard</a>
            <a href="/app/nutrition" className="text-sm text-gray-600 hover:text-[#1A56DB]">Nutrition</a>
            <button onClick={handleLogout} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-4">
          <a href="/app/nutrition" className="text-sm text-[#1A56DB] hover:underline">← Back to Food Log</a>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Add Food</h1>
        <p className="mb-6 text-sm text-gray-500">Search the database or add a custom food entry.</p>

        {/* Sub-nav */}
        <div className="mb-6 flex gap-2">
          <a href="/app/nutrition" className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50">Log</a>
          <a href="/app/nutrition/add" className="rounded-full bg-[#1A56DB] px-4 py-1.5 text-xs font-medium text-white">Add</a>
          <a href="/app/nutrition/scan" className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50">Scan</a>
          <a href="/app/nutrition/mealplan" className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50">Meal Plan</a>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex rounded-full bg-gray-100 p-1">
          <button
            onClick={() => setTab("search")}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === "search" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Search Database
          </button>
          <button
            onClick={() => setTab("custom")}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === "custom" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Custom Food
          </button>
        </div>

        {/* Search Tab */}
        {tab === "search" && (
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Find Food</h2>
            <input
              type="text"
              placeholder="Search foods (e.g. chicken, rice, eggs)..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
            />

            {searchResults.length > 0 && (
              <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
                {searchResults.map((food: any) => (
                  <button
                    key={food.id}
                    onClick={() => setSelectedFood(food)}
                    className={`w-full rounded-lg px-4 py-3 text-left transition-colors ${
                      selectedFood?.id === food.id
                        ? "bg-blue-50 ring-1 ring-[#1A56DB]"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{food.name}</p>
                        <p className="text-xs text-gray-400">{food.serving_size} · {food.category}</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{food.calories} kcal</span>
                    </div>
                    <div className="mt-1 flex gap-3 text-xs text-gray-400">
                      <span>P: {food.protein}g</span>
                      <span>C: {food.carbs}g</span>
                      <span>F: {food.fat}g</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Custom Tab */}
        {tab === "custom" && (
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Custom Food Entry</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Food Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Homemade Lasagna"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Calories (kcal)</label>
                  <input type="number" value={customCalories} onChange={(e) => setCustomCalories(e.target.value)} placeholder="0" className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-[#1A56DB] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Protein (g)</label>
                  <input type="number" value={customProtein} onChange={(e) => setCustomProtein(e.target.value)} placeholder="0" className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-[#1A56DB] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Carbs (g)</label>
                  <input type="number" value={customCarbs} onChange={(e) => setCustomCarbs(e.target.value)} placeholder="0" className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-[#1A56DB] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fat (g)</label>
                  <input type="number" value={customFat} onChange={(e) => setCustomFat(e.target.value)} placeholder="0" className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-[#1A56DB] focus:outline-none" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Controls */}
        {(selectedFood || (tab === "custom" && customName.trim())) && (
          <div className="mt-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Log Settings</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Meal Type</label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#1A56DB] focus:outline-none"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Servings</label>
                <input
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={servings}
                  onChange={(e) => setServings(parseFloat(e.target.value) || 1)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#1A56DB] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#1A56DB] focus:outline-none"
                />
              </div>
            </div>
            <button
              onClick={handleAddFood}
              className="mt-4 w-full rounded-full bg-[#1A56DB] px-6 py-3 text-sm font-medium text-white hover:bg-[#1E40AF] transition-colors"
            >
              Add to Food Log
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
