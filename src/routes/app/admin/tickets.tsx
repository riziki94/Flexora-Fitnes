import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  getSupportTickets,
  closeSupportTicket,
} from "~/lib/support-actions";
import { checkAdminAccess } from "~/lib/analytics-actions";

interface Ticket {
  id: number;
  subject: string;
  message: string;
  status: string;
  userName: string;
  userEmail: string;
  createdAt: string;
}

interface CommonIssue {
  subject: string;
  count: number;
}

export const Route = createFileRoute("/app/admin/tickets")({
  component: AdminTicketsPage,
});

function AdminTicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [counts, setCounts] = useState({ open: 0, closed: 0 });
  const [commonIssues, setCommonIssues] = useState<CommonIssue[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");

  useEffect(() => {
    checkAdminAccess()
      .then(() => {
        setIsAdmin(true);
        loadTickets();
      })
      .catch(() => {
        setIsAdmin(false);
        setLoading(false);
      });
  }, []);

  function loadTickets() {
    setLoading(true);
    getSupportTickets()
      .then((result: any) => {
        if (result.admin) {
          setTickets(result.tickets);
          setCounts(result.counts);
          setCommonIssues(result.commonIssues || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  function handleCloseTicket(ticketId: number) {
    if (!confirm("Lukke denne supportforespørselen?")) return;
    closeSupportTicket({ data: { ticketId } })
      .then((result: any) => {
        if (result.success) loadTickets();
      })
      .catch(console.error);
  }

  const filteredTickets = filter === "all"
    ? tickets
    : tickets.filter((t) => t.status === filter);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 animate-bounce rounded-full bg-[#1A56DB]" style={{ animationDelay: "0ms" }} />
            <span className="h-3 w-3 animate-bounce rounded-full bg-[#1A56DB]" style={{ animationDelay: "150ms" }} />
            <span className="h-3 w-3 animate-bounce rounded-full bg-[#1A56DB]" style={{ animationDelay: "300ms" }} />
          </div>
          <p className="text-sm text-gray-500">Laster...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700">Ingen tilgang</p>
          <p className="text-sm text-gray-500 mt-1">Krever administrator-rettigheter</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2">
              <span className="text-lg font-bold text-[#1A56DB]">Flexora</span>
              <span className="text-lg font-light text-gray-400">Fitnes</span>
            </a>
            <span className="rounded-full bg-orange-100 px-3 py-0.5 text-xs font-medium text-orange-700">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/app/admin/analytics" className="text-sm text-gray-500 hover:text-gray-700">Analytics</a>
            <a href="/app/dashboard" className="text-sm text-gray-500 hover:text-gray-700">Dashboard</a>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
          <p className="mt-1 text-sm text-gray-500">Administrer kundeservice-forespørsler</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Åpne tickets</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold text-gray-900">{counts.open}</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Lukkede tickets</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold text-gray-900">{counts.closed}</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Totalt</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold text-gray-900">{counts.open + counts.closed}</p>
          </div>
        </div>

        {/* Common Issues */}
        {commonIssues.length > 0 && (
          <div className="mb-8 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Vanlige problemer (åpne tickets)</h3>
            <div className="flex flex-wrap gap-2">
              {commonIssues.map((issue, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-sm text-orange-700"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-200 text-xs font-bold text-orange-700">
                    {issue.count}
                  </span>
                  {issue.subject}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-2 mb-6">
          {(["all", "open", "closed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-[#1A56DB] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 ring-1 ring-gray-200"
              }`}
            >
              {f === "all" ? "Alle" : f === "open" ? "Åpne" : "Lukkede"}
            </button>
          ))}
        </div>

        {/* Ticket List */}
        {filteredTickets.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
            <p className="text-sm text-gray-500">Ingen tickets å vise</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                className={`rounded-xl bg-white p-5 shadow-sm ring-1 ${
                  ticket.status === "open" ? "ring-orange-200" : "ring-gray-200"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900">{ticket.subject}</h3>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          ticket.status === "open"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {ticket.status === "open" ? "Åpen" : "Lukket"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 whitespace-pre-wrap">{ticket.message}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>
                        <strong>{ticket.userName}</strong> ({ticket.userEmail})
                      </span>
                      <span>•</span>
                      <span>{new Date(ticket.createdAt).toLocaleString("no-NO")}</span>
                    </div>
                  </div>
                  {ticket.status === "open" && (
                    <button
                      onClick={() => handleCloseTicket(ticket.id)}
                      className="flex-shrink-0 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 transition-colors"
                    >
                      Lukk
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Refresh button */}
        <div className="mt-6 text-center">
          <button
            onClick={loadTickets}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 transition-colors"
          >
            Oppdater
          </button>
        </div>
      </div>
    </div>
  );
}
