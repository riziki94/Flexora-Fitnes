import { useMemo } from "react";

const COLORS = [
  "#1A56DB", "#2563EB", "#7C3AED", "#9333EA", "#DB2777",
  "#DC2626", "#EA580C", "#CA8A04", "#16A34A", "#0891B2",
];

function nameToColor(name: string): string {
  if (!name) return COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: number;
  className?: string;
}

export default function Avatar({ src, name = "", size = 40, className = "" }: AvatarProps) {
  const bgColor = useMemo(() => nameToColor(name), [name]);

  if (src && src.startsWith("data:")) {
    return (
      <img
        src={src}
        alt={name || "Avatar"}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        color: "#fff",
        fontSize: size * 0.38,
      }}
    >
      {getInitials(name)}
    </div>
  );
}
