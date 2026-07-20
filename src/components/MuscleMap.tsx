import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { MUSCLE_GROUPS } from "~/lib/muscle-data";

interface MuscleMapProps {
  activeMuscles?: { primary: string[]; secondary: string[] } | null;
  exerciseName?: string;
  height?: number;
  className?: string;
}

// Map our muscle group IDs to 3D body region indices
const MUSCLE_TO_REGION: Record<string, number> = {
  chest: 0, front_delts: 1, front_delts_r: 1,
  biceps: 2, biceps_r: 2, abs: 3,
  obliques: 4, obliques_r: 4, quads: 5, quads_r: 5,
  calves: 6, calves_r: 6, forearms: 7, forearms_r: 7,
  traps: 8, rear_delts: 9, rear_delts_r: 9,
  lats: 10, lats_r: 10, mid_back: 11, lower_back: 12,
  glutes: 13, hamstrings: 14, hamstrings_r: 14,
  calves_back: 6, calves_back_r: 6, triceps: 15, triceps_r: 15,
};

interface RegionDef {
  id: string; name: string; view: "front" | "back" | "both"; meshIndex: number;
}

const REGION_DEFS: RegionDef[] = [
  { id: "chest", name: "Chest", view: "front", meshIndex: 0 },
  { id: "front_delts", name: "Shoulders", view: "front", meshIndex: 1 },
  { id: "biceps", name: "Biceps", view: "front", meshIndex: 2 },
  { id: "abs", name: "Abs", view: "front", meshIndex: 3 },
  { id: "obliques", name: "Obliques", view: "front", meshIndex: 4 },
  { id: "quads", name: "Quadriceps", view: "front", meshIndex: 5 },
  { id: "calves", name: "Calves", view: "front", meshIndex: 6 },
  { id: "forearms", name: "Forearms", view: "front", meshIndex: 7 },
  { id: "traps", name: "Traps", view: "back", meshIndex: 8 },
  { id: "rear_delts", name: "Rear Delts", view: "back", meshIndex: 9 },
  { id: "lats", name: "Lats", view: "back", meshIndex: 10 },
  { id: "mid_back", name: "Mid Back", view: "back", meshIndex: 11 },
  { id: "lower_back", name: "Lower Back", view: "back", meshIndex: 12 },
  { id: "glutes", name: "Glutes", view: "back", meshIndex: 13 },
  { id: "hamstrings", name: "Hamstrings", view: "back", meshIndex: 14 },
  { id: "triceps", name: "Triceps", view: "back", meshIndex: 15 },
];

export function MuscleMap({
  activeMuscles, exerciseName, height = 400, className = "",
}: MuscleMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<"front" | "back">("front");
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  // Refs for state that the Three.js render loop needs
  const stateRef = useRef({
    activeRegions: new Set<number>(),
    activePrimary: new Set<number>(),
    hoveredRegion: null as string | null,
    view: "front" as "front" | "back",
  });

  // Lazy-init Three.js scene on mount
  useEffect(() => {
    if (mountRef.current) return;
    mountRef.current = true;
    const container = containerRef.current;
    if (!container) return;

    let animId = 0;
    let bodyGroup: any = null; // THREE.Group
    let overlayMeshes: any[] = []; // THREE.Mesh[]
    let scene: any = null;
    let camera: any = null;
    let renderer: any = null;
    let raycaster: any = null;
    let currentRotY = 0, currentRotX = 0;
    let zoom = 1;
    let isDown = false;

    // Dynamic import for SSR safety
    import("three").then((THREE) => {
      if (!container || !mountRef.current) return;

      const w = container.clientWidth || Math.round(height * 0.55);
      const h = height;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf8fafc);

      camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 20);
      camera.position.set(0, 0.2, 3.2);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 1.4));
      const key = new THREE.DirectionalLight(0xffffff, 1.2);
      key.position.set(2, 3, 4); scene.add(key);
      const fill = new THREE.DirectionalLight(0xaaccff, 0.6);
      fill.position.set(-2, 0.5, -1); scene.add(fill);
      const rim = new THREE.DirectionalLight(0xffffff, 0.8);
      rim.position.set(0, -0.5, -3); scene.add(rim);

      bodyGroup = buildBodyModel(THREE);
      scene.add(bodyGroup);

      const { group: ovGroup, meshes } = buildMuscleOverlays(THREE);
      scene.add(ovGroup);
      overlayMeshes = meshes;

      raycaster = new THREE.Raycaster();
      const canvas = renderer.domElement;

      // Rotation state (local to closure, mutated by events)
      let targetRotY = 0, targetRotX = 0;
      let prevX = 0, prevY = 0;

      canvas.addEventListener("pointerdown", (e: PointerEvent) => {
        isDown = true; prevX = e.clientX; prevY = e.clientY;
        setIsDragging(true);
        canvas.style.cursor = "grabbing";
      });

      const onUp = () => {
        if (isDown) { isDown = false; setIsDragging(false); canvas.style.cursor = "grab"; }
      };
      window.addEventListener("pointerup", onUp);

      window.addEventListener("pointermove", (e: PointerEvent) => {
        if (isDown) {
          targetRotY += (e.clientX - prevX) * 0.008;
          targetRotX += (e.clientY - prevY) * 0.005;
          targetRotX = Math.max(-1.0, Math.min(1.0, targetRotX));
          prevX = e.clientX; prevY = e.clientY;
        }
        if (!isDown && overlayMeshes.length && raycaster && camera) {
          const rect = canvas.getBoundingClientRect();
          raycaster.setFromCamera(
            new THREE.Vector2(
              ((e.clientX - rect.left) / rect.width) * 2 - 1,
              -((e.clientY - rect.top) / rect.height) * 2 + 1
            ), camera
          );
          const hits = raycaster.intersectObjects(overlayMeshes);
          const idx = hits.length > 0 ? (hits[0].object.userData.regionIndex as number | undefined) : undefined;
          if (idx !== undefined) {
            const r = REGION_DEFS.find(d => d.meshIndex === idx);
            setHoveredRegion(r?.id || null);
          } else setHoveredRegion(null);
        }
      });

      canvas.addEventListener("click", () => {
        if (isDown) return;
        if (!raycaster || !camera) return;
        const hits = raycaster.intersectObjects(overlayMeshes);
        if (hits.length > 0) {
          const idx = hits[0].object.userData.regionIndex as number | undefined;
          if (idx !== undefined) {
            const r = REGION_DEFS.find(d => d.meshIndex === idx);
            setSelectedRegion(prev => prev === r?.id ? null : r?.id || null);
          }
        } else setSelectedRegion(null);
      });

      canvas.addEventListener("wheel", (e: WheelEvent) => {
        e.preventDefault();
        zoom -= e.deltaY * 0.001;
        zoom = Math.max(0.6, Math.min(2.0, zoom));
      }, { passive: false });

      canvas.style.cursor = "grab";

      function animate() {
        animId = requestAnimationFrame(animate);
        if (!bodyGroup || !camera || !renderer || !scene) return;
        currentRotY += (targetRotY - currentRotY) * 0.1;
        currentRotX += (targetRotX - currentRotX) * 0.1;
        bodyGroup.rotation.y = currentRotY;
        bodyGroup.rotation.x = currentRotX;
        camera.position.z += (3.2 / zoom - camera.position.z) * 0.1;

        // Update overlay colors from state ref
        const s = stateRef.current;
        for (const mesh of overlayMeshes) {
          const idx = mesh.userData.regionIndex as number | undefined;
          if (idx === undefined) continue;
          const rd = REGION_DEFS.find(d => d.meshIndex === idx);
          const onView = rd?.view === s.view || rd?.view === "both";
          const isAct = s.activeRegions.has(idx);
          const isPrim = s.activePrimary.has(idx);
          const isHov = s.hoveredRegion !== null && MUSCLE_TO_REGION[s.hoveredRegion] === idx;

          if (!isAct && !isHov) { mesh.visible = false; continue; }
          mesh.visible = true;
          const mat = mesh.material;
          if (isPrim) { mat.color.set(0x1a56db); mat.opacity = 0.6; }
          else if (isAct) { mat.color.set(0x93c5fd); mat.opacity = 0.45; }
          else if (isHov) { mat.color.set(0x3b82f6); mat.opacity = 0.4; }
        }

        renderer.render(scene, camera);
      }
      animate();

      const ro = new ResizeObserver(() => {
        if (!renderer || !camera) return;
        const cw = container.clientWidth || Math.round(height * 0.55);
        renderer.setSize(cw, height);
        camera.aspect = cw / height;
        camera.updateProjectionMatrix();
      });
      ro.observe(container);

      setReady(true);

      (container as any).__cleanup = () => {
        cancelAnimationFrame(animId);
        ro.disconnect();
        window.removeEventListener("pointerup", onUp);
        if (renderer) { renderer.dispose(); container.removeChild(renderer.domElement); }
      };
    });

    return () => {
      mountRef.current = false;
      const c = containerRef.current;
      if (c && (c as any).__cleanup) (c as any).__cleanup();
    };
  }, []);

  // Sync React state → Three.js render-loop ref
  const activeRegions = useMemo(() => {
    const s = new Set<number>();
    if (activeMuscles) {
      for (const m of activeMuscles.primary) { const i = MUSCLE_TO_REGION[m]; if (i !== undefined) s.add(i); }
      for (const m of activeMuscles.secondary) { const i = MUSCLE_TO_REGION[m]; if (i !== undefined) s.add(i); }
    }
    return s;
  }, [activeMuscles]);

  const activePrimaryRegions = useMemo(() => {
    const s = new Set<number>();
    if (activeMuscles) for (const m of activeMuscles.primary) { const i = MUSCLE_TO_REGION[m]; if (i !== undefined) s.add(i); }
    return s;
  }, [activeMuscles]);

  // Keep the stateRef in sync (read by the Three.js animation loop)
  stateRef.current = { activeRegions, activePrimary: activePrimaryRegions, hoveredRegion, view };

  const handleViewToggle = useCallback((v: "front" | "back") => setView(v), []);

  // Legend
  const legendItems: { label: string; color: string }[] = [];
  if (activeMuscles?.primary.length) {
    for (const mId of activeMuscles.primary) {
      const m = MUSCLE_GROUPS.find(g => g.id === mId || g.id === `${mId}_r`);
      if (m && !legendItems.find(l => l.label === m.name))
        legendItems.push({ label: m.name, color: "bg-[#1A56DB]" });
    }
  }
  if (activeMuscles?.secondary.length) {
    for (const mId of activeMuscles.secondary) {
      const m = MUSCLE_GROUPS.find(g => g.id === mId || g.id === `${mId}_r`);
      if (m && !legendItems.find(l => l.label === m.name))
        legendItems.push({ label: m.name, color: "bg-[#93C5FD]" });
    }
  }

  const selectedMuscleName = selectedRegion
    ? MUSCLE_GROUPS.find(g => g.id === selectedRegion)?.name || selectedRegion
    : null;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="mb-2 flex rounded-lg bg-gray-100 p-0.5">
        <button onClick={() => handleViewToggle("front")}
          className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${view === "front" ? "bg-white text-[#1A56DB] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          Front
        </button>
        <button onClick={() => handleViewToggle("back")}
          className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${view === "back" ? "bg-white text-[#1A56DB] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          Back
        </button>
      </div>

      <div ref={containerRef} style={{ width: Math.round(height * 0.55), height }}
        className="relative rounded-lg border border-gray-200 bg-[#f8fafc] overflow-hidden cursor-grab select-none">
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A56DB] border-t-transparent" />
          </div>
        )}
        {ready && !isDragging && !activeMuscles && (
          <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none z-10">
            <span className="text-[10px] text-gray-400 bg-white/80 px-2 py-0.5 rounded">
              Drag to rotate &bull; Scroll to zoom &bull; Click muscles
            </span>
          </div>
        )}
      </div>

      {selectedMuscleName && (
        <div className="mt-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs text-blue-700">{selectedMuscleName}</div>
      )}

      {legendItems.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-medium text-gray-500">Target Muscles:</span>
          {legendItems.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${item.color}`} />{item.label}
            </span>
          ))}
        </div>
      )}

      {exerciseName && <p className="mt-2 text-sm font-medium text-[#1A56DB]">{exerciseName}</p>}
    </div>
  );
}

// ─── Three.js helpers (only run client-side) ───

function buildBodyModel(THREE: any): THREE.Group {
  const body = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xe8d5c4, roughness: 0.6, metalness: 0.05 });

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 24), skin);
  head.position.set(0, 1.62, 0);
  body.add(head);

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 0.15, 12), skin);
  neck.position.set(0, 1.38, 0);
  body.add(neck);

  // Torso
  const upperTorso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.30, 8, 8, 4), skin);
  upperTorso.position.set(0, 1.15, 0);
  body.add(upperTorso);
  const lowerTorso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.35, 0.28, 8, 8, 4), skin);
  lowerTorso.position.set(0, 0.78, 0);
  body.add(lowerTorso);
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.18, 0.28, 6, 4, 4), skin);
  pelvis.position.set(0, 0.50, 0);
  body.add(pelvis);

  // Shoulders
  const lSh = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), skin);
  lSh.position.set(-0.35, 1.28, 0);
  body.add(lSh);
  const rSh = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), skin);
  rSh.position.set(0.35, 1.28, 0);
  body.add(rSh);

  // Arms
  function arm(x: number) {
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.40, 12), skin);
    up.position.set(x, 0.95, 0); up.rotation.z = (x > 0 ? -1 : 1) * 0.15;
    body.add(up);
    const elb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), skin);
    elb.position.set(x * 0.92, 0.63, x > 0 ? 0.04 : -0.04);
    body.add(elb);
    const fa = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.38, 12), skin);
    fa.position.set(x * 1.06, 0.36, 0.02); fa.rotation.z = (x > 0 ? -1 : 1) * 0.08;
    body.add(fa);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), skin);
    hand.position.set(x * 1.15, 0.1, 0.02);
    body.add(hand);
  }
  arm(-1); arm(1);

  // Legs
  function leg(x: number) {
    const th = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.11, 0.45, 12), skin);
    th.position.set(x * 0.16, 0.25, 0);
    body.add(th);
    const kn = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), skin);
    kn.position.set(x * 0.16, -0.28, 0);
    body.add(kn);
    const ca = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.42, 12), skin);
    ca.position.set(x * 0.16, -0.70, 0);
    body.add(ca);
    const ft = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.06, 0.22, 6, 4, 4), skin);
    ft.position.set(x * 0.16, -1.12, 0.06);
    body.add(ft);
  }
  leg(-1); leg(1);

  return body;
}

function buildMuscleOverlays(THREE: any): { group: THREE.Group; meshes: THREE.Mesh[] } {
  const group = new THREE.Group();
  const meshes: THREE.Mesh[] = [];
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x1a56db, roughness: 0.3, metalness: 0.1,
    transparent: true, opacity: 0, depthWrite: false,
  });

  const configs: { idx: number; geo: () => THREE.BufferGeometry; pos: [number, number, number]; scl?: [number, number, number] }[] = [
    { idx: 0, geo: () => new THREE.BoxGeometry(0.48, 0.28, 0.18, 6, 4, 2), pos: [0, 1.18, 0.22], scl: [1, 1, 0.5] },
    { idx: 1, geo: () => new THREE.SphereGeometry(0.15, 12, 8), pos: [-0.35, 1.28, 0.08] },
    { idx: 1, geo: () => new THREE.SphereGeometry(0.15, 12, 8), pos: [0.35, 1.28, 0.08] },
    { idx: 2, geo: () => new THREE.CylinderGeometry(0.10, 0.10, 0.32, 10), pos: [-0.08, 0.95, 0.12] },
    { idx: 2, geo: () => new THREE.CylinderGeometry(0.10, 0.10, 0.32, 10), pos: [0.08, 0.95, 0.12] },
    { idx: 3, geo: () => new THREE.BoxGeometry(0.35, 0.38, 0.12, 6, 6, 2), pos: [0, 0.80, 0.22] },
    { idx: 4, geo: () => new THREE.BoxGeometry(0.10, 0.32, 0.14, 4, 6, 2), pos: [-0.28, 0.80, 0.10] },
    { idx: 4, geo: () => new THREE.BoxGeometry(0.10, 0.32, 0.14, 4, 6, 2), pos: [0.28, 0.80, 0.10] },
    { idx: 5, geo: () => new THREE.CylinderGeometry(0.12, 0.12, 0.40, 10), pos: [-0.16, 0.25, 0.12] },
    { idx: 5, geo: () => new THREE.CylinderGeometry(0.12, 0.12, 0.40, 10), pos: [0.16, 0.25, 0.12] },
    { idx: 6, geo: () => new THREE.CylinderGeometry(0.09, 0.10, 0.35, 10), pos: [-0.16, -0.70, 0.08] },
    { idx: 6, geo: () => new THREE.CylinderGeometry(0.09, 0.10, 0.35, 10), pos: [0.16, -0.70, 0.08] },
    { idx: 6, geo: () => new THREE.CylinderGeometry(0.09, 0.10, 0.35, 10), pos: [-0.16, -0.70, -0.08] },
    { idx: 6, geo: () => new THREE.CylinderGeometry(0.09, 0.10, 0.35, 10), pos: [0.16, -0.70, -0.08] },
    { idx: 7, geo: () => new THREE.CylinderGeometry(0.08, 0.08, 0.32, 10), pos: [-1.06, 0.36, 0.10] },
    { idx: 7, geo: () => new THREE.CylinderGeometry(0.08, 0.08, 0.32, 10), pos: [1.06, 0.36, 0.10] },
    { idx: 8, geo: () => new THREE.BoxGeometry(0.44, 0.14, 0.12, 6, 3, 2), pos: [0, 1.30, -0.22] },
    { idx: 9, geo: () => new THREE.SphereGeometry(0.15, 12, 8), pos: [-0.35, 1.28, -0.08] },
    { idx: 9, geo: () => new THREE.SphereGeometry(0.15, 12, 8), pos: [0.35, 1.28, -0.08] },
    { idx: 10, geo: () => new THREE.BoxGeometry(0.14, 0.40, 0.10, 4, 6, 2), pos: [-0.30, 0.90, -0.18] },
    { idx: 10, geo: () => new THREE.BoxGeometry(0.14, 0.40, 0.10, 4, 6, 2), pos: [0.30, 0.90, -0.18] },
    { idx: 11, geo: () => new THREE.BoxGeometry(0.30, 0.22, 0.10, 6, 4, 2), pos: [0, 1.02, -0.22] },
    { idx: 12, geo: () => new THREE.BoxGeometry(0.28, 0.26, 0.10, 6, 4, 2), pos: [0, 0.65, -0.22] },
    { idx: 13, geo: () => new THREE.BoxGeometry(0.38, 0.18, 0.14, 8, 4, 2), pos: [0, 0.50, -0.18] },
    { idx: 14, geo: () => new THREE.CylinderGeometry(0.11, 0.11, 0.38, 10), pos: [-0.16, 0.25, -0.10] },
    { idx: 14, geo: () => new THREE.CylinderGeometry(0.11, 0.11, 0.38, 10), pos: [0.16, 0.25, -0.10] },
    { idx: 15, geo: () => new THREE.CylinderGeometry(0.09, 0.09, 0.32, 10), pos: [-0.08, 0.95, -0.10] },
    { idx: 15, geo: () => new THREE.CylinderGeometry(0.09, 0.09, 0.32, 10), pos: [0.08, 0.95, -0.10] },
  ];

  for (const cfg of configs) {
    const mat = baseMat.clone();
    const mesh = new THREE.Mesh(cfg.geo(), mat);
    mesh.position.set(...cfg.pos);
    if (cfg.scl) mesh.scale.set(...cfg.scl);
    mesh.userData = { regionIndex: cfg.idx };
    mesh.visible = false;
    mesh.renderOrder = 1;
    group.add(mesh);
    meshes.push(mesh);
  }

  return { group, meshes };
}
