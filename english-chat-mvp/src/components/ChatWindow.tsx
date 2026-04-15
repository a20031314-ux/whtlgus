"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArchivePanel,
  ChatMessage,
  ConversationSession,
  SavedItem,
} from "./ArchivePanel";
import { copy, Locale } from "@/lib/copy";
import { CorrectionCard } from "./CorrectionCard";
import { HowToSayCard } from "./HowToSayCard";
import { LanguageSelector } from "./LanguageSelector";
import { MessageBubble } from "./MessageBubble";
import { SaveButton } from "./SaveButton";

type CorrectionResult = {
  highlighted: string;
  corrected: string;
  natural: string;
  explanation: string;
  hasError: boolean;
};

type ExpressionResult = {
  expression: string;
  explanation: string;
  example: string;
};

type InputMode = "chat" | "how_to_say";

type ChatTurn = {
  id: string;
  mode: InputMode;
  userMessage: string;
  assistantMessage?: string;
  correctionResult?: CorrectionResult;
  expressionResult?: ExpressionResult;
  translatedMessage?: string;
  isTranslating?: boolean;
};

type ChatModeApiResponse = {
  assistantMessage: string;
  correction: {
    highlighted: string;
    corrected: string;
    natural: string;
    explanation: string;
  };
};

type ExpressionApiResponse = {
  expression: string;
  explanation: string;
  example: string;
};

const SESSION_MESSAGE_LIMIT = 15;
const SAVED_ITEMS_KEY = "savedItems";
const CONVERSATION_SESSIONS_KEY = "conversationSessions";

function normalizeCorrectionResult(
  originalMessage: string,
  correction: ChatModeApiResponse["correction"],
): CorrectionResult {
  const corrected = correction.corrected?.trim() || originalMessage;
  const highlighted = correction.highlighted?.trim() || originalMessage;
  const natural = correction.natural?.trim() || corrected;
  const explanation =
    correction.explanation?.trim() || "일시적인 오류입니다. 다시 시도해주세요.";

  const hasBracketError =
    highlighted.includes("[") && (highlighted.includes("->") || highlighted.includes("→"));
  const correctedChanged =
    corrected.replace(/\s+/g, " ").trim() !==
    originalMessage.replace(/\s+/g, " ").trim();
  const hasError = hasBracketError || correctedChanged;

  return {
    corrected,
    highlighted,
    natural,
    explanation,
    hasError,
  };
}

function makeSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadSavedItems(): SavedItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SAVED_ITEMS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as SavedItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSavedItem(item: SavedItem) {
  if (typeof window === "undefined") {
    return;
  }

  const current = loadSavedItems();
  if (current.some((saved) => saved.id === item.id)) {
    return;
  }
  window.localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify([item, ...current]));
}

function deleteSavedItem(id: string) {
  if (typeof window === "undefined") {
    return;
  }
  const next = loadSavedItems().filter((item) => item.id !== id);
  window.localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(next));
}

function clearSavedItems() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify([]));
}

function loadConversationSessions(): ConversationSession[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CONVERSATION_SESSIONS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as ConversationSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveConversationSession(session: ConversationSession) {
  if (typeof window === "undefined") {
    return;
  }

  const current = loadConversationSessions();
  const withoutCurrent = current.filter((item) => item.id !== session.id);
  window.localStorage.setItem(
    CONVERSATION_SESSIONS_KEY,
    JSON.stringify([session, ...withoutCurrent]),
  );
}

function deleteConversationSession(id: string) {
  if (typeof window === "undefined") {
    return;
  }
  const next = loadConversationSessions().filter((session) => session.id !== id);
  window.localStorage.setItem(CONVERSATION_SESSIONS_KEY, JSON.stringify(next));
}

function clearConversationSessions() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(CONVERSATION_SESSIONS_KEY, JSON.stringify([]));
}

function toSessionMessages(turns: ChatTurn[]): ChatMessage[] {
  return turns.flatMap((turn) => {
    const userMessage: ChatMessage = {
      id: `${turn.id}-user`,
      role: "user",
      content: turn.userMessage,
      createdAt: Date.now(),
    };

    if (turn.mode === "chat") {
      const assistantPayload = {
        assistantMessage: turn.assistantMessage || "",
        correctionResult: turn.correctionResult || null,
      };
      return [
        userMessage,
        {
          id: `${turn.id}-assistant`,
          role: "assistant",
          content: JSON.stringify(assistantPayload),
          createdAt: Date.now(),
        },
      ];
    }

    if (turn.expressionResult) {
      return [
        userMessage,
        {
          id: `${turn.id}-helper`,
          role: "helper",
          content: JSON.stringify({ expressionResult: turn.expressionResult }),
          createdAt: Date.now(),
        },
      ];
    }

    return [userMessage];
  });
}

function fromSessionMessages(messages: ChatMessage[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  let pendingUser: ChatMessage | null = null;

  for (const message of messages) {
    if (message.role === "user") {
      pendingUser = message;
      continue;
    }

    if (!pendingUser) {
      continue;
    }

    if (message.role === "assistant") {
      let assistantMessage = "";
      let correctionResult: CorrectionResult | undefined;
      try {
        const parsed = JSON.parse(message.content) as {
          assistantMessage?: string;
          correctionResult?: CorrectionResult;
        };
        assistantMessage = parsed.assistantMessage || "";
        correctionResult = parsed.correctionResult;
      } catch {
        assistantMessage = message.content;
      }

      turns.push({
        id: pendingUser.id.replace("-user", ""),
        mode: "chat",
        userMessage: pendingUser.content,
        assistantMessage,
        correctionResult,
      });
      pendingUser = null;
      continue;
    }

    if (message.role === "helper") {
      let expressionResult: ExpressionResult = {
        expression: pendingUser.content,
        explanation: "",
        example: "",
      };
      try {
        const parsed = JSON.parse(message.content) as {
          expressionResult?: ExpressionResult;
        };
        if (parsed.expressionResult) {
          expressionResult = parsed.expressionResult;
        }
      } catch {
        expressionResult = {
          expression: message.content,
          explanation: "",
          example: "",
        };
      }

      turns.push({
        id: pendingUser.id.replace("-user", ""),
        mode: "how_to_say",
        userMessage: pendingUser.content,
        expressionResult,
      });
      pendingUser = null;
    }
  }

  return turns;
}

function buildCorrectionSavedItem(turn: ChatTurn): SavedItem | null {
  if (!turn.correctionResult) {
    return null;
  }

  return {
    id: `correction-${turn.id}`,
    type: "correction",
    title: turn.correctionResult.corrected,
    original: turn.userMessage,
    corrected: turn.correctionResult.corrected,
    natural: turn.correctionResult.natural,
    explanation: turn.correctionResult.explanation,
    createdAt: Date.now(),
  };
}

function buildExpressionSavedItem(turn: ChatTurn): SavedItem | null {
  if (!turn.expressionResult) {
    return null;
  }

  return {
    id: `expression-${turn.id}`,
    type: "expression",
    title: turn.expressionResult.expression,
    original: turn.userMessage,
    corrected: turn.expressionResult.expression,
    explanation: turn.expressionResult.explanation,
    example: turn.expressionResult.example,
    createdAt: Date.now(),
  };
}

export function ChatWindow() {
  const [locale, setLocale] = useState<Locale>("ko");
  const ui = copy[locale];
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [mode, setMode] = useState<InputMode>("chat");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [conversationSessions, setConversationSessions] = useState<ConversationSession[]>(
    [],
  );
  const [currentSessionId, setCurrentSessionId] = useState<string>(makeSessionId());
  const [currentSessionCreatedAt, setCurrentSessionCreatedAt] = useState<number>(
    Date.now(),
  );
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);

  const remainingMessages = useMemo(
    () => SESSION_MESSAGE_LIMIT - turns.length,
    [turns.length],
  );
  const isSessionLimitReached = remainingMessages <= 0;
  const isInputDisabled = isSessionLimitReached;

  useEffect(() => {
    setSavedItems(loadSavedItems());
    setConversationSessions(loadConversationSessions());
  }, []);

  useEffect(() => {
    if (!currentSessionId) {
      return;
    }
    if (turns.length === 0) {
      return;
    }

    const firstMessage = turns[0]?.userMessage || "Conversation Session";
    const session: ConversationSession = {
      id: currentSessionId,
      title:
        firstMessage.length > 28 ? `${firstMessage.slice(0, 28)}...` : firstMessage,
      createdAt: currentSessionCreatedAt,
      endedAt: sessionEnded ? Date.now() : undefined,
      messageCount: turns.length,
      messages: toSessionMessages(turns),
    };

    saveConversationSession(session);
    setConversationSessions(loadConversationSessions());
  }, [turns, currentSessionId, currentSessionCreatedAt, sessionEnded]);

  useEffect(() => {
    if (isSessionLimitReached && !sessionEnded) {
      setSessionEnded(true);
    }
  }, [isSessionLimitReached, sessionEnded]);

  const sendChatMessage = async (message: string) => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, mode: "chat" }),
    });

    if (!response.ok) {
      throw new Error("Failed to get chat response.");
    }

    const data = (await response.json()) as ChatModeApiResponse;
    const correctionResult = normalizeCorrectionResult(message, data.correction);

    setTurns((previous) => [
      ...previous,
      {
        id: `${Date.now()}`,
        mode: "chat",
        userMessage: message,
        assistantMessage:
          data.assistantMessage?.trim() || "Got it. Tell me one more sentence.",
        correctionResult,
      },
    ]);
  };

  const fetchExpressionResult = async (message: string) => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, mode: "how_to_say" }),
    });

    if (!response.ok) {
      throw new Error("Failed to get expression response.");
    }

    const data = (await response.json()) as ExpressionApiResponse;

    setTurns((previous) => [
      ...previous,
      {
        id: `${Date.now()}`,
        mode: "how_to_say",
        userMessage: message,
        expressionResult: {
          expression: data.expression?.trim() || message,
          explanation:
            data.explanation?.trim() || "일시적인 오류입니다. 다시 시도해주세요.",
          example: data.example?.trim() || "Please try again later.",
        },
      },
    ]);
  };

  const saveItemFromTurn = (item: SavedItem | null) => {
    if (!item) {
      return;
    }
    saveSavedItem(item);
    setSavedItems(loadSavedItems());
  };

  const startNewChat = () => {
    setTurns([]);
    setInput("");
    setMode("chat");
    setSessionEnded(false);
    setCurrentSessionId(makeSessionId());
    setCurrentSessionCreatedAt(Date.now());
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const endCurrentSession = () => {
    if (turns.length === 0) {
      startNewChat();
      return;
    }

    setSessionEnded(true);
    startNewChat();
  };

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending || isInputDisabled) {
      return;
    }

    setIsSending(true);
    try {
      if (mode === "how_to_say") {
        await fetchExpressionResult(trimmed);
      } else {
        await sendChatMessage(trimmed);
      }
      setInput("");
    } catch {
      setTurns((previous) => [
        ...previous,
        {
          id: `${Date.now()}`,
          mode,
          userMessage: trimmed,
          ...(mode === "how_to_say"
            ? {
                expressionResult: {
                  expression: trimmed,
                  explanation: "일시적인 오류입니다. 잠시 후 다시 시도해 주세요.",
                  example: "Please try again later.",
                },
              }
            : {
                assistantMessage: "지금 처리에 문제가 있었어요.",
                correctionResult: {
                  highlighted: trimmed,
                  corrected: trimmed,
                  natural: trimmed,
                  explanation: "일시적인 오류입니다. 잠시 후 다시 시도해 주세요.",
                  hasError: true,
                },
              }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleUseExpressionAsMessage = async (text: string) => {
    const message = text.trim();
    if (!message || isSending || isInputDisabled) {
      return;
    }

    setMode("chat");
    setIsSending(true);
    try {
      await sendChatMessage(message);
    } catch {
      setTurns((previous) => [
        ...previous,
        {
          id: `${Date.now()}`,
          mode: "chat",
          userMessage: message,
          assistantMessage: "지금 처리에 문제가 있었어요.",
          correctionResult: {
            highlighted: message,
            corrected: message,
            natural: message,
            explanation: "일시적인 오류입니다. 잠시 후 다시 시도해 주세요.",
            hasError: true,
          },
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleTranslate = async (turnId: string, text: string) => {
    setTurns((previous) =>
      previous.map((turn) =>
        turn.id === turnId ? { ...turn, isTranslating: true } : turn,
      ),
    );

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("Failed to translate.");
      }

      const data = (await response.json()) as { translated: string };

      setTurns((previous) =>
        previous.map((turn) =>
          turn.id === turnId
            ? {
                ...turn,
                translatedMessage: data.translated,
                isTranslating: false,
              }
            : turn,
        ),
      );
    } catch {
      setTurns((previous) =>
        previous.map((turn) =>
          turn.id === turnId
            ? {
                ...turn,
                translatedMessage: ui.translateFailed,
                isTranslating: false,
              }
            : turn,
        ),
      );
    }
  };

  const openConversationSession = (session: ConversationSession) => {
    setCurrentSessionId(session.id);
    setCurrentSessionCreatedAt(session.createdAt);
    setSessionEnded(false);
    setTurns(fromSessionMessages(session.messages));
    setMode("chat");
    setIsArchiveOpen(false);
  };

  return (
    <>
      <section className="flex h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-lg">
        <header className="border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">{ui.appTitle}</h1>
              <p className="text-xs text-slate-500">
                {ui.freeTraining} · {ui.messagesUsed}: {turns.length}/{SESSION_MESSAGE_LIMIT}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <LanguageSelector locale={locale} onChange={setLocale} />
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={endCurrentSession}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                >
                  {ui.endSession}
                </button>
                <button
                  type="button"
                  onClick={() => setIsArchiveOpen(true)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                >
                  {ui.archive}
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {turns.map((turn) => {
            const correctionSavedId = `correction-${turn.id}`;
            const expressionSavedId = `expression-${turn.id}`;
            const correctionSaved = savedItems.some((item) => item.id === correctionSavedId);
            const expressionSaved = savedItems.some((item) => item.id === expressionSavedId);

            return (
              <article key={turn.id} className="space-y-2">
                <MessageBubble
                  role="user"
                  message={turn.userMessage}
                  labels={{
                    translate: ui.translate,
                    translating: ui.translating,
                    translation: ui.translation,
                    listen: ui.listen,
                  }}
                />

                {turn.mode === "chat" &&
                  turn.correctionResult &&
                  turn.assistantMessage && (
                    <>
                      <CorrectionCard
                        highlighted={turn.correctionResult.highlighted}
                        corrected={turn.correctionResult.corrected}
                        natural={turn.correctionResult.natural}
                        explanation={turn.correctionResult.explanation}
                        hasError={turn.correctionResult.hasError}
                        feedback={
                          turn.correctionResult.hasError
                            ? ui.correctionFeedbackError
                            : ui.correctionFeedbackCorrect
                        }
                        labels={{
                          title: ui.correctionTitle,
                          highlighted: ui.highlighted,
                          corrected: ui.corrected,
                          natural: ui.natural,
                          explanation: ui.explanation,
                          listen: ui.listen,
                          noCorrectionNeeded: ui.noCorrectionNeeded,
                        }}
                        actions={
                          <SaveButton
                            isSaved={correctionSaved}
                            saveLabel={ui.save}
                            savedLabel={ui.saved}
                            onSave={() => saveItemFromTurn(buildCorrectionSavedItem(turn))}
                          />
                        }
                      />
                      <MessageBubble
                        role="assistant"
                        message={turn.assistantMessage}
                        translatedMessage={turn.translatedMessage}
                        isTranslating={turn.isTranslating}
                        onTranslate={() =>
                          handleTranslate(turn.id, turn.assistantMessage ?? "")
                        }
                        labels={{
                          translate: ui.translate,
                          translating: ui.translating,
                          translation: ui.translation,
                          listen: ui.listen,
                        }}
                      />
                    </>
                  )}

                {turn.mode === "how_to_say" && turn.expressionResult && (
                  <HowToSayCard
                    expression={turn.expressionResult.expression}
                    explanation={turn.expressionResult.explanation}
                    example={turn.expressionResult.example}
                    labels={{
                      title: ui.expressionHelperTitle,
                      explanation: ui.explanation,
                      example: ui.example,
                    }}
                    actions={
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleUseExpressionAsMessage(
                              turn.expressionResult?.expression || "",
                            )
                          }
                          className="rounded-md bg-slate-900 px-2 py-1 text-xs text-white hover:bg-slate-700"
                        >
                          {ui.useThisExpression}
                        </button>
                        <SaveButton
                          isSaved={expressionSaved}
                          saveLabel={ui.save}
                          savedLabel={ui.saved}
                          onSave={() => saveItemFromTurn(buildExpressionSavedItem(turn))}
                        />
                      </div>
                    }
                  />
                )}
              </article>
            );
          })}
        </div>

        <form
          onSubmit={handleSend}
          className="border-t border-slate-200 bg-white p-3 sm:p-4"
        >
          {isInputDisabled ? (
            <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center shadow-sm">
              <p className="text-base font-semibold text-slate-900">{ui.sessionComplete}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={startNewChat}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white transition hover:bg-slate-700"
                >
                  {ui.startNewSession}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode("chat")}
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    mode === "chat"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  {ui.chatMode}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("how_to_say")}
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    mode === "how_to_say"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  {ui.askExpression}
                </button>
              </div>

              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={
                    mode === "chat" ? ui.inputPlaceholder : ui.expressionPlaceholder
                  }
                  rows={2}
                  className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-slate-500"
                />
                <button
                  type="submit"
                  disabled={isSending}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isSending ? `${ui.send}...` : ui.send}
                </button>
              </div>
            </>
          )}
        </form>
      </section>

      {isArchiveOpen && (
        <ArchivePanel
          savedItems={savedItems}
          conversationSessions={conversationSessions}
          ui={ui}
          onClose={() => setIsArchiveOpen(false)}
          onReuseSavedItem={(text) => {
            setMode("chat");
            setInput(text);
            setIsArchiveOpen(false);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          onDeleteSavedItem={(id) => {
            deleteSavedItem(id);
            setSavedItems(loadSavedItems());
          }}
          onClearSavedItems={() => {
            clearSavedItems();
            setSavedItems(loadSavedItems());
          }}
          onDeleteConversationSession={(id) => {
            deleteConversationSession(id);
            setConversationSessions(loadConversationSessions());
          }}
          onClearConversationSessions={() => {
            clearConversationSessions();
            setConversationSessions(loadConversationSessions());
          }}
          onOpenConversationSession={openConversationSession}
        />
      )}
    </>
  );
}
