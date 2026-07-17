import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getPtDetail } from "~/lib/booking-actions";

export const Route = createFileRoute("/app/pt/$id")({
  component: PtProfilePage,
});

function PtProfilePage() {
  const navigate = useNavigate();
  const params = Route.useParams();
  const ptId = Number(params.id);

  const [user, setUser] = useState<any>(null);
  const [pt, setPt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("flexora_user");
    if (!stored) { navigate({ to: "/login" }); return; }
    try { setUser(JSON.parse(stored)); } catch { navigate({ to: "/login" }); return; }

    getPtDetail({ ptId })
      .then(setPt)
      .catch((e) => setError(e.message || "PT not found"))
      .finally(() => setLoading(false));
  }, [ptId]);

  function handleLogout() {
    localStorage.removeItem("flexora_token");
    localStorage.removeItem("flexora_user");
    document.cookie = "flexora_token=; path=/; max-age=0";
    navigate({ to: "/" });
  }

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    );
  }

  if (error || !pt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900">PT Not Found</p>
          <p className="mt-1 text-sm text-gray-500">{error || "This trainer profile is not available."}</p>
          <a href="/app/pt/discover" className="mt-4 inline-block text-sm font-medium text-[#1A56DB] hover:underline">
            &larr; Back to Discover
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <a href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#1A56DB]">Flexora</span>
            <span className="text-lg font-light text-gray-400">Fitnes</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/app/dashboard" className="text-sm text-gray-600 hover:text-[#1A56DB]">Dashboard</a>
            <a href="/app/pt/discover" className="text-sm text-gray-600 hover:text-[#1A56DB]">Discover</a>
            <a href="/app/bookings" className="text-sm text-gray-600 hover:text-[#1A56DB]">My Bookings</a>
            <button onClick={handleLogout} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-start gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1A56DB]/10 text-2xl font-bold text-[#1A56DB]">
              {pt.name?.charAt(0)?.toUpperCase() || "P"}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">{pt.name}</h1>
              <p className="text-sm text-gray-500">{pt.country}</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-yellow-400">
                  {"★".repeat(Math.round(pt.avg_rating || 0))}
                  {"☆".repeat(5 - Math.round(pt.avg_rating || 0))}
                </span>
                <span className="text-xs text-gray-400">({pt.review_count} reviews)</span>
              </div>
              {pt.speed_date_enabled && (
                <span className="mt-2 inline-block rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                  ⚡ Speed Date Available
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 text-center">
            <p className="text-xs font-medium uppercase text-gray-400">Experience</p>
            <p className="mt-1 text-lg font-bold text-gray-900">{pt.years_of_experience || 0} yrs</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 text-center">
            <p className="text-xs font-medium uppercase text-gray-400">Rate</p>
            <p className="mt-1 text-lg font-bold text-gray-900">{pt.hourly_rate || 500} kr/hr</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 text-center">
            <p className="text-xs font-medium uppercase text-gray-400">Education</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{pt.education_location || "\u2014"}</p>
          </div>
        </div>

        {user?.role === "client" && (
          <div className="mb-8">
            <a
              href={`/app/booking/create?ptId=${pt.id}`}
              className="block w-full rounded-xl bg-[#1A56DB] px-6 py-4 text-center text-base font-semibold text-white hover:bg-[#1E40AF] transition-colors shadow-sm"
            >
              Book a Session with {pt.name}
            </a>
          </div>
        )}

        {pt.bio && (
          <div className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">About</h2>
            <p className="text-sm leading-relaxed text-gray-700">{pt.bio}</p>
          </div>
        )}

        {pt.specialties?.length > 0 && (
          <div className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Specialties</h2>
            <div className="flex flex-wrap gap-2">
              {pt.specialties.map((s: string) => (
                <span key={s} className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-[#1A56DB]">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {pt.certification_info && (
          <div className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Certifications</h2>
            <p className="text-sm text-gray-700">{pt.certification_info}</p>
            {pt.diploma_url && (
              <a href={pt.diploma_url} target="_blank" rel="noopener" className="mt-2 inline-block text-sm font-medium text-[#1A56DB] hover:underline">
                View Diploma &rarr;
              </a>
            )}
          </div>
        )}

        {pt.availability?.length > 0 && (
          <div className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Weekly Availability</h2>
            <div className="space-y-2">
              {pt.availability.map((slot: any, i: number) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5">
                  <span className="text-sm font-medium text-gray-700">{dayNames[slot.day_of_week]}</span>
                  <span className="text-sm text-gray-500">{slot.start_time} &ndash; {slot.end_time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {pt.reviews?.length > 0 && (
          <div className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
              Reviews ({pt.review_count})
            </h2>
            <div className="space-y-4">
              {pt.reviews.map((r: any) => (
                <div key={r.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{r.client_name}</p>
                    <span className="text-xs text-yellow-400">
                      {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                    </span>
                  </div>
                  {r.comment && <p className="mt-1 text-sm text-gray-600">{r.comment}</p>}
                  <p className="mt-1 text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center">
          <a href="/app/pt/discover" className="text-sm font-medium text-[#1A56DB] hover:underline">
            &larr; Back to Discover
          </a>
        </div>
      </main>
    </div>
  );
}
