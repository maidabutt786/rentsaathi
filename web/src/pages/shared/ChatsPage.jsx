import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";

import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useDocumentTitle } from "../../hooks/useUi.js";
import { getChat, sendMessage, subscribeChats, subscribeMessages } from "../../lib/listingsApi.js";
import { demoMode } from "../../lib/firebase.js";
import { timeAgo } from "../../lib/format.js";
import Avatar from "../../components/ui/Avatar.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Button from "../../components/ui/Button.jsx";
import { PageLoader } from "../../components/ui/Spinner.jsx";
import PageHeader from "../../components/layout/PageHeader.jsx";

function ConversationList({ chats, uid, base, activeId }) {
  if (chats.length === 0) {
    return <div className="p-5 text-sm text-muted">No conversations yet. Start one from a listing page.</div>;
  }
  return (
    <ul className="divide-y divide-line">
      {chats.map((chat) => {
        const otherId = chat.participants?.find((participant) => participant !== uid);
        const name = chat.names?.[otherId] || "RentSaathi user";
        return (
          <li key={chat.id}>
            <Link
              to={`${base}/${chat.id}`}
              className={`flex items-start gap-3 px-4 py-3 transition hover:bg-subtle ${
                activeId === chat.id ? "bg-primary-soft/60" : ""
              }`}
              aria-current={activeId === chat.id}
            >
              <Avatar name={name} size={38} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{name}</p>
                  <span className="shrink-0 text-[11px] text-muted">{timeAgo(chat.updatedAt)}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted">{chat.lastMessage || "New conversation"}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ChatWindow({ chatId, uid, base }) {
  const { push } = useToast();
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getChat(chatId)
      .then((data) => {
        if (!cancelled) setChat(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const unsubscribe = subscribeMessages(chatId, (items) => setMessages(items));
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [chatId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const send = async (event) => {
    event?.preventDefault();
    if (text.trim().length === 0) return;
    setSending(true);
    try {
      await sendMessage(chatId, uid, text.trim());
      if (demoMode) {
        setMessages((current) => [
          ...current,
          { id: `local-${Date.now()}`, senderId: uid, text: text.trim(), createdAt: new Date().toISOString() },
        ]);
      }
      setText("");
    } catch (error) {
      push(error.message || "Message could not be sent.", "error");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <PageLoader label="Opening chat…" />;

  const otherId = chat?.participants?.find((participant) => participant !== uid);
  const otherName = chat?.names?.[otherId] || "Conversation";

  return (
    <div className="flex h-[560px] flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Link to={base} className="rounded-lg p-1.5 text-muted hover:bg-subtle hover:text-ink lg:hidden" aria-label="Back to chats">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Avatar name={otherName} size={36} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{otherName}</p>
          <p className="truncate text-xs text-muted">
            About listing{" "}
            <Link to={`/listings/${chat?.listingId}`} className="text-primary hover:underline">
              {chat?.listingId}
            </Link>
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-subtle/60 p-4">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">Say salam and ask about the room.</p>
        ) : (
          messages.map((message) => {
            const mine = message.senderId === uid;
            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                    mine ? "rounded-br-md bg-primary text-white" : "rounded-bl-md bg-surface text-ink"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  <p className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-muted"}`}>{timeAgo(message.createdAt)}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
        <label className="flex-1">
          <span className="sr-only">Message</span>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send(event);
              }
            }}
            rows={1}
            maxLength={1000}
            placeholder="Write a message…"
            className="input-base max-h-28 min-h-[44px] resize-none py-2.5"
          />
        </label>
        <Button type="submit" loading={sending} disabled={!text.trim()} aria-label="Send message">
          <Send className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>
      <p className="px-4 pb-3 text-[11px] text-muted">Never send money before visiting. Keep conversations here.</p>
    </div>
  );
}

export default function ChatsPage({ base = "/student/chats", title = "Messages" }) {
  useDocumentTitle(title);
  const { profile } = useAuth();
  const { chatId } = useParams();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return undefined;
    const unsubscribe = subscribeChats(profile.uid, (items) => {
      setChats(items);
      setLoading(false);
    });
    return () => unsubscribe?.();
  }, [profile?.uid]);

  if (!profile) return null;

  const emptyConversation = (
    <div className="flex h-[560px] flex-col items-center justify-center p-8 text-center">
      <MessageSquare className="h-10 w-10 text-line" aria-hidden="true" />
      <p className="mt-3 font-medium">Choose a conversation</p>
      <p className="mt-1 max-w-xs text-sm text-muted">Pick a chat on the left to read and reply.</p>
    </div>
  );

  return (
    <div>
      <PageHeader
        eyebrow="Inbox"
        title={title}
        subtitle="All messages stay inside RentSaathi so there is a record if something goes wrong."
      />
      <div className="card mt-5 overflow-hidden">
        <div className="grid lg:grid-cols-[320px_1fr]">
          <div className={`border-line lg:border-r ${chatId ? "hidden lg:block" : "block"}`}>
            <div className="border-b border-line px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
                Conversations
              </p>
            </div>
            {loading ? (
              <div className="space-y-3 p-4">
                <div className="skeleton h-12 w-full" />
                <div className="skeleton h-12 w-full" />
              </div>
            ) : (
              <ConversationList chats={chats} uid={profile.uid} base={base} activeId={chatId} />
            )}
          </div>
          <div className={chatId ? "block" : "hidden lg:block"}>
            {chatId ? (
              <ChatWindow chatId={chatId} uid={profile.uid} base={base} />
            ) : chats.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No conversations yet"
                body="Open a listing and message the landlord. Your chats will appear here."
                action={
                  <Button to="/listings" size="sm">
                    Find a room
                  </Button>
                }
                className="border-0 shadow-none"
              />
            ) : (
              emptyConversation
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
