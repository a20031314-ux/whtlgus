"use client";

type TTSButtonProps = {
  text: string;
  className?: string;
  ariaLabel?: string;
};

export function TTSButton({ text, className, ariaLabel }: TTSButtonProps) {
  const handleSpeak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  return (
    <button
      type="button"
      onClick={handleSpeak}
      aria-label={ariaLabel ?? "Listen"}
      className={`rounded-md border border-slate-300 bg-white px-2 py-1 text-sm transition hover:bg-slate-50 ${className ?? ""}`}
    >
      🔊
    </button>
  );
}
