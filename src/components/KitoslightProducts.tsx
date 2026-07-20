const PRODUCTS = [
  {
    id: "smart-bench",
    name: "Smartbenk",
    icon: "",
    delivers: [
      "USB-C charging",
      "Wireless Qi charging",
      "WiFi hotspot",
      "CO₂ measurement",
    ],
    power: "Solar powered",
    description:
      "Smart urban bench with integrated solar panels. Provides free USB-C and wireless charging, public WiFi, and real-time CO₂ monitoring.",
  },
  {
    id: "bus-shelter",
    name: "Busskur med solceller",
    icon: "",
    delivers: [
      "USB-C charging",
      "Wireless Qi charging",
      "WiFi hotspot",
      "CO₂ measurement",
      "Weather protection",
    ],
    power: "Solar powered roof",
    description:
      "Solar-powered bus shelter with integrated environmental sensors. Charges phones, provides WiFi, and monitors air quality.",
  },
  {
    id: "solar-pole",
    name: "Solcellestolpe med lading",
    icon: "",
    delivers: [
      "USB-C charging",
      "Wireless Qi charging",
      "WiFi hotspot",
      "CO₂ measurement",
      "Area lighting",
    ],
    power: "Solar powered",
    description:
      "Multi-functional solar street pole. Combines LED lighting with phone charging, WiFi access point, and environmental monitoring.",
  },
];

export function KitoslightProducts() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Section Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
          <span></span>
          <span>Kitoslight Products</span>
        </h2>
      </div>

      {/* Product Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCTS.map((product) => (
          <div
            key={product.id}
            className="rounded-xl border border-gray-200 bg-white p-6 transition-all duration-300 hover:shadow-lg hover:border-gray-300 flex flex-col"
          >
            {/* Product Image */}
            <img
              src={`/images/kitoslight-${product.id === "smart-bench" ? "bench" : product.id === "bus-shelter" ? "shelter" : "pole"}.png`}
              alt={product.name}
              className="w-full h-40 object-cover rounded-lg mb-3"
            />
            {/* Icon */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-2xl">
                {product.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {product.name}
                </h3>
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {product.power}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">{product.description}</p>

            {/* Specifications */}
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Specifications
              </h4>
              <ul className="space-y-1.5">
                {product.delivers.map((spec) => (
                  <li
                    key={spec}
                    className="flex items-center gap-2 text-sm text-gray-700"
                  >
                    <svg
                      className="h-4 w-4 flex-shrink-0 text-emerald-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {spec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
