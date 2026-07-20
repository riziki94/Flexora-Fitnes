import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// ── Re-export shared types from the original module ───────────────────────
export {
  OBJECT_TYPES,
  type PlacedObject,
  type ObjectTypeId,
  CITY_LOCATIONS,
  snapToGrid,
  createDemoCity,
} from "./AferCityMap";

import type { PlacedObject, ObjectTypeId } from "./AferCityMap";
import { OBJECT_TYPES, CITY_LOCATIONS } from "./AferCityMap";

// ── Props interface (compatible with original AferCityMapProps) ───────────
export interface AferCityMapProps {
  objects: PlacedObject[];
  selectedObjId: string | null;
  activePlaceType: ObjectTypeId | null;
  cityName: string;
  tileLayer: string;
  onPlaceObject: (lat: number, lng: number) => void;
  onSelectObject: (obj: PlacedObject) => void;
  onObjectClick: (obj: PlacedObject) => void;
}

// ── Color mapping ─────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, number> = {
  container_house: 0xd97706, // brown/tan
  school: 0xef4444, // red
  hospital: 0xf8fafc, // white
  battery_storage: 0xa855f7, // purple
  industry: 0x64748b, // gray
  smart_bench: 0x3b82f6, // blue
  bus_shelter: 0x06b6d4, // cyan
  park: 0x22c55e, // green
  parking: 0x94a3b8, // slate
  ev_charger: 0x84cc16, // lime
  solar_light: 0xeab308, // yellow
  road: 0x4b5563, // dark gray
};

const TYPE_HEIGHTS: Record<string, number> = {
  container_house: 2.5,
  school: 6,
  hospital: 10,
  battery_storage: 3,
  industry: 5,
  smart_bench: 1,
  bus_shelter: 2.5,
  park: 0.1,
  parking: 0.1,
  ev_charger: 2,
  solar_light: 4,
  road: 0.05,
};

const TYPE_SIZES: Record<string, [number, number]> = {
  container_house: [6, 12],
  school: [30, 20],
  hospital: [40, 25],
  battery_storage: [6, 3],
  industry: [25, 15],
  smart_bench: [2, 1],
  bus_shelter: [4, 2],
  park: [20, 20],
  parking: [15, 10],
  ev_charger: [1, 1],
  solar_light: [0.3, 0.3],
  road: [4, 4],
};

// ── Scale factor: world units per meter ───────────────────────────────────
const WORLD_SCALE = 0.5;

// ── Main Component ────────────────────────────────────────────────────────
export default function AferCityMap3D({
  objects,
  selectedObjId,
  activePlaceType,
  cityName,
  tileLayer: _tileLayer,
  onPlaceObject,
  onSelectObject,
  onObjectClick,
}: AferCityMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number>(0);
  const objectMeshesRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const groundRef = useRef<THREE.Mesh | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const isDraggingRef = useRef(false);
  const mouseDownPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const city = CITY_LOCATIONS[cityName] || CITY_LOCATIONS["Oslo"];

  // Store placed objects in a ref for event handlers
  const objectsRef = useRef(objects);
  objectsRef.current = objects;

  const selectedObjIdRef = useRef(selectedObjId);
  selectedObjIdRef.current = selectedObjId;

  // ── Init scene ──────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 80, 300);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      1,
      500
    );
    camera.position.set(60, 70, 90);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);
    controls.maxPolarAngle = Math.PI / 2.2; // prevent going underground
    controls.minDistance = 15;
    controls.maxDistance = 200;
    controls.update();
    controlsRef.current = controls;

    // ── Lighting ──────────────────────────────────────────────────────────
    // Ambient
    const ambient = new THREE.AmbientLight(0x8899bb, 1.2);
    scene.add(ambient);

    // Hemisphere
    const hemi = new THREE.HemisphereLight(0xddeeff, 0x333344, 0.8);
    scene.add(hemi);

    // Directional (sun)
    const sun = new THREE.DirectionalLight(0xffffff, 3);
    sun.position.set(80, 100, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 400;
    sun.shadow.camera.left = -120;
    sun.shadow.camera.right = 120;
    sun.shadow.camera.top = 120;
    sun.shadow.camera.bottom = -120;
    sun.shadow.bias = -0.0005;
    scene.add(sun);

    // ── Ground ────────────────────────────────────────────────────────────
    const groundGeo = new THREE.PlaneGeometry(300, 300);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2d3a2d,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    scene.add(ground);
    groundRef.current = ground;

    // ── Grid ──────────────────────────────────────────────────────────────
    const gridSize = 200;
    const gridStep = 5;
    const gridHelper = new THREE.PolarGridHelper(gridSize / 2, gridSize / gridStep, gridSize / gridStep, 64, 0xffffff, 0xffffff);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Fine grid
    const fineGrid = new THREE.GridHelper(gridSize, gridSize / 1, 0x888888, 0x444444);
    fineGrid.material.opacity = 0.15;
    fineGrid.material.transparent = true;
    fineGrid.position.y = 0.005;
    scene.add(fineGrid);

    // ── Animation loop ────────────────────────────────────────────────────
    function animate() {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // ── Resize ────────────────────────────────────────────────────────────
    function onResize() {
      if (!container || !camera || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      scene.clear();
    };
  }, []);

  // ── Sync building meshes with objects ───────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const meshMap = objectMeshesRef.current;

    // Remove meshes for objects that no longer exist
    const currentIds = new Set(objects.map((o) => o.id));
    for (const [id, mesh] of meshMap) {
      if (!currentIds.has(id)) {
        scene.remove(mesh);
        disposeMesh(mesh);
        meshMap.delete(id);
      }
    }

    // Add/update meshes
    for (const obj of objects) {
      const existing = meshMap.get(obj.id);
      if (existing) {
        // Update position if needed
        const pos = latLngToWorld(obj.lat, obj.lng, city.lat, city.lng);
        existing.position.set(pos.x, pos.z, pos.y);
        // Update highlight
        updateHighlight(existing, obj.id === selectedObjId, obj.id === hoveredId);
      } else {
        const mesh = createObjectMesh(obj, city.lat, city.lng);
        if (mesh) {
          scene.add(mesh);
          meshMap.set(obj.id, mesh);
          updateHighlight(mesh, obj.id === selectedObjId, obj.id === hoveredId);
        }
      }
    }
  }, [objects, city, selectedObjId, hoveredId]);

  // ── Mouse events ────────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const dx = e.clientX - mouseDownPos.current.x;
    const dy = e.clientY - mouseDownPos.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      isDraggingRef.current = true;
    }

    // Hover detection
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    const container = containerRef.current;
    if (!renderer || !camera || !scene || !container) return;

    const rect = container.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    const meshes = objectMeshesRef.current;
    const intersectTargets: THREE.Object3D[] = [];
    meshes.forEach((m) => intersectTargets.push(m));

    const intersects = raycasterRef.current.intersectObjects(intersectTargets, true);
    if (intersects.length > 0) {
      let found = intersects[0].object;
      while (found && !found.userData.objectId) {
        found = found.parent as THREE.Object3D;
      }
      const id = found?.userData?.objectId;
      setHoveredId(id || null);
      if (container) {
        container.style.cursor = id ? "pointer" : "";
      }
    } else {
      setHoveredId(null);
      if (container) {
        container.style.cursor = activePlaceType ? "crosshair" : "";
      }
    }
  }, [activePlaceType]);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isDraggingRef.current) return;

      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      const scene = sceneRef.current;
      const container = containerRef.current;

      // If in placement mode, place object on ground
      if (activePlaceType && renderer && camera && scene && container) {
        const rect = container.getBoundingClientRect();
        const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const rc = new THREE.Raycaster();
        rc.setFromCamera(new THREE.Vector2(mx, my), camera);

        // Intersect with ground plane (y=0)
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const hitPoint = new THREE.Vector3();
        const hit = rc.ray.intersectPlane(groundPlane, hitPoint);
        if (hit) {
          const [lat, lng] = worldToLatLng(hitPoint.x, hitPoint.z, city.lat, city.lng);
          onPlaceObject(lat, lng);
        }
        return;
      }

      // Otherwise, check for object click
      if (!renderer || !camera || !scene || !container) return;

      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const meshes = objectMeshesRef.current;
      const intersectTargets: THREE.Object3D[] = [];
      meshes.forEach((m) => intersectTargets.push(m));

      const intersects = raycasterRef.current.intersectObjects(intersectTargets, true);
      if (intersects.length > 0) {
        let found = intersects[0].object;
        while (found && !found.userData.objectId) {
          found = found.parent as THREE.Object3D;
        }
        const id = found?.userData?.objectId;
        if (id) {
          const obj = objectsRef.current.find((o) => o.id === id);
          if (obj) {
            onObjectClick(obj);
            onSelectObject(obj);
          }
        }
      }
    },
    [activePlaceType, onPlaceObject, onObjectClick, onSelectObject, city]
  );

  const handlePointerLeave = useCallback(() => {
    setHoveredId(null);
    if (containerRef.current) {
      containerRef.current.style.cursor = "";
    }
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ cursor: activePlaceType ? "crosshair" : undefined }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      {/* Canvas is added by Three.js */}
      {/* Overlay for placement hint */}
      {activePlaceType && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg z-10 pointer-events-none">
          Click on the ground to place{" "}
          {OBJECT_TYPES.find((t) => t.id === activePlaceType)?.label}
        </div>
      )}
      {!activePlaceType && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/50 text-[10px] z-10 pointer-events-none">
          Drag to orbit • Scroll to zoom • Right-drag to pan
        </div>
      )}
    </div>
  );
}

// ── Coordinate conversion helpers ─────────────────────────────────────────
function latLngToWorld(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number
): THREE.Vector3 {
  const mToX = (m: number) => m * WORLD_SCALE;
  const mToZ = (m: number) => m * WORLD_SCALE;

  const dLatM = (lat - centerLat) * 111320;
  const dLngM =
    (lng - centerLng) * 111320 * Math.cos((centerLat * Math.PI) / 180);

  return new THREE.Vector3(mToX(dLngM), 0, mToZ(dLatM));
}

function worldToLatLng(
  x: number,
  z: number,
  centerLat: number,
  centerLng: number
): [number, number] {
  const dLngM = x / WORLD_SCALE;
  const dLatM = z / WORLD_SCALE;

  const lat = centerLat + dLatM / 111320;
  const lng =
    centerLng +
    dLngM / (111320 * Math.cos((centerLat * Math.PI) / 180));

  return [lat, lng];
}

// ── Mesh creation ─────────────────────────────────────────────────────────
function createObjectMesh(
  obj: PlacedObject,
  centerLat: number,
  centerLng: number
): THREE.Object3D | null {
  const color = TYPE_COLORS[obj.typeId] ?? 0x888888;
  const height = TYPE_HEIGHTS[obj.typeId] ?? 2;
  const [wM, dM] = TYPE_SIZES[obj.typeId] ?? [1, 1];
  const w = wM * WORLD_SCALE;
  const d = dM * WORLD_SCALE;
  const h = height * WORLD_SCALE;

  const pos = latLngToWorld(obj.lat, obj.lng, centerLat, centerLng);

  const group = new THREE.Group();
  group.userData.objectId = obj.id;
  group.position.set(pos.x, 0, pos.z);

  if (obj.typeId === "road" && obj.roadPoints && obj.roadPoints.length >= 2) {
    // Create road as a series of connected segments
    for (let i = 0; i < obj.roadPoints.length - 1; i++) {
      const p1 = latLngToWorld(
        obj.roadPoints[i][0],
        obj.roadPoints[i][1],
        centerLat,
        centerLng
      );
      const p2 = latLngToWorld(
        obj.roadPoints[i + 1][0],
        obj.roadPoints[i + 1][1],
        centerLat,
        centerLng
      );

      const midX = (p1.x + p2.x) / 2;
      const midZ = (p1.z + p2.z) / 2;
      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const segLen = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dx, dz);

      const segGeo = new THREE.BoxGeometry(1.5, 0.1, segLen);
      const segMat = new THREE.MeshStandardMaterial({
        color: 0x3d3d3d,
        roughness: 0.8,
        metalness: 0.1,
      });
      const segMesh = new THREE.Mesh(segGeo, segMat);
      segMesh.position.set(midX - pos.x, 0.05, midZ - pos.z - pos.y);
      segMesh.rotation.y = angle;
      segMesh.receiveShadow = true;
      segMesh.castShadow = true;
      group.add(segMesh);
    }
    return group;
  }

  if (obj.typeId === "solar_light") {
    // Pole + light
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, h, 8);
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.3,
      metalness: 0.8,
    });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = h / 2;
    pole.castShadow = true;
    group.add(pole);

    // Light bulb
    const bulbGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.2,
      emissive: 0xeab308,
      emissiveIntensity: 0.6,
    });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.y = h;
    group.add(bulb);

    return group;
  }

  if (obj.typeId === "park" || obj.typeId === "parking") {
    // Flat colored plane
    const geo = new THREE.PlaneGeometry(w, d);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.9,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.02;
    mesh.receiveShadow = true;
    group.add(mesh);

    if (obj.typeId === "park") {
      // Add some "tree" dots
      for (let i = 0; i < 6; i++) {
        const tx = (Math.random() - 0.5) * w * 0.8;
        const tz = (Math.random() - 0.5) * d * 0.8;
        const trunkGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.6, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.7 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.set(tx, 0.3, tz);
        trunk.castShadow = true;
        group.add(trunk);

        const leafGeo = new THREE.SphereGeometry(0.35, 6, 4);
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.8 });
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.set(tx, 0.75, tz);
        leaf.castShadow = true;
        group.add(leaf);
      }
    }

    return group;
  }

  if (obj.typeId === "ev_charger") {
    // Small station
    const baseGeo = new THREE.BoxGeometry(w, h * 0.3, d);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.6 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = h * 0.15;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const displayGeo = new THREE.BoxGeometry(w * 0.7, h * 0.6, d * 0.3);
    const displayMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, emissive: color, emissiveIntensity: 0.3 });
    const display = new THREE.Mesh(displayGeo, displayMat);
    display.position.y = h * 0.55;
    display.castShadow = true;
    group.add(display);
    return group;
  }

  if (obj.typeId === "smart_bench" || obj.typeId === "bus_shelter") {
    // Simple bench/shelter
    const bodyGeo = new THREE.BoxGeometry(w, h, d);
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    if (obj.typeId === "bus_shelter") {
      // Add roof
      const roofGeo = new THREE.BoxGeometry(w + 1, 0.2, d + 0.5);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.5 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = h + 0.1;
      roof.castShadow = true;
      group.add(roof);
    }

    return group;
  }

  // Default: box building
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.5,
    metalness: 0.2,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = h / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  // Add roof detail for houses
  if (obj.typeId === "container_house") {
    const roofGeo = new THREE.ConeGeometry(Math.max(w, d) * 0.7, 1, 4);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.7,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = h + 0.5;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);
  }

  // Add cross on hospital
  if (obj.typeId === "hospital") {
    const crossVGeo = new THREE.BoxGeometry(1, 5, 1);
    const crossHGeo = new THREE.BoxGeometry(3, 1, 1);
    const crossMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      roughness: 0.3,
      emissive: 0xff0000,
      emissiveIntensity: 0.5,
    });
    const crossV = new THREE.Mesh(crossVGeo, crossMat);
    crossV.position.set(0, h + 2.5, d / 2 + 0.6);
    const crossH = new THREE.Mesh(crossHGeo, crossMat);
    crossH.position.set(0, h + 2.5, d / 2 + 0.6);
    group.add(crossV);
    group.add(crossH);
  }

  return group;
}

// ── Highlight helpers ─────────────────────────────────────────────────────
function updateHighlight(
  obj: THREE.Object3D,
  isSelected: boolean,
  isHovered: boolean
) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      for (const mat of materials) {
        if (mat instanceof THREE.MeshStandardMaterial) {
          if (isSelected) {
            mat.emissiveIntensity = 0.5;
          } else if (isHovered) {
            mat.emissiveIntensity = 0.3;
          } else {
            mat.emissiveIntensity = (mat as any)._originalEmissive ?? 0;
          }
        }
      }
    }
  });

  // Add outline effect via scale
  if (isSelected || isHovered) {
    obj.scale.set(1.05, 1.02, 1.05);
  } else {
    obj.scale.set(1, 1, 1);
  }
}

// ── Dispose helper ────────────────────────────────────────────────────────
function disposeMesh(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else if (child.material) {
        child.material.dispose();
      }
    }
  });
}
