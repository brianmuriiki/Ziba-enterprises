import { useState, useEffect, useRef } from "react";
import { supabase, type Message } from "../lib/supabase";
import { IcImage, IcSend } from "../lib/icons";
import { useAuth } from "../lib/auth-context";

interface Props {
  listingType: "product" | "property" | "service";
  listingId: string;
  otherPartyId: string;
  otherPartyName: string;
  listingTitle: string;
  conversationId?: string;
  page?: boolean;
  onClose: () => void;
}

export default function MessageModal({ listingType, listingId, otherPartyId, otherPartyName, listingTitle, conversationId: existingConversationId, page = false, onClose }: Props) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [reportingMessage, setReportingMessage] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function withSignedAttachment(message: Message): Promise<Message> {
    if (!message.attachment_url || message.attachment_url.startsWith("http")) return message;
    const { data } = await supabase.storage.from("private-chat-attachments").createSignedUrl(message.attachment_url, 3600);
    return { ...message, attachment_url: data?.signedUrl || null };
  }

  useEffect(() => {
    if (!profile) {
      setLoading(false);
      setError("Your Ziba profile could not be loaded. Sign out and back in, then try messaging again.");
      return;
    }
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    setLoading(true);
    setError("");
    async function init() {
      try {
        let conv: { id: string } | null = null;
        if (existingConversationId) {
          const { data, error } = await supabase.from("conversations").select("id").eq("id", existingConversationId).maybeSingle();
          if (error) throw error;
          conv = data;
        } else {
          const { data, error } = await supabase.from("conversations").select("id").eq("listing_type", listingType).eq("listing_id", listingId)
            .or(`and(buyer_id.eq.${profile.id},other_party_id.eq.${otherPartyId}),and(buyer_id.eq.${otherPartyId},other_party_id.eq.${profile.id})`).maybeSingle();
          if (error) throw error;
          conv = data;
        }
        if (!conv && profile.id !== otherPartyId) {
          const { data, error } = await supabase.from("conversations").insert({ listing_type: listingType, listing_id: listingId, buyer_id: profile.id, other_party_id: otherPartyId }).select("id").single();
          if (error?.code === "23505") {
            // A concurrent open may have created this conversation after our lookup.
            const { data: existing, error: lookupError } = await supabase.from("conversations").select("id")
              .eq("listing_type", listingType).eq("listing_id", listingId)
              .or(`and(buyer_id.eq.${profile.id},other_party_id.eq.${otherPartyId}),and(buyer_id.eq.${otherPartyId},other_party_id.eq.${profile.id})`).maybeSingle();
            if (lookupError) throw lookupError;
            conv = existing;
          } else if (error) {
            throw error;
          } else {
            conv = data;
          }
        }
        if (!conv) throw new Error("This conversation could not be opened.");
        if (cancelled) return;
        setConversationId(conv.id);
        const { data: msgs, error: messagesError } = await supabase.from("messages").select("*, profiles:profiles_public(full_name, avatar_url)").eq("conversation_id", conv.id).order("created_at", { ascending: true });
        if (messagesError) throw messagesError;
        if (cancelled) return;
        setMessages(await Promise.all((msgs || []).map((message) => withSignedAttachment(message))));
        const readAt = new Date().toISOString();
        const { error: markReadError } = await supabase.from("messages").update({ read_at: readAt })
          .eq("conversation_id", conv.id).is("read_at", null).neq("sender_id", profile.id);
        if (markReadError) throw markReadError;
        channel = supabase.channel(`messages:${conv.id}`)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conv.id}` }, async (payload) => {
          const { data } = await supabase.from("messages").select("*, profiles:profiles_public(full_name, avatar_url)").eq("id", payload.new.id).single();
          if (data) {
            let readyMessage = await withSignedAttachment(data);
            setMessages((previous) => previous.some((message) => message.id === data.id) ? previous : [...previous, readyMessage]);
            if (data.sender_id !== profile.id) {
              const readAt = new Date().toISOString();
              const { error: markReadError } = await supabase.from("messages").update({ read_at: readAt }).eq("id", data.id).is("read_at", null);
              if (!markReadError) {
                readyMessage = { ...readyMessage, read_at: readAt };
                setMessages((previous) => previous.map((message) => message.id === data.id ? readyMessage : message));
              }
            }
          }
        })
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conv.id}` }, (payload) => {
            const updated = payload.new as Message;
            setMessages((previous) => previous.map((message) => message.id === updated.id ? { ...message, read_at: updated.read_at } : message));
          })
          .subscribe();
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not open this conversation.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; if (channel) void supabase.removeChannel(channel); };
  }, [profile, listingType, listingId, otherPartyId, existingConversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if ((!text.trim() && !attachment) || !conversationId || !profile || sending) return;
    setSending(true);
    setError("");
    let attachmentPath: string | null = null;
    try {
      if (attachment) {
        if (!attachment.type.startsWith("image/")) throw new Error("Choose an image attachment.");
        if (attachment.size > 10 * 1024 * 1024) throw new Error("Images must be 10 MB or smaller.");
        const extension = attachment.name.split(".").pop() || "jpg";
        attachmentPath = `${conversationId}/${profile.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("private-chat-attachments").upload(attachmentPath, attachment, { contentType: attachment.type, upsert: false });
        if (uploadError) throw uploadError;
      }
      const { data: savedMessage, error: insertError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: profile.id,
        content: text.trim() || "Photo attachment",
        attachment_url: attachmentPath,
      }).select("*").single();

      if (insertError) throw insertError;
      const readyMessage = await withSignedAttachment({ ...savedMessage, profiles: { full_name: profile.full_name, avatar_url: profile.avatar_url } });
      setMessages((previous) => previous.some((message) => message.id === readyMessage.id) ? previous : [...previous, readyMessage]);
      setText("");
      setAttachment(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Message could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function reportMessage(messageId: string) {
    if (!profile || reportReason.trim().length < 10) { setError("Please describe the concern in at least 10 characters."); return; }
    const { error: reportError } = await supabase.from("reports").insert({ target_type: "message", target_id: messageId, reported_by: profile.id, reason: reportReason.trim() });
    if (reportError) setError(reportError.message);
    else { setError("Message sent to the moderation team."); setReportingMessage(null); setReportReason(""); }
  }

  function formatTime(ts: string) {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className={page ? "w-full" : "fixed inset-0 z-50 flex items-center justify-center p-4"} onClick={page ? undefined : onClose}>
      {!page && <div className="absolute inset-0" style={{ backgroundColor: "rgba(26,20,16,0.5)", backdropFilter: "blur(4px)" }} />}
      <div
        className={`relative w-full ${page ? "rounded-2xl h-[min(72vh,720px)] min-h-[min(460px,calc(100dvh-12rem))]" : "max-w-lg rounded-2xl"} shadow-2xl flex flex-col`}
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", ...(!page ? { height: "min(560px, calc(100dvh - 2rem))" } : {}) }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <div className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>{otherPartyName}</div>
            <div className="text-xs truncate max-w-xs" style={{ color: "var(--muted-foreground)" }}>{listingTitle}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--secondary)]" style={{ color: "var(--muted-foreground)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {error && <div className="text-xs p-2 rounded-lg" style={{ background: "#FEE2E2", color: "#991B1B" }}>{error}</div>}
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>Loading conversation…</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--muted)" }}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Send a message to start the conversation.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === profile?.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[75%]">
                    <div
                      className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                      style={
                        isMine
                          ? { backgroundColor: "var(--primary)", color: "#fff", borderBottomRightRadius: "4px" }
                          : { backgroundColor: "var(--secondary)", color: "var(--foreground)", borderBottomLeftRadius: "4px" }
                      }
                    >
                      {msg.attachment_url && <a href={msg.attachment_url} target="_blank" rel="noreferrer"><img src={msg.attachment_url} alt="Message attachment" className="rounded-lg mb-2 max-h-48 object-contain"/></a>}
                      {msg.content !== "Photo attachment" && msg.content}
                    </div>
                    <div className="text-xs mt-1 px-1" style={{ color: "var(--muted-foreground)", textAlign: isMine ? "right" : "left" }}>
                      {formatTime(msg.created_at)}{isMine && msg.read_at && <span> · Read</span>}
                    </div>
                    {!isMine && <button onClick={() => { setReportingMessage(reportingMessage === msg.id ? null : msg.id); setError(""); }} className="text-[11px] mt-1 px-1 underline" style={{ color: "var(--muted-foreground)" }}>Report message</button>}
                    {reportingMessage === msg.id && <div className="mt-2"><textarea value={reportReason} onChange={(event) => setReportReason(event.target.value)} rows={2} placeholder="Tell us what is concerning" className="input-base resize-none text-xs"/><button onClick={() => reportMessage(msg.id)} className="mt-1 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "var(--primary)", color: "white" }}>Send report</button></div>}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="px-4 py-3 border-t flex gap-2 items-center" style={{ borderColor: "var(--border)" }}>
          <label className="p-2 rounded-lg cursor-pointer" title={attachment?.name || "Attach an image"} style={{ color: attachment ? "var(--primary)" : "var(--muted-foreground)" }}><IcImage size={17}/><input type="file" accept="image/*" onChange={(event) => setAttachment(event.target.files?.[0] || null)} className="hidden"/></label>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 px-4 py-2.5 rounded-xl text-sm border outline-none focus:border-[var(--primary)]"
            style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }}
          />
          <button
            type="submit"
            disabled={(!text.trim() && !attachment) || sending || loading || !conversationId}
            className="px-4 py-2.5 rounded-xl transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: "var(--primary)", color: "#fff" }}
          >
            <IcSend size={16}/>
          </button>
        </form>
      </div>
    </div>
  );
}
