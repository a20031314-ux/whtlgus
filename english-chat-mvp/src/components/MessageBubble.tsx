import { TTSButton } from "./TTSButton";

type MessageBubbleProps = {
  role: "user" | "assistant";
  message: string;
  translatedMessage?: string;
  isTranslating?: boolean;
  onTranslate?: () => void;
  labels: {
    translate: string;
    translating: string;
    translation: string;
    listen: string;
  };
};

export function MessageBubble({
  role,
  message,
  translatedMessage,
  isTranslating,
  onTranslate,
  labels,
}: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm sm:max-w-[75%] ${
          isUser
            ? "rounded-br-sm bg-slate-900 text-white"
            : "rounded-bl-sm bg-white text-slate-900"
        }`}
      >
        <p className="whitespace-pre-wrap">{message}</p>

        {!isUser && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <TTSButton text={message} ariaLabel={labels.listen} />
            <button
              type="button"
              onClick={onTranslate}
              disabled={isTranslating}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isTranslating ? labels.translating : labels.translate}
            </button>
          </div>
        )}

        {!isUser && translatedMessage && (
          <p className="mt-2 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
            {labels.translation}: {translatedMessage}
          </p>
        )}
      </div>
    </div>
  );
}
