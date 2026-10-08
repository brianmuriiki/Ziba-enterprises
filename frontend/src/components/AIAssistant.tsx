import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { db, request } from "../lib/client";
import { IcArrowRight, IcX } from "../lib/icons";

type ListingType = "product" | "property" | "service";
interface ListingReference {
  id: string;
  type: ListingType;
  title: string;
  description?: string;
  location?: string | null;
  category?: string | null;
  price?: number | null;
  price_range?: string | null;
  compare_at_price?: number | null;
  transaction_type?: string | null;
}
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  listings?: ListingReference[];
}

const starterMessage: ChatMessage = {
  role: "assistant",
  content: "Hi! I can help you find products, homes, and services on Ziba, or answer questions about how the marketplace works. What are you looking for?",
};

export default function AIAssistant({ onViewListing }: { onViewListing: (listing: any) => void }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([starterMessage]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openingListing, setOpeningListing] = useState<string | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messageListRef.current) messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  }, [messages, open]);

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const userMessage: ChatMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);
    try {
      const result = await request("/assistant/chat", {
        method: "POST",
        body: JSON.stringify({ messages: nextMessages.map(({ role, content }) => ({ role, content })) }),
      });
      setMessages((current) => [...current, { role: "assistant", content: result.message, listings: result.listings || [] }]);
    } catch (cause: any) {
      setError(cause?.message || "The assistant is temporarily unavailable. Try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  async function showListing(listing: ListingReference) {
    setOpeningListing(listing.id);
    const table = listing.type === "product" ? "products" : listing.type === "property" ? "properties" : "services";
    const { data } = await db.from(table).select("*").eq("id", listing.id).maybeSingle();
    setOpeningListing(null);
    if (data) onViewListing({ ...data, _type: listing.type });
    else setError("That listing is no longer available.");
  }

  return (
    <div className="fixed bottom-5 right-4 z-40 sm:right-6">
      {open && <section className="mb-3 flex h-[min(76dvh,42rem)] w-[calc(100vw-2rem)] max-w-[25rem] flex-col overflow-hidden rounded-2xl border shadow-2xl" style={{ background: "var(--card)", borderColor: "var(--border)" }} aria-label="Ziba AI assistant">
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "var(--secondary)", color: "var(--primary)" }} aria-hidden="true"><AssistantIcon /></span>
            <div><h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Ziba Assistant</h2><p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Marketplace guide</p></div>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--secondary)]" style={{ color: "var(--muted-foreground)" }} aria-label="Close assistant"><IcX size={18} /></button>
        </header>

        <div ref={messageListRef} className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
          {messages.map((message, index) => <div key={`${index}-${message.role}`} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className="max-w-[92%]">
              <div className="rounded-2xl px-3.5 py-3 text-sm leading-relaxed whitespace-pre-wrap" style={message.role === "user" ? { background: "var(--primary)", color: "var(--primary-foreground)" } : { background: "var(--secondary)", color: "var(--foreground)" }}>{message.content}</div>
              {!!message.listings?.length && <div className="mt-2 space-y-2">{message.listings.map((listing) => <article key={`${listing.type}-${listing.id}`} className="rounded-xl border p-3" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>{listing.type === "property" ? listing.transaction_type === "sale" ? "Home for sale" : "Home for rent" : listing.type === "service" ? "Service" : listing.category || "Product"}</p>
                <h3 className="mt-1 text-sm font-semibold" style={{ color: "var(--foreground)" }}>{listing.title}</h3>
                <div className="mt-1 flex items-center justify-between gap-2"><span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{listing.location || "Kenya"}</span><span className="shrink-0 text-right"><b className="block text-xs" style={{ color: "var(--primary)" }}>{listing.price_range || (listing.price != null ? `KES ${Number(listing.price).toLocaleString()}${listing.type === "property" && listing.transaction_type !== "sale" ? "/mo" : ""}` : "View details")}</b>{Number(listing.compare_at_price) > Number(listing.price) && <span className="block text-[10px] line-through" style={{ color: "var(--muted-foreground)" }}>KES {Number(listing.compare_at_price).toLocaleString()}</span>}</span></div>
                <button type="button" disabled={openingListing === listing.id} onClick={() => void showListing(listing)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold disabled:opacity-60" style={{ color: "var(--primary)" }}>{openingListing === listing.id ? "Opening…" : "View listing"}<IcArrowRight size={13} /></button>
              </article>)}</div>}
            </div>
          </div>)}
          {loading && <div className="flex justify-start"><div className="rounded-2xl px-4 py-3 text-sm" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>Searching Ziba…</div></div>}
        </div>

        {error && <p className="mx-4 mb-2 rounded-lg px-3 py-2 text-xs" style={{ background: "#FEE2E2", color: "#991B1B" }} role="alert">{error}</p>}
        <form onSubmit={(event) => void sendMessage(event)} className="border-t p-3" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-end gap-2 rounded-2xl border p-2" style={{ background: "var(--background)", borderColor: "var(--border)" }}>
            <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleKeyDown} maxLength={2000} rows={1} placeholder="Ask about products, homes, or services…" aria-label="Message the Ziba assistant" className="max-h-28 min-h-10 flex-1 resize-y bg-transparent px-2 py-2 text-sm outline-none" style={{ color: "var(--foreground)" }} />
            <button type="submit" disabled={loading || !input.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl disabled:opacity-50" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }} aria-label="Send message"><SendIcon /></button>
          </div>
          <p className="mt-2 px-1 text-[10px] leading-relaxed" style={{ color: "var(--muted-foreground)" }}>AI answers may be inaccurate. Confirm listing details with the lister. Never share passwords or PINs.</p>
        </form>
      </section>}

      <div className="flex justify-end">
        <button type="button" onClick={() => setOpen((value) => !value)} className="flex h-14 items-center gap-2 rounded-full px-5 font-semibold shadow-lg transition-transform hover:-translate-y-0.5" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }} aria-expanded={open} aria-label={open ? "Close Ziba Assistant" : "Ask Ziba Assistant"}>
          {open ? <IcX size={19} /> : <AssistantIcon />}<span>{open ? "Close" : "Ask Ziba"}</span>
        </button>
      </div>
    </div>
  );
}

function AssistantIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3a7 7 0 0 0-7 7v2a3 3 0 0 0 3 3h1v-5H8a3 3 0 0 0-3 3"/><path d="M12 3a7 7 0 0 1 7 7v2a3 3 0 0 1-3 3h-1v-5h1a3 3 0 0 1 3 3"/><path d="M8 18c1 1 2.2 1.5 4 1.5 2 0 3.3-.6 4-1.5M12 6v1m-3 2 1 .5m5-.5-1 .5"/></svg>;
}

function SendIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>;
}
