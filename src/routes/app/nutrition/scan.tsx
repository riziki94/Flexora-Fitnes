import { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/nutrition/scan")({
  component: FoodScanPage,
});

function FoodScanPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [mealType, setMealType] = useState("lunch");
  const [servings, setServings] = useState(1);
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreviewUrl(ev.target?.result as string);
      simulateScan();
    };
    reader.readAsDataURL(file);
  }

  function simulateScan() {
    setScanning(true);
    setScanResult(null);
    // Simulate AI scanning with a delay, then auto-search common foods
    setTimeout(() => {
      setScanning(false);
      // Simulated result: pick a few possible matches
      const simulatedQueries = ["Chicken Breast", "Salmon", "Rice", "Pasta", "Salad", "Eggs", "Oatmeal"];
      const randomQuery = simulatedQueries[Math.floor(Math.random() * simulatedQueries.length)];
      setScanResult(randomQuery);
      handleSearch(randomQuery);
    }, 1500);
  }

  async function handleAddToLog() {
    if (!selectedFood || !user) return;
    try {
      const { addFoodLog } = await import("~/lib/nutrition-actions");
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
      alert("Food added to log!");
      navigate({ to: "/app/nutrition" });
    } catch (e) {
      console.error("Failed to add food log", e);
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
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Food Scanner</h1>
        <p className="mb-6 text-sm text-gray-500">Upload a photo or search for your food to log it.</p>

        {/* Sub-nav */}
        <div className="mb-6 flex gap-2">
          <a href="/app/nutrition" className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50">Log</a>
          <a href="/app/nutrition/add" className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50">Add</a>
          <a href="/app/nutrition/scan" className="rounded-full bg-[#1A56DB] px-4 py-1.5 text-xs font-medium text-white">Scan</a>
          <a href="/app/nutrition/mealplan" className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50">Meal Plan</a>
        </div>

        {/* Upload Area */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Photo Scan</h2>
          <div
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 hover:border-[#1A56DB] hover:bg-blue-50/30 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="mb-3 max-h-48 rounded-lg object-cover" />
            ) : (
              <div className="mb-3 text-4xl">📸</div>
            )}
            <p className="text-sm font-medium text-gray-700">Tap to upload a photo of your meal</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, or take a photo</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {scanning && (
            <div className="mt-4 flex items-center justify-center gap-2 text-[#1A56DB]">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#1A56DB] border-t-transparent" />
              <span className="text-sm font-medium">Analyzing your meal...</span>
            </div>
          )}

          {scanResult && !scanning && (
            <div className="mt-4 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
              <p className="font-medium">AI Scan Result:</p>
              <p>We think this looks like <strong>{scanResult}</strong>. Results below for confirmation.</p>
            </div>
          )}
        </div>

        {/* Manual Search */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Search Food Database</h2>
          <input
            type="text"
            placeholder="Search foods (e.g. chicken, rice, eggs)..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
          />

          {searchResults.length > 0 && (
            <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
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

        {/* Selected Food Details & Add */}
        {selectedFood && (
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Log This Food</h2>
            <div className="mb-4 rounded-lg bg-gray-50 p-4">
              <p className="font-semibold text-gray-900">{selectedFood.name}</p>
              <p className="text-xs text-gray-500">{selectedFood.serving_size} per serving</p>
              <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                <div><p className="text-lg font-bold text-blue-600">{Math.round(selectedFood.calories * servings)}</p><p className="text-xs text-gray-400">kcal</p></div>
                <div><p className="text-lg font-bold text-red-500">{Math.round(selectedFood.protein * servings)}g</p><p className="text-xs text-gray-400">Protein</p></div>
                <div><p className="text-lg font-bold text-yellow-500">{Math.round(selectedFood.carbs * servings)}g</p><p className="text-xs text-gray-400">Carbs</p></div>
                <div><p className="text-lg font-bold text-purple-500">{Math.round(selectedFood.fat * servings)}g</p><p className="text-xs text-gray-400">Fat</p></div>
              </div>
            </div>

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
              onClick={handleAddToLog}
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
