import { useTranslation, languages } from "~/lib/i18n";

export function FlagSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useTranslation();

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {languages.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          title={l.nativeLabel}
          aria-label={`Switch to ${l.label}`}
          className={`rounded-md px-1.5 py-1 text-lg transition-all ${
            lang === l.code
              ? "scale-110 bg-white/20 ring-2 ring-white/80 shadow-sm"
              : "opacity-60 hover:opacity-100 hover:scale-105"
          }`}
        >
          <span className="block leading-none">{l.flag}</span>
        </button>
      ))}
    </div>
  );
}
