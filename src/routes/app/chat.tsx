import { useState, useRef, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { askAssistant, getChatHistory, clearChatHistory } from "~/lib/chat-actions";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  { no: "Finn en PT i Norge", en: "Find a PT in Norway" },
  { no: "Hvordan fungerer prøveperioden?", en: "How does the trial work?" },
  { no: "Hva koster det?", en: "What does it cost?" },
  { no: "Anbefal en PT for vekttap", en: "Recommend a PT for weight loss" },
  { no: "Hvilke funksjoner har Flexora?", en: "What features does Flexora have?" },
  { no: "Hvem er de beste PT-ene?", en: "Who are the top PTs?" },
];

export const Route = createFileRoute("/app/chat")({
  component: ChatPage,
});

function ChatPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const [userName, setUserName] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check auth and load history
  useEffect(() => {
    const stored = localStorage.getItem("flexora_user");
    if (!stored) {
      // Not logged in — still show chat but without history
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content:
            "Hei! 👋 Jeg er Flexora sin AI-assistent. Jeg kan hjelpe deg med å finne en PT, svare på spørsmål om plattformen, eller anbefale abonnementer. Hva lurer du på? 💙",
        },
      ]);
      setIsHistoryLoaded(true);
      return;
    }

    try {
      const user = JSON.parse(stored);
      setUserName(user.name || "");

      getChatHistory()
        .then((history: any[]) => {
          if (history && history.length > 0) {
            const msgs: Message[] = history.map((m: any) => ({
              id: String(m.id),
              role: m.role,
              content: m.content,
            }));
            setMessages(msgs);
          } else {
            setMessages([
              {
                id: "welcome",
                role: "assistant",
                content:
                  "Hei, " + (user.name || "der") + "! 👋 Velkommen tilbake til Flexora AI-assistenten. Hva kan jeg hjelpe deg med i dag? 💙",
              },
            ]);
          }
        })
        .catch(() => {
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content:
                "Hei, " + (user.name || "der") + "! 👋 Jeg er Flexora sin AI-assistent. Hva kan jeg hjelpe deg med? 💙",
            },
          ]);
        })
        .finally(() => setIsHistoryLoaded(true));
    } catch {
      setIsHistoryLoaded(true);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isHistoryLoaded) {
      inputRef.current?.focus();
    }
  }, [isHistoryLoaded]);

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

    askAssistant({ data: { question: messageText } })
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

  function handleClearHistory() {
    if (!confirm("Slette hele chatthistorikken?")) return;
    clearChatHistory()
      .then(() => {
        setMessages([
          {
            id: "cleared",
            role: "assistant",
            content: "Chatthistorikken er slettet. Hva kan jeg hjelpe deg med? 💙",
          },
        ]);
      })
      .catch(console.error);
  }

  function renderMessageContent(content: string) {
    const lines = content.split("\n");
    return lines.map((line, i) => {
      const bolded = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
      return (
        <span key={i}>
          <span dangerouslySetInnerHTML={{ __html: bolded }} />
          {i < lines.length - 1 && <br />}
        </span>
      );
    });
  }

  if (!isHistoryLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 animate-bounce rounded-full bg-[#1A56DB]" style={{ animationDelay: "0ms" }} />
            <span className="h-3 w-3 animate-bounce rounded-full bg-[#1A56DB]" style={{ animationDelay: "150ms" }} />
            <span className="h-3 w-3 animate-bounce rounded-full bg-[#1A56DB]" style={{ animationDelay: "300ms" }} />
          </div>
          <p className="text-sm text-gray-500">Laster chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Top Nav */}
      <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2">
              <span className="text-lg font-bold text-[#1A56DB]">Flexora</span>
              <span className="text-lg font-light text-gray-400">Fitnes</span>
            </a>
            <span className="hidden sm:inline-block rounded-full bg-blue-100 px-3 py-0.5 text-xs font-medium text-[#1A56DB]">
              AI Assistent
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClearHistory}
              className="text-sm text-gray-500 hover:text-red-500 transition-colors"
              title="Slett historikk"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
            <a
              href="/app/dashboard"
              className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Dashboard
            </a>
          </div>
        </div>
      </nav>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col mx-auto w-full max-w-4xl">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length <= 1 && (
            <div className="text-center py-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1A56DB] text-white shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Flexora AI Assistent 💙</h1>
              <p className="mt-1 text-sm text-gray-500">
                Still meg spørsmål om plattformen, PT-er, eller få personlige anbefalinger
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="mr-2 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#1A56DB] text-xs font-bold text-white">
                  AI
                </div>
              )}
              <div
                className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#1A56DB] text-white rounded-br-md"
                    : "bg-white text-gray-800 shadow-sm ring-1 ring-gray-100 rounded-bl-md"
                }`}
              >
                {renderMessageContent(msg.content)}
              </div>
              {msg.role === "user" && (
                <div className="ml-2 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-300 text-xs font-bold text-gray-600">
                  {userName ? userName.charAt(0).toUpperCase() : "U"}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="mr-2 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#1A56DB] text-xs font-bold text-white">
                AI
              </div>
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

        {/* Suggested Questions */}
        {messages.length <= 1 && (
          <div className="border-t border-gray-200 bg-white px-4 sm:px-6 py-4">
            <p className="mb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
              Vanlige spørsmål
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q.no)}
                  className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-[#1A56DB] transition-colors"
                >
                  {q.no}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-200 bg-white px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Skriv en melding til Flexora AI..."
              disabled={isLoading}
              className="flex-1 rounded-full border border-gray-300 px-5 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-[#1A56DB] focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20 disabled:opacity-50"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#1A56DB] text-white hover:bg-[#1E40AF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
              aria-label="Send message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-gray-400">
            Flexora AI-assistent • Svar basert på plattformdata og reelle PT-profiler
          </p>
        </div>
      </div>
    </div>
  );
}
