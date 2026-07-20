import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getPTMatches } from "~/lib/booking-actions";
import Avatar from "~/components/Avatar";

interface Match {
  id: number;
  ptUserId: number;
  clientUserId: number;
  clientName: string;
  clientProfilePicture: string;
  clientCountry: string;
  slotId: number;
  status: string;
  chatCreated: boolean;
  createdAt: string;
  slotDatetime: string;
}

export const Route = createFileRoute("/app/pt/matches")({
  component: PTMatchesPage,
});

function PTMatchesPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("flexora_user");
    if (!stored) {
      navigate({ to: "/login" });
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      if (parsed.role !== "pt") {
        navigate({ to: "/app/dashboard" });
        return;
      }
      setUser(parsed);

      getPTMatches()
        .then((data: any) => setMatches(data))
        .catch((err) => console.error("Failed to load matches:", err))
        .finally(() => setLoading(false));
    } catch {
      navigate({ to: "/login" });
    }
  }, []);

  function handleLogout() {
    localStorage.removeItem("flexora_token");
    localStorage.removeItem("flexora_user");
    document.cookie = "flexora_token=; path=/; max-age=0";
    navigate({ to: "/" });
  }

  function formatDate(dateStr: string): string {
    if (!dateStr) return "";
    const d = new Date(dateStr + "Z");
    return d.toLocaleDateString("nb-NO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function formatDateTime(dateStr: string): string {
    if (!dateStr) return "";
    const d = new Date(dateStr + "Z");
    return d.toLocaleDateString("nb-NO", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "matched":
        return (
          <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
            ✅ Matchet
          </span>
        );
      case "client_accepted":
        return (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
            ⏳ Kunden har akseptert — venter på deg
          </span>
        );
      case "pt_accepted":
        return (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
            ⏳ Du har akseptert — venter på kunden
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            ⏳ Venter
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 capitalize">
            {status}
          </span>
        );
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-500">Laster matches...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2">
              <span className="text-lg font-bold text-[#1A56DB]">Flexora</span>
              <span className="text-lg font-light text-gray-400">Fitnes</span>
            </a>
            <span className="hidden sm:inline-block rounded-full bg-purple-100 px-3 py-0.5 text-xs font-medium text-purple-700">
              PT Matcher
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/app/dashboard" className="text-sm text-gray-600 hover:text-[#1A56DB]">
              Dashboard
            </a>
            <a href="/app/messages" className="text-sm text-gray-600 hover:text-[#1A56DB]">
              Meldinger
            </a>
            <a href="/app/pt/discover" className="text-sm text-gray-600 hover:text-[#1A56DB]">
              Speed Date
            </a>
            <button
              onClick={handleLogout}
              className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
            >
              Logg ut
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Mine Matcher</h1>
          <p className="mt-1 text-gray-500">
            Her finner du alle kunder du har matchet med via speed date.
          </p>
        </div>

        {/* Match list */}
        {matches.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-100">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-50">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-purple-400"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700">Ingen matches enda</h3>
            <p className="mt-1 text-sm text-gray-500">
              Delta i speed dates for å matche med kunder.
            </p>
            <a
              href="/app/pt/discover"
              className="mt-6 inline-block rounded-full bg-[#1A56DB] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#1E40AF] transition-colors"
            >
              Gå til Speed Date →
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <div
                key={match.id}
                className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  {/* Client avatar */}
                  <Avatar
                    src={match.clientProfilePicture}
                    name={match.clientName}
                    size={56}
                  />

                  {/* Match info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">
                          {match.clientName}
                        </h3>
                        {match.clientCountry && (
                          <p className="text-xs text-gray-500">
                            {match.clientCountry}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {getStatusBadge(match.status)}
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>
                        Matchet: {formatDate(match.createdAt)}
                      </span>
                      {match.slotDatetime && (
                        <span>
                          Speed date: {formatDateTime(match.slotDatetime)}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {match.chatCreated ? (
                        <a
                          href={`/app/messages?pt=${match.clientUserId}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#1A56DB] px-4 py-2 text-sm font-medium text-white hover:bg-[#1E40AF] transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          Start chat
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-400">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          Chat ikke tilgjengelig enda
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
