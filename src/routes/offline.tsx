import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/offline")({
  component: OfflinePage,
});

function OfflinePage() {
  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        {/* Logo */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-600 text-white text-5xl font-bold shadow-lg shadow-emerald-200">
          K
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          You're offline
        </h1>
        <p className="mt-3 text-base text-gray-500 max-w-sm mx-auto">
          It looks like your internet connection has been lost. Please check your
          connection and try again.
        </p>

        {/* Retry button */}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-base font-semibold text-white shadow-md shadow-emerald-200 hover:bg-emerald-700 transition-all duration-200 active:scale-95"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Retry
        </button>

        {/* Helpful tip */}
        <p className="mt-6 text-sm text-gray-400">
          Kitozon will automatically reload once your connection is restored.
        </p>
      </div>
    </main>
  );
}
