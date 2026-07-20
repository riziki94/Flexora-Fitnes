import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { searchPTs, getAvailableCountries, getAvailableSpecialties } from "~/lib/booking-actions";
import Avatar from "~/components/Avatar";

export const Route = createFileRoute("/app/pt/discover")({
  component: PtDiscoverPage,
});

function PtDiscoverPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [pts, setPts] = useState<any[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [expFilter, setExpFilter] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("flexora_user");
    if (!stored) { navigate({ to: "/login" }); return; }
    try {
      setUser(JSON.parse(stored));
    } catch {
      navigate({ to: "/login" }); return;
    }

    Promise.all([
      searchPTs({}),
      getAvailableCountries(),
      getAvailableSpecialties(),
    ]).then(([ptsData, countriesData, specsData]) => {
      setPts(ptsData);
      setCountries(countriesData);
      setSpecialties(specsData);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  async function doSearch() {
    setLoading(true);
    try {
      const res = await searchPTs({
        search: searchTerm || undefined,
        country: countryFilter || undefined,
        specialty: specialtyFilter || undefined,
        minExperience: expFilter ? Number(expFilter) : undefined,
      });
      setPts(res);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function handleLogout() {
    localStorage.removeItem("flexora_token");
    localStorage.removeItem("flexora_user");
    document.cookie = "flexora_token=; path=/; max-age=0";
    navigate({ to: "/" });
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <a href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#1A56DB]">Flexora</span>
            <span className="text-lg font-light text-gray-400">Fitnes</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/app/dashboard" className="text-sm text-gray-600 hover:text-[#1A56DB]">Dashboard</a>
            <a href="/app/bookings" className="text-sm text-gray-600 hover:text-[#1A56DB]">My Bookings</a>
            <button onClick={handleLogout} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Discover Personal Trainers</h1>
          <p className="text-gray-500">Find your perfect verified PT from around the world</p>
        </div>

        {/* Speed Date Banner */}
        <div className="mb-8 rounded-xl bg-gradient-to-r from-[#1A56DB] to-[#3B82F6] p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">⚡ Speed Date Matching</h2>
              <p className="mt-1 text-sm text-blue-100">Quick 5-minute intro calls with available PTs — find your match fast!</p>
            </div>
            <a
              href="/app/pt/speed-date"
              className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-[#1A56DB] hover:bg-blue-50 transition-colors"
            >
              Try Speed Date
            </a>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Search</label>
              <input
                type="text"
                placeholder="Name, specialty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Country</label>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#1A56DB] focus:outline-none"
              >
                <option value="">All Countries</option>
                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Specialty</label>
              <select
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#1A56DB] focus:outline-none"
              >
                <option value="">All Specialties</option>
                {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Min Experience</label>
              <select
                value={expFilter}
                onChange={(e) => setExpFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#1A56DB] focus:outline-none"
              >
                <option value="">Any</option>
                <option value="1">1+ years</option>
                <option value="3">3+ years</option>
                <option value="5">5+ years</option>
                <option value="10">10+ years</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={doSearch}
                className="w-full rounded-lg bg-[#1A56DB] px-4 py-2 text-sm font-medium text-white hover:bg-[#1E40AF] transition-colors"
              >
                Filter
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="text-gray-500">Loading PTs...</div>
          </div>
        ) : pts.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-100">
            <p className="text-gray-500">No PTs match your filters. Try adjusting your search.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pts.map((pt) => (
              <div key={pt.id} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 hover:shadow-md transition-shadow">
                {/* Avatar */}
                <div className="mb-4 flex items-center gap-4">
                  <Avatar src={pt.profile_picture} name={pt.name} size={48} />
                  <div>
                    <h3 className="font-semibold text-gray-900">{pt.name}</h3>
                    <p className="text-xs text-gray-500">{pt.country}</p>
                  </div>
                </div>

                {/* Rating */}
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-yellow-400">{"★".repeat(Math.round(pt.avg_rating || 0))}{"☆".repeat(5 - Math.round(pt.avg_rating || 0))}</span>
                  <span className="text-xs text-gray-400">({pt.review_count})</span>
                </div>

                {/* Specialties */}
                <div className="mb-3 flex flex-wrap gap-1">
                  {(pt.specialties || []).slice(0, 3).map((s: string) => (
                    <span key={s} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-[#1A56DB]">
                      {s}
                    </span>
                  ))}
                  {(pt.specialties || []).length > 3 && (
                    <span className="text-xs text-gray-400">+{pt.specialties.length - 3} more</span>
                  )}
                </div>

                {/* Stats */}
                <div className="mb-4 grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <div>
                    <span className="font-medium text-gray-700">{pt.years_of_experience}</span> yrs exp
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">{pt.hourly_rate}</span> kr/hr
                  </div>
                </div>

                {pt.speed_date_enabled && (
                  <div className="mb-3 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
                    ⚡ Available for Speed Date
                  </div>
                )}

                {pt.certificate_image && (
                  <div className="mb-3 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Verified Certificate
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <a
                      href={`/app/pt/${pt.id}`}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      View Profile
                    </a>
                    <a
                      href={`/app/booking/create?ptId=${pt.id}`}
                      className="flex-1 rounded-lg bg-[#1A56DB] px-3 py-2 text-center text-sm font-medium text-white hover:bg-[#1E40AF] transition-colors"
                    >
                      Book Now
                    </a>
                  </div>
                  <a
                    href={`/register?ref_pt=${pt.id}`}
                    className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-center text-sm font-medium text-green-700 hover:bg-green-100 transition-colors"
                  >
                    Registrer deg og tren med {pt.name}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
