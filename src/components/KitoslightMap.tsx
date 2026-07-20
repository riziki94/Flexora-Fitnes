import { useEffect, useState, type ReactNode, Suspense, lazy } from "react";

/** Renders children only after client-side hydration */
function ClientOnly({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

/** Shell rendered during SSR and while Leaflet loads on client */
function MapShell({ height }: { height: string }) {
  return (
    <div
      className="h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-100 via-cyan-50 to-teal-100 rounded-2xl"
      style={{ minHeight: height }}
    >
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-emerald-500 border-t-transparent" />
        <p className="mt-3 text-sm text-gray-500 font-medium">Loading map...</p>
      </div>
    </div>
  );
}

// ── Dynamically imported Leaflet map (only on client) ──────────────────
const LeafletMap = lazy(() => import("./LeafletMap"));

import type { Device } from "~/data/kitoslight-devices";

interface MapViewProps {
  devices: Device[];
  selectedDeviceId: string | null;
  onSelectDevice: (device: Device) => void;
  filterCity: string;
}

export function MapView(props: MapViewProps) {
  return (
    <ClientOnly>
      <Suspense fallback={<MapShell height="100%" />}>
        <LeafletMap {...props} />
      </Suspense>
    </ClientOnly>
  );
}
