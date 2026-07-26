import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "~/lib/i18n";

const STORAGE_KEY = "flexora_exit_popup_shown";

export function ExitIntentPopup() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    // Only trigger when mouse moves towards the top of the page (y < 10)
    if (e.clientY > 10) return;
    // Check sessionStorage — show only once per session
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    sessionStorage.setItem(STORAGE_KEY, "1");
    setVisible(true);
  }, []);

  useEffect(() => {
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [handleMouseLeave]);

  function close() {
    setVisible(false);
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) close();
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Exit offer"
    >
      <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl ring-1 ring-gray-200 animate-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={close}
          className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <h2 className="mb-3 text-center text-xl font-bold text-gray-900">
          {t("exit.title")}
        </h2>
        <p className="mb-6 text-center text-gray-600 leading-relaxed">
          {t("exit.description")}
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <a
            href="/register"
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#1A56DB] to-[#3B82F6] px-6 py-3 text-base font-semibold text-white shadow-lg hover:from-[#1E40AF] hover:to-[#2563EB] transition-all min-h-[44px]"
          >
            {t("exit.claimOffer")}
          </a>
          <button
            onClick={close}
            className="rounded-full px-6 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors min-h-[44px]"
          >
            {t("exit.noThanks")}
          </button>
        </div>
      </div>
    </div>
  );
}
