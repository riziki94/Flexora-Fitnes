import { useState, useRef, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { askSupport, submitSupportTicket } from "~/lib/support-actions";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const QUICK_BUTTONS = [
  { label: "Betaling", emoji: "💳", query: "Jeg har et spørsmål om betaling" },
  { label: "PT-booking", emoji: "📅", query: "Hvordan booker jeg en PT-time?" },
  { label: "Trening", emoji: "🏋️", query: "Jeg lurer på treningsplaner" },
  { label: "Abonnement", emoji: "📋", query: "Hva koster abonnementene?" },
  { label: "Teknisk hjelp", emoji: "🔧", query: "Jeg har et teknisk problem" },
];

export const Route = createFileRoute("/app/support")({
  component: SupportPage,
});

function SupportPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketSent, setTicketSent] = useState(false);
  const [ticketError, setTicketError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("flexora_user");
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setUserName(user.name || "");
      } catch {}
    }

    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hei! 👋 Jeg er Flexora sitt **kundeservice-team**. Jeg kan hjelpe deg med betaling, PT-booking, trening, abonnement og tekniske problemer. Hva kan jeg hjelpe deg med? 💙",
      },
    ]);
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(text?: string) {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: messageText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    askSupport({ data: { question: messageText } })
      .then((result: any) => {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: result.response,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        if (result.escalated) setShowTicketForm(true);
      })
      .catch(() => {
        setMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), role: "assistant", content: "Beklager, noe gikk galt. Prøv igjen! 😔" },
        ]);
      })
      .finally(() => setIsLoading(false));
  }

  function handleQuickButton(query: string) {
    handleSend(query);
  }

  function handleSubmitTicket() {
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      setTicketError("Fyll ut både emne og melding.");
      return;
    }
    setTicketError("");
    submitSupportTicket({ data: { subject: ticketSubject, message: ticketMessage } })
      .then((result: any) => {
        setTicketSent(true);
        setMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), role: "assistant", content: result.message },
        ]);
        setShowTicketForm(false);
      })
      .catch(() => setTicketError("Kunne ikke sende. Prøv igjen."));
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
            <span className="hidden sm:inline-block rounded-full bg-green-100 px-3 py-0.5 text-xs font-medium text-green-700">
              Kundeservice
            </span>
          </div>
          <a
            href="/app/dashboard"
            className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Dashboard
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col lg:flex-row">
        {/* Chat Area */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.length <= 1 && (
              <div className="text-center py-8">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500 text-white shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-gray-900">Flexora Kundeservice 💚</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Få hjelp med betaling, booking, trening, abonnement og tekniske problemer
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="mr-2 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
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
                <div className="mr-2 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
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

          {/* Quick Buttons */}
          {messages.length <= 1 && (
            <div className="border-t border-gray-200 bg-white px-4 sm:px-6 py-4">
              <p className="mb-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                Hva trenger du hjelp med?
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_BUTTONS.map((btn, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickButton(btn.query)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:border-green-200 hover:text-green-700 transition-colors"
                  >
                    <span>{btn.emoji}</span>
                    <span>{btn.label}</span>
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
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Beskriv problemet ditt..."
                disabled={isLoading}
                className="flex-1 rounded-full border border-gray-300 px-5 py-3 text-sm text-gray-700 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:opacity-50"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                aria-label="Send message"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-gray-400">
              Flexora Kundeservice • AI-drevet support • Svar basert på plattformdata
            </p>
          </div>
        </div>

        {/* Sidebar: Quick actions & ticket form */}
        <div className="hidden lg:block w-80 border-l border-gray-200 bg-white p-6 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Hurtighandlinger</h3>

          <div className="space-y-2 mb-6">
            {QUICK_BUTTONS.map((btn, i) => (
              <button
                key={i}
                onClick={() => handleQuickButton(btn.query)}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left text-sm text-gray-700 hover:bg-green-50 hover:border-green-200 transition-colors"
              >
                <span className="text-lg">{btn.emoji}</span>
                <div>
                  <p className="font-medium">{btn.label}</p>
                  <p className="text-xs text-gray-400">Klikk for hjelp</p>
                </div>
              </button>
            ))}
          </div>

          {!ticketSent && (
            <div className="border-t border-gray-100 pt-6">
              <button
                onClick={() => setShowTicketForm(!showTicketForm)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Kontakt support
              </button>
              <p className="mt-2 text-center text-xs text-gray-400">
                Direkte kontakt med support-teamet
              </p>
            </div>
          )}

          {/* Ticket form */}
          {showTicketForm && !ticketSent && (
            <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
              <h4 className="text-sm font-semibold text-orange-800 mb-3">
                📝 Send supportforespørsel
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-orange-700 mb-1">Emne</label>
                  <input
                    type="text"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="F.eks. Refusjon for PT-time"
                    className="w-full rounded-lg border border-orange-200 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-orange-700 mb-1">Beskrivelse</label>
                  <textarea
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    rows={4}
                    placeholder="Beskriv problemet ditt i detalj..."
                    className="w-full rounded-lg border border-orange-200 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400 resize-none"
                  />
                </div>
                {ticketError && (
                  <p className="text-xs text-red-500">{ticketError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleSubmitTicket}
                    className="flex-1 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
                  >
                    Send
                  </button>
                  <button
                    onClick={() => setShowTicketForm(false)}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            </div>
          )}

          {ticketSent && (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-medium text-green-800">✅ Forespørsel sendt!</p>
              <p className="mt-1 text-xs text-green-600">Support-teamet kontakter deg innen 24 timer.</p>
            </div>
          )}

          <div className="mt-6 rounded-xl bg-gray-50 p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Åpningstider</h4>
            <p className="text-sm text-gray-600">
              AI-support: <span className="text-green-600 font-medium">24/7</span>
            </p>
            <p className="text-sm text-gray-600">
              Mennesker: <span className="text-gray-500">Man–Fre 09–17</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
