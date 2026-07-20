import { useState, useRef, useEffect, useCallback } from "react";
import {
  findAnswer,
  simulateTypingDelay,
  WELCOME_MESSAGE,
  SUGGESTED_QUESTIONS,
} from "~/lib/chat-assistant";

interface Message {
  id: number;
  text: string;
  isBot: boolean;
}

const STORAGE_KEY = "kitozon-chat-messages";

function loadMessages(): Message[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as Message[];
    }
  } catch {
    // ignore parse errors
  }
  return [];
}

function saveMessages(msgs: Message[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
  } catch {
    // ignore storage errors
  }
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => loadMessages());
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [hasOpenedBefore, setHasOpenedBefore] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change or typing state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // Focus input when chat opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Persist messages to sessionStorage on change
  useEffect(() => {
    if (messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages]);

  // On first open, add welcome message
  const handleOpen = useCallback(() => {
    setOpen(true);
    if (!hasOpenedBefore) {
      setHasOpenedBefore(true);
      // Only add welcome if no messages exist yet
      if (messages.length === 0) {
        const welcome: Message = {
          id: Date.now(),
          text: WELCOME_MESSAGE,
          isBot: true,
        };
        setMessages([welcome]);
      }
    }
  }, [hasOpenedBefore, messages.length]);

  const handleSend = useCallback(
    async (text?: string) => {
      const messageText = (text || input).trim();
      if (!messageText) return;

      const userMsg: Message = {
        id: Date.now(),
        text: messageText,
        isBot: false,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setTyping(true);

      // Simulate typing delay then respond
      await simulateTypingDelay();

      const answer = findAnswer(messageText);
      const botMsg: Message = {
        id: Date.now() + 1,
        text: answer,
        isBot: true,
      };

      setMessages((prev) => [...prev, botMsg]);
      setTyping(false);
    },
    [input],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (question: string) => {
    handleSend(question);
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={handleOpen}
          aria-label="Open chat"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-200 transition-all duration-200 active:scale-95"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex w-[320px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-300/50 transition-all duration-200">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-green-500 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white text-sm font-bold">
                K
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Hilde
                </h3>
                <p className="text-xs text-emerald-100">
                  {typing ? "Skriver..." : "AI-assistent"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Messages area */}
          <div
            className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4"
            style={{ height: "320px" }}
          >
            {messages.length === 0 && (
              <p className="text-center text-sm text-gray-400 mt-12">
                Still a question? Jeg er her for å hjelpe!
              </p>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`mb-3 flex ${msg.isBot ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.isBot
                      ? "rounded-tl-sm bg-white text-gray-800 shadow-sm border border-gray-100"
                      : "rounded-tr-sm bg-emerald-600 text-white"
                  }`}
                >
                  {/* Render markdown-like bold and line breaks */}
                  {msg.isBot
                    ? renderBotMessage(msg.text)
                    : msg.text}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div className="mb-3 flex justify-start">
                <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm text-gray-800 shadow-sm border border-gray-100">
                  <div className="flex gap-1">
                    <span
                      className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested questions */}
          {messages.length <= 1 && (
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-2.5">
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSuggestionClick(q)}
                    className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="border-t border-gray-100 bg-white px-3 py-2.5">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Skriv et spørsmål..."
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors"
                disabled={typing}
              />
              <button
                onClick={() => handleSend()}
                disabled={typing || !input.trim()}
                aria-label="Send message"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Render bot message text, handling **bold**, line breaks, and emoji.
 */
function renderBotMessage(text: string): React.ReactNode[] {
  // Split on **bold** markers
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-gray-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    // Handle newlines within plain text
    if (part.includes("\n")) {
      return (
        <span key={i}>
          {part.split("\n").map((line, j, arr) => (
            <span key={j}>
              {line}
              {j < arr.length - 1 && <br />}
            </span>
          ))}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
