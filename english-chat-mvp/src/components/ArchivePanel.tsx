import { useState } from "react";
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

type ArchiveTab = "saved" | "sessions";

type ArchivePanelProps = {
  savedItems: SavedItem[];
  conversationSessions: ConversationSession[];
  ui: UICopy;
  onClose: () => void;
  onReuseSavedItem: (text: string) => void;
  onDeleteSavedItem: (id: string) => void;
  onClearSavedItems: () => void;
  onDeleteConversationSession: (id: string) => void;
  onClearConversationSessions: () => void;
};

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString();
}

export function ArchivePanel({
  savedItems,
  conversationSessions,
  ui,
  onClose,
  onReuseSavedItem,
  onDeleteSavedItem,
  onClearSavedItems,
  onDeleteConversationSession,
  onClearConversationSessions,
}: ArchivePanelProps) {
  const [activeTab, setActiveTab] = useState<ArchiveTab>("saved");
  const [openedSessionId, setOpenedSessionId] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/30 sm:items-center sm:justify-center">
      <section className="h-[85vh] w-full overflow-hidden rounded-t-2xl bg-white shadow-xl sm:h-[80vh] sm:max-w-2xl sm:rounded-2xl">
        <header className="border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">{ui.archive}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
            >
              {ui.closeArchive}
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("saved")}
              className={`rounded-md px-3 py-1 text-xs transition ${
                activeTab === "saved"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
            >
              {ui.savedItemsTab}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("sessions")}
              className={`rounded-md px-3 py-1 text-xs transition ${
                activeTab === "sessions"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
            >
              {ui.sessionsTab}
            </button>
          </div>
        </header>

        <div className="h-[calc(100%-98px)] overflow-y-auto p-4">
          {activeTab === "saved" ? (
            savedItems.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                {ui.archiveEmpty}
              </p>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={onClearSavedItems}
                  className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-700 hover:bg-rose-100"
                >
                  {ui.resetArchive}
                </button>
                {savedItems.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
                  >
                    <p className="font-medium text-slate-900" translate="no">
                      {item.title}
                    </p>
                    {item.original && (
                      <p className="mt-1 text-slate-600">{item.original}</p>
                    )}
                    {item.corrected && (
                      <p className="mt-1" translate="no">
                        {ui.corrected}: {item.corrected}
                      </p>
                    )}
                    {item.natural && (
                      <p className="mt-1" translate="no">
                        {ui.natural}: {item.natural}
                      </p>
                    )}
                    {item.explanation && (
                      <p className="mt-1">{ui.explanation}: {item.explanation}</p>
                    )}
                    {item.example && (
                      <p className="mt-1" translate="no">
                        {ui.example}: {item.example}
                      </p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onReuseSavedItem(item.natural || item.corrected || item.title)
                        }
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                      >
                        {ui.reuse}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSavedItem(item.id)}
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                      >
                        {ui.delete}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : conversationSessions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
              {ui.sessionsEmpty}
            </p>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                onClick={onClearConversationSessions}
                className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-700 hover:bg-rose-100"
              >
                {ui.clearSessions}
              </button>
              {conversationSessions.map((session) => {
                const isOpen = openedSessionId === session.id;
                return (
                  <article
                    key={session.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
                  >
                    <p className="font-medium text-slate-900">{session.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(session.createdAt)} · {session.messageCount} {ui.messagesUsed}
                    </p>

                    {isOpen && (
                      <div className="mt-2 space-y-1 rounded-lg bg-white p-2 text-xs text-slate-700">
                        {session.messages.map((message) => (
                          <p key={message.id}>
                            <span className="font-semibold">{message.role}: </span>
                            {message.content}
                          </p>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenedSessionId((previous) =>
                            previous === session.id ? null : session.id,
                          )
                        }
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                      >
                        {ui.openSession}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteConversationSession(session.id)}
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                      >
                        {ui.delete}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
