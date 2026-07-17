import { useState, useEffect, useRef, useCallback } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import {
  getConversations,
  getMessages,
  sendMessage,
  getUnreadCount,
} from "~/lib/direct-message-actions";
import Avatar from "~/components/Avatar";

interface Conversation {
  partnerId: number;
  partnerName: string;
  partnerRole: string;
  partnerAvatar: string;
  partnerCountry: string;
  lastMessage: string;
  lastMessageAt: string;
  lastSenderId: number;
  unreadCount: number;
  lastActive: string;
  sourceType: string;
  matchStatus: string;
  matchId: number;
  slotDatetime: string;
  chatCreated: boolean;
}

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  read: boolean;
  createdAt: string;
  senderName: string;
}

export const Route = createFileRoute("/app/messages")({
  component: MessagesPage,
  validateSearch: (search: Record<string, unknown>) => ({
    pt: search.pt as string | undefined,
  }),
});

function MessagesPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/app/messages" });
  const [userId, setUserId] = useState<number | null>(null);
  const [userName, setUserName] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<number | null>(null);
  const [activePartnerName, setActivePartnerName] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Init auth
  useEffect(() => {
    const stored = localStorage.getItem("flexora_user");
    if (!stored) {
      navigate({ to: "/login" });
      return;
    }
    try {
      const user = JSON.parse(stored);
      setUserId(user.id);
      setUserName(user.name || "");
    } catch {
      navigate({ to: "/login" });
    }
  }, []);

  // Load conversations
  const loadConversations = useCallback(() => {
    getConversations()
      .then((convs: any[]) => {
        setConversations(convs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!userId) return;
    loadConversations();
  }, [userId]);

  // Handle "pt" search param — auto-open conversation with that PT
  useEffect(() => {
    if (!search.pt || !userId || loading) return;
    const ptId = parseInt(search.pt, 10);
    if (isNaN(ptId)) return;

    // Look for existing conversation
    const existing = conversations.find(c => c.partnerId === ptId);
    if (existing) {
      selectConversation(existing);
    } else {
      // Fetch PT info and start a new conversation window
      setActivePartnerId(ptId);
      // We'll need to get the name — fetch from conversations after sending first message
      fetchPartnerName(ptId);
    }
  }, [search.pt, conversations, userId, loading]);

  function fetchPartnerName(partnerId: number) {
    // Try to find in existing conversations first
    const existing = conversations.find(c => c.partnerId === partnerId);
    if (existing) {
      setActivePartnerName(existing.partnerName);
      return;
    }
    // Default — will be updated after first message
    setActivePartnerName(`User #${partnerId}`);
  }

  // Poll for new messages every 3 seconds
  useEffect(() => {
    if (!activePartnerId || !userId) return;

    pollRef.current = setInterval(() => {
      getMessages({ data: { partnerId: activePartnerId } })
        .then((msgs: any[]) => {
          setMessages(msgs);
          // Refresh conversation list for unread counts
          getConversations().then(setConversations);
        })
        .catch(() => {});
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activePartnerId, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function selectConversation(conv: Conversation) {
    setActivePartnerId(conv.partnerId);
    setActivePartnerName(conv.partnerName);
    getMessages({ data: { partnerId: conv.partnerId } })
      .then((msgs: any[]) => setMessages(msgs))
      .catch(() => {});

    // Refresh conversations to update unread counts
    loadConversations();
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function handleSend() {
    const text = input.trim();
    if (!text || !activePartnerId || sending) return;

    setSending(true);
    setInput("");

    sendMessage({ data: { receiverId: activePartnerId, content: text } })
      .then((msg: any) => {
        setMessages(prev => [...prev, msg]);
        loadConversations();
      })
      .catch(err => {
        alert(err.message || "Kunne ikke sende melding");
      })
      .finally(() => setSending(false));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value);
  }

  function handleLogout() {
    localStorage.removeItem("flexora_token");
    localStorage.removeItem("flexora_user");
    document.cookie = "flexora_token=; path=/; max-age=0";
    navigate({ to: "/" });
  }

  function formatTime(dateStr: string): string {
    if (!dateStr) return "";
    const d = new Date(dateStr + "Z");
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Nå";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m siden`;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  function isOnline(lastActive: string): boolean {
    if (!lastActive) return false;
    const d = new Date(lastActive + "Z");
    const diff = Date.now() - d.getTime();
    return diff < 5 * 60 * 1000; // online if active in last 5 min
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-500">Laster meldinger...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Nav */}
      <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2">
              <span className="text-lg font-bold text-[#1A56DB]">Flexora</span>
              <span className="text-lg font-light text-gray-400">Fitnes</span>
            </a>
            <span className="hidden sm:inline-block rounded-full bg-blue-100 px-3 py-0.5 text-xs font-medium text-[#1A56DB]">
              Meldinger
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/app/dashboard" className="text-sm text-gray-600 hover:text-[#1A56DB]">Dashboard</a>
            <button onClick={handleLogout} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200">
              Logg ut
            </button>
          </div>
        </div>
      </nav>

      {/* Main content: split view */}
      <div className="flex flex-1 overflow-hidden">
        {/* Conversation list */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Samtaler</h2>
          </div>
          {conversations.length === 0 ? (
            <div className="p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">Ingen samtaler enda</p>
              <p className="mt-1 text-xs text-gray-400">
                Finn en PT og book en time for å starte en samtale
              </p>
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={`${conv.sourceType}-${conv.partnerId}`}
                onClick={() => selectConversation(conv)}
                className={`w-full border-b border-gray-50 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                  activePartnerId === conv.partnerId ? "bg-blue-50 hover:bg-blue-50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    <Avatar src={conv.partnerAvatar} name={conv.partnerName} size={40} />
                    {isOnline(conv.lastActive) && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {conv.partnerName}
                      </p>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                        {formatTime(conv.lastMessageAt || conv.slotDatetime)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs text-gray-500 capitalize">{conv.partnerRole === "pt" ? "PT" : "Klient"}</p>
                      {conv.sourceType === "speed_date_match" && (
                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                          conv.matchStatus === "matched"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          ⚡ Speed date
                          {conv.matchStatus !== "matched" && " (venter)"}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm truncate mt-0.5 ${
                      conv.unreadCount > 0 && conv.lastSenderId !== userId
                        ? "font-semibold text-gray-900"
                        : "text-gray-500"
                    }`}>
                      {conv.sourceType === "speed_date_match" && !conv.lastMessage ? (
                        <span className="text-[#1A56DB] font-medium">Start chat →</span>
                      ) : (
                        <>
                          {conv.lastSenderId === userId ? "Du: " : ""}
                          {conv.lastMessage}
                        </>
                      )}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-[#1A56DB] text-xs font-bold text-white">
                      {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Chat area */}
        <div className="flex flex-1 flex-col bg-gray-50">
          {!activePartnerId ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-700">Velg en samtale</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Velg en samtale fra listen for å starte å chatte
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {(() => {
                      const conv = conversations.find(c => c.partnerId === activePartnerId);
                      return <Avatar src={conv?.partnerAvatar} name={activePartnerName} size={36} />;
                    })()}
                    {(() => {
                      const conv = conversations.find(c => c.partnerId === activePartnerId);
                      return conv && isOnline(conv.lastActive) ? (
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                      ) : null;
                    })()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{activePartnerName}</p>
                    <p className="text-xs text-gray-500">
                      {(() => {
                        const conv = conversations.find(c => c.partnerId === activePartnerId);
                        if (!conv) return "Ukjent status";
                        return isOnline(conv.lastActive)
                          ? "Online nå"
                          : `Sist aktiv: ${formatTime(conv.lastActive)}`;
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
                {messages.length === 0 && (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-gray-400">
                      Ingen meldinger enda. Send den første meldingen!
                    </p>
                  </div>
                )}
                {messages.map(msg => {
                  const isOwn = msg.senderId === userId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      {!isOwn && (
                        <Avatar src="" name={msg.senderName} size={28} className="mr-2 mt-1" />
                      )}
                      <div className="max-w-[70%]">
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            isOwn
                              ? "bg-[#1A56DB] text-white rounded-br-md"
                              : "bg-white text-gray-800 shadow-sm ring-1 ring-gray-100 rounded-bl-md"
                          }`}
                        >
                          {msg.content}
                        </div>
                        <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? "justify-end" : "justify-start"}`}>
                          <span className="text-xs text-gray-400">
                            {formatTime(msg.createdAt)}
                          </span>
                          {isOwn && (
                            <span className="text-xs text-gray-400">
                              {msg.read ? "✓✓" : "✓"}
                            </span>
                          )}
                        </div>
                      </div>
                      {isOwn && (
                        <Avatar src="" name={userName} size={28} className="ml-2 mt-1" />
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-gray-200 bg-white px-4 sm:px-6 py-3">
                <div className="flex items-center gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Skriv en melding..."
                    disabled={sending}
                    className="flex-1 rounded-full border border-gray-300 px-5 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-[#1A56DB] focus:outline-none focus:ring-2 focus:ring-[#1A56DB]/20 disabled:opacity-50"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#1A56DB] text-white hover:bg-[#1E40AF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                    aria-label="Send message"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
