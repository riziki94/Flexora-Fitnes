import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/afercity/")({
  component: AferCity,
});

// ── SVG City Skyline Illustration ────────────────────────────────────────────
function CitySkyline() {
  return (
    <svg
      viewBox="0 0 800 340"
      className="w-full max-w-3xl mx-auto"
      aria-label="AferCity smart city skyline illustration"
    >
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#064e3b" />
          <stop offset="50%" stopColor="#065f46" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="sunGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="solarPanel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="windowGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fde68a" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect x="0" y="0" width="800" height="260" fill="url(#skyGrad)" />

      {/* Sun */}
      <circle cx="680" cy="60" r="32" fill="url(#sunGrad)" opacity="0.9" />
      <circle cx="680" cy="60" r="40" fill="#fbbf24" opacity="0.15" />

      {/* Stars / dots */}
      {[
        [120, 30],
        [200, 50],
        [340, 25],
        [450, 40],
        [550, 35],
        [80, 60],
        [300, 45],
        [500, 55],
      ].map(([x, y], i) => (
        <circle key={`star-${i}`} cx={x} cy={y} r={1.5} fill="#6ee7b7" opacity={0.6} />
      ))}

      {/* Clouds */}
      <g opacity="0.15" fill="white">
        <ellipse cx="180" cy="70" rx="50" ry="14" />
        <ellipse cx="210" cy="65" rx="40" ry="10" />
        <ellipse cx="500" cy="85" rx="45" ry="12" />
        <ellipse cx="530" cy="80" rx="35" ry="9" />
      </g>

      {/* Ground */}
      <rect x="0" y="260" width="800" height="80" fill="url(#groundGrad)" />
      <rect x="0" y="258" width="800" height="6" fill="#34d399" opacity="0.4" />

      {/* ── Container Houses ─────────────────────────────── */}
      {/* House 1 — studio */}
      <rect x="60" y="180" width="80" height="80" rx="3" fill="#d97706" />
      <rect x="60" y="180" width="80" height="80" rx="3" fill="none" stroke="#b45309" strokeWidth="2" />
      {/* Windows */}
      <rect x="72" y="190" width="16" height="20" rx="1" fill="url(#windowGrad)" />
      <rect x="96" y="190" width="16" height="20" rx="1" fill="url(#windowGrad)" />
      <rect x="120" y="190" width="12" height="20" rx="1" fill="url(#windowGrad)" />
      <rect x="72" y="218" width="16" height="20" rx="1" fill="url(#windowGrad)" />
      <rect x="96" y="218" width="16" height="20" rx="1" fill="url(#windowGrad)" />
      <rect x="120" y="218" width="12" height="20" rx="1" fill="url(#windowGrad)" />
      {/* Solar panels on roof */}
      <rect x="65" y="172" width="24" height="10" rx="1" fill="url(#solarPanel)" />
      <rect x="95" y="172" width="24" height="10" rx="1" fill="url(#solarPanel)" />
      {/* Door */}
      <rect x="116" y="240" width="18" height="20" rx="1" fill="#92400e" />

      {/* House 2 — family, 2 containers stacked */}
      <rect x="160" y="150" width="100" height="110" rx="3" fill="#b45309" />
      <rect x="160" y="150" width="100" height="110" rx="3" fill="none" stroke="#92400e" strokeWidth="2" />
      {/* Windows top */}
      <rect x="172" y="160" width="18" height="24" rx="1" fill="url(#windowGrad)" />
      <rect x="198" y="160" width="18" height="24" rx="1" fill="url(#windowGrad)" />
      <rect x="224" y="160" width="18" height="24" rx="1" fill="url(#windowGrad)" />
      {/* Windows bottom */}
      <rect x="172" y="198" width="18" height="24" rx="1" fill="url(#windowGrad)" />
      <rect x="198" y="198" width="18" height="24" rx="1" fill="url(#windowGrad)" />
      <rect x="224" y="198" width="18" height="24" rx="1" fill="url(#windowGrad)" />
      {/* Solar panels */}
      <rect x="165" y="142" width="30" height="10" rx="1" fill="url(#solarPanel)" />
      <rect x="200" y="142" width="30" height="10" rx="1" fill="url(#solarPanel)" />
      {/* Door */}
      <rect x="218" y="233" width="22" height="24" rx="2" fill="#78350f" />
      {/* Balcony railing */}
      <rect x="175" y="190" width="78" height="3" fill="#64748b" />

      {/* House 3 — premium, 3 containers */}
      <rect x="280" y="140" width="110" height="120" rx="3" fill="#d97706" />
      <rect x="280" y="140" width="110" height="120" rx="3" fill="none" stroke="#92400e" strokeWidth="2" />
      {/* 3-level windows */}
      {[
        [292, 150],
        [320, 150],
        [348, 150],
        [292, 184],
        [320, 184],
        [348, 184],
        [292, 218],
        [320, 218],
        [348, 218],
      ].map(([x, y], i) => (
        <rect key={`h3w-${i}`} x={x} y={y} width="18" height="22" rx="1" fill="url(#windowGrad)" />
      ))}
      {/* Solar panels */}
      <rect x="285" y="132" width="30" height="10" rx="1" fill="url(#solarPanel)" />
      <rect x="320" y="132" width="30" height="10" rx="1" fill="url(#solarPanel)" />
      <rect x="355" y="132" width="30" height="10" rx="1" fill="url(#solarPanel)" />
      {/* Door */}
      <rect x="335" y="237" width="22" height="23" rx="2" fill="#78350f" />

      {/* ── Smart Poles (Kitoslight) ──────────────────── */}
      {[
        [15, 170],
        [430, 175],
        [560, 170],
        [640, 165],
        [740, 175],
      ].map(([x, topY], i) => (
        <g key={`pole-${i}`}>
          {/* Pole shaft */}
          <rect x={x + 1} y={topY} width="4" height={260 - topY} fill="#475569" />
          {/* Arm */}
          <line x1={x + 3} y1={topY + 4} x2={x + 18} y2={topY} stroke="#475569" strokeWidth="3" />
          {/* Light fixture */}
          <rect x={x + 15} y={topY - 2} width="8" height="5" rx="1" fill="#fbbf24" />
          {/* Glow */}
          <ellipse cx={x + 19} cy={topY + 1} rx="8" ry="6" fill="#fbbf24" opacity="0.2" />
          {/* Small solar panel on top */}
          <rect x={x - 2} y={topY - 8} width="10" height="6" rx="0.5" fill="url(#solarPanel)" />
        </g>
      ))}

      {/* ── Smart Bus Shelter ──────────────────────────── */}
      <g transform="translate(450, 210)">
        {/* Roof */}
        <rect x="0" y="0" width="70" height="8" rx="2" fill="#06b6d4" />
        <rect x="-2" y="-6" width="74" height="8" rx="2" fill="url(#solarPanel)" opacity="0.7" />
        {/* Back wall */}
        <rect x="2" y="8" width="66" height="40" rx="2" fill="white" opacity="0.9" />
        <rect x="2" y="8" width="66" height="40" rx="2" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
        {/* Glass panels */}
        <rect x="6" y="12" width="18" height="32" rx="1" fill="#bae6fd" opacity="0.5" />
        <rect x="28" y="12" width="18" height="32" rx="1" fill="#bae6fd" opacity="0.5" />
        <rect x="50" y="12" width="14" height="32" rx="1" fill="#bae6fd" opacity="0.5" />
        {/* Info screen */}
        <rect x="15" y="30" width="44" height="12" rx="1" fill="#0f172a" opacity="0.7" />
        <text x="37" y="39" textAnchor="middle" fill="#34d399" fontSize="5" fontFamily="monospace">
          07:42
        </text>
        {/* Bench */}
        <rect x="8" y="44" width="54" height="5" rx="1" fill="#64748b" />
        {/* Poles */}
        <rect x="3" y="8" width="2" height="50" fill="#94a3b8" />
        <rect x="65" y="8" width="2" height="50" fill="#94a3b8" />
      </g>

      {/* ── Smart Bench ────────────────────────────────── */}
      <g transform="translate(540, 243)">
        {/* Seat */}
        <rect x="0" y="0" width="36" height="7" rx="2" fill="#3b82f6" />
        {/* Legs */}
        <rect x="4" y="7" width="3" height="12" rx="1" fill="#1e40af" />
        <rect x="29" y="7" width="3" height="12" rx="1" fill="#1e40af" />
        {/* Solar strip on front */}
        <rect x="0" y="4" width="36" height="3" rx="1" fill="url(#solarPanel)" opacity="0.8" />
        {/* USB port indicator */}
        <rect x="14" y="2" width="4" height="2" rx="0.5" fill="#22c55e" />
        <circle cx="17" cy="1" r="1" fill="#22c55e" opacity="0.6">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* ── Trees ───────────────────────────────────────── */}
      {[
        [50, 240],
        [145, 240],
        [420, 240],
        [535, 240],
        [600, 238],
        [700, 238],
        [760, 238],
      ].map(([x, cy], i) => (
        <g key={`tree-${i}`}>
          <rect x={x + 3} y={cy + 6} width="4" height="16" rx="1" fill="#78350f" />
          <circle cx={x + 5} cy={cy} r="10" fill="#22c55e" opacity="0.8" />
          <circle cx={x + 1} cy={cy + 4} r="8" fill="#16a34a" opacity="0.7" />
          <circle cx={x + 9} cy={cy + 3} r="7" fill="#15803d" opacity="0.6" />
        </g>
      ))}

      {/* ── Pathway ─────────────────────────────────────── */}
      <path
        d="M-5,270 Q200,265 400,268 Q600,271 805,267"
        fill="none"
        stroke="#a8a29e"
        strokeWidth="3"
        strokeDasharray="8 4"
        opacity="0.5"
      />

      {/* ── Kitozon Logo Text ──────────────────────────── */}
      <text
        x="400"
        y="310"
        textAnchor="middle"
        fill="white"
        fontFamily="system-ui, sans-serif"
        fontWeight="800"
        fontSize="14"
        letterSpacing="4"
        opacity="0.7"
      >
        KITOZON
      </text>

      {/* ── Floating energy particles ──────────────────── */}
      {[
        [330, 100],
        [370, 90],
        [410, 95],
        [350, 110],
        [390, 105],
      ].map(([x, y], i) => (
        <circle key={`particle-${i}`} cx={x} cy={y} r={2} fill="#34d399" opacity="0.4">
          <animate
            attributeName="cy"
            values={`${y};${y - 15};${y}`}
            dur={`${3 + i * 0.4}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.2;0.6;0.2"
            dur={`${3 + i * 0.4}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </svg>
  );
}

// ── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({
  title,
  description,
  color,
}: {
  title: string;
  description: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    amber: "bg-amber-100",
    cyan: "bg-cyan-100",
    blue: "bg-blue-100",
    emerald: "bg-emerald-100",
  };

  return (
    <div className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-emerald-200 hover:-translate-y-1">
      <div
        className={`inline-flex h-14 w-auto items-center justify-center rounded-xl ${
          colorMap[color] || "bg-emerald-100"
        } mb-4 px-3 py-2`}
      >
        <img src="/images/logo-original.png" alt="Kitozon" className="h-8 w-auto object-contain" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
function AferCity() {
  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-950">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-700/20 via-transparent to-transparent" />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "radial-gradient(circle, #34d399 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-8 sm:px-6 lg:px-8 lg:pt-24">
          {/* Badge */}
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-800/60 border border-emerald-600/30 px-4 py-1.5 text-sm font-medium text-emerald-300 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Smart City Simulator — Coming Soon
            </span>
          </div>

          {/* Title */}
          <div className="text-center mb-4">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              <span className="text-emerald-400">AFER</span>{" "}
              <span className="text-white">CITY</span>
            </h1>
            <p className="mt-4 text-lg text-emerald-200/80 max-w-2xl mx-auto">
              Design and simulate your own sustainable smart city. Place container
              homes, smart infrastructure, and green energy — all powered by Kitozon.
            </p>
          </div>

          {/* City Skyline */}
          <div className="py-4">
            <CitySkyline />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              What you can build with AferCity
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              A complete smart city ecosystem — from housing to infrastructure,
              all designed for sustainability.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              title="Container Homes"
              description="Design modular container houses with integrated solar panels, customizable layouts, and zero-carbon operation."
              color="amber"
            />
            <FeatureCard
              title="Smart Poles"
              description="Solar-powered streetlights with environmental sensors — light, air quality, and energy data in real time."
              color="emerald"
            />
            <FeatureCard
              title="Bus Shelters"
              description="Smart shelters with live arrival info, USB charging, WiFi, and air quality monitoring for commuters."
              color="cyan"
            />
            <FeatureCard
              title="Smart Benches"
              description="Solar-powered benches with USB charging ports, WiFi hotspots, and integrated environmental sensors."
              color="blue"
            />
          </div>
        </div>
      </section>

      {/* Stats / Vision Section */}
      <section className="bg-gray-50 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3 text-center">
            {[
              { value: "100%", label: "Renewable Energy", sub: "Solar-powered everything" },
              { value: "0", label: "Carbon Emissions", sub: "Net-zero city design" },
              { value: "24/7", label: "Real-Time Monitoring", sub: "Live data from every device" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100"
              >
                <div className="text-3xl font-black text-emerald-600 mb-2">
                  {stat.value}
                </div>
                <div className="font-bold text-gray-900">{stat.label}</div>
                <div className="text-sm text-gray-500 mt-1">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-emerald-700 to-green-600 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to explore the future of smart cities?
          </h2>
          <p className="mt-4 text-lg text-emerald-100 max-w-2xl mx-auto">
            AferCity is coming soon. In the meantime, explore our real-time
            environmental monitoring platform Kitoslight — live data from smart
            devices across your city.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/kitoslight"
              className="rounded-xl bg-white px-8 py-4 text-base font-semibold text-emerald-700 shadow-lg hover:bg-emerald-50 transition-all duration-200"
            >
              Explore Kitoslight
            </Link>
            <Link
              to="/"
              className="rounded-xl border-2 border-white/30 bg-transparent px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-all duration-200"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
