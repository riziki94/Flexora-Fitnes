import type { FurnitureType, PlacedFurniture, DesignAction } from "../types/zongosol";

// ── Furniture Catalog ────────────────────────────────────
export interface FurnitureDef {
  type: FurnitureType;
  label: string;
  icon: string;
  defaultW: number;
  defaultH: number;
  color: string;
  category: "living" | "bedroom";
}

export const FURNITURE_CATALOG: FurnitureDef[] = [
  { type: "sofa-3", label: "3-Seat Sofa", icon: "🛋️", defaultW: 36, defaultH: 16, color: "#5C4A3E", category: "living" },
  { type: "sofa-2", label: "2-Seat Sofa", icon: "🛋️", defaultW: 26, defaultH: 16, color: "#6B5B4E", category: "living" },
  { type: "sectional", label: "Sectional", icon: "🛋️", defaultW: 32, defaultH: 28, color: "#5C4A3E", category: "living" },
  { type: "coffee-table", label: "Coffee Table", icon: "☕", defaultW: 20, defaultH: 12, color: "#D4A76A", category: "living" },
  { type: "tv-unit", label: "TV Unit", icon: "📺", defaultW: 22, defaultH: 8, color: "#3a3a3a", category: "living" },
  { type: "dining-4", label: "Dining (4-seat)", icon: "🍽️", defaultW: 26, defaultH: 18, color: "#D4A76A", category: "living" },
  { type: "dining-6", label: "Dining (6-seat)", icon: "🍽️", defaultW: 32, defaultH: 18, color: "#C49A5A", category: "living" },
  { type: "bookshelf", label: "Bookshelf", icon: "📚", defaultW: 14, defaultH: 7, color: "#7B5B3A", category: "living" },
  { type: "bed-double", label: "Double Bed", icon: "🛏️", defaultW: 36, defaultH: 22, color: "#f5f5f0", category: "bedroom" },
  { type: "bed-queen", label: "Queen Bed", icon: "🛏️", defaultW: 30, defaultH: 20, color: "#f0f0f0", category: "bedroom" },
  { type: "bed-single", label: "Single Bed", icon: "🛏️", defaultW: 18, defaultH: 20, color: "#f5f5f0", category: "bedroom" },
  { type: "wardrobe", label: "Wardrobe", icon: "👔", defaultW: 16, defaultH: 10, color: "#7B5B3A", category: "bedroom" },
  { type: "nightstand", label: "Nightstand", icon: "🪔", defaultW: 8, defaultH: 8, color: "#A0845C", category: "bedroom" },
  { type: "desk", label: "Desk", icon: "💻", defaultW: 20, defaultH: 12, color: "#A0845C", category: "bedroom" },
];

export const GRID_SIZE = 20;

export function getFurnitureDef(type: FurnitureType): FurnitureDef | undefined {
  return FURNITURE_CATALOG.find(f => f.type === type);
}

interface FurniturePaletteProps {
  onDragStart: (def: FurnitureDef) => void;
}

export default function FurniturePalette({ onDragStart }: FurniturePaletteProps) {
  const livingItems = FURNITURE_CATALOG.filter(f => f.category === "living");
  const bedroomItems = FURNITURE_CATALOG.filter(f => f.category === "bedroom");

  return (
    <div className="w-48 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
        <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Furniture
        </span>
      </div>

      {/* Living room */}
      <div className="px-2 pt-2">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1.5">Living Room</p>
        <div className="space-y-1">
          {livingItems.map(item => (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", item.type);
                e.dataTransfer.effectAllowed = "copy";
                onDragStart(item);
              }}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all group"
            >
              <span className="text-sm">{item.icon}</span>
              <span className="text-[10px] font-medium text-gray-700 group-hover:text-emerald-700 truncate">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bedroom */}
      <div className="px-2 pt-3 pb-3">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1.5">Bedroom</p>
        <div className="space-y-1">
          {bedroomItems.map(item => (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", item.type);
                e.dataTransfer.effectAllowed = "copy";
                onDragStart(item);
              }}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing hover:bg-purple-50 border border-transparent hover:border-purple-200 transition-all group"
            >
              <span className="text-sm">{item.icon}</span>
              <span className="text-[10px] font-medium text-gray-700 group-hover:text-purple-700 truncate">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
