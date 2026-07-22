import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type {
  RoomType,
  ContainerSize,
  ExteriorColor,
  KitchenLayout,
  CountertopMaterial,
  KitchenAppliance,
  BathFixture,
  LivingItem,
  BedroomItem,
  DesignState,
  RoomLayout3D,
} from "../types/zongosol";

// ── Constants ──────────────────────────────────────────
const ROOM_COLORS: Record<RoomType, string> = {
  kitchen: "#FF8C42", bathroom: "#4A90D9", living: "#5CB85C", bedroom: "#9B59B6",
};

const COUNTERTOP_HEX: Record<CountertopMaterial, string> = {
  wood: "#8B5E3C", granite: "#4A4A4A", marble: "#F5F5F0", laminate: "#E5E7EB", steel: "#9CA3AF",
};

const LIVING_LABELS: Record<LivingItem, string> = {
  "sofa-3": "3-Seat Sofa", "sofa-2": "2-Seat Sofa", sectional: "Sectional",
  "coffee-table": "Coffee Table", "tv-unit": "TV Unit", "dining-4": "Dining (4)", "dining-6": "Dining (6)", bookshelf: "Bookshelf",
};
const BEDROOM_LABELS: Record<BedroomItem, string> = {
  "bed-double": "Double Bed", "bed-queen": "Queen Bed", "bed-single": "Single Bed",
  wardrobe: "Wardrobe", nightstand: "Nightstand", desk: "Desk",
};

function formatPrice(n: number | undefined) {
  if (n == null) return "0 kr";
  return new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(n);
}

function getDimensions(state: DesignState) {
  let l: number, w: number;
  switch (state.containerSize) {
    case "20ft": l = 20 * 0.3048; w = 8 * 0.3048; break;
    case "40ft": l = 40 * 0.3048; w = 8 * 0.3048; break;
    case "double": l = 40 * 0.3048; w = 16 * 0.3048; break;
    case "custom": l = state.customLength * 0.3048; w = state.customWidth * 0.3048; break;
    default: l = 20 * 0.3048; w = 8 * 0.3048;
  }
  return { length: l, width: w, height: 2.59 };
}

function computeRoomLayouts3D(rooms: { id: string; type: RoomType; label: string }[], l: number, w: number): RoomLayout3D[] {
  const roomCount = rooms.length;
  let layouts: RoomLayout3D[] = [];
  if (roomCount <= 3) {
    const segLen = l / roomCount;
    rooms.forEach((room, i) => {
      layouts.push({ x: segLen * i + segLen / 2, z: w / 2, rw: segLen - 0.04, rd: w - 0.08, room });
    });
  } else if (roomCount === 5) {
    const third = l / 3;
    layouts.push({ x: third * 0.5, z: w * 0.25, rw: third - 0.04, rd: w * 0.5 - 0.04, room: rooms[0] });
    layouts.push({ x: third * 0.5, z: w * 0.75, rw: third - 0.04, rd: w * 0.5 - 0.04, room: rooms[1] });
    layouts.push({ x: third * 1.5, z: w / 2, rw: third - 0.04, rd: w - 0.08, room: rooms[2] });
    layouts.push({ x: third * 2.5, z: w * 0.25, rw: third - 0.04, rd: w * 0.5 - 0.04, room: rooms[3] });
    layouts.push({ x: third * 2.5, z: w * 0.75, rw: third - 0.04, rd: w * 0.5 - 0.04, room: rooms[4] });
  } else if (roomCount >= 7) {
    const cols = 3, rows = Math.ceil(roomCount / cols);
    const cellW = l / rows, cellD = w / cols;
    rooms.forEach((room, i) => {
      const row = Math.floor(i / cols), col = i % cols;
      layouts.push({ x: cellW * row + cellW / 2, z: cellD * col + cellD / 2, rw: cellW - 0.06, rd: cellD - 0.06, room });
    });
  } else {
    const segLen = l / roomCount;
    rooms.forEach((room, i) => {
      layouts.push({ x: segLen * i + segLen / 2, z: w / 2, rw: segLen - 0.04, rd: w - 0.08, room });
    });
  }
  return layouts;
}

interface RoomFullscreenProps {
  state: DesignState;
  roomId: string;
  onClose: () => void;
  onStateChange?: (updates: Partial<DesignState>) => void;
}

export default function RoomFullscreen({ state, roomId, onClose, onStateChange }: RoomFullscreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const animFrameRef = useRef<number>(0);
  const [activeTab, setActiveTab] = useState<string>("design");
  const [roomColor, setRoomColor] = useState<string>(ROOM_COLORS[state.rooms.find(r => r.id === roomId)?.type ?? "living"]);
  const floorMeshRef = useRef<THREE.Mesh | null>(null);

  const room = state.rooms.find((r) => r.id === roomId);
  const roomType = room?.type ?? "living";
  const roomLabel = room?.label ?? "Room";

  // ── Room-specific design options ─────────────────────
  const isKitchen = roomType === "kitchen";
  const isBathroom = roomType === "bathroom";
  const isLiving = roomType === "living";
  const isBedroom = roomType === "bedroom";

  const tabs: { key: string; label: string }[] = [];
  if (isKitchen) tabs.push({ key: "design", label: "Kitchen" });
  if (isBathroom) tabs.push({ key: "design", label: "Bathroom" });
  if (isLiving) tabs.push({ key: "design", label: "Living Room" });
  if (isBedroom) tabs.push({ key: "design", label: "Bedroom" });
  tabs.push({ key: "colors", label: "Colors" });

  // ── 3D Scene ────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const container = canvas.parentElement;
    if (!container) return;
    const w = container.clientWidth;
    const h = Math.max(container.clientHeight, 400);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f0f4f8");
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, w / h, 0.5, 50);
    camera.position.set(3, 4, 6);
    camera.lookAt(3, 1.3, 1.2);
    scene.add(camera);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(3, 1.3, 1.2);
    controls.enableDamping = true;
    controls.minDistance = 1.5;
    controls.maxDistance = 10;
    controls.update();

    // Lighting
    scene.add(new THREE.AmbientLight("#ffffff", 1.5));
    const hemi = new THREE.HemisphereLight("#b1e1ff", "#8d6e63", 1.0);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight("#ffffff", 3.0);
    sun.position.set(10, 12, 8);
    sun.castShadow = true;
    scene.add(sun);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(15, 15);
    const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ color: "#c8d8c0", roughness: 0.9 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid
    const grid = new THREE.PolarGridHelper(8, 16, 12, 64, "#cccccc", "#dddddd");
    grid.position.y = 0;
    scene.add(grid);

    // Build room scene
    const roomGroup = new THREE.Group();
    scene.add(roomGroup);

    const { length: cl, width: cw, height: ch } = getDimensions(state);
    const layouts = computeRoomLayouts3D(state.rooms, cl, cw);
    const layout = layouts.find((l) => l.room.id === roomId);

    const roomW = layout?.rw ?? 3;
    const roomD = layout?.rd ?? 2.4;
    const roomX = layout?.x ?? cl / 2;
    const roomZ = layout?.z ?? cw / 2;

    // Room floor
    const floorGeo = new THREE.PlaneGeometry(roomW + 1, roomD + 1);
    const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({
      color: roomColor, roughness: 0.7, metalness: 0.05, transparent: true, opacity: 0.5,
    }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(roomX, 0.04, roomZ);
    floor.receiveShadow = true;
    roomGroup.add(floor);
    floorMeshRef.current = floor;

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: "#f5f5f0", roughness: 0.6, metalness: 0.1 });
    const wallH = 2.5;
    const halfRW = roomW / 2;
    const halfRD = roomD / 2;
    const wallThick = 0.06;

    function addWall(wx: number, wy: number, wz: number, ww: number, wh: number, wd: number) {
      const g = new THREE.BoxGeometry(ww, wh, wd);
      const m = new THREE.Mesh(g, wallMat.clone());
      m.position.set(wx, wy, wz);
      m.castShadow = true; m.receiveShadow = true;
      roomGroup.add(m);
    }
    addWall(roomX - halfRW, wallH / 2, roomZ, wallThick, wallH, roomD);
    addWall(roomX + halfRW, wallH / 2, roomZ, wallThick, wallH, roomD);
    addWall(roomX, wallH / 2, roomZ - halfRD, roomW, wallH, wallThick);
    addWall(roomX, wallH / 2, roomZ + halfRD, roomW, wallH, wallThick);

    // Furniture based on room type
    const floorY = 0.06;
    if (isKitchen) {
      // Counter
      const counter = new THREE.Mesh(
        new THREE.BoxGeometry(roomW * 0.7, 0.9, 0.6),
        new THREE.MeshStandardMaterial({ color: "#f5f0e8", roughness: 0.4, metalness: 0.2 })
      );
      counter.position.set(roomX, floorY + 0.45, roomZ - halfRD + 0.35);
      counter.castShadow = true;
      roomGroup.add(counter);

      const counterTop = new THREE.Mesh(
        new THREE.BoxGeometry(roomW * 0.7, 0.04, 0.62),
        new THREE.MeshStandardMaterial({ color: COUNTERTOP_HEX[state.kitchenCountertop], roughness: 0.2, metalness: 0.3 })
      );
      counterTop.position.set(roomX, floorY + 0.92, roomZ - halfRD + 0.35);
      roomGroup.add(counterTop);

      if (state.kitchenAppliances.includes("refrigerator")) {
        const fridge = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.7, 0.65), new THREE.MeshStandardMaterial({ color: "#e8e8e8", roughness: 0.1, metalness: 0.7 }));
        fridge.position.set(roomX + halfRW - 0.5, floorY + 0.85, roomZ + halfRD - 0.4);
        roomGroup.add(fridge);
      }
    }

    if (isBathroom) {
      if (state.bathFixtures.includes("shower")) {
        const tray = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.8), new THREE.MeshStandardMaterial({ color: "#f0f0f0" }));
        tray.position.set(roomX + halfRW - 0.6, floorY + 0.03, roomZ + halfRD - 0.6);
        roomGroup.add(tray);
      }
      if (state.bathFixtures.includes("toilet")) {
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.55), new THREE.MeshStandardMaterial({ color: "#fefefe" }));
        base.position.set(roomX - halfRW + 0.5, floorY + 0.23, roomZ - halfRD + 0.5);
        roomGroup.add(base);
      }
      if (state.bathFixtures.includes("double-sink")) {
        const vanity = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.85, 0.5), new THREE.MeshStandardMaterial({ color: "#f5f5f0" }));
        vanity.position.set(roomX + halfRW - 0.6, floorY + 0.43, roomZ + halfRD - 0.3);
        roomGroup.add(vanity);
      }
    }

    if (isLiving) {
      if (state.livingItems.includes("sofa-3")) {
        const sofa = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 0.85), new THREE.MeshStandardMaterial({ color: "#5C4A3E", roughness: 0.6 }));
        sofa.position.set(roomX, floorY + 0.25, roomZ + halfRD - 0.6);
        sofa.castShadow = true;
        roomGroup.add(sofa);
      }
      if (state.livingItems.includes("coffee-table")) {
        const table = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.6), new THREE.MeshStandardMaterial({ color: "#D4A76A", roughness: 0.3 }));
        table.position.set(roomX, floorY + 0.4, roomZ);
        roomGroup.add(table);
      }
      if (state.livingItems.includes("tv-unit")) {
        const tv = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.4), new THREE.MeshStandardMaterial({ color: "#3a3a3a" }));
        tv.position.set(roomX, floorY + 0.25, roomZ - halfRD + 0.3);
        roomGroup.add(tv);
      }
    }

    if (isBedroom) {
      if (state.bedroomItems.includes("bed-double") || state.bedroomItems.includes("bed-queen")) {
        const bed = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 2.0), new THREE.MeshStandardMaterial({ color: "#f5f5f0", roughness: 0.6 }));
        bed.position.set(roomX, floorY + 0.35, roomZ + halfRD - 1.2);
        bed.castShadow = true;
        roomGroup.add(bed);
      }
      if (state.bedroomItems.includes("wardrobe")) {
        const wb = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.1, 0.6), new THREE.MeshStandardMaterial({ color: "#7B5B3A", roughness: 0.3 }));
        wb.position.set(roomX - halfRW + 0.6, floorY + 1.05, roomZ - halfRD + 0.4);
        roomGroup.add(wb);
      }
      if (state.bedroomItems.includes("desk")) {
        const desk = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.6), new THREE.MeshStandardMaterial({ color: "#A0845C", roughness: 0.3 }));
        desk.position.set(roomX + halfRW - 0.8, floorY + 0.72, roomZ + halfRD - 0.5);
        roomGroup.add(desk);
      }
    }

    // Center camera on room
    const dist = Math.max(roomW, roomD) * 1.5;
    camera.position.set(roomX, roomW * 0.6, roomZ + dist);
    controls.target.set(roomX, wallH * 0.5, roomZ);
    controls.update();

    function animate() {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    function handleResize() {
      if (!container || !renderer || !camera) return;
      const nw = container.clientWidth;
      const nh = Math.max(container.clientHeight, 400);
      renderer.setSize(nw, nh, false);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material?.dispose();
        }
      });
    };
  }, [roomId, state]);

  // Update floor color when roomColor changes
  useEffect(() => {
    const floor = floorMeshRef.current;
    if (!floor) return;
    const mat = floor.material;
    if (Array.isArray(mat)) {
      mat.forEach(m => { if (m instanceof THREE.MeshStandardMaterial) m.color.set(roomColor); });
    } else if (mat instanceof THREE.MeshStandardMaterial) {
      mat.color.set(roomColor);
    }
  }, [roomColor]);

  // ── Render ──────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col" style={{ height: "100dvh" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-700 to-green-600 text-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-medium transition-all"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Tilbake
          </button>
          <div>
            <h2 className="text-lg font-bold">{roomLabel}</h2>
            <p className="text-xs text-emerald-200">{roomType === "kitchen" ? "Kjøkken" : roomType === "bathroom" ? "Bad" : roomType === "living" ? "Stue" : roomType === "bedroom" ? "Soverom" : "Rom"} — Fullskjermsvisning</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === t.key ? "bg-white text-emerald-700" : "bg-white/10 text-white/80 hover:bg-white/20"
              }`}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* 3D View */}
        <div className="flex-1 relative bg-gray-100">
          <div className="absolute inset-0" ref={(el) => { /* canvas parent */ }}>
            <canvas ref={canvasRef} className="w-full h-full" style={{ touchAction: "none" }} />
          </div>
          <div className="absolute top-3 right-3 z-10">
            <span className="px-2.5 py-1 rounded-lg text-[10px] text-gray-500 bg-white/80 shadow-sm border border-gray-200">
              Dra for å rotere · Scroll for å zoome
            </span>
          </div>
        </div>

        {/* Design Tools Sidebar */}
        {activeTab === "design" && (
          <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0 p-4 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              {roomLabel} — Designverktøy
            </h3>

            {/* Kitchen tools */}
            {isKitchen && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-2">Kjøkkenlayout</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["L-shape", "galley", "island"] as KitchenLayout[]).map((layout) => (
                      <button key={layout} onClick={() => onStateChange?.({ kitchenLayout: layout })}
                        className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all ${
                          state.kitchenLayout === layout ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >{layout === "L-shape" ? "L-Shape" : layout === "galley" ? "Galley" : "Island"}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-2">Benkeplate</label>
                  <div className="flex flex-wrap gap-2">
                    {(["wood","granite","marble","laminate","steel"] as CountertopMaterial[]).map((m) => (
                      <button key={m} onClick={() => onStateChange?.({ kitchenCountertop: m })}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                          state.kitchenCountertop === m ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300"
                        }`}
                      >{m.charAt(0).toUpperCase() + m.slice(1)}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-2">Hvitevarer</label>
                  <div className="flex flex-wrap gap-2">
                    {(["refrigerator","oven","dishwasher","microwave","cooktop"] as KitchenAppliance[]).map((app) => {
                      const active = state.kitchenAppliances.includes(app);
                      return (
                        <button key={app} onClick={() => onStateChange?.({ kitchenAppliances: active ? state.kitchenAppliances.filter(a => a !== app) : [...state.kitchenAppliances, app] })}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                            active ? "border-amber-500 bg-amber-50 text-amber-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
                          }`}
                        >{app.charAt(0).toUpperCase() + app.slice(1)}</button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Bathroom tools */}
            {isBathroom && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">Velg baderomsinnredning:</p>
                {(["shower","tub","double-sink","toilet","bidet"] as BathFixture[]).map((fixture) => {
                  const active = state.bathFixtures.includes(fixture);
                  return (
                    <button key={fixture} onClick={() => onStateChange?.({ bathFixtures: active ? state.bathFixtures.filter(f => f !== fixture) : [...state.bathFixtures, fixture] })}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-all ${
                        active ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="font-medium text-gray-700">{fixture === "double-sink" ? "Dobbel Servant" : fixture === "shower" ? "Dusj" : fixture === "tub" ? "Badekar" : fixture === "toilet" ? "Toalett" : "Bidét"}</span>
                      <span className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${active ? "bg-blue-500" : "bg-gray-300"}`}>
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${active ? "translate-x-4" : "translate-x-0.5"}`} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Living room tools */}
            {isLiving && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">Møbler til stuen:</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(LIVING_LABELS) as LivingItem[]).map((item) => {
                    const active = state.livingItems.includes(item);
                    return (
                      <button key={item} onClick={() => onStateChange?.({ livingItems: active ? state.livingItems.filter(i => i !== item) : [...state.livingItems, item] })}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-center transition-all ${
                          active ? "border-green-500 bg-green-50" : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <span className="text-[10px] font-medium text-gray-700 leading-tight">{LIVING_LABELS[item]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bedroom tools */}
            {isBedroom && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">Møbler til soverommet:</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(BEDROOM_LABELS) as BedroomItem[]).map((item) => {
                    const active = state.bedroomItems.includes(item);
                    return (
                      <button key={item} onClick={() => onStateChange?.({ bedroomItems: active ? state.bedroomItems.filter(i => i !== item) : [...state.bedroomItems, item] })}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border text-center transition-all ${
                          active ? "border-purple-500 bg-purple-50" : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <span className="text-[10px] font-medium text-gray-700 leading-tight">{BEDROOM_LABELS[item]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Colors tab */}
        {activeTab === "colors" && (
          <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0 p-4 space-y-4">
            <h3 className="text-sm font-bold text-gray-800">Farger &amp; Materialer</h3>
            <p className="text-xs text-gray-500">Fargevalg for {roomLabel.toLowerCase()}. Nåværende: <span className="inline-block w-4 h-4 rounded-full border border-gray-300 align-middle ml-1" style={{ backgroundColor: roomColor }} /></p>
            <div className="grid grid-cols-5 gap-2">
              {["#f5f5f0","#e8e0d8","#d4c5a9","#c0b8a8","#a89880","#8B7355","#6B5B4E","#5C4A3E","#D4E4F0","#B8D4E8"].map((color) => (
                <button key={color}
                  onClick={() => setRoomColor(color)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                    roomColor === color ? "border-emerald-500 ring-2 ring-emerald-300 scale-110" : "border-gray-200 hover:border-emerald-400"
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <p className="text-[10px] text-gray-400 italic">Gulvfarge oppdateres i sanntid i 3D-visningen.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-100 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
        <span className="text-xs text-gray-500">{state.rooms.length} rom i designet</span>
        <button onClick={onClose}
          className="px-4 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-all"
        >Lukk fullskjerm</button>
      </div>
    </div>
  );
}
