import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getMyBookings, cancelBooking, cancelBookingClient, markNoShow, getRefundInfo } from "~/lib/booking-actions";
import { ratePtSession, hasUserRatedBooking } from "~/lib/pt-ratings-actions";
import { PT_PREPAYMENT_POLICY, PT_REFUND_HOURS_THRESHOLD, PT_SESSION_PRICE } from "~/lib/stripe";

export const Route = createFileRoute("/app/bookings/")({
  component: MyBookingsPage,
});

function RatingWidget({ bookingId, ptUserId, ptName, onRated }: {
  bookingId: number;
  ptUserId: number;
  ptName: string;
  onRated: () => void;
}) {
  const [rating, setRating] = useState<"good" | "okay" | "bad" | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingRating, setExistingRating] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    hasUserRatedBooking({ bookingId, ptUserId }).then((r: any) => {
      if (r.rated) {
        setExistingRating(r.rating);
        setSubmitted(true);
      }
      setChecked(true);
    }).catch(() => setChecked(true));
  }, []);

  async function handleSubmit() {
    if (!rating) return;
    setSubmitting(true);
    try {
      await ratePtSession({ ptUserId, sessionId: bookingId, rating, comment });
      setSubmitted(true);
      onRated();
    } catch (e: any) {
      setSubmitted(true);
    }
    setSubmitting(false);
  }

  if (!checked) return null;
  if (submitted || existingRating) {
    const displayRating = existingRating || rating;
    const labels: Record<string, string> = { good: "Godt", okay: "Nokså godt", bad: "Ikke godt" };
    const colors: Record<string, string> = { good: "text-green-600", okay: "text-yellow-600", bad: "text-red-600" };
    return (
      <div className="mt-3 rounded-lg bg-gray-50 px-4 py-2.5">
        <p className="text-xs text-gray-500">Your rating: <span className={`font-semibold ${colors[displayRating || "good"]}`}>{labels[displayRating || "good"]}</span></p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="mb-2 text-xs font-medium text-amber-800">Rate {ptName}:</p>
      <div className="flex gap-2 mb-2">
        {(["good", "okay", "bad"] as const).map((r) => {
          const labels: Record<string, string> = { good: "Godt", okay: "Nokså godt", bad: "Ikke godt" };
          const activeColors: Record<string, string> = { good: "bg-green-500 text-white border-green-500", okay: "bg-yellow-500 text-white border-yellow-500", bad: "bg-red-500 text-white border-red-500" };
          return (
            <button
              key={r}
              onClick={() => setRating(r)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                rating === r
                  ? activeColors[r]
                  : "border-gray-300 text-gray-600 hover:border-gray-400"
              }`}
            >
              {labels[r]}
            </button>
          );
        })}
      </div>
      {rating && (
        <>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional comment..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-400 mb-2"
            rows={2}
          />
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Submitting..." : "Submit Rating"}
          </button>
        </>
      )}
    </div>
  );
}

// Calculate refund info client-side for display
function getRefundDisplay(booking: any) {
  const now = new Date();
  const scheduledTime = new Date(booking.scheduled_at + "Z");
  const hoursUntilSession = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  const price = booking.price || PT_SESSION_PRICE;

  if (hoursUntilSession > PT_REFUND_HOURS_THRESHOLD) {
    return {
      message: `Du får 50% refusjon (${Math.round(price / 2)} kr)`,
      color: "text-amber-700 bg-amber-50 border-amber-200",
    };
  }
  return {
    message: "Ingen refusjon ved avbud mindre enn 2 timer før",
    color: "text-red-700 bg-red-50 border-red-200",
  };
}

// Check if booking is within video session window (30 min before to 2 hours after)
function isWithinVideoWindow(scheduledAt: string): boolean {
  const now = new Date();
  const scheduled = new Date(scheduledAt + "Z");
  const windowStart = new Date(scheduled.getTime() - 30 * 60 * 1000);
  const windowEnd = new Date(scheduled.getTime() + 2 * 60 * 60 * 1000);
  return now >= windowStart && now <= windowEnd;
}

function PaymentStatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    unpaid: "Unpaid",
    paid: "Paid",
    refunded_50: "50% Refunded",
    refunded_full: "No Refund",
  };
  const colors: Record<string, string> = {
    unpaid: "bg-yellow-100 text-yellow-700",
    paid: "bg-green-100 text-green-700",
    refunded_50: "bg-amber-100 text-amber-700",
    refunded_full: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-600"}`}>
      {labels[status] || status}
    </span>
  );
}

function MyBookingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");
  const [actionType, setActionType] = useState<"info" | "success" | "error">("info");
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");
  const [showCancelConfirm, setShowCancelConfirm] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("flexora_user");
    if (!stored) { navigate({ to: "/login" }); return; }
    try { setUser(JSON.parse(stored)); } catch { navigate({ to: "/login" }); return; }

    loadBookings();

    // Check for payment success param
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("payment") === "success") {
        setActionMsg("Payment successful! Your booking is confirmed.");
        setActionType("success");
      } else if (params.get("payment") === "cancelled") {
        setActionMsg("Payment was cancelled. Your booking is not confirmed.");
        setActionType("error");
      }
    }
  }, []);

  async function loadBookings() {
    setLoading(true);
    try {
      const result = await getMyBookings();
      setData(result);
    } catch (e: any) {
      console.error(e);
    }
    setLoading(false);
  }

  async function handleCancel(bookingId: number) {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await cancelBooking({ bookingId });
      setActionMsg("Booking cancelled.");
      setActionType("info");
      loadBookings();
    } catch (e: any) {
      setActionMsg(e.message || "Failed to cancel.");
      setActionType("error");
    }
  }

  async function handleClientCancel(bookingId: number) {
    try {
      const result = await cancelBookingClient({ bookingId });
      setActionMsg(result.refundMessage || "Booking cancelled.");
      setActionType("success");
      setShowCancelConfirm(null);
      loadBookings();
    } catch (e: any) {
      setActionMsg(e.message || "Failed to cancel.");
      setActionType("error");
      setShowCancelConfirm(null);
    }
  }

  async function handleNoShow(bookingId: number) {
    if (!confirm("Møtte ikke — ingen refusjon til kunde. Bekreft?")) return;
    try {
      await markNoShow({ bookingId });
      setActionMsg("Marked as no-show — ingen refusjon til kunde.");
      setActionType("info");
      loadBookings();
    } catch (e: any) {
      setActionMsg(e.message || "Failed to mark no-show.");
      setActionType("error");
    }
  }

  function handleLogout() {
    localStorage.removeItem("flexora_token");
    localStorage.removeItem("flexora_user");
    document.cookie = "flexora_token=; path=/; max-age=0";
    navigate({ to: "/" });
  }

  const isPt = user?.role === "pt";

  function statusBadge(status: string) {
    const colors: Record<string, string> = {
      confirmed: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700",
      pending: "bg-yellow-100 text-yellow-700",
    };
    return (
      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${colors[status] || "bg-gray-100 text-gray-600"}`}>
        {status}
      </span>
    );
  }

  const now = new Date();
  let bookings = data?.bookings || [];

  // Apply filter
  if (filter === "upcoming") {
    bookings = bookings.filter((b: any) => new Date(b.scheduled_at) >= now && b.status !== "cancelled");
  } else if (filter === "past") {
    bookings = bookings.filter((b: any) => new Date(b.scheduled_at) < now || b.status === "completed" || b.status === "cancelled");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading bookings...</div>
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
            <button onClick={handleLogout} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-500">
            {isPt ? "Manage your client sessions" : "Track your training sessions"}
          </p>
        </div>

        {actionMsg && (
          <div className={`mb-6 rounded-lg p-3 text-sm ${
            actionType === "success" ? "bg-green-50 text-green-700" :
            actionType === "error" ? "bg-red-50 text-red-700" :
            "bg-blue-50 text-blue-700"
          }`}>{actionMsg}</div>
        )}

        {/* Prepayment policy banner for clients */}
        {!isPt && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">💳 Forskuddsbetaling og Avbud</p>
            <p className="mt-1 text-xs text-amber-700">{PT_PREPAYMENT_POLICY}</p>
          </div>
        )}

        {/* PT Earnings Summary */}
        {isPt && data?.earnings && (
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 text-center">
              <p className="text-xs font-medium uppercase text-gray-400">Total Sessions</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{data.earnings.total_sessions}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 text-center">
              <p className="text-xs font-medium uppercase text-gray-400">Total Earned</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{data.earnings.total_earnings} kr</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 text-center">
              <p className="text-xs font-medium uppercase text-gray-400">Upcoming</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{data.earnings.upcoming_earnings} kr</p>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="mb-6 flex gap-2">
          {(["all", "upcoming", "past"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-[#1A56DB] text-white"
                  : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Bookings list */}
        {bookings.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-100">
            <p className="text-gray-500">No bookings found.</p>
            {!isPt && (
              <a
                href="/app/pt/discover"
                className="mt-4 inline-block rounded-lg bg-[#1A56DB] px-5 py-2 text-sm font-medium text-white hover:bg-[#1E40AF]"
              >
                Find a Trainer
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b: any) => {
              const refund = !isPt && b.status === "confirmed" ? getRefundDisplay(b) : null;
              return (
                <div key={b.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {isPt ? b.client_name : b.pt_name}
                        </h3>
                        {statusBadge(b.status)}
                        {b.payment_status && b.payment_status !== "unpaid" && (
                          <PaymentStatusBadge status={b.payment_status} />
                        )}
                      </div>

                      <div className="grid gap-1 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">📅</span>
                          {new Date(b.scheduled_at).toLocaleDateString("en-US", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                          {" at "}
                          {new Date(b.scheduled_at).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div>
                          <span className="text-gray-400">⏱</span>{" "}
                          {b.session_type === "30min" ? "30 min" : "60 min"}
                          {" · "}
                          {b.price} kr
                        </div>
                        {!isPt && b.pt_country && (
                          <div>
                            <span className="text-gray-400">📍</span> {b.pt_country}
                          </div>
                        )}
                      </div>

                      {b.cancellation_status !== "none" && (
                        <div className="mt-2">
                          <span className="inline-block rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                            {b.cancellation_status === "pt_cancelled"
                              ? "Cancelled by PT"
                              : b.cancellation_status === "client_no_show"
                              ? "Client No-Show — ingen refusjon"
                              : "Cancelled by client"}
                          </span>
                        </div>
                      )}

                      {/* Refund info for confirmed bookings (client view) */}
                      {refund && (
                        <div className={`mt-2 rounded-lg border px-3 py-1.5 text-xs font-medium ${refund.color}`}>
                          {refund.message}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="ml-4 flex flex-col gap-2">
                      {/* PT actions */}
                      {isPt && b.status === "confirmed" && (
                        <>
                          {isWithinVideoWindow(b.scheduled_at) && (
                            <a
                              href={`/app/video?bookingId=${b.id}`}
                              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors text-center"
                            >
                              🎥 Start Video
                            </a>
                          )}
                          <button
                            onClick={() => handleCancel(b.id)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleNoShow(b.id)}
                            className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 transition-colors"
                          >
                            Møtte ikke
                          </button>
                        </>
                      )}

                      {/* Client actions */}
                      {!isPt && b.status === "confirmed" && (
                        <>
                          {isWithinVideoWindow(b.scheduled_at) && (
                            <a
                              href={`/app/video?bookingId=${b.id}`}
                              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors text-center"
                            >
                              🎥 Start Video
                            </a>
                          )}
                          {showCancelConfirm === b.id ? (
                            <div className="space-y-2">
                              {(() => {
                                const r = getRefundDisplay(b);
                                return (
                                  <p className={`rounded-lg border px-2 py-1 text-xs font-medium ${r.color}`}>
                                    {r.message}
                                  </p>
                                );
                              })()}
                              <button
                                onClick={() => handleClientCancel(b.id)}
                                className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 transition-colors w-full"
                              >
                                Bekreft avbud
                              </button>
                              <button
                                onClick={() => setShowCancelConfirm(null)}
                                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors w-full"
                              >
                                Avbryt
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowCancelConfirm(b.id)}
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                            >
                              Avbestill
                            </button>
                          )}
                        </>
                      )}

                      {!isPt && b.status === "confirmed" && b.pt_id && (
                        <a
                          href={`/app/pt/${b.pt_id}`}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors text-center"
                        >
                          View PT
                        </a>
                      )}
                      {!isPt && b.status === "completed" && b.pt_id && (
                        <RatingWidget
                          bookingId={b.id}
                          ptUserId={b.pt_id}
                          ptName={b.pt_name}
                          onRated={() => loadBookings()}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom nav for client */}
        {!isPt && (
          <div className="mt-8 text-center">
            <a
              href="/app/pt/discover"
              className="inline-block rounded-lg bg-[#1A56DB] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#1E40AF] transition-colors"
            >
              Book Another Session
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
