import { useState, useRef, useEffect } from "react";
import { askAssistant } from "~/lib/chat-actions";
import { askSupport } from "~/lib/support-actions";
import { getUnreadCount } from "~/lib/direct-message-actions";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  { no: "Finn en PT i Norge", en: "Find a PT in Norway" },
  { no: "Hva koster det?", en: "What does it cost?" },
  { no: "Hjelp med betaling", en: "Help with payment" },
  { no: "Mitt abonnement", en: "My subscription" },
];

// Support-related keywords that trigger the support engine
const SUPPORT_KEYWORDS = [
  "hjelp", "help", "problem", "issue", "betaling", "refusjon", "refund",
  "kansellere", "cancel", "abonnement", "subscription", "teknisk",
  "fungerer ikke", "not working", "feil", "error", "klage", "complaint",
  "support", "kontakt", "contact",
];

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [unreadDmCount, setUnreadDmCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Poll for unread DM count
  useEffect(() => {
    const stored = localStorage.getItem("flexora_token");
    if (!stored) return;

    const poll = () => {
      getUnreadCount()
        .then((c: any) => setUnreadDmCount(typeof c === "number" ? c : 0))
        .catch(() => {});
    };
    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Welcome message
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content:
            "Hei! 👋 Jeg er Flexora sin AI-assistent. Jeg kan hjelpe deg med å finne en PT, svare på spørsmål om plattformen, eller anbefale abonnementer. Hva lurer du på? 💙",
        },
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  function handleSend(text?: string) {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Detect if this is a support query
    const lower = messageText.toLowerCase();
    const isSupport = SUPPORT_KEYWORDS.some(kw => lower.includes(kw));

    const caller = isSupport
      ? askSupport({ data: { question: messageText } })
      : askAssistant({ data: { question: messageText } });

    caller
      .then((result: any) => {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: result.response,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      })
      .catch((err: any) => {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Beklager, noe gikk galt. Prøv igjen senere! 😔",
        };
        setMessages((prev) => [...prev, errorMsg]);
        console.error("Chat error:", err);
      })
      .finally(() => setIsLoading(false));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function renderMessageContent(content: string) {
    // Simple markdown-like rendering: **bold**, line breaks
    const lines = content.split("\n");
    return lines.map((line, i) => {
      // Bold text
      const bolded = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
      return (
        <span key={i}>
          <span dangerouslySetInnerHTML={{ __html: bolded }} />
          {i < lines.length - 1 && <br />}
        </span>
      );
    });
  }

  return (
    <>
      {/* Floating chat bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#1A56DB] text-white shadow-lg hover:bg-[#1E40AF] transition-all hover:scale-110 active:scale-95"
          aria-label="Open chat"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            AI
          </span>
          {unreadDmCount > 0 && (
            <span className="absolute -top-1 -left-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#1A56DB] text-xs font-bold text-white px-1">
              {unreadDmCount > 9 ? "9+" : unreadDmCount}
            </span>
          )}
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[520px] w-[380px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between bg-[#1A56DB] px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                AI
              </div>
              <div>
                <p className="text-sm font-semibold">Flexora AI Assistent</p>
                <p className="text-xs text-blue-100">Alltid online</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 hover:bg-white/10 transition-colors"
                aria-label="Minimize chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setMessages([]);
                }}
                className="rounded-lg p-1.5 hover:bg-white/10 transition-colors"
                aria-label="Close chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#1A56DB] text-white rounded-br-md"
                      : "bg-white text-gray-800 shadow-sm ring-1 ring-gray-100 rounded-bl-md"
                  }`}
                >
                  {renderMessageContent(msg.content)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-gray-100">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested questions (shown when no user messages yet) */}
          {messages.length <= 1 && (
            <div className="border-t border-gray-100 bg-white px-4 py-2.5">
              <p className="mb-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Forslag</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q.no)}
                    className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-[#1A56DB] transition-colors"
                  >
                    {q.no}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-200 bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Skriv en melding..."
                disabled={isLoading}
                className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-[#1A56DB] focus:outline-none focus:ring-1 focus:ring-[#1A56DB] disabled:opacity-50"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1A56DB] text-white hover:bg-[#1E40AF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Send message"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-gray-400">
              Flexora AI • Drevet av smart matching •{" "}
              <a href="/app/chat" className="underline hover:text-[#1A56DB]">Chat</a>
              {" • "}
              <a href="/app/support" className="underline hover:text-green-600">Kundeservice</a>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
