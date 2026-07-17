import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createBooking, getPtDetail } from "~/lib/booking-actions";
import { PT_SESSION_PRICE, PT_SESSION_PAYMENT_LINK, PT_PREPAYMENT_POLICY } from "~/lib/stripe";

export const Route = createFileRoute("/app/booking/create")({
  component: BookingCreatePage,
});

function BookingCreatePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [pt, setPt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [sessionType, setSessionType] = useState<"30min" | "60min">("60min");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [confirmation, setConfirmation] = useState<any>(null);
  const [step, setStep] = useState<"form" | "payment">("form");
  const [pendingBookingId, setPendingBookingId] = useState<number | null>(null);

  // Get ptId from query params
  const ptId = typeof window !== "undefined"
    ? Number(new URLSearchParams(window.location.search).get("ptId"))
    : 0;

  useEffect(() => {
    const stored = localStorage.getItem("flexora_user");
    if (!stored) { navigate({ to: "/login" }); return; }
    try {
      const u = JSON.parse(stored);
      setUser(u);
      if (u.role !== "client") {
        setError("Only clients can book sessions.");
        setLoading(false);
        return;
      }
    } catch { navigate({ to: "/login" }); return; }

    if (!ptId) {
      setError("No PT selected. Please choose a trainer first.");
      setLoading(false);
      return;
    }

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

  // Step 1: Create booking, then move to payment step
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time || !ptId) return;

    setSubmitting(true);
    try {
      const scheduledAt = `${date}T${time}:00`;
      const result = await createBooking({ ptId, scheduledAt, sessionType });
      setPendingBookingId(result.bookingId);
      setConfirmation(result);
      setStep("payment");
    } catch (e: any) {
      setError(e.message || "Booking failed. Please try again.");
    }
    setSubmitting(false);
  }

  // Step 2: Open Stripe payment link
  function handleProceedToPayment() {
    if (!pendingBookingId || !confirmation) return;
    const successUrl = `${window.location.origin}/app/bookings?payment=success&bookingId=${pendingBookingId}`;
    // Open Stripe payment link in a new tab
    window.open(PT_SESSION_PAYMENT_LINK, "_blank", "noopener,noreferrer");
    // Navigate to bookings page so user can see their pending booking
    navigate({ to: "/app/bookings" });
  }

  // Set default date to tomorrow
  useEffect(() => {
    if (!date) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(tomorrow.toISOString().split("T")[0]);
    }
  }, []);

  const hourlyRate = pt?.hourly_rate || PT_SESSION_PRICE;
  const price = sessionType === "30min" ? hourlyRate / 2 : hourlyRate;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
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

      <main className="mx-auto max-w-2xl px-6 py-8">
        <div className="mb-6">
          <a href={ptId ? `/app/pt/${ptId}` : "/app/pt/discover"} className="text-sm font-medium text-[#1A56DB] hover:underline">
            ← Back
          </a>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {step === "payment" && confirmation ? (
          /* ── Payment Step ── */
          <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl">
                💳
              </div>
              <h1 className="text-xl font-bold text-gray-900">Complete Payment</h1>
              <p className="mt-2 text-sm text-gray-500">
                Your booking is reserved — pay to confirm it
              </p>
            </div>

            {/* Booking Summary */}
            <div className="mb-6 rounded-lg bg-gray-50 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">PT</span>
                <span className="font-medium text-gray-900">{pt?.name || "Trainer"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date</span>
                <span className="font-medium text-gray-900">
                  {new Date(confirmation.scheduledAt).toLocaleDateString("en-US", {
                    weekday: "long", year: "numeric", month: "long", day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time</span>
                <span className="font-medium text-gray-900">
                  {new Date(confirmation.scheduledAt).toLocaleTimeString("en-US", {
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration</span>
                <span className="font-medium text-gray-900">
                  {confirmation.sessionType === "30min" ? "30 minutes" : "60 minutes"}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-lg text-[#1A56DB]">{confirmation.price} kr</span>
              </div>
            </div>

            {/* Prepayment Policy */}
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-sm font-semibold text-amber-800">💳 Forskuddsbetaling</h3>
              <p className="mt-1 text-sm text-amber-700">{PT_PREPAYMENT_POLICY}</p>
            </div>

            <button
              onClick={handleProceedToPayment}
              className="w-full rounded-xl bg-[#1A56DB] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#1E40AF] transition-colors"
            >
              Pay {confirmation.price} kr with Stripe →
            </button>

            <p className="mt-3 text-center text-xs text-gray-400">
              You will be redirected to Stripe to complete payment securely.
              After payment you'll be taken to your bookings.
            </p>
          </div>
        ) : error ? (
          <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-100 text-center">
            <p className="text-gray-500">{error}</p>
            <a
              href="/app/pt/discover"
              className="mt-4 inline-block text-sm font-medium text-[#1A56DB] hover:underline"
            >
              ← Browse Trainers
            </a>
          </div>
        ) : (
          <>
            {/* PT Summary */}
            {pt && (
              <div className="mb-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1A56DB]/10 text-lg font-bold text-[#1A56DB]">
                    {pt.name?.charAt(0)?.toUpperCase() || "P"}
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">{pt.name}</h2>
                    <p className="text-sm text-gray-500">
                      {pt.specialties?.slice(0, 2).join(", ") || "Personal Trainer"}
                      {" · "}{pt.hourly_rate || 500} kr/hr
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Booking Form */}
            <form onSubmit={handleSubmit} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <h1 className="text-lg font-bold text-gray-900 mb-6">Book a Session</h1>

              {/* Session Type */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">Session Duration</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSessionType("30min")}
                    className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                      sessionType === "30min"
                        ? "border-[#1A56DB] bg-blue-50 text-[#1A56DB]"
                        : "border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    30 Minutes
                    <span className="block text-xs font-normal text-gray-500 mt-0.5">
                      {hourlyRate / 2} kr
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionType("60min")}
                    className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                      sessionType === "60min"
                        ? "border-[#1A56DB] bg-blue-50 text-[#1A56DB]"
                        : "border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    60 Minutes
                    <span className="block text-xs font-normal text-gray-500 mt-0.5">
                      {hourlyRate} kr
                    </span>
                  </button>
                </div>
              </div>

              {/* Date */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
                />
              </div>

              {/* Time */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB]"
                />
              </div>

              {/* Price Summary */}
              <div className="mb-6 rounded-lg bg-gray-50 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Session Price</span>
                  <span className="font-semibold text-gray-900">{price} kr</span>
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  Payment required to confirm booking
                </div>
              </div>

              {/* Prepayment & Cancellation Policy */}
              <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <h3 className="text-sm font-semibold text-amber-800">💳 Forskuddsbetaling og Avbud</h3>
                <p className="mt-1 text-sm text-amber-700">{PT_PREPAYMENT_POLICY}</p>
                <ul className="mt-2 space-y-1 text-xs text-amber-700">
                  <li>• Betaling skjer via Stripe — du videresendes til sikker betaling</li>
                  <li>• Avbud mer enn 2 timer før: 50% refusjon (250 kr)</li>
                  <li>• Avbud mindre enn 2 timer før: ingen refusjon</li>
                  <li>• Hvis PT avlyser: full refusjon</li>
                </ul>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !date || !time}
                className="w-full rounded-xl bg-[#1A56DB] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#1E40AF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Creating booking..." : `Proceed to Payment — ${price} kr`}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
