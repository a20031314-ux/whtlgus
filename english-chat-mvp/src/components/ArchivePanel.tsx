import { UICopy } from "@/lib/copy";

export type SavedItem = {
  id: string;
  type: "correction" | "expression";
  title: string;
  original?: string;
  corrected?: string;
  natural?: string;
  explanation?: string;
  example?: string;
  createdAt: number;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "helper";
  content: string;
  createdAt: number;
};

export type ConversationSession = {
  id: string;
  title: string;
  createdAt: number;
  endedAt?: number;
  messageCount: number;
  messages: ChatMessage[];
};

type ArchivePanelProps = {
  isOpen: boolean;
  savedItems: SavedItem[];
  conversationSessions: ConversationSession[];
  ui: UICopy;
  onClose: () => void;
  onReuseSavedItem: (text: string) => void;
  onDeleteSavedItem: (id: string) => void;
  onClearSavedItems: () => void;
  onDeleteConversationSession: (id: string) => void;
  onClearConversationSessions: () => void;
  onOpenConversationSession: (session: ConversationSession) => void;
};

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString();
}

export function ArchivePanel({
  isOpen,
  savedItems,
  conversationSessions,
  ui,
  onClose,
  onReuseSavedItem,
  onDeleteSavedItem,
  onClearSavedItems,
  onDeleteConversationSession,
  onClearConversationSessions,
  onOpenConversationSession,
}: ArchivePanelProps) {
  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-200 ${
        isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <button
        type="button"
        aria-label="Close sidebar backdrop"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />
      <aside
        className={`absolute left-0 top-0 h-full w-[88%] max-w-sm overflow-y-auto border-r border-slate-200 bg-white p-4 shadow-xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{ui.archive}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
          >
            {ui.closeArchive}
          </button>
        </header>

        <section className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">{ui.savedItemsTab}</h3>
            {savedItems.length > 0 && (
              <button
                type="button"
                onClick={onClearSavedItems}
                className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700 hover:bg-rose-100"
              >
                {ui.resetArchive}
              </button>
            )}
          </div>
          {savedItems.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-600">
              {ui.archiveEmpty}
            </p>
          ) : (
            <div className="space-y-2">
              {savedItems.map((item) => (
                <article
                  key={item.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs"
                >
                  <p className="font-medium text-slate-900" translate="no">
                    {item.title}
                  </p>
                  {item.explanation && (
                    <p className="mt-1 text-slate-700">{item.explanation}</p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onReuseSavedItem(item.natural || item.corrected || item.title)
                      }
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                    >
                      {ui.reuse}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSavedItem(item.id)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                    >
                      {ui.delete}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">{ui.sessionsTab}</h3>
            {conversationSessions.length > 0 && (
              <button
                type="button"
                onClick={onClearConversationSessions}
                className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700 hover:bg-rose-100"
              >
                {ui.clearSessions}
              </button>
            )}
          </div>
          {conversationSessions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-600">
              {ui.sessionsEmpty}
            </p>
          ) : (
            <div className="space-y-2">
              {conversationSessions.map((session) => (
                <article
                  key={session.id}
                  className="rounded-lg border border-slate-200 bg-white p-3 text-xs"
                >
                  <p className="font-medium text-slate-900">{session.title}</p>
                  <p className="mt-1 text-slate-500">
                    {formatDate(session.createdAt)} · {session.messageCount} {ui.messagesUsed}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenConversationSession(session)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                    >
                      {ui.openSession}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteConversationSession(session.id)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                    >
                      {ui.delete}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
