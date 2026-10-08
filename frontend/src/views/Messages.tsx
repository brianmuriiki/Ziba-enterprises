import { useCallback, useEffect, useState } from "react";
import { db } from "../lib/client";
import { useAuth } from "../lib/auth-context";
import { IcMessage } from "../lib/icons";
import MessageModal from "../components/MessageModal";
import LoadingAnimation from "../components/LoadingAnimation";
import type { MsgTarget } from "../App";

type ConversationRow = MsgTarget & {
  id: string;
  peerAvatar: string | null;
  latestMessage: string;
  latestAt: string;
  unread: number;
};

export default function Messages() {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [active, setActive] = useState<ConversationRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!profile) return;
    setError("");
    const { data: rows, error: conversationsError } = await db
      .from("conversations")
      .select("*")
      .or(`buyer_id.eq.${profile.id},other_party_id.eq.${profile.id}`)
      .order("created_at", { ascending: false });
    if (conversationsError) {
      setError(conversationsError.message);
      setLoading(false);
      return;
    }

    const items = await Promise.all((rows || []).map(async (conversation) => {
      const peerId = conversation.buyer_id === profile.id ? conversation.other_party_id : conversation.buyer_id;
      const listingTable = conversation.listing_type === "product" ? "products" : conversation.listing_type === "property" ? "properties" : "services";
      const [peerResult, listingResult, latestResult, unreadResult] = await Promise.all([
        db.from("profiles_public").select("full_name,avatar_url").eq("id", peerId).maybeSingle(),
        db.from(listingTable).select("title").eq("id", conversation.listing_id).maybeSingle(),
        db.from("messages").select("content,created_at").eq("conversation_id", conversation.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        db.from("messages").select("id", { count: "exact", head: true }).eq("conversation_id", conversation.id).is("read_at", null).neq("sender_id", profile.id),
      ]);
      return {
        id: conversation.id,
        listingType: conversation.listing_type,
        listingId: conversation.listing_id,
        otherPartyId: peerId,
        otherPartyName: peerResult.data?.full_name || "Marketplace member",
        listingTitle: listingResult.data?.title || "Listing unavailable",
        conversationId: conversation.id,
        peerAvatar: peerResult.data?.avatar_url || null,
        latestMessage: latestResult.data?.content || "Start the conversation",
        latestAt: latestResult.data?.created_at || conversation.created_at,
        unread: unreadResult.count || 0,
      } as ConversationRow;
    }));
    setConversations(items);
    setActive((current) => current ? items.find((item) => item.id === current.id) || null : null);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    if (!profile) {
      setLoading(false);
      setError("Your Ziba profile could not be loaded. Sign out and sign back in; if this continues, check that your API and MongoDB connection are available.");
      return;
    }
    setLoading(true);
    setError("");
    void refresh();
    const channel = db.channel(`inbox:${profile.id}`).on("postgres_changes", {
      event: "INSERT", schema: "public", table: "messages",
    }, () => { void refresh(); }).subscribe();
    return () => { void db.removeChannel(channel); };
  }, [profile, refresh]);

  return <div className="page-shell py-8 min-h-screen">
    <header className="mb-6">
      <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "var(--primary)" }}>Your inbox</p>
      <h1 className="font-display text-3xl md:text-4xl">Messages</h1>
      <p className="text-sm mt-2" style={{ color: "var(--muted-foreground)" }}>Chat with sellers, landlords, and service providers about their listings.</p>
    </header>

    {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: "#FEE2E2", color: "#991B1B" }}>{error}</div>}

    <div className="grid lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.5fr)] gap-4 items-start">
      <section className={`${active ? "hidden lg:block" : "block"} rounded-2xl border overflow-hidden min-h-[min(460px,calc(100dvh-12rem))]`} style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="px-5 py-4 border-b font-semibold text-sm" style={{ borderColor: "var(--border)" }}>Conversations <span className="font-normal" style={{ color: "var(--muted-foreground)" }}>({conversations.length})</span></div>
        {loading ? <LoadingAnimation label="Loading conversations" /> : conversations.length === 0 ? (
          <div className="p-7 text-center">
            <span className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: "var(--secondary)", color: "var(--primary)" }}><IcMessage size={19}/></span>
            <p className="font-medium text-sm">No conversations yet</p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--muted-foreground)" }}>Open a listing and choose Contact to start chatting with its lister.</p>
          </div>
        ) : conversations.map((conversation) => (
          <button key={conversation.id} onClick={() => setActive(conversation)} className="w-full text-left p-4 border-b flex items-center gap-3 hover:bg-[var(--secondary)] transition-colors" style={{ borderColor: "var(--border)", background: active?.id === conversation.id ? "var(--secondary)" : undefined }}>
            {conversation.peerAvatar ? <img src={conversation.peerAvatar} alt="" className="w-10 h-10 rounded-full object-cover" /> : <span className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-semibold text-sm" style={{ background: "var(--secondary)", color: "var(--primary)" }}>{conversation.otherPartyName.slice(0, 1).toUpperCase()}</span>}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold truncate">{conversation.otherPartyName}</span>
              <span className="block text-xs truncate" style={{ color: "var(--muted-foreground)" }}>{conversation.listingTitle}</span>
              <span className="block text-xs truncate mt-1" style={{ color: "var(--muted-foreground)" }}>{conversation.latestMessage}</span>
            </span>
            <span className="flex flex-col items-end gap-1 shrink-0">
              <time className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{new Date(conversation.latestAt).toLocaleDateString()}</time>
              {conversation.unread > 0 && <span className="min-w-5 h-5 px-1 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: "var(--primary)", color: "white" }}>{conversation.unread > 9 ? "9+" : conversation.unread}</span>}
            </span>
          </button>
        ))}
      </section>

      <section className={`${active ? "block" : "hidden lg:flex"} min-h-[min(460px,calc(100dvh-12rem))] items-center justify-center rounded-2xl border p-3 sm:p-5`} style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        {active ? <MessageModal page {...active} onClose={() => setActive(null)} /> : <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Select a conversation to view your messages.</p>}
      </section>
    </div>
  </div>;
}
