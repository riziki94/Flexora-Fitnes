import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type {
  ContainerSize,
  ExteriorColor,
  RoomType,
  Wall,
  LayoutType,
  KitchenLayout,
  CountertopMaterial,
  KitchenAppliance,
  BathFixture,
  LivingItem,
  BedroomItem,
  SmartHomeType,
  Window_,
  Door_,
  RoomDef,
  DesignState,
  PlacedFurniture,
  FurnitureType,
  ViewPreset,
  TimeOfDay,
  Weather,
  EnvironmentPreset,
  TimeConfig,
  WeatherConfig,
  ContainerPos,
  RoomLayout3D,
} from "../types/zongosol";

// ── Constants ──────────────────────────────────────────
const EXTERIOR_HEX: Record<ExteriorColor, string> = {
  wood: "#8B5E3C", metal: "#9CA3AF", white: "#F5F5F0", green: "#2D5A27", charcoal: "#4A4A4A",
};

const ROOM_COLORS: Record<RoomType, string> = {
  kitchen: "#FF8C42", bathroom: "#4A90D9", living: "#5CB85C", bedroom: "#9B59B6",
};

const COUNTERTOP_HEX: Record<CountertopMaterial, string> = {
  wood: "#8B5E3C", granite: "#4A4A4A", marble: "#F5F5F0", laminate: "#E5E7EB", steel: "#9CA3AF",
};

// ── Environment configs ─────────────────────────────────
const TIME_CONFIGS: Record<TimeOfDay, TimeConfig> = {
  sunrise: { skyColor: "#FF9B6A", sunColor: "#FFAA55", sunIntensity: 3.0, ambientIntensity: 0.8, hemiSkyColor: "#FFD4A8", hemiGroundColor: "#8B6914", hemiIntensity: 0.6, fogColor: "#FFCC99", fogNear: 15, fogFar: 60, groundColor: "#B0C4A0" },
  day:     { skyColor: "#87CEEB", sunColor: "#FFF8E7", sunIntensity: 3.5, ambientIntensity: 1.2, hemiSkyColor: "#B1E1FF", hemiGroundColor: "#8D6E63", hemiIntensity: 0.8, fogColor: "#B8C8D8", fogNear: 20, fogFar: 80, groundColor: "#A8C5A0" },
  sunset:  { skyColor: "#E87A5A", sunColor: "#FF7744", sunIntensity: 2.8, ambientIntensity: 0.7, hemiSkyColor: "#FFB899", hemiGroundColor: "#6B4226", hemiIntensity: 0.5, fogColor: "#FFBBAA", fogNear: 12, fogFar: 55, groundColor: "#C0B090" },
  night:   { skyColor: "#0A0A28", sunColor: "#1A1A5E", sunIntensity: 0.4, ambientIntensity: 0.12, hemiSkyColor: "#0D0D3A", hemiGroundColor: "#1A1A2E", hemiIntensity: 0.08, fogColor: "#08081E", fogNear: 8, fogFar: 40, groundColor: "#1A2A1A" },
};

const WEATHER_CONFIGS: Record<Weather, WeatherConfig> = {
  clear: { skyTint: "none", ambientMult: 1.0, sunMult: 1.0, particleType: "none", groundColor: "none" },
  rain:  { skyTint: "#707070", ambientMult: 0.45, sunMult: 0.35, particleType: "rain", groundColor: "#889088" },
  snow:  { skyTint: "#D0D0D8", ambientMult: 0.65, sunMult: 0.55, particleType: "snow", groundColor: "#F4F4F0" },
};

const ENV_PRESETS: { time: TimeOfDay; weather: Weather; label: string; icon: string }[] = [
  { time: "sunrise", weather: "clear", label: "Morning Tour", icon: "" },
  { time: "sunset",  weather: "clear", label: "Golden Hour",  icon: "" },
  { time: "night",   weather: "clear", label: "Cozy Evening",  icon: "" },
  { time: "day",     weather: "snow",  label: "Winter Wonder", icon: "" },
  { time: "day",     weather: "rain",  label: "Stormy Day",    icon: "" },
];

// ── Particle systems ────────────────────────────────────
function createRainParticles(): THREE.Points {
  const count = 4000;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 35;
    positions[i + 1] = Math.random() * 25;
    positions[i + 2] = (Math.random() - 0.5) * 35;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: "#AAC8FF", size: 0.07, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.NormalBlending });
  const points = new THREE.Points(geo, mat);
  points.name = "rainSystem"; points.visible = false;
  return points;
}

function createSnowParticles(): THREE.Points {
  const count = 2000;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 35;
    positions[i * 3 + 1] = Math.random() * 25;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 35;
    sizes[i] = Math.random() * 0.2 + 0.08;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  const mat = new THREE.PointsMaterial({ color: "#FFFFFF", size: 0.18, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.NormalBlending });
  const points = new THREE.Points(geo, mat);
  points.name = "snowSystem"; points.visible = false;
  return points;
}

function getDimensions(state: DesignState): { length: number; width: number; height: number } {
  let lengthFt: number;
  let widthFt: number;
  switch (state.containerSize) {
    case "20ft": lengthFt = 20; widthFt = 8; break;
    case "40ft": lengthFt = 40; widthFt = 8; break;
    case "double": lengthFt = 40; widthFt = 16; break;
    case "custom": lengthFt = state.customLength; widthFt = state.customWidth; break;
    default: lengthFt = 20; widthFt = 8;
  }
  return { length: lengthFt * 0.3048, width: widthFt * 0.3048, height: 2.59 };
}

// ── Container builder helper ───────────────────────────

function getContainerPositions(layoutType: LayoutType, length: number, width: number, height: number): ContainerPos[] {
  switch (layoutType) {
    case "single": return [{ ox: 0, oy: 0, oz: 0, rotY: 0 }];
    case "side-by-side": return [{ ox: 0, oy: 0, oz: 0, rotY: 0 }, { ox: 0, oy: 0, oz: width + 0.1, rotY: 0 }];
    case "l-shape": return [{ ox: 0, oy: 0, oz: 0, rotY: 0 }, { ox: length, oy: 0, oz: 0, rotY: Math.PI / 2 }];
    case "u-shape": return [{ ox: 0, oy: 0, oz: width + 0.1, rotY: 0 }, { ox: 0, oy: 0, oz: 0, rotY: Math.PI / 2 }, { ox: length, oy: 0, oz: 0, rotY: Math.PI / 2 }];
    case "stacked": return [{ ox: 0, oy: 0, oz: 0, rotY: 0 }, { ox: 0, oy: height + 0.3, oz: 0, rotY: 0 }];
    default: return [{ ox: 0, oy: 0, oz: 0, rotY: 0 }];
  }
}

function getLayoutCenter(positions: ContainerPos[], length: number, width: number, height: number) {
  if (positions.length === 0) return { cx: length / 2, cy: height / 2, cz: width / 2 };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const { ox, oy, oz, rotY } of positions) {
    const corners = [
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(length, 0, 0),
      new THREE.Vector3(0, height, 0), new THREE.Vector3(length, height, 0),
      new THREE.Vector3(0, 0, width), new THREE.Vector3(length, 0, width),
      new THREE.Vector3(0, height, width), new THREE.Vector3(length, height, width),
    ];
    for (const c of corners) {
      const cos = Math.cos(rotY), sin = Math.sin(rotY);
      const rx = c.x * cos - c.z * sin;
      const rz = c.x * sin + c.z * cos;
      minX = Math.min(minX, rx + ox); maxX = Math.max(maxX, rx + ox);
      minY = Math.min(minY, c.y + oy); maxY = Math.max(maxY, c.y + oy);
      minZ = Math.min(minZ, rz + oz); maxZ = Math.max(maxZ, rz + oz);
    }
  }
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, cz: (minZ + maxZ) / 2, spanX: maxX - minX, spanY: maxY - minY, spanZ: maxZ - minZ };
}

// ── Room layout computation (shared) ──────────────────

function computeRoomLayouts3D(rooms: RoomDef[], l: number, w: number): RoomLayout3D[] {
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

// ── 3D Furniture helpers ──────────────────────────────

function createBox(w: number, h: number, d: number, color: string, roughness = 0.5, metalness = 0.1): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

function createCylinder(r: number, h: number, color: string, roughness = 0.3, metalness = 0.2): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(r, r, h, 16);
  const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

// ── Kitchen builder ────────────────────────────────────

function addKitchen3D(group: THREE.Group, roomLayout: RoomLayout3D, state: DesignState, l: number, w: number) {
  const { x: rx, z: rz, rw, rd } = roomLayout;
  const counterColor = COUNTERTOP_HEX[state.kitchenCountertop];
  const floorY = 0.06;
  const counterH = 0.9;
  const counterD = 0.6;
  const counterTopH = 0.04;
  const brandColor = "#f5f0e8";
  const brandDark = "#d4c5a9";

  const kitchenGroup = new THREE.Group();

  if (state.kitchenLayout === "L-shape") {
    // L-shape: two perpendicular counter segments
    const seg1Len = rw * 0.6;
    const seg2Len = rd * 0.5;
    // Main counter along room length
    const base1 = createBox(seg1Len, counterH, counterD, brandColor, 0.4, 0.2);
    base1.position.set(rx - rw / 2 + seg1Len / 2, floorY + counterH / 2, rz - rd / 2 + counterD / 2);
    kitchenGroup.add(base1);
    const top1 = createBox(seg1Len, counterTopH, counterD + 0.02, counterColor, 0.2, 0.3);
    top1.position.set(rx - rw / 2 + seg1Len / 2, floorY + counterH, rz - rd / 2 + counterD / 2);
    kitchenGroup.add(top1);
    // Side counter
    const base2 = createBox(counterD, counterH, seg2Len, brandColor, 0.4, 0.2);
    base2.position.set(rx - rw / 2 + counterD / 2, floorY + counterH / 2, rz - rd / 2 + seg2Len / 2);
    kitchenGroup.add(base2);
    const top2 = createBox(counterD + 0.02, counterTopH, seg2Len, counterColor, 0.2, 0.3);
    top2.position.set(rx - rw / 2 + counterD / 2, floorY + counterH, rz - rd / 2 + seg2Len / 2);
    kitchenGroup.add(top2);
    // Upper cabinets
    const uc1 = createBox(seg1Len * 0.6, 0.5, 0.35, brandDark, 0.4, 0.2);
    uc1.position.set(rx - rw / 2 + seg1Len * 0.35, floorY + counterH + 0.7, rz - rd / 2 + counterD / 2);
    kitchenGroup.add(uc1);
  } else if (state.kitchenLayout === "galley") {
    // Two parallel counters
    const segLen = rw * 0.8;
    const base1 = createBox(segLen, counterH, counterD, brandColor, 0.4, 0.2);
    base1.position.set(rx, floorY + counterH / 2, rz - rd / 2 + counterD / 2);
    kitchenGroup.add(base1);
    const top1 = createBox(segLen, counterTopH, counterD + 0.02, counterColor, 0.2, 0.3);
    top1.position.set(rx, floorY + counterH, rz - rd / 2 + counterD / 2);
    kitchenGroup.add(top1);
    const base2 = createBox(segLen, counterH, counterD, brandColor, 0.4, 0.2);
    base2.position.set(rx, floorY + counterH / 2, rz + rd / 2 - counterD / 2);
    kitchenGroup.add(base2);
    const top2 = createBox(segLen, counterTopH, counterD + 0.02, counterColor, 0.2, 0.3);
    top2.position.set(rx, floorY + counterH, rz + rd / 2 - counterD / 2);
    kitchenGroup.add(top2);
    // Upper cabinets on one side
    const uc1 = createBox(segLen * 0.5, 0.5, 0.35, brandDark, 0.4, 0.2);
    uc1.position.set(rx, floorY + counterH + 0.7, rz - rd / 2 + counterD / 2);
    kitchenGroup.add(uc1);
  } else if (state.kitchenLayout === "island") {
    // Wall counter + island
    const wallLen = rw * 0.7;
    const base1 = createBox(wallLen, counterH, counterD, brandColor, 0.4, 0.2);
    base1.position.set(rx - rw / 2 + wallLen / 2, floorY + counterH / 2, rz - rd / 2 + counterD / 2);
    kitchenGroup.add(base1);
    const top1 = createBox(wallLen, counterTopH, counterD + 0.02, counterColor, 0.2, 0.3);
    top1.position.set(rx - rw / 2 + wallLen / 2, floorY + counterH, rz - rd / 2 + counterD / 2);
    kitchenGroup.add(top1);
    // Island in center
    const islW = Math.min(1.5, rw * 0.4), islD = Math.min(0.8, rd * 0.4);
    const island = createBox(islW, counterH, islD, brandColor, 0.4, 0.2);
    island.position.set(rx, floorY + counterH / 2, rz);
    kitchenGroup.add(island);
    const islTop = createBox(islW, counterTopH, islD + 0.02, counterColor, 0.2, 0.3);
    islTop.position.set(rx, floorY + counterH, rz);
    kitchenGroup.add(islTop);
    // Upper cabinets
    const uc1 = createBox(wallLen * 0.5, 0.5, 0.35, brandDark, 0.4, 0.2);
    uc1.position.set(rx - rw / 2 + wallLen * 0.35, floorY + counterH + 0.7, rz - rd / 2 + counterD / 2);
    kitchenGroup.add(uc1);
  }

  // Sink cutout (small blue rectangle on counter)
  const sinkGeo = new THREE.PlaneGeometry(0.4, 0.35);
  const sinkMat = new THREE.MeshStandardMaterial({ color: "#6a9fb5", roughness: 0.1, metalness: 0.6, side: THREE.DoubleSide });
  const sink = new THREE.Mesh(sinkGeo, sinkMat);
  sink.rotation.x = -Math.PI / 2;
  sink.position.set(rx - rw * 0.15, floorY + counterH + counterTopH + 0.005, rz - rd / 2 + counterD / 2);
  kitchenGroup.add(sink);

  // Appliances
  if (state.kitchenAppliances.includes("refrigerator")) {
    const fridge = createBox(0.65, 1.7, 0.65, "#e8e8e8", 0.1, 0.7);
    fridge.position.set(rx + rw * 0.3, floorY + 0.85, rz + rd / 2 - 0.4);
    kitchenGroup.add(fridge);
  }
  if (state.kitchenAppliances.includes("oven")) {
    const oven = createBox(0.6, 0.7, 0.55, "#3a3a3a", 0.2, 0.7);
    oven.position.set(rx - rw * 0.15, floorY + counterH + 0.35, rz - rd / 2 + counterD / 2 + 0.01);
    kitchenGroup.add(oven);
  }
  if (state.kitchenAppliances.includes("cooktop")) {
    // Stove cutout on counter
    const cookGeo = new THREE.PlaneGeometry(0.6, 0.45);
    const cookMat = new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.1, metalness: 0.8, side: THREE.DoubleSide });
    const cook = new THREE.Mesh(cookGeo, cookMat);
    cook.rotation.x = -Math.PI / 2;
    cook.position.set(rx + rw * 0.1, floorY + counterH + counterTopH + 0.005, rz - rd / 2 + counterD / 2);
    kitchenGroup.add(cook);
    // 4 burner circles
    for (let bi = 0; bi < 4; bi++) {
      const bGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.01, 12);
      const bMat = new THREE.MeshStandardMaterial({ color: "#555", roughness: 0.2, metalness: 0.8 });
      const burner = new THREE.Mesh(bGeo, bMat);
      const bx = (bi % 2 === 0 ? -0.12 : 0.12) + rx + rw * 0.1;
      const bz = (bi < 2 ? -0.08 : 0.08) + rz - rd / 2 + counterD / 2;
      burner.position.set(bx, floorY + counterH + counterTopH + 0.01, bz);
      kitchenGroup.add(burner);
    }
  }
  if (state.kitchenAppliances.includes("dishwasher")) {
    const dw = createBox(0.55, 0.8, 0.55, "#d4d4d8", 0.1, 0.6);
    dw.position.set(rx + rw * 0.2, floorY + 0.4, rz + rd / 2 - 0.35);
    kitchenGroup.add(dw);
  }
  if (state.kitchenAppliances.includes("microwave")) {
    const mw = createBox(0.45, 0.3, 0.35, "#333", 0.1, 0.6);
    mw.position.set(rx - rw * 0.1, floorY + counterH + 0.55, rz - rd / 2 + counterD / 2 + 0.01);
    kitchenGroup.add(mw);
  }

  group.add(kitchenGroup);
}

// ── Bathroom builder ──────────────────────────────────

function addBathroom3D(group: THREE.Group, roomLayout: RoomLayout3D, state: DesignState) {
  const { x: rx, z: rz, rw, rd } = roomLayout;
  const floorY = 0.06;
  const bathGroup = new THREE.Group();

  const fixtures = state.bathFixtures;
  // Place fixtures side by side
  const fixtureCount = fixtures.length;
  if (fixtureCount === 0) return;

  const spacing = Math.min(rd, rw) / (fixtureCount + 1);

  fixtures.forEach((fixture, i) => {
    const fx = rx - rw * 0.3 + (i + 1) * spacing;
    const fz = rz;

    switch (fixture) {
      case "shower": {
        // Glass-walled box
        const sw = 0.75, sd = 0.75;
        // Base tray
        const tray = createBox(sw, 0.05, sd, "#f0f0f0", 0.1, 0.1);
        tray.position.set(fx, floorY + 0.03, fz);
        bathGroup.add(tray);
        // Glass walls (translucent)
        const glassMat = new THREE.MeshStandardMaterial({ color: "#a8d8ea", roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.4 });
        const glassWalls = [
          { w: sw, h: 1.9, d: 0.02, px: fx, py: floorY + 0.95, pz: fz - sd / 2 },
          { w: 0.02, h: 1.9, d: sd, px: fx - sw / 2, py: floorY + 0.95, pz: fz },
          { w: 0.02, h: 1.9, d: sd, px: fx + sw / 2, py: floorY + 0.95, pz: fz },
        ];
        glassWalls.forEach(gw => {
          const gGeo = new THREE.BoxGeometry(gw.w, gw.h, gw.d);
          const gMesh = new THREE.Mesh(gGeo, glassMat.clone());
          gMesh.position.set(gw.px, gw.py, gw.pz);
          gMesh.castShadow = true;
          bathGroup.add(gMesh);
        });
        // Showerhead
        const head = createCylinder(0.08, 0.03, "#888888", 0.1, 0.8);
        head.position.set(fx, floorY + 1.85, fz);
        bathGroup.add(head);
        break;
      }
      case "tub": {
        // Oval bathtub
        const tubGeo = new THREE.CapsuleGeometry(0.35, 1.2, 8, 16);
        const tubMat = new THREE.MeshStandardMaterial({ color: "#fefefe", roughness: 0.15, metalness: 0.05 });
        const tub = new THREE.Mesh(tubGeo, tubMat);
        tub.scale.set(0.9, 0.5, 0.7);
        tub.position.set(fx, floorY + 0.3, fz);
        tub.castShadow = true; tub.receiveShadow = true;
        bathGroup.add(tub);
        break;
      }
      case "double-sink": {
        // Vanity
        const vanity = createBox(0.9, 0.85, 0.5, "#f5f5f0", 0.15, 0.05);
        vanity.position.set(fx, floorY + 0.43, fz);
        bathGroup.add(vanity);
        // Two basins
        for (let b = -1; b <= 1; b += 2) {
          const basinGeo = new THREE.CylinderGeometry(0.12, 0.08, 0.1, 16);
          const basinMat = new THREE.MeshStandardMaterial({ color: "#fefefe", roughness: 0.05, metalness: 0.1 });
          const basin = new THREE.Mesh(basinGeo, basinMat);
          basin.position.set(fx + b * 0.2, floorY + 0.9, fz + 0.2);
          bathGroup.add(basin);
        }
        // Mirror
        const mirrorGeo = new THREE.PlaneGeometry(0.7, 0.6);
        const mirrorMat = new THREE.MeshStandardMaterial({ color: "#d0e0f0", roughness: 0.05, metalness: 0.9, side: THREE.DoubleSide });
        const mirror = new THREE.Mesh(mirrorGeo, mirrorMat);
        mirror.position.set(fx, floorY + 1.4, fz + 0.26);
        bathGroup.add(mirror);
        break;
      }
      case "toilet": {
        // Toilet base
        const base = createBox(0.4, 0.45, 0.55, "#fefefe", 0.05, 0.05);
        base.position.set(fx, floorY + 0.23, fz);
        bathGroup.add(base);
        // Tank
        const tank = createBox(0.35, 0.35, 0.2, "#fefefe", 0.05, 0.05);
        tank.position.set(fx, floorY + 0.55, fz - 0.15);
        bathGroup.add(tank);
        // Seat
        const seatGeo = new THREE.TorusGeometry(0.15, 0.04, 8, 16);
        const seatMat = new THREE.MeshStandardMaterial({ color: "#fefefe", roughness: 0.1, metalness: 0.05 });
        const seat = new THREE.Mesh(seatGeo, seatMat);
        seat.rotation.x = Math.PI / 2;
        seat.position.set(fx, floorY + 0.5, fz + 0.15);
        bathGroup.add(seat);
        break;
      }
      case "bidet": {
        // Similar to toilet but smaller
        const base = createBox(0.35, 0.4, 0.5, "#fefefe", 0.05, 0.05);
        base.position.set(fx, floorY + 0.2, fz);
        bathGroup.add(base);
        const tank = createBox(0.3, 0.3, 0.18, "#fefefe", 0.05, 0.05);
        tank.position.set(fx, floorY + 0.48, fz - 0.13);
        bathGroup.add(tank);
        break;
      }
    }
  });

  group.add(bathGroup);
}

// ── Living Room furniture ─────────────────────────────

function addLivingFurniture3D(group: THREE.Group, roomLayout: RoomLayout3D, state: DesignState) {
  const { x: rx, z: rz, rw, rd } = roomLayout;
  const floorY = 0.06;
  const items = state.livingItems;
  if (items.length === 0) return;

  const furnGroup = new THREE.Group();
  // Position items in a row with simple non-overlapping layout
  let offsetX = rx - rw * 0.35;
  let offsetZ = rz;
  const stepX = rw * 0.7 / Math.max(items.length, 1);

  items.forEach((item, i) => {
    const posX = offsetX + i * stepX;

    switch (item) {
      case "sofa-3": {
        // 3-seat sofa: 2.2m
        const seat = createBox(2.2, 0.4, 0.85, "#5C4A3E", 0.6, 0.1);
        seat.position.set(posX, floorY + 0.25, offsetZ);
        furnGroup.add(seat);
        const back = createBox(2.2, 0.5, 0.15, "#4A382E", 0.5, 0.1);
        back.position.set(posX, floorY + 0.65, offsetZ - 0.35);
        furnGroup.add(back);
        const armL = createBox(0.12, 0.4, 0.85, "#4A382E", 0.5, 0.1);
        armL.position.set(posX - 1.04, floorY + 0.4, offsetZ);
        furnGroup.add(armL);
        const armR = createBox(0.12, 0.4, 0.85, "#4A382E", 0.5, 0.1);
        armR.position.set(posX + 1.04, floorY + 0.4, offsetZ);
        furnGroup.add(armR);
        break;
      }
      case "sofa-2": {
        // 2-seat sofa: 1.6m
        const seat = createBox(1.6, 0.4, 0.85, "#6B5B4E", 0.6, 0.1);
        seat.position.set(posX, floorY + 0.25, offsetZ);
        furnGroup.add(seat);
        const back = createBox(1.6, 0.5, 0.15, "#5A4A3E", 0.5, 0.1);
        back.position.set(posX, floorY + 0.65, offsetZ - 0.35);
        furnGroup.add(back);
        break;
      }
      case "sectional": {
        // L-shaped sectional
        const main = createBox(2.0, 0.4, 0.85, "#5C4A3E", 0.6, 0.1);
        main.position.set(posX, floorY + 0.25, offsetZ);
        furnGroup.add(main);
        const side = createBox(0.85, 0.4, 1.2, "#5C4A3E", 0.6, 0.1);
        side.position.set(posX + 0.8, floorY + 0.25, offsetZ + 0.4);
        furnGroup.add(side);
        break;
      }
      case "coffee-table": {
        // 1.2m x 0.6m
        const top = createBox(1.2, 0.06, 0.6, "#D4A76A", 0.3, 0.05);
        top.position.set(posX, floorY + 0.4, offsetZ + 0.3);
        furnGroup.add(top);
        // 4 legs
        for (let lx = -1; lx <= 1; lx += 2) {
          for (let lz = -1; lz <= 1; lz += 2) {
            const leg = createCylinder(0.03, 0.35, "#8B6914", 0.3, 0.1);
            leg.position.set(posX + lx * 0.5, floorY + 0.17, offsetZ + 0.3 + lz * 0.2);
            furnGroup.add(leg);
          }
        }
        break;
      }
      case "tv-unit": {
        // Flat panel TV on stand
        const stand = createBox(1.2, 0.5, 0.4, "#3a3a3a", 0.2, 0.3);
        stand.position.set(posX, floorY + 0.25, offsetZ);
        furnGroup.add(stand);
        // Screen
        const screenGeo = new THREE.PlaneGeometry(1.1, 0.7);
        const screenMat = new THREE.MeshStandardMaterial({ color: "#1a1a2e", roughness: 0.1, metalness: 0.4, side: THREE.DoubleSide });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(posX, floorY + 0.85, offsetZ + 0.21);
        furnGroup.add(screen);
        break;
      }
      case "dining-4": {
        // 1.4m x 0.9m table + 4 chairs
        const tableTop = createBox(1.4, 0.06, 0.9, "#D4A76A", 0.3, 0.05);
        tableTop.position.set(posX, floorY + 0.72, offsetZ);
        furnGroup.add(tableTop);
        // Legs
        for (let lx = -1; lx <= 1; lx += 2) {
          for (let lz = -1; lz <= 1; lz += 2) {
            const leg = createCylinder(0.04, 0.68, "#8B6914", 0.3, 0.1);
            leg.position.set(posX + lx * 0.55, floorY + 0.34, offsetZ + lz * 0.35);
            furnGroup.add(leg);
          }
        }
        break;
      }
      case "dining-6": {
        // 1.8m x 0.9m table
        const tableTop = createBox(1.8, 0.06, 0.9, "#C49A5A", 0.3, 0.05);
        tableTop.position.set(posX, floorY + 0.72, offsetZ);
        furnGroup.add(tableTop);
        for (let lx = -1; lx <= 1; lx += 2) {
          for (let lz = -1; lz <= 1; lz += 2) {
            const leg = createCylinder(0.04, 0.68, "#8B6914", 0.3, 0.1);
            leg.position.set(posX + lx * 0.75, floorY + 0.34, offsetZ + lz * 0.35);
            furnGroup.add(leg);
          }
        }
        break;
      }
      case "bookshelf": {
        // Tall bookshelf against wall
        const shelf = createBox(0.8, 2.0, 0.35, "#7B5B3A", 0.4, 0.1);
        shelf.position.set(posX, floorY + 1.0, offsetZ - rd * 0.35);
        furnGroup.add(shelf);
        // Shelf dividers
        for (let s = 1; s <= 3; s++) {
          const div = createBox(0.76, 0.03, 0.33, "#5C3A1E", 0.4, 0.1);
          div.position.set(posX, floorY + s * 0.5, offsetZ - rd * 0.35);
          furnGroup.add(div);
        }
        break;
      }
    }
  });

  group.add(furnGroup);
}

// ── Bedroom furniture ─────────────────────────────────

function addBedroomFurniture3D(group: THREE.Group, roomLayout: RoomLayout3D, state: DesignState) {
  const { x: rx, z: rz, rw, rd } = roomLayout;
  const floorY = 0.06;
  const items = state.bedroomItems;
  if (items.length === 0) return;

  const furnGroup = new THREE.Group();
  let offsetX = rx - rw * 0.35;
  const offsetZ = rz;
  const stepX = rw * 0.7 / Math.max(items.length, 1);

  items.forEach((item, i) => {
    const posX = offsetX + i * stepX;

    switch (item) {
      case "bed-double": {
        // 1.8m x 2m bed
        const mattress = createBox(1.8, 0.2, 2.0, "#f5f5f0", 0.6, 0.05);
        mattress.position.set(posX, floorY + 0.35, offsetZ);
        furnGroup.add(mattress);
        const frame = createBox(1.9, 0.25, 2.1, "#5C3A1E", 0.4, 0.1);
        frame.position.set(posX, floorY + 0.13, offsetZ);
        furnGroup.add(frame);
        // Pillow
        const pillow = createBox(0.6, 0.08, 0.3, "#ffffff", 0.7, 0.01);
        pillow.position.set(posX - 0.5, floorY + 0.5, offsetZ - 0.8);
        furnGroup.add(pillow);
        break;
      }
      case "bed-queen": {
        // 1.6m x 2m bed
        const mattress = createBox(1.6, 0.2, 2.0, "#f0f0f0", 0.6, 0.05);
        mattress.position.set(posX, floorY + 0.35, offsetZ);
        furnGroup.add(mattress);
        const frame = createBox(1.7, 0.25, 2.1, "#5C3A1E", 0.4, 0.1);
        frame.position.set(posX, floorY + 0.13, offsetZ);
        furnGroup.add(frame);
        break;
      }
      case "bed-single": {
        // 1m x 2m bed
        const mattress = createBox(1.0, 0.2, 2.0, "#f5f5f0", 0.6, 0.05);
        mattress.position.set(posX, floorY + 0.35, offsetZ);
        furnGroup.add(mattress);
        const frame = createBox(1.1, 0.25, 2.1, "#5C3A1E", 0.4, 0.1);
        frame.position.set(posX, floorY + 0.13, offsetZ);
        furnGroup.add(frame);
        break;
      }
      case "wardrobe": {
        const wardrobe = createBox(0.9, 2.1, 0.6, "#7B5B3A", 0.3, 0.15);
        wardrobe.position.set(posX, floorY + 1.05, offsetZ - rd * 0.35);
        furnGroup.add(wardrobe);
        // Handles
        for (let h = -1; h <= 1; h += 2) {
          const handle = createCylinder(0.015, 0.12, "#C0C0C0", 0.1, 0.9);
          handle.position.set(posX - 0.15, floorY + 1.1 + h * 0.4, offsetZ - rd * 0.35 + 0.31);
          handle.rotation.x = Math.PI / 2;
          furnGroup.add(handle);
        }
        break;
      }
      case "nightstand": {
        const stand = createBox(0.5, 0.5, 0.4, "#A0845C", 0.3, 0.1);
        stand.position.set(posX + 0.8, floorY + 0.25, offsetZ - 0.7);
        furnGroup.add(stand);
        // Lamp
        const lampBase = createCylinder(0.06, 0.05, "#333", 0.2, 0.5);
        lampBase.position.set(posX + 0.8, floorY + 0.52, offsetZ - 0.7);
        furnGroup.add(lampBase);
        const lampPole = createCylinder(0.015, 0.25, "#555", 0.2, 0.5);
        lampPole.position.set(posX + 0.8, floorY + 0.67, offsetZ - 0.7);
        furnGroup.add(lampPole);
        break;
      }
      case "desk": {
        const deskTop = createBox(1.2, 0.05, 0.6, "#A0845C", 0.3, 0.1);
        deskTop.position.set(posX, floorY + 0.72, offsetZ);
        furnGroup.add(deskTop);
        for (let lx = -1; lx <= 1; lx += 2) {
          const leg = createCylinder(0.03, 0.7, "#7B5B3A", 0.3, 0.1);
          leg.position.set(posX + lx * 0.5, floorY + 0.35, offsetZ);
          furnGroup.add(leg);
        }
        break;
      }
    }
  });

  group.add(furnGroup);
}

// ── Placed Furniture 3D (from drag & drop on floor plan) ─

function addPlacedFurniture3D(group: THREE.Group, state: DesignState, l: number, w: number) {
  const floorY = 0.06;
  if (!state.placedFurniture || state.placedFurniture.length === 0) return;
  
  const furnGroup = new THREE.Group();
  
  // Need container dimensions in SVG units to map to 3D
  let svgW: number, svgH: number;
  if (state.containerSize === "40ft") { svgW = 120; svgH = 400; }
  else if (state.containerSize === "double") { svgW = 200; svgH = 260; }
  else if (state.containerSize === "custom") { svgW = 120; svgH = 350; }
  else { svgW = 120; svgH = 240; } // 20ft default
  
  state.placedFurniture.forEach((furn: PlacedFurniture) => {
    // Map 2D SVG coordinates to 3D world coordinates
    // SVG x -> 3D x (length), SVG y -> 3D z (width)
    const fw = furn.rotation === 90 || furn.rotation === 270 ? furn.height : furn.width;
    const fh = furn.rotation === 90 || furn.rotation === 270 ? furn.width : furn.height;
    
    const posX3d = (furn.x / svgW) * l + (fw / svgW) * l / 2;
    const posZ3d = (furn.y / svgH) * w + (fh / svgH) * w / 2;
    
    // Size in 3D (scale proportionally)
    const sizeX = (fw / svgW) * l;
    const sizeZ = (fh / svgH) * w;
    
    // Height based on furniture type
    let height3d = 0.4;
    switch (furn.type) {
      case "sofa-3": case "sofa-2": case "sectional": height3d = 0.4; break;
      case "coffee-table": height3d = 0.35; break;
      case "tv-unit": height3d = 0.5; break;
      case "dining-4": case "dining-6": height3d = 0.06; break;
      case "bookshelf": height3d = 2.0; break;
      case "wardrobe": height3d = 2.1; break;
      case "bed-double": case "bed-queen": case "bed-single": height3d = 0.2; break;
      case "nightstand": height3d = 0.5; break;
      case "desk": height3d = 0.05; break;
      default: height3d = 0.4;
    }
    
    // Simple box representation
    const boxGeo = new THREE.BoxGeometry(Math.max(0.15, sizeX), Math.max(0.08, height3d), Math.max(0.15, sizeZ));
    const boxMat = new THREE.MeshStandardMaterial({ 
      color: furn.color, roughness: 0.5, metalness: 0.1 
    });
    const box = new THREE.Mesh(boxGeo, boxMat);
    const halfH = Math.max(0.08, height3d) / 2;
    box.position.set(posX3d, floorY + halfH, posZ3d);
    box.castShadow = true;
    box.receiveShadow = true;
    
    // If rotated, apply rotation around Y axis
    if (furn.rotation !== 0) {
      box.rotation.y = (furn.rotation * Math.PI) / 180;
    }
    
    furnGroup.add(box);
    
    // Add legs for tables
    if (furn.type === "coffee-table" || furn.type === "dining-4" || furn.type === "dining-6" || furn.type === "desk" || furn.type === "nightstand") {
      const legGeo = new THREE.CylinderGeometry(0.02, 0.02, height3d * 0.7, 8);
      const legMat = new THREE.MeshStandardMaterial({ color: "#5C3A1E", roughness: 0.4, metalness: 0.1 });
      const halfX = sizeX / 2 - 0.08;
      const halfZ = sizeZ / 2 - 0.08;
      const legH = height3d * 0.35;
      for (let lx = -1; lx <= 1; lx += 2) {
        for (let lz = -1; lz <= 1; lz += 2) {
          const leg = new THREE.Mesh(legGeo, legMat);
          leg.position.set(posX3d + lx * halfX, legH, posZ3d + lz * halfZ);
          leg.castShadow = true;
          if (furn.rotation !== 0) {
            leg.rotation.y = (furn.rotation * Math.PI) / 180;
          }
          furnGroup.add(leg);
        }
      }
    }
  });
  
  group.add(furnGroup);
}

// ── Electrical markers ────────────────────────────────

function addElectricalMarkers(group: THREE.Group, containerGroup: THREE.Group, state: DesignState, l: number, w: number, h: number) {
  const floorY = 0.06;
  const elecGroup = new THREE.Group();

  // Outlet dots along walls
  const outletMat = new THREE.MeshStandardMaterial({ color: "#FFD700", roughness: 0.2, metalness: 0.5, emissive: "#553300", emissiveIntensity: 0.3 });
  const wallH = 0.3; // height on wall
  for (let i = 0; i < state.electricalOutlets; i++) {
    const frac = (i + 1) / (state.electricalOutlets + 1);
    // Distribute along bottom wall
    const ox = frac * l;
    const oz = -0.02;
    const outletGeo = new THREE.BoxGeometry(0.06, 0.08, 0.02);
    const outlet = new THREE.Mesh(outletGeo, outletMat);
    outlet.position.set(ox, floorY + wallH, oz);
    elecGroup.add(outlet);
  }

  // Light fixtures (ceiling)
  const lightMat = new THREE.MeshStandardMaterial({ color: "#FFFF88", roughness: 0.1, metalness: 0.2, emissive: "#ffffaa", emissiveIntensity: 0.6 });
  for (let i = 0; i < state.electricalLights; i++) {
    const frac = (i + 1) / (state.electricalLights + 1);
    const lx = frac * l;
    const lz = w / 2;
    const lightGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.position.set(lx, h - 0.05, lz);
    elecGroup.add(light);
  }

  // Smart home hub
  if (state.smartHome !== "none") {
    const hubColor = state.smartHome === "knx" ? "#00AA00" : "#0088CC";
    const hubMat = new THREE.MeshStandardMaterial({ color: hubColor, roughness: 0.2, metalness: 0.6, emissive: hubColor, emissiveIntensity: 0.3 });
    const hubGeo = new THREE.BoxGeometry(0.15, 0.1, 0.1);
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.position.set(l * 0.1, floorY + 0.6, w * 0.9);
    elecGroup.add(hub);
    // Antenna
    const antGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.08, 8);
    const ant = new THREE.Mesh(antGeo, hubMat);
    ant.position.set(l * 0.1, floorY + 0.68, w * 0.9);
    elecGroup.add(ant);
  }

  // EV Charger
  if (state.evCharger) {
    const chargerMat = new THREE.MeshStandardMaterial({ color: "#00AA66", roughness: 0.2, metalness: 0.5, emissive: "#003322", emissiveIntensity: 0.2 });
    const chargerBox = createBox(0.3, 0.45, 0.15, "#00AA66", 0.2, 0.5);
    chargerBox.position.set(l - 0.2, floorY + 1.0, w + 0.02);
    elecGroup.add(chargerBox);
    // Cable
    const cableGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.3, 8);
    const cable = new THREE.Mesh(cableGeo, new THREE.MeshStandardMaterial({ color: "#222", roughness: 0.5, metalness: 0.1 }));
    cable.position.set(l - 0.2, floorY + 0.65, w + 0.1);
    cable.rotation.x = Math.PI / 4;
    elecGroup.add(cable);
  }

  containerGroup.add(elecGroup);
}

// ── Build Container Box (updated) ─────────────────────

function buildContainerBox(
  group: THREE.Group,
  ox: number, oy: number, oz: number, rotY: number,
  l: number, w: number, h: number,
  colorHex: string,
  state: DesignState,
  isGroundFloor: boolean
) {
  const box = new THREE.Group();
  box.position.set(ox, oy, oz);
  box.rotation.y = rotY;

  const wallThickness = 0.08;

  const wallMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.65, metalness: 0.15 });
  const roofMat = new THREE.MeshStandardMaterial({ color: "#3a3a3a", roughness: 0.5, metalness: 0.3 });
  const floorMat = new THREE.MeshStandardMaterial({ color: "#c4a882", roughness: 0.7, metalness: 0.05 });

  // Floor
  const floorGeo = new THREE.BoxGeometry(l, 0.05, w);
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.position.set(l / 2, 0.025, w / 2);
  floorMesh.castShadow = true; floorMesh.receiveShadow = true;
  box.add(floorMesh);

  // Roof
  const roofGeo = new THREE.BoxGeometry(l, 0.06, w);
  const roofMesh = new THREE.Mesh(roofGeo, roofMat);
  roofMesh.position.set(l / 2, h + 0.03, w / 2);
  roofMesh.castShadow = true; roofMesh.receiveShadow = true;
  roofMesh.name = "roof";
  box.add(roofMesh);

  // Walls
  const leftWallGeo = new THREE.BoxGeometry(wallThickness, h, w);
  const leftWall = new THREE.Mesh(leftWallGeo, wallMat.clone());
  leftWall.position.set(0, h / 2, w / 2);
  leftWall.castShadow = true; leftWall.receiveShadow = true;
  box.add(leftWall);

  const rightWallGeo = new THREE.BoxGeometry(wallThickness, h, w);
  const rightWall = new THREE.Mesh(rightWallGeo, wallMat.clone());
  rightWall.position.set(l, h / 2, w / 2);
  rightWall.castShadow = true; rightWall.receiveShadow = true;
  box.add(rightWall);

  const frontWallGeo = new THREE.BoxGeometry(l, h, wallThickness);
  const frontWall = new THREE.Mesh(frontWallGeo, wallMat.clone());
  frontWall.position.set(l / 2, h / 2, 0);
  frontWall.castShadow = true; frontWall.receiveShadow = true;
  box.add(frontWall);

  const backWallGeo = new THREE.BoxGeometry(l, h, wallThickness);
  const backWall = new THREE.Mesh(backWallGeo, wallMat.clone());
  backWall.position.set(l / 2, h / 2, w);
  backWall.castShadow = true; backWall.receiveShadow = true;
  box.add(backWall);

  // Wireframe edges
  const edgesGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(l, h, w));
  const edgesLine = new THREE.LineSegments(edgesGeo, new THREE.LineBasicMaterial({ color: "#000000", opacity: 0.15, transparent: true }));
  edgesLine.position.set(l / 2, h / 2, w / 2);
  box.add(edgesLine);

  // Windows
  state.windows.forEach((win) => {
    const winWidth = 0.9, winHeight = 1.0;
    const winGeo = new THREE.BoxGeometry(winWidth, winHeight, 0.02);
    const winMat = new THREE.MeshStandardMaterial({
      color: "#87CEEB", roughness: 0.1, metalness: 0.4, emissive: "#1a4a6e", emissiveIntensity: 0.3, transparent: true, opacity: 0.7,
    });
    const pos = win.position / 100;
    const margin = 0.3;
    let wx: number, wy: number, wz: number;
    if (win.wall === "left") { wx = -0.01; wy = h * 0.55; wz = margin + pos * (w - margin * 2); }
    else if (win.wall === "right") { wx = l + 0.01; wy = h * 0.55; wz = margin + pos * (w - margin * 2); }
    else if (win.wall === "bottom") { wx = margin + pos * (l - margin * 2); wy = h * 0.55; wz = -0.01; }
    else { wx = margin + pos * (l - margin * 2); wy = h * 0.55; wz = w + 0.01; }
    const wMesh = new THREE.Mesh(winGeo, winMat);
    wMesh.position.set(wx, wy, wz);
    wMesh.name = "windowGlow";
    box.add(wMesh);
    const fGeo = new THREE.BoxGeometry(winWidth + 0.06, winHeight + 0.06, 0.015);
    const fMesh = new THREE.Mesh(fGeo, new THREE.MeshStandardMaterial({ color: "#2c2c2c", roughness: 0.3, metalness: 0.8 }));
    fMesh.position.copy(wMesh.position);
    box.add(fMesh);
  });

  // Doors
  state.doors.forEach((door) => {
    const doorWidth = 0.9, doorHeight = 2.1;
    const doorGeo = new THREE.BoxGeometry(doorWidth, doorHeight, 0.04);
    const doorMat = new THREE.MeshStandardMaterial({ color: "#5C3A1E", roughness: 0.4, metalness: 0.3 });
    const pos = door.position / 100;
    const margin = 0.3;
    let dx: number, dy: number, dz: number;
    if (door.wall === "left") { dx = -0.02; dy = doorHeight / 2; dz = margin + pos * (w - margin * 2); }
    else if (door.wall === "right") { dx = l + 0.02; dy = doorHeight / 2; dz = margin + pos * (w - margin * 2); }
    else if (door.wall === "bottom") { dx = margin + pos * (l - margin * 2); dy = doorHeight / 2; dz = -0.02; }
    else { dx = margin + pos * (l - margin * 2); dy = doorHeight / 2; dz = w + 0.02; }
    const dMesh = new THREE.Mesh(doorGeo, doorMat);
    dMesh.position.set(dx, dy, dz);
    box.add(dMesh);
    const dfMesh = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth + 0.08, doorHeight + 0.08, 0.02),
      new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.3, metalness: 0.8 })
    );
    dfMesh.position.copy(dMesh.position);
    box.add(dfMesh);
    const hMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8),
      new THREE.MeshStandardMaterial({ color: "#C0C0C0", roughness: 0.2, metalness: 0.9 })
    );
    hMesh.position.copy(dMesh.position);
    hMesh.position.y += 0.3;
    hMesh.rotation.x = Math.PI / 2;
    box.add(hMesh);
  });

  // Interior room coloring
  if (state.rooms.length > 0) {
    const roomLayouts = computeRoomLayouts3D(state.rooms, l, w);
    const interiorGroup = new THREE.Group();

    roomLayouts.forEach(({ x, z, rw, rd, room }) => {
      const roomGeo = new THREE.PlaneGeometry(rw, rd);
      const roomMat = new THREE.MeshStandardMaterial({
        color: ROOM_COLORS[room.type], roughness: 0.7, metalness: 0.05,
        side: THREE.DoubleSide, transparent: true, opacity: 0.6,
      });
      const roomPlane = new THREE.Mesh(roomGeo, roomMat);
      roomPlane.rotation.x = -Math.PI / 2;
      roomPlane.position.set(x, 0.06, z);
      roomPlane.userData = { roomId: room.id, isRoom: true };
      interiorGroup.add(roomPlane);
    });

    // Add furniture based on room type (only for ground floor)
    if (isGroundFloor) {
      roomLayouts.forEach((layout) => {
        if (layout.room.type === "kitchen") {
          addKitchen3D(interiorGroup, layout, state, l, w);
        } else if (layout.room.type === "bathroom") {
          addBathroom3D(interiorGroup, layout, state);
        } else if (layout.room.type === "living") {
          addLivingFurniture3D(interiorGroup, layout, state);
        } else if (layout.room.type === "bedroom") {
          addBedroomFurniture3D(interiorGroup, layout, state);
        }
      });

      // Electrical markers
      addElectricalMarkers(interiorGroup, interiorGroup, state, l, w, h);
      addPlacedFurniture3D(interiorGroup, state, l, w);
    }

    box.add(interiorGroup);
  }

  // Solar panels
  if (state.solarPanels) {
    const panelGroup = new THREE.Group();
    const cols = Math.max(1, Math.floor(l / 1.7));
    const rows = Math.max(1, Math.floor(w / 1.1));
    const panelW = 1.6, panelD = 1.0, panelH = 0.04, gapX = 0.1, gapZ = 0.1;
    const totalW = cols * panelW + (cols - 1) * gapX;
    const totalD = rows * panelD + (rows - 1) * gapZ;
    const startX = l / 2 - totalW / 2 + panelW / 2;
    const startZ = w / 2 - totalD / 2 + panelD / 2;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const pGeo = new THREE.BoxGeometry(panelW, panelH, panelD);
        const pMat = new THREE.MeshStandardMaterial({ color: "#1a237e", roughness: 0.15, metalness: 0.6, emissive: "#0a0a2e", emissiveIntensity: 0.2 });
        const panel = new THREE.Mesh(pGeo, pMat);
        panel.position.set(startX + c * (panelW + gapX), h + 0.06 + panelH / 2, startZ + r * (panelD + gapZ));
        panel.castShadow = true; panel.receiveShadow = true;
        panelGroup.add(panel);
      }
    }
    box.add(panelGroup);
  }

  // Deck
  if (isGroundFloor && state.deck) {
    const deckGeo = new THREE.BoxGeometry(l + 1, 0.06, 2);
    const deckMat = new THREE.MeshStandardMaterial({ color: "#A0522D", roughness: 0.6, metalness: 0.05 });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.set(l / 2, 0.03, w + 1);
    deck.receiveShadow = true; deck.castShadow = true;
    box.add(deck);
  }

  // Phase 7: Interior night lights (initially off)
  if (isGroundFloor) {
    const nightLight = new THREE.PointLight("#FFAA33", 0, 8, 2);
    nightLight.position.set(l / 2, h * 0.5, w / 2);
    nightLight.name = "interiorNightLight";
    nightLight.visible = false;
    box.add(nightLight);
  }

  group.add(box);
}

// ── Stairs helper ────────────────────────────────────────

function addStairs(group: THREE.Group, l: number, w: number, h: number) {
  const stepCount = 8;
  const stepW = 0.8;
  const stepD = 0.3;
  const stepH = h / stepCount;
  const stairMat = new THREE.MeshStandardMaterial({ color: "#777777", roughness: 0.5, metalness: 0.4 });
  for (let i = 0; i < stepCount; i++) {
    const stepGeo = new THREE.BoxGeometry(stepW, stepH, stepD);
    const step = new THREE.Mesh(stepGeo, stairMat);
    step.position.set(l / 2, stepH * i + stepH / 2, w + stepD / 2 + i * stepD);
    step.castShadow = true; step.receiveShadow = true;
    group.add(step);
  }
}

// ── Balcony helper ───────────────────────────────────────

function addBalcony(group: THREE.Group, l: number, w: number, h: number, upperY: number) {
  const balcW = 1.5, balcH = 0.06;
  const platGeo = new THREE.BoxGeometry(balcW, balcH, w);
  const platMat = new THREE.MeshStandardMaterial({ color: "#A0522D", roughness: 0.6, metalness: 0.05 });
  const platform = new THREE.Mesh(platGeo, platMat);
  platform.position.set(l / 2, upperY + 0.03, w / 2);
  platform.receiveShadow = true; platform.castShadow = true;
  group.add(platform);

  const railMat = new THREE.MeshStandardMaterial({ color: "#555555", roughness: 0.3, metalness: 0.8 });
  const railH = 1.0;
  const posts = 6;
  for (let i = 0; i < posts; i++) {
    const postGeo = new THREE.CylinderGeometry(0.03, 0.03, railH, 8);
    const post = new THREE.Mesh(postGeo, railMat);
    post.position.set(l / 2 + balcW / 2 - 0.15, upperY + railH / 2, (i / (posts - 1)) * w);
    post.castShadow = true;
    group.add(post);
  }
  const topRailGeo = new THREE.CylinderGeometry(0.02, 0.02, w, 8);
  const topRail = new THREE.Mesh(topRailGeo, railMat);
  topRail.rotation.z = Math.PI / 2;
  topRail.position.set(l / 2 + balcW / 2 - 0.15, upperY + railH, w / 2);
  group.add(topRail);
}

// ── Roof Terrace helper ──────────────────────────────────

function addRoofTerrace(group: THREE.Group, l: number, w: number, h: number, roofY: number) {
  const railMat = new THREE.MeshStandardMaterial({ color: "#555555", roughness: 0.3, metalness: 0.8 });
  const railH = 1.0;
  const postGap = 1.5;
  const perimeter = [
    { x: 0.1, z: 0.1 }, { x: l - 0.1, z: 0.1 }, { x: 0.1, z: w - 0.1 }, { x: l - 0.1, z: w - 0.1 },
  ];
  for (let px = 0.1; px <= l - 0.05; px += postGap) {
    perimeter.push({ x: px, z: 0.1 }); perimeter.push({ x: px, z: w - 0.1 });
  }
  for (let pz = postGap + 0.1; pz <= w - 0.15; pz += postGap) {
    perimeter.push({ x: 0.1, z: pz }); perimeter.push({ x: l - 0.1, z: pz });
  }
  for (const { x, z } of perimeter) {
    const postGeo = new THREE.CylinderGeometry(0.03, 0.03, railH, 8);
    const post = new THREE.Mesh(postGeo, railMat);
    post.position.set(x, roofY + railH / 2, z);
    post.castShadow = true;
    group.add(post);
  }
  const hatchGeo = new THREE.BoxGeometry(0.8, 0.15, 0.8);
  const hatch = new THREE.Mesh(hatchGeo, new THREE.MeshStandardMaterial({ color: "#444444", roughness: 0.4, metalness: 0.6 }));
  hatch.position.set(l / 2, roofY + 0.08, w / 2);
  hatch.castShadow = true;
  group.add(hatch);
}

// ── Component ──────────────────────────────────────────
interface Container3DProps {
  state: DesignState;
  viewMode: "3d" | "floorplan";
  onViewModeChange: (mode: "3d" | "floorplan") => void;
  onRoomClick?: (roomId: string) => void;
  tourActive?: boolean;
  onTourStateChange?: (active: boolean) => void;
}

export interface Container3DHandle {
  captureView: (preset: ViewPreset) => string | null;
  getCanvas: () => HTMLCanvasElement | null;
  startTour: () => void;
  stopTour: () => void;
}

const Container3D = forwardRef<Container3DHandle, Container3DProps>(function Container3D({ state, viewMode, onViewModeChange, onRoomClick, tourActive: externalTourActive, onTourStateChange }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const containerGroupRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number>(0);
  // Phase 7: dynamic scene element refs
  const sunRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientRef = useRef<THREE.AmbientLight | null>(null);
  const hemiRef = useRef<THREE.HemisphereLight | null>(null);
  const groundRef = useRef<THREE.Mesh | null>(null);
  const rainRef = useRef<THREE.Points | null>(null);
  const snowRef = useRef<THREE.Points | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [activePreset, setActivePreset] = useState<ViewPreset | null>(null);
  // Phase 7: environment & screenshot state
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("day");
  const [weather, setWeather] = useState<Weather>("clear");
  const [showEnvPanel, setShowEnvPanel] = useState(false);
  const [showARModal, setShowARModal] = useState(false);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);
  const [showScreenshotGallery, setShowScreenshotGallery] = useState(false);

  // ── Tour state ───────────────────────────────────────
  const [internalTourActive, setInternalTourActive] = useState(false);
  const [tourPhase, setTourPhase] = useState(0);
  const [tourRoomLabel, setTourRoomLabel] = useState<string | null>(null);
  const tourAnimRef = useRef<number>(0);
  const tourStartTimeRef = useRef<number>(0);
  const tourPhaseDurationRef = useRef<number>(4000); // ms per room
  const tourCameraStartPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const tourCameraEndPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const tourTargetStartRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const tourTargetEndRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const tourIsTransitioningRef = useRef<boolean>(true);
  const roomMeshRefs = useRef<{ mesh: THREE.Mesh; roomId: string }[]>([]);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // ── Tour helper: get room viewpoints ─────────────────
  const getRoomViewpoints = useCallback(() => {
    const dims = getDimensions(state);
    const { length: l, width: w, height: h } = dims;
    const layouts = computeRoomLayouts3D(state.rooms, l, w);
    if (layouts.length === 0) return [];

    // Build a tour sequence: entrance overview → each room → exterior
    const viewpoints: { pos: THREE.Vector3; target: THREE.Vector3; label: string; roomId?: string }[] = [];

    // 1. Entrance overview
    const firstRoom = layouts[0];
    const cx = l / 2;
    viewpoints.push({
      pos: new THREE.Vector3(cx, h * 1.8, w + 5),
      target: new THREE.Vector3(cx, h * 0.5, w / 2),
      label: "Inngang",
    });

    // 2. Each room
    layouts.forEach((layout) => {
      const roomCenter = new THREE.Vector3(layout.x, h * 0.5, layout.z);
      const roomDist = Math.max(layout.rw, layout.rd) * 1.4;
      viewpoints.push({
        pos: new THREE.Vector3(layout.x, h * 0.8, layout.z + roomDist),
        target: roomCenter,
        label: layout.room.label,
        roomId: layout.room.id,
      });
    });

    // 3. Terrace/deck exterior
    const lastRoom = layouts[layouts.length - 1];
    viewpoints.push({
      pos: new THREE.Vector3(lastRoom.x, h * 1.5, w + 4),
      target: new THREE.Vector3(lastRoom.x, h * 0.6, w / 2),
      label: state.deck ? "Terrasse" : "Utside",
    });

    return viewpoints;
  }, [state]);

  // ── Tour animation logic ─────────────────────────────
  const startTourFn = useCallback(() => {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    if (!controls) return;

    const viewpoints = getRoomViewpoints();
    if (viewpoints.length === 0) return;

    controls.autoRotate = false;
    setInternalTourActive(true);
    onTourStateChange?.(true);
    setTourPhase(0);
    tourPhaseDurationRef.current = 4000;
    tourIsTransitioningRef.current = true;

    // Set initial state for phase 0
    setTourRoomLabel(viewpoints[0].label);
    tourCameraStartPosRef.current.copy(camera?.position ?? viewpoints[0].pos);
    tourCameraEndPosRef.current.copy(viewpoints[0].pos);
    tourTargetStartRef.current.copy(controls.target);
    tourTargetEndRef.current.copy(viewpoints[0].target);
    tourStartTimeRef.current = performance.now();

    // Start animation frame
    const animateTour = (time: number) => {
      const cam = cameraRef.current;
      const ctrl = controlsRef.current;
      if (!cam || !ctrl) return;

      const elapsed = time - tourStartTimeRef.current;
      const viewpointsCurrent = getRoomViewpoints();

      // Determine current phase
      const phaseIdx = Math.min(Math.floor(elapsed / tourPhaseDurationRef.current), viewpointsCurrent.length - 1);
      const phaseTime = elapsed - phaseIdx * tourPhaseDurationRef.current;
      const t = Math.min(phaseTime / tourPhaseDurationRef.current, 1.0);

      // Ease in-out
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      if (phaseIdx < viewpointsCurrent.length) {
        const vp = viewpointsCurrent[phaseIdx];
        setTourPhase(phaseIdx);
        setTourRoomLabel(vp.label);

        if (t < 1.0) {
          // Interpolate position
          if (phaseIdx === 0) {
            cam.position.lerpVectors(tourCameraStartPosRef.current, vp.pos, ease);
            ctrl.target.lerpVectors(tourTargetStartRef.current, vp.target, ease);
          } else {
            const prevVp = viewpointsCurrent[phaseIdx - 1];
            cam.position.lerpVectors(prevVp.pos, vp.pos, ease);
            ctrl.target.lerpVectors(prevVp.target, vp.target, ease);
          }
        } else {
          cam.position.copy(vp.pos);
          ctrl.target.copy(vp.target);
        }
      }

      ctrl.update();

      if (phaseIdx < viewpointsCurrent.length - 1 || t < 1.0) {
        tourAnimRef.current = requestAnimationFrame(animateTour);
      } else {
        // Tour complete
        setInternalTourActive(false);
        onTourStateChange?.(false);
        setTourRoomLabel(null);
        controls.autoRotate = true;
      }
    };

    tourAnimRef.current = requestAnimationFrame(animateTour);
  }, [getRoomViewpoints, onTourStateChange]);

  const stopTourFn = useCallback(() => {
    cancelAnimationFrame(tourAnimRef.current);
    setInternalTourActive(false);
    onTourStateChange?.(false);
    setTourRoomLabel(null);
    if (controlsRef.current) {
      controlsRef.current.autoRotate = true;
    }
  }, [onTourStateChange]);

  // ── Room click handler ───────────────────────────────
  const handleCanvasClick = useCallback((event: MouseEvent) => {
    if (!canvasRef.current || !sceneRef.current || !cameraRef.current) return;
    if (internalTourActive) return;

    const rect = canvasRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

    const roomMeshes = roomMeshRefs.current;
    const intersects = raycasterRef.current.intersectObjects(roomMeshes.map(r => r.mesh), false);

    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      const roomEntry = roomMeshes.find(r => r.mesh === hit);
      if (roomEntry) {
        onRoomClick?.(roomEntry.roomId);
      }
    }
  }, [internalTourActive, onRoomClick]);

  // ── Expose capture + tour handle ────────────────────
  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    captureView: (preset: ViewPreset) => {
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      const scene = sceneRef.current;
      const controls = controlsRef.current;
      if (!renderer || !camera || !scene) return null;
      const dims = getDimensions(state);
      const { length, width, height } = dims;
      const cx = length / 2; const cz = width / 2; const cy = height / 2;
      const savedPos = camera.position.clone();
      const savedTarget = controls?.target.clone() ?? new THREE.Vector3(cx, cy, cz);
      const dist = Math.max(length, width, height) * 2.2;
      const target = new THREE.Vector3(cx, cy, cz);
      switch (preset) {
        case "front": camera.position.set(cx, cy, cz + dist); break;
        case "back": camera.position.set(cx, cy, cz - dist); break;
        case "top": camera.position.set(cx, cy + dist, cz); break;
        case "bird": camera.position.set(cx + dist * 0.7, cy + dist * 0.5, cz + dist * 0.7); break;
        case "walk": camera.position.set(cx - dist * 0.4, cy + height * 0.3, cz + dist * 0.5); break;
      }
      camera.lookAt(target);
      if (controls) { controls.target.copy(target); controls.update(); }
      renderer.render(scene, camera);
      const dataUrl = renderer.domElement.toDataURL("image/png");
      camera.position.copy(savedPos);
      camera.lookAt(savedTarget);
      if (controls) { controls.target.copy(savedTarget); controls.update(); }
      return dataUrl;
    },
    startTour: () => {
      startTourFn();
    },
    stopTour: () => {
      stopTourFn();
    },
  }), [state]);

  // ── Scene initialization ────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const container = canvas.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = Math.max(container.clientHeight, 400);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#e8f0fe");
    scene.fog = new THREE.Fog("#e8f0fe", 20, 80);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.5, 100);
    camera.position.set(8, 6, 10);
    camera.lookAt(3, 1, 0);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(3, 1.3, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2;
    controls.maxDistance = 25;
    controls.maxPolarAngle = Math.PI * 0.75;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.5;
    controls.update();
    controlsRef.current = controls;

    // Lighting
    const ambient = new THREE.AmbientLight("#ffffff", 1.2);
    scene.add(ambient);
    ambientRef.current = ambient;

    const hemi = new THREE.HemisphereLight("#b1e1ff", "#8d6e63", 0.8);
    scene.add(hemi);
    hemiRef.current = hemi;

    const sun = new THREE.DirectionalLight("#ffffff", 3.5);
    sun.position.set(15, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 60;
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    sun.shadow.bias = -0.0005;
    scene.add(sun);
    sunRef.current = sun;

    const groundGeo = new THREE.PlaneGeometry(40, 40);
    const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ color: "#a8c5a0", roughness: 0.9, metalness: 0 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    ground.name = "ground";
    scene.add(ground);
    groundRef.current = ground;

    // Phase 7: particle systems
    const rainSystem = createRainParticles();
    scene.add(rainSystem);
    rainRef.current = rainSystem;

    const snowSystem = createSnowParticles();
    scene.add(snowSystem);
    snowRef.current = snowSystem;

    const grid = new THREE.PolarGridHelper(18, 36, 24, 128, "#888888", "#cccccc");
    grid.position.y = 0;
    scene.add(grid);

    const containerGroup = new THREE.Group();
    scene.add(containerGroup);
    containerGroupRef.current = containerGroup;

    function animate() {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();

      // Phase 7: Animate particles
      const rainSys = rainRef.current;
      const snowSys = snowRef.current;
      if (rainSys && rainSys.visible) {
        const pos = rainSys.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          pos.array[i * 3 + 1] -= 0.25;
          if (pos.array[i * 3 + 1] < -2) {
            pos.array[i * 3 + 1] = 23;
            pos.array[i * 3] = (Math.random() - 0.5) * 35;
            pos.array[i * 3 + 2] = (Math.random() - 0.5) * 35;
          }
        }
        pos.needsUpdate = true;
      }
      if (snowSys && snowSys.visible) {
        const sPos = snowSys.geometry.attributes.position;
        for (let i = 0; i < sPos.count; i++) {
          sPos.array[i * 3 + 1] -= 0.03 + Math.random() * 0.02;
          sPos.array[i * 3] += (Math.random() - 0.5) * 0.04;
          if (sPos.array[i * 3 + 1] < -2) {
            sPos.array[i * 3 + 1] = 23;
            sPos.array[i * 3] = (Math.random() - 0.5) * 35;
            sPos.array[i * 3 + 2] = (Math.random() - 0.5) * 35;
          }
        }
        sPos.needsUpdate = true;
      }

      renderer.render(scene, camera);
    }
    animate();

    function handleResize() {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = Math.max(container.clientHeight, 400);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", handleResize);

    // Room click detection
    canvas.addEventListener("click", handleCanvasClick);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("click", handleCanvasClick);
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
  }, []);

  useEffect(() => {
    if (controlsRef.current) controlsRef.current.autoRotate = autoRotate;
  }, [autoRotate]);

  // ── Phase 7: Environment update ────────────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    const sun = sunRef.current;
    const ambient = ambientRef.current;
    const hemi = hemiRef.current;
    const ground = groundRef.current;
    const rain = rainRef.current;
    const snow = snowRef.current;
    if (!scene || !sun || !ambient || !hemi || !ground) return;

    const timeCfg = TIME_CONFIGS[timeOfDay];
    const weatherCfg = WEATHER_CONFIGS[weather];

    // Sky / background
    const baseSky = new THREE.Color(timeCfg.skyColor);
    if (weatherCfg.skyTint !== "none") {
      baseSky.multiply(new THREE.Color(weatherCfg.skyTint));
    }
    scene.background = baseSky;

    // Fog
    scene.fog = new THREE.Fog(
      weatherCfg.skyTint !== "none"
        ? baseSky.getHexString()
        : timeCfg.fogColor,
      timeCfg.fogNear,
      timeCfg.fogFar
    );

    // Directional (sun)
    sun.color.set(timeCfg.sunColor);
    sun.intensity = timeCfg.sunIntensity * weatherCfg.sunMult;
    if (timeOfDay === "night") sun.position.set(5, 8, 5);

    // Ambient
    ambient.color.set(timeCfg.sunColor);
    ambient.intensity = timeCfg.ambientIntensity * weatherCfg.ambientMult;

    // Hemisphere
    hemi.color.set(timeCfg.hemiSkyColor);
    hemi.groundColor.set(timeCfg.hemiGroundColor);
    hemi.intensity = timeCfg.hemiIntensity * weatherCfg.ambientMult;

    // Ground
    const groundColor = weatherCfg.groundColor !== "none"
      ? weatherCfg.groundColor
      : timeCfg.groundColor;
    if (Array.isArray(ground.material)) {
      ground.material.forEach(m => { if (m instanceof THREE.MeshStandardMaterial) m.color.set(groundColor); });
    } else if (ground.material instanceof THREE.MeshStandardMaterial) {
      ground.material.color.set(groundColor);
    }

    // Particles
    if (rain) rain.visible = weatherCfg.particleType === "rain";
    if (snow) snow.visible = weatherCfg.particleType === "snow";

    // Night interior lights
    const containerGroup = containerGroupRef.current;
    if (containerGroup) {
      containerGroup.traverse((obj) => {
        if (obj instanceof THREE.PointLight && obj.name === "interiorNightLight") {
          obj.intensity = timeOfDay === "night" ? 1.5 : 0;
          obj.visible = timeOfDay === "night";
        }
      });
      // Also glow windows at night
      containerGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.name === "windowGlow") {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => {
              if (m instanceof THREE.MeshStandardMaterial) {
                m.emissiveIntensity = timeOfDay === "night" ? 1.2 : 0.3;
                m.emissive.set(timeOfDay === "night" ? "#FFAA33" : "#1a4a6e");
              }
            });
          } else if (obj.material instanceof THREE.MeshStandardMaterial) {
            obj.material.emissiveIntensity = timeOfDay === "night" ? 1.2 : 0.3;
            obj.material.emissive.set(timeOfDay === "night" ? "#FFAA33" : "#1a4a6e");
          }
        }
      });
    }
  }, [timeOfDay, weather]);

  // ── Rebuild container geometry ──────────────────────
  useEffect(() => {
    const group = containerGroupRef.current;
    if (!group) return;

    function disposeMesh(obj: THREE.Object3D) {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material?.dispose();
      } else if (obj instanceof THREE.Line) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material?.dispose();
      }
    }
    while (group.children.length > 0) {
      const child = group.children[0];
      child.traverse(disposeMesh);
      group.remove(child);
    }

    if (!state.selectedModel) return;

    const { length, width, height } = getDimensions(state);
    const colorHex = EXTERIOR_HEX[state.exteriorColor];
    const l = length, w = width, h = height;

    const positions = getContainerPositions(state.layoutType, l, w, h);
    positions.forEach((pos, i) => {
      buildContainerBox(group, pos.ox, pos.oy, pos.oz, pos.rotY, l, w, h, colorHex, state, i === 0);
    });

    if (state.stairs) addStairs(group, l, w, h);
    if (state.balcony && state.layoutType === "stacked") addBalcony(group, l, w, h, h + 0.3);
    if (state.roofTerrace) {
      let maxRoofY = h + 0.03;
      if (state.layoutType === "stacked") maxRoofY = h + 0.3 + h + 0.03;
      addRoofTerrace(group, l, w, h, maxRoofY);
    }

    // Collect room meshes for raycasting
    const roomMeshes: { mesh: THREE.Mesh; roomId: string }[] = [];
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData?.isRoom) {
        roomMeshes.push({ mesh: obj, roomId: obj.userData.roomId as string });
      }
    });
    roomMeshRefs.current = roomMeshes;
  }, [state]);

  // ── Preset view buttons ────────────────────────────
  const setPresetView = useCallback((preset: ViewPreset) => {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    if (!controls || !camera) return;

    const { length, width, height } = getDimensions(state);
    const positions = getContainerPositions(state.layoutType, length, width, height);
    const { cx, cy, cz, spanX, spanY, spanZ } = getLayoutCenter(positions, length, width, height);

    setActivePreset(preset);
    controls.autoRotate = false;

    switch (preset) {
      case "front": camera.position.set(cx, cy, cz + spanZ + 4); controls.target.set(cx, cy, cz); break;
      case "back": camera.position.set(cx, cy, cz - spanZ - 4); controls.target.set(cx, cy, cz); break;
      case "top": camera.position.set(cx, cy + spanY + 6, cz); controls.target.set(cx, cy, cz); break;
      case "bird": camera.position.set(cx + spanX * 0.6, cy + spanY + spanX * 0.7, cz + spanZ * 0.6); controls.target.set(cx, cy, cz); break;
      case "walk": camera.position.set(cx - spanX * 0.3, 1.65, cz - spanZ * 0.4); controls.target.set(cx + spanX * 0.2, 1.65, cz + spanZ * 0.2); break;
      case "drone": 
        camera.position.set(cx + spanX * 0.3, cy + 18, cz + spanZ * 1.5); 
        camera.fov = 70; camera.updateProjectionMatrix();
        controls.target.set(cx, cy, cz);
        controls.autoRotate = true; controls.autoRotateSpeed = 0.3;
        break;
    }
    controls.update();
  }, [state]);

  const resetView = useCallback(() => {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    if (!controls || !camera) return;
    const { length, width, height } = getDimensions(state);
    const positions = getContainerPositions(state.layoutType, length, width, height);
    const { cx, cy, cz, spanX, spanZ } = getLayoutCenter(positions, length, width, height);
    setActivePreset(null);
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.5;
    camera.fov = 50; camera.updateProjectionMatrix();
    camera.position.set(cx + spanX * 0.8, cy + spanX * 0.6, cz + spanZ * 1.2);
    controls.target.set(cx, cy, cz);
    controls.update();
  }, [state, autoRotate]);

  // ── Screenshot capture ──────────────────────────────
  const takeScreenshot = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.render(sceneRef.current!, cameraRef.current!);
    const dataUrl = renderer.domElement.toDataURL("image/png");
    setScreenshots(prev => [dataUrl, ...prev].slice(0, 6));
  }, []);

  const captureDroneShot = useCallback(() => {
    setPresetView("drone");
    setTimeout(() => {
      const renderer = rendererRef.current;
      if (!renderer) return;
      renderer.render(sceneRef.current!, cameraRef.current!);
      const dataUrl = renderer.domElement.toDataURL("image/png");
      setScreenshots(prev => [dataUrl, ...prev].slice(0, 6));
    }, 600);
  }, [setPresetView]);

  // ── Empty state ──────────────────────────────────────
  if (!state.selectedModel) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
        <div className="text-center px-6">
          <svg className="mx-auto h-14 w-14 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          <p className="text-sm font-medium">Select a container model above</p>
          <p className="text-xs mt-1 text-gray-400">The 3D preview will appear here</p>
        </div>
      </div>
    );
  }

  const presetButtons: { preset: ViewPreset; icon: string; label: string }[] = [
    { preset: "front", icon: "", label: "Front" },
    { preset: "back",  icon: "", label: "Back" },
    { preset: "top",   icon: "", label: "Top" },
    { preset: "bird",  icon: "", label: "Bird" },
    { preset: "walk",  icon: "", label: "Walk" },
    { preset: "drone", icon: "", label: "Drone" },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* ── Top Toolbar ─────────────────────────────── */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          3D Preview
        </span>
        <div className="flex items-center gap-1.5">
          <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden">
            <button onClick={() => onViewModeChange("3d")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "3d" ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            > 3D View</button>
            <button onClick={() => onViewModeChange("floorplan")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "floorplan" ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            > Floor Plan</button>
          </div>
          <button onClick={() => setShowEnvPanel(!showEnvPanel)}
            title="Environment settings"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              showEnvPanel ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
            }`}
          ></button>
          <button onClick={takeScreenshot}
            title="Take screenshot"
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 transition-all"
          ></button>
          <button
            onClick={() => {
              if (internalTourActive) {
                stopTourFn();
              } else {
                startTourFn();
              }
            }}
            title={internalTourActive ? "Stop tour" : "Start virtual tour"}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
              internalTourActive
                ? "bg-red-600 text-white border-red-600 animate-pulse"
                : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {internalTourActive ? (
              <>
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                Stopp
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" /></svg>
                Visning
              </>
            )}
          </button>
          {screenshots.length > 0 && (
            <button onClick={() => setShowScreenshotGallery(!showScreenshotGallery)}
              title="Screenshot gallery"
              className={`px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
                showScreenshotGallery ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
              }`}
            > {screenshots.length}</button>
          )}
          <button onClick={() => setShowARModal(true)}
            title="AR Preview"
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition-all"
          > AR</button>
        </div>
      </div>

      {/* ── Main 3D Canvas ────────────────────────────── */}
      <div style={{ display: viewMode === "3d" ? "block" : "none" }} className="relative">
        <div className="relative min-h-[60vh] sm:min-h-[70vh] lg:min-h-[500px]">
          <canvas ref={canvasRef} className="w-full h-full" style={{ touchAction: "none" }} />

          {/* Environment panel overlay (left side) */}
          {showEnvPanel && (
            <div className="absolute top-2 left-2 z-20 bg-white/95 backdrop-blur rounded-xl shadow-lg border border-gray-200 p-3 w-52 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-700"> Environment</span>
                <button onClick={() => setShowEnvPanel(false)} className="text-gray-400 hover:text-gray-600"></button>
              </div>

              {/* Time of Day */}
              <p className="text-gray-500 mb-1.5 font-medium">Time of Day</p>
              <div className="grid grid-cols-2 gap-1 mb-3">
                {(["sunrise","day","sunset","night"] as TimeOfDay[]).map(t => (
                  <button key={t} onClick={() => setTimeOfDay(t)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      timeOfDay === t ? "bg-blue-600 text-white border-blue-600" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}
                  >{t==="sunrise"?" Sunrise":t==="day"?" Day":t==="sunset"?" Sunset":" Night"}</button>
                ))}
              </div>

              {/* Weather */}
              <p className="text-gray-500 mb-1.5 font-medium">Weather</p>
              <div className="grid grid-cols-3 gap-1 mb-3">
                {(["clear","rain","snow"] as Weather[]).map(w => (
                  <button key={w} onClick={() => setWeather(w)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      weather === w ? "bg-blue-600 text-white border-blue-600" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}
                  >{w==="clear"?"":w==="rain"?"":""}</button>
                ))}
              </div>

              {/* Quick Presets */}
              <p className="text-gray-500 mb-1.5 font-medium">Presets</p>
              <div className="space-y-1">
                {ENV_PRESETS.map((p, i) => (
                  <button key={i} onClick={() => { setTimeOfDay(p.time); setWeather(p.weather); }}
                    className={`w-full px-2 py-1.5 rounded-lg text-xs font-medium border transition-all text-left ${
                      timeOfDay === p.time && weather === p.weather 
                        ? "bg-blue-600 text-white border-blue-600" 
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}
                  >{p.icon} {p.label}</button>
                ))}
              </div>
            </div>
          )}

          {/* Screenshot gallery overlay */}
          {showScreenshotGallery && screenshots.length > 0 && (
            <div className="absolute top-2 right-2 z-20 bg-white/95 backdrop-blur rounded-xl shadow-lg border border-gray-200 p-3 w-56">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-700 text-xs"> Screenshots</span>
                <button onClick={() => setShowScreenshotGallery(false)} className="text-gray-400 hover:text-gray-600 text-xs"></button>
              </div>
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {screenshots.map((s, i) => (
                  <button key={i} onClick={() => setViewingScreenshot(s)}
                    className="aspect-[4/3] rounded-lg overflow-hidden border border-gray-200 hover:border-purple-400 transition-colors"
                  ><img src={s} alt={`Screenshot ${i+1}`} className="w-full h-full object-cover" /></button>
                ))}
              </div>
              <button onClick={() => {
                screenshots.forEach((s, i) => {
                  const a = document.createElement("a");
                  a.href = s; a.download = `kitozon-screenshot-${i+1}.png`; a.click();
                });
              }}
                className="w-full px-2 py-1.5 rounded-lg text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 transition-all"
              >⬇ Download All</button>
            </div>
          )}

          {/* Screenshot full-view modal */}
          {viewingScreenshot && (
            <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-center justify-center" onClick={() => setViewingScreenshot(null)}>
              <div className="relative max-w-[90%] max-h-[90%]" onClick={e => e.stopPropagation()}>
                <img src={viewingScreenshot} alt="Screenshot" className="max-w-full max-h-[80vh] rounded-xl shadow-2xl border-4 border-white" />
                <button onClick={() => setViewingScreenshot(null)}
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white shadow border border-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900 text-sm"
                ></button>
                <a href={viewingScreenshot} download="kitozon-screenshot.png"
                  className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 shadow"
                >⬇ Download</a>
              </div>
            </div>
          )}

          {/* Preset view buttons */}
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 z-10">
            {presetButtons.map(({ preset, icon, label }) => (
              <button key={preset} onClick={() => setPresetView(preset)}
                title={`${label} view`}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium shadow-sm border transition-all ${
                  activePreset === preset ? "bg-emerald-600 text-white border-emerald-600" : "bg-white/90 text-gray-700 border-gray-200 hover:bg-white hover:border-gray-300"
                }`}
              >{icon} {label}</button>
            ))}
            <button onClick={resetView}
              title="Reset view"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium shadow-sm border transition-all ${
                !activePreset && autoRotate ? "bg-emerald-600 text-white border-emerald-600" : "bg-white/90 text-gray-700 border-gray-200 hover:bg-white hover:border-gray-300"
              }`}
            > Reset</button>
          </div>

          {/* Bottom-right controls */}
          <div className="absolute bottom-3 right-3 flex flex-wrap gap-1.5 z-10">
            <button onClick={captureDroneShot}
              title="Capture drone view"
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium shadow-sm border bg-white/90 text-indigo-600 border-indigo-200 hover:bg-white hover:border-indigo-300 transition-all"
            > Drone Shot</button>
            <button onClick={() => { setAutoRotate(!autoRotate); if (!autoRotate) setActivePreset(null); }}
              title={autoRotate ? "Stop auto-rotate" : "Start auto-rotate"}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium shadow-sm border transition-all ${
                autoRotate ? "bg-emerald-600 text-white border-emerald-600" : "bg-white/90 text-gray-700 border-gray-200 hover:bg-white hover:border-gray-300"
              }`}
            >{autoRotate ? " Pause" : "▶ Rotate"}</button>
          </div>

          <div className="absolute top-3 right-3 z-10">
            <span className="px-2.5 py-1 rounded-lg text-[10px] text-gray-500 bg-white/80 shadow-sm border border-gray-200">
               Drag to rotate · Scroll to zoom · Right-drag to pan
            </span>
          </div>

          {/* Tour room label overlay */}
          {internalTourActive && tourRoomLabel && (
            <div className="absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="bg-black/75 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl text-center animate-pulse">
                <p className="text-xs text-emerald-300 mb-1 font-medium">Virtuell omvisning</p>
                <p className="text-2xl font-extrabold tracking-tight">{tourRoomLabel}</p>
                <p className="text-xs text-gray-300 mt-1">{tourPhase + 1} av {getRoomViewpoints().length} stopp</p>
              </div>
            </div>
          )}

          {/* Room click hint */}
          {!internalTourActive && roomMeshRefs.current.length > 0 && (
            <div className="absolute bottom-12 left-1/2 z-10 -translate-x-1/2 pointer-events-none">
              <span className="px-3 py-1.5 rounded-full text-[10px] text-gray-400 bg-white/70 shadow-sm border border-gray-200/50">
                Klikk på et rom for fullskjermvisning
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Floorplan placeholder ─────────────────────── */}
      {viewMode === "floorplan" && (
        <div className="flex items-center justify-center h-[400px] text-gray-400 bg-[#f8fafc]">
          <p className="text-sm">Switch to 3D View to see the interactive model</p>
        </div>
      )}

      {/* ── Legend ─────────────────────────────────────── */}
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-3 text-xs">
        {(Object.keys(ROOM_COLORS) as RoomType[]).map((type) => (
          <span key={type} className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: ROOM_COLORS[type], opacity: 0.7 }} />
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </span>
        ))}
        <span className="flex items-center gap-1.5 ml-2"><span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#87CEEB", opacity: 0.7 }} />Window</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#5C3A1E" }} />Door</span>
        {state.solarPanels && <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#1a237e" }} />Solar</span>}
        <span className="text-gray-400 ml-auto flex items-center gap-2">
          <span>{state.containerSize === "20ft" ? "20ft × 8ft" : state.containerSize === "40ft" ? "40ft × 8ft" : state.containerSize === "double" ? "2× 40ft" : `${state.customLength}ft × ${state.customWidth}ft`}</span>
          <span className="text-gray-300">|</span>
          <span>{getContainerPositions(state.layoutType, 0, 0, 0).length} container{getContainerPositions(state.layoutType, 0, 0, 0).length !== 1 ? "s" : ""}</span>
        </span>
      </div>

      {/* ── AR Preview Modal ──────────────────────────── */}
      {showARModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowARModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span className="text-2xl"></span> AR Preview
              </h3>
              <button onClick={() => setShowARModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none"></button>
            </div>

            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">1⃣</span>
                <p><strong>Open on your phone</strong><br/>Visit <code className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-xs">kitozon.app</code> in your mobile browser</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">2⃣</span>
                <p><strong>Point your camera</strong><br/>Point your phone at your land/property where you want to place the home</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">3⃣</span>
                <p><strong>See it in AR</strong><br/>The container home will appear in augmented reality — walk around and explore!</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="w-32 h-32 mx-auto mb-2 bg-gray-200 rounded-lg flex items-center justify-center text-4xl">
                  
                </div>
                <p className="text-xs text-gray-400">QR code for app download</p>
              </div>

              <div className="bg-indigo-50 rounded-lg p-3 text-xs text-indigo-700">
                <strong>Note:</strong> Full AR experience available in the Kitozon mobile app. 
                This web-based 3D preview provides accurate visualisation of your design.
              </div>
            </div>

            <button onClick={() => setShowARModal(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all"
            >Got it</button>
          </div>
        </div>
      )}
    </div>
  );
});

export default Container3D;
