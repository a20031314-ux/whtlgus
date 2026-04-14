import { Locale, copy } from "@/lib/copy";

type LanguageSelectorProps = {
  locale: Locale;
  onChange: (locale: Locale) => void;
};

export function LanguageSelector({ locale, onChange }: LanguageSelectorProps) {
  const labels = copy[locale];

  const options: Array<{ key: Locale; label: string }> = [
    { key: "ko", label: labels.languageKorean },
    { key: "en", label: labels.languageEnglish },
    { key: "es", label: labels.languageSpanish },
  ];

  return (
    <div className="flex flex-wrap gap-1">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          className={`rounded-md px-2 py-1 text-xs transition ${
            locale === option.key
              ? "bg-slate-900 text-white"
              : "bg-slate-200 text-slate-700 hover:bg-slate-300"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
