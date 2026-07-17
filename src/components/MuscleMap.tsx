import { useRef, useEffect, useCallback, useState } from "react";
import { MUSCLE_GROUPS, getMuscleMapping, type MuscleGroup } from "~/lib/muscle-data";

interface MuscleMapProps {
  activeMuscles?: { primary: string[]; secondary: string[] } | null;
  exerciseName?: string;
  height?: number;
  className?: string;
}

export function MuscleMap({ activeMuscles, exerciseName, height = 400, className = "" }: MuscleMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null);
  const [view, setView] = useState<"front" | "back">("front");

  const width = Math.round(height * 0.55); // maintain aspect ratio

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    // Draw the body silhouette
    drawBody(ctx, width, height, view);

    // Draw muscle groups
    const highlightSet = new Set<string>();
    if (activeMuscles) {
      activeMuscles.primary.forEach((m) => {
        // Handle left/right variants
        highlightSet.add(m);
        highlightSet.add(`${m}_r`);
      });
      activeMuscles.secondary.forEach((m) => {
        highlightSet.add(m);
        highlightSet.add(`${m}_r`);
      });
    }

    if (hoveredMuscle && !activeMuscles) {
      highlightSet.add(hoveredMuscle);
      highlightSet.add(`${hoveredMuscle}_r`);
    }

    const viewGroups = MUSCLE_GROUPS.filter((g) => g.view === view || g.view === "both");

    for (const group of viewGroups) {
      const isPrimary = activeMuscles?.primary.some(
        (m) => group.id === m || group.id === `${m}_r` || group.id.startsWith(m)
      );
      const isSecondary = !isPrimary && activeMuscles?.secondary.some(
        (m) => group.id === m || group.id === `${m}_r` || group.id.startsWith(m)
      );
      const isHovered = hoveredMuscle && (group.id === hoveredMuscle || group.id === `${hoveredMuscle}_r`);

      let fillColor = "rgba(200, 210, 220, 0.3)";
      let strokeColor = "rgba(180, 190, 200, 0.5)";

      if (isPrimary) {
        fillColor = "rgba(26, 86, 219, 0.45)"; // blue
        strokeColor = "rgba(26, 86, 219, 0.7)";
      } else if (isSecondary) {
        fillColor = "rgba(147, 197, 253, 0.4)"; // lighter blue
        strokeColor = "rgba(147, 197, 253, 0.6)";
      } else if (isHovered) {
        fillColor = "rgba(26, 86, 219, 0.25)";
        strokeColor = "rgba(26, 86, 219, 0.5)";
      }

      drawMusclePolygon(ctx, group.points, fillColor, strokeColor, width, height);
    }
  }, [width, height, activeMuscles, hoveredMuscle, view]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || activeMuscles) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * width;
      const y = ((e.clientY - rect.top) / rect.height) * height;

      let found: string | null = null;
      for (const group of MUSCLE_GROUPS) {
        if (group.view !== view && group.view !== "both") continue;
        if (isPointInPolygon(x, y, group.points, width, height)) {
          found = group.id.replace(/_r$/, "");
          break;
        }
      }
      setHoveredMuscle(found);
    },
    [width, height, activeMuscles, view]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredMuscle(null);
  }, []);

  // Build legend
  const legendItems: { label: string; color: string }[] = [];
  if (activeMuscles?.primary.length) {
    for (const mId of activeMuscles.primary) {
      const muscle = MUSCLE_GROUPS.find((g) => g.id === mId || g.id === `${mId}_r`);
      if (muscle && !legendItems.find((l) => l.label === muscle.name)) {
        legendItems.push({ label: muscle.name, color: "bg-[#1A56DB]" });
      }
    }
  }
  if (activeMuscles?.secondary.length) {
    for (const mId of activeMuscles.secondary) {
      const muscle = MUSCLE_GROUPS.find((g) => g.id === mId || g.id === `${mId}_r`);
      if (muscle && !legendItems.find((l) => l.label === muscle.name)) {
        legendItems.push({ label: muscle.name, color: "bg-[#93C5FD]" });
      }
    }
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* View toggle */}
      <div className="mb-2 flex rounded-lg bg-gray-100 p-0.5">
        <button
          onClick={() => setView("front")}
          className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
            view === "front" ? "bg-white text-[#1A56DB] shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Front
        </button>
        <button
          onClick={() => setView("back")}
          className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
            view === "back" ? "bg-white text-[#1A56DB] shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Back
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="cursor-pointer"
      />

      {/* Legend */}
      {legendItems.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-medium text-gray-500">Target Muscles:</span>
          {legendItems.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${item.color}`} />
              {item.label}
            </span>
          ))}
        </div>
      )}

      {exerciseName && (
        <p className="mt-2 text-sm font-medium text-[#1A56DB]">{exerciseName}</p>
      )}
    </div>
  );
}

function drawBody(ctx: CanvasRenderingContext2D, w: number, h: number, view: "front" | "back") {
  const offsetX = view === "back" ? 0 : 0;

  ctx.save();
  ctx.strokeStyle = "rgba(180, 190, 200, 0.6)";
  ctx.fillStyle = "rgba(220, 230, 240, 0.2)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const scaleX = w / 100;
  const scaleY = h / 100;

  // Head
  const cx = 50 * scaleX;
  const cy = 9 * scaleY;
  const r = 7 * scaleY;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Neck
  ctx.beginPath();
  ctx.moveTo(47 * scaleX, 14 * scaleY);
  ctx.lineTo(47 * scaleX, 17 * scaleY);
  ctx.lineTo(53 * scaleX, 17 * scaleY);
  ctx.lineTo(53 * scaleX, 14 * scaleY);
  ctx.stroke();

  // Torso
  ctx.beginPath();
  ctx.moveTo(32 * scaleX, 17 * scaleY);
  ctx.lineTo(68 * scaleX, 17 * scaleY);
  ctx.lineTo(70 * scaleX, 55 * scaleY);
  ctx.lineTo(30 * scaleX, 55 * scaleY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Left arm
  ctx.beginPath();
  ctx.moveTo(32 * scaleX, 17 * scaleY);
  ctx.lineTo(28 * scaleX, 30 * scaleY);
  ctx.lineTo(26 * scaleX, 50 * scaleY);
  ctx.lineTo(24 * scaleX, 68 * scaleY);
  ctx.stroke();

  // Right arm
  ctx.beginPath();
  ctx.moveTo(68 * scaleX, 17 * scaleY);
  ctx.lineTo(72 * scaleX, 30 * scaleY);
  ctx.lineTo(74 * scaleX, 50 * scaleY);
  ctx.lineTo(76 * scaleX, 68 * scaleY);
  ctx.stroke();

  // Left leg
  ctx.beginPath();
  ctx.moveTo(34 * scaleX, 55 * scaleY);
  ctx.lineTo(32 * scaleX, 82 * scaleY);
  ctx.lineTo(34 * scaleX, 96 * scaleY);
  ctx.stroke();

  // Right leg
  ctx.beginPath();
  ctx.moveTo(66 * scaleX, 55 * scaleY);
  ctx.lineTo(68 * scaleX, 82 * scaleY);
  ctx.lineTo(66 * scaleX, 96 * scaleY);
  ctx.stroke();

  ctx.restore();
}

function drawMusclePolygon(
  ctx: CanvasRenderingContext2D,
  points: [number, number][],
  fillColor: string,
  strokeColor: string,
  w: number,
  h: number
) {
  if (points.length < 3) return;
  const scaleX = w / 100;
  const scaleY = h / 100;

  ctx.beginPath();
  ctx.moveTo(points[0][0] * scaleX, points[0][1] * scaleY);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0] * scaleX, points[i][1] * scaleY);
  }
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function isPointInPolygon(
  x: number,
  y: number,
  points: [number, number][],
  w: number,
  h: number
): boolean {
  const scaleX = w / 100;
  const scaleY = h / 100;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i][0] * scaleX;
    const yi = points[i][1] * scaleY;
    const xj = points[j][0] * scaleX;
    const yj = points[j][1] * scaleY;

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
