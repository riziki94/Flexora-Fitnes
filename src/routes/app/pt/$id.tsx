import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { getPtDetail } from "~/lib/booking-actions";
import { getPtSatisfaction } from "~/lib/pt-ratings-actions";

export const Route = createFileRoute("/app/pt/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    welcome: (search.welcome as string) || "",
  }),
  component: PtProfilePage,
});

function PtProfilePage() {
  const navigate = useNavigate();
  const params = Route.useParams();
  const ptId = Number(params.id);

  const [user, setUser] = useState<any>(null);
  const [pt, setPt] = useState<any>(null);
  const [satisfaction, setSatisfaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [certLightbox, setCertLightbox] = useState<string>("");

  const search = useSearch({ from: "/app/pt/$id" });
  const showWelcome = search.welcome === "1";

  useEffect(() => {
    const stored = localStorage.getItem("flexora_user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore bad stored data */ }
    }

    getPtDetail({ ptId })
      .then(setPt)
      .catch((e) => setError(e.message || "PT not found"))
      .finally(() => setLoading(false));
    getPtSatisfaction({ ptUserId: ptId })
      .then(setSatisfaction)
      .catch(() => {});
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

  const isLoggedIn = !!user;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <a href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#1A56DB]">Flexora</span>
            <span className="text-lg font-light text-gray-400">Fitnes</span>
          </a>
          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              <a href="/app/dashboard" className="text-sm text-gray-600 hover:text-[#1A56DB]">Dashboard</a>
              <a href="/app/pt/discover" className="text-sm text-gray-600 hover:text-[#1A56DB]">Discover</a>
              <a href="/app/bookings" className="text-sm text-gray-600 hover:text-[#1A56DB]">My Bookings</a>
              <button onClick={handleLogout} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200">
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <a href="/app/pt/discover" className="text-sm text-gray-600 hover:text-[#1A56DB]">Discover PTs</a>
              <a href="/login" className="text-sm text-gray-600 hover:text-[#1A56DB]">Sign In</a>
              <a href={`/register?ref_pt=${ptId}`} className="rounded-full bg-[#1A56DB] px-4 py-2 text-sm font-medium text-white hover:bg-[#1E40AF]">
                Registrer deg
              </a>
            </div>
          )}
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-8">
        {/* Welcome banner for referral registrations */}
        {showWelcome && (
          <div className="mb-6 rounded-xl bg-green-50 border border-green-200 p-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎉</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-800">
                  Velkommen! Du er nå klar for å trene med {pt.name}.
                </p>
                <p className="mt-1 text-sm text-green-700">
                  Din premium-prøveperiode er aktivert! Du har full tilgang i 30 dager.
                </p>
                <a
                  href={`/app/booking/create?ptId=${ptId}`}
                  className="mt-3 inline-block rounded-full bg-[#1A56DB] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1E40AF] transition-colors"
                >
                  Book din første time
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Referral CTA for non-logged-in visitors */}
        {!isLoggedIn && !showWelcome && (
          <div className="mb-6 rounded-xl bg-gradient-to-r from-[#1A56DB] to-[#3B82F6] p-5 text-white">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm font-semibold">
                  Likte du {pt.name} sin profil?
                </p>
                <p className="mt-1 text-xs text-blue-100">
                  Registrer deg og få premium tilgang med 30 dagers gratis prøveperiode!
                </p>
              </div>
              <a
                href={`/register?ref_pt=${ptId}`}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#1A56DB] hover:bg-blue-50 transition-colors whitespace-nowrap"
              >
                Registrer deg og tren med {pt.name}
              </a>
            </div>
          </div>
        )}
        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-start gap-5">
            <Avatar src={pt.profile_picture} name={pt.name} size={64} />
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

        {satisfaction && satisfaction.allTimeTotal > 0 && (
          <div className="mb-8 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
              Customer Satisfaction
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-bold ${
                    satisfaction.color === "green" ? "text-green-600" :
                    satisfaction.color === "yellow" ? "text-yellow-600" :
                    "text-red-600"
                  }`}>
                    {satisfaction.satisfactionPct}%
                  </span>
                  <span className="text-sm text-gray-500">fornøyde kunder denne måneden</span>
                </div>
                <div className="mt-2 h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      satisfaction.color === "green" ? "bg-green-500" :
                      satisfaction.color === "yellow" ? "bg-yellow-500" :
                      "bg-red-500"
                    }`}
                    style={{ width: `${satisfaction.satisfactionPct}%` }}
                  />
                </div>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{satisfaction.allTimeTotal}</p>
                <p className="text-xs text-gray-400">total ratings</p>
              </div>
            </div>
            {satisfaction.monthly.total > 0 && (
              <div className="mt-3 flex gap-3 text-xs text-gray-500">
                <span className="text-green-600">👍 {satisfaction.monthly.good} godt</span>
                <span className="text-yellow-600">👌 {satisfaction.monthly.okay} okay</span>
                <span className="text-red-600">👎 {satisfaction.monthly.bad} ikke godt</span>
              </div>
            )}
          </div>
        )}

        {user?.role === "client" && (
          <div className="mb-8 space-y-3">
            <a
              href={`/app/booking/create?ptId=${pt.id}`}
              className="block w-full rounded-xl bg-[#1A56DB] px-6 py-4 text-center text-base font-semibold text-white hover:bg-[#1E40AF] transition-colors shadow-sm"
            >
              Book a Session with {pt.name}
            </a>
            <a
              href={`/app/messages?pt=${pt.id}`}
              className="block w-full rounded-xl border-2 border-[#1A56DB] bg-white px-6 py-4 text-center text-base font-semibold text-[#1A56DB] hover:bg-blue-50 transition-colors"
            >
              💬 Send melding
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

        {(pt.certification_info || pt.certificate_image) && (
          <div className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Certifications</h2>
            {pt.certificate_image && (
              <div className="mb-3">
                <img
                  src={pt.certificate_image}
                  alt="Certificate"
                  className="max-h-40 rounded-lg border border-gray-200 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setCertLightbox(pt.certificate_image)}
                  title="Click to view full-size"
                />
              </div>
            )}
            {pt.certification_info && (
              <p className="text-sm text-gray-700">{pt.certification_info}</p>
            )}
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
      {/* Certificate Lightbox Modal */}
      {certLightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setCertLightbox('')}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setCertLightbox('')}
              className="absolute -top-3 -right-3 rounded-full bg-white p-1.5 text-gray-700 hover:bg-gray-200 shadow-lg transition-colors"
              title="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={certLightbox}
              alt="Certificate full-size"
              className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

      </main>
    </div>
  );
}
