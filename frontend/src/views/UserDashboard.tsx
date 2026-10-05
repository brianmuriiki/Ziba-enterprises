import { useCallback, useEffect, useState } from "react";
import { supabase, type Profile } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { IcCheck, IcHome, IcMessage, IcShoppingBag, IcTrash, IcWrench } from "../lib/icons";
import type { MsgTarget } from "../App";

type Tab = "overview" | "analysis" | "listings" | "saved" | "messages" | "activity" | "profile";

export default function UserDashboard({ onCreateListing, onOpenConversation, onApplyRole }: { onCreateListing: () => void; onOpenConversation: (target: MsgTarget) => void; onApplyRole: (role: "seller" | "landlord" | "service_provider") => void }) {
  const { profile, user, roles, refreshProfile } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [listings, setListings] = useState<any[]>([]);
  const [saved, setSaved] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [reviewedOrders, setReviewedOrders] = useState<string[]>([]);
  const [reviewingOrder, setReviewingOrder] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!profile) return;
    const tables = ["products", "properties", "services"] as const;
    const owners = ["seller_id", "landlord_id", "provider_id"] as const;
    const listingRows = await Promise.all(tables.map((table, i) => supabase.from(table).select("*").eq(owners[i], profile.id).order("created_at", { ascending: false })));
    setListings(listingRows.flatMap((r, i) => (r.data || []).map((item: any) => ({ ...item, type: tables[i] }))));
    const [savedRows, orderRows, noticeRows, conversationRows, reviewRows] = await Promise.all([
      supabase.from("saved_listings").select("*").eq("profile_id", profile.id).order("created_at", { ascending: false }),
      supabase.from("orders").select("*").or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`).order("created_at", { ascending: false }),
      supabase.from("notifications").select("*").eq("profile_id", profile.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("conversations").select("*").or(`buyer_id.eq.${profile.id},other_party_id.eq.${profile.id}`).order("created_at", { ascending: false }),
      supabase.from("reviews").select("order_id").eq("reviewer_id", profile.id),
    ]);
    const savedRowsWithListing = await Promise.all((savedRows.data || []).map(async (row: any) => {
      const table = row.listing_type === "product" ? "products" : row.listing_type === "property" ? "properties" : "services";
      const { data } = await supabase.from(table).select("id,title,status").eq("id", row.listing_id).maybeSingle();
      return { ...row, listing: data };
    }));
    setSaved(savedRowsWithListing);
    setOrders(orderRows.data || []);
    setReviewedOrders((reviewRows.data || []).map((row: any) => row.order_id));
    setNotifications(noticeRows.data || []);
    const conversationsWithContext = await Promise.all((conversationRows.data || []).map(async (conversation: any) => {
      const peerId = conversation.buyer_id === profile.id ? conversation.other_party_id : conversation.buyer_id;
      const table = conversation.listing_type === "product" ? "products" : conversation.listing_type === "property" ? "properties" : "services";
      const [peer, listing, latest] = await Promise.all([
        supabase.from("profiles_public").select("full_name").eq("id", peerId).maybeSingle(),
        supabase.from(table).select("title").eq("id", conversation.listing_id).maybeSingle(),
        supabase.from("messages").select("content,created_at").eq("conversation_id", conversation.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      return { ...conversation, peerId, peerName: peer.data?.full_name || "Marketplace member", listingTitle: listing.data?.title || "Listing", latestMessage: latest.data?.content || "Start the conversation", latestAt: latest.data?.created_at || conversation.created_at };
    }));
    setConversations(conversationsWithContext);
  }, [profile]);

  useEffect(() => { refresh(); }, [refresh]);

  async function removeListing(item: any) {
    const owner = item.type === "products" ? "seller_id" : item.type === "properties" ? "landlord_id" : "provider_id";
    const { error } = await supabase.from(item.type).delete().eq("id", item.id).eq(owner, profile!.id);
    setMessage(error?.message || "Listing removed.");
    refresh();
  }

  async function setPropertyAvailability(id: string, available: boolean) {
    const { error } = await supabase.from("properties").update({ availability_status: available ? "available" : "taken" }).eq("id", id).eq("landlord_id", profile!.id);
    setMessage(error?.message || `Property marked ${available ? "available" : "taken"}.`);
    refresh();
  }

  async function updateOrder(id: string, status: string) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    setMessage(error?.message || `Request marked ${status.replaceAll("_", " ")}.`);
    refresh();
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    const { error } = await supabase.from("profiles").update({ full_name: fullName.trim(), phone: phone.trim() || null }).eq("id", profile!.id);
    if (!error) await refreshProfile();
    setMessage(error?.message || "Profile updated."); setBusy(false);
  }

  async function markRead(id: string) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    refresh();
  }

  async function submitReview(order: any) {
    const { error } = await supabase.from("reviews").insert({ order_id: order.id, reviewer_id: profile!.id, reviewee_id: order.seller_id, rating, comment: reviewComment.trim() });
    setMessage(error?.message || "Thanks for sharing your experience.");
    if (!error) setReviewingOrder(null);
    refresh();
  }

  const approvedListingRoles = roles.filter((role) => role.status === "approved" && ["seller", "landlord", "service_provider"].includes(role.role));
  const roleAnalytics = [
    { role: "seller", listingType: "products", orderType: "product", title: "Seller analysis", activity: "Purchase requests", listingBreakdownTitle: "Product status", listingStates: ["active", "draft", "sold", "taken", "rejected", "suspended"] },
    { role: "landlord", listingType: "properties", orderType: "property", title: "Landlord analysis", activity: "Viewing requests", listingBreakdownTitle: "Property availability", listingStates: ["available", "taken"] },
    { role: "service_provider", listingType: "services", orderType: "service", title: "Service provider analysis", activity: "Booking requests", listingBreakdownTitle: "Service status", listingStates: ["active", "draft", "rejected", "suspended"] },
  ].filter((group) => approvedListingRoles.some((role) => role.role === group.role)).map((group) => {
    const roleListings = listings.filter((item) => item.type === group.listingType);
    const requests = orders.filter((order) => order.seller_id === profile?.id && order.listing_type === group.orderType);
    const requestStatuses = ["pending", "accepted", "completed", "rejected", "cancelled"].map((status) => ({
      label: status.replaceAll("_", " "),
      value: requests.filter((request) => request.status === status).length,
    }));
    const listingStatuses = group.listingStates.map((status) => ({
      label: status,
      value: roleListings.filter((listing) => (group.role === "landlord" ? listing.availability_status : listing.status) === status).length,
    }));
    return { ...group, roleListings, requests, requestStatuses, listingStatuses };
  });
  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    ...(approvedListingRoles.length ? [{ id: "analysis" as const, label: "Analysis" }] : []),
    { id: "listings", label: "My listings" }, { id: "saved", label: "Saved" }, { id: "messages", label: "Messages" }, { id: "activity", label: "Activity" }, { id: "profile", label: "Profile" },
  ];
  return <div className="max-w-7xl mx-auto px-5 md:px-10 py-10 min-h-screen">
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8"><div><p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "var(--primary)" }}>Your space</p><h1 className="font-display text-3xl md:text-4xl">Good to see you, {profile?.full_name?.split(" ")[0] || "there"}.</h1><p className="text-sm mt-2" style={{ color: "var(--muted-foreground)" }}>{user?.email}</p></div><button onClick={onCreateListing} className="px-5 py-3 rounded-full text-sm font-semibold" style={{ background: "var(--primary)", color: "white" }}>Create a listing</button></header>
    <nav className="flex gap-1 overflow-x-auto border-b mb-6" style={{ borderColor: "var(--border)" }}>{tabs.map((item) => <button key={item.id} onClick={() => { setTab(item.id); setMessage(""); }} className="px-4 py-3 text-sm border-b-2 whitespace-nowrap" style={{ borderColor: tab === item.id ? "var(--primary)" : "transparent", color: tab === item.id ? "var(--primary)" : "var(--muted-foreground)" }}>{item.label}</button>)}</nav>
    {message && <div className="mb-5 p-3 rounded-xl text-sm" style={{ background: "#EAF2F0", color: "var(--accent)" }}>{message}</div>}
    {tab === "overview" && <><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">{[["My listings", listings.length, <IcHome/>], ["Saved", saved.length, <IcCheck/>], ["Requests", orders.length, <IcMessage/>], ["Unread updates", notifications.filter((n) => !n.read_at).length, <IcShoppingBag/>]].map(([label, value, icon]) => <div key={String(label)} className="p-5 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}><div className="flex justify-between text-sm" style={{ color: "var(--muted-foreground)" }}><span>{label}</span>{icon}</div><div className="font-display text-3xl mt-3">{value}</div></div>)}</div><div className="grid lg:grid-cols-2 gap-5"><section className="p-5 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}><h2 className="font-display text-xl mb-4">Your roles</h2>{roles.map((r) => <div key={r.id} className="flex justify-between py-3 border-t text-sm capitalize" style={{ borderColor: "var(--border)" }}><span>{r.role.replaceAll("_", " ")}</span><span style={{ color: r.status === "approved" ? "var(--accent)" : "var(--primary)" }}>{r.status}</span></div>)}{roles.length === 0 && <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Your buyer account is ready. Apply for a listing role to get started.</p>}</section><section className="p-5 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}><h2 className="font-display text-xl mb-4">Recent activity</h2>{orders.slice(0, 4).map((o) => <div key={o.id} className="py-3 border-t text-sm flex justify-between capitalize" style={{ borderColor: "var(--border)" }}><span>{o.listing_type} request</span><span style={{ color: "var(--muted-foreground)" }}>{o.status.replaceAll("_", " ")}</span></div>)}{orders.length === 0 && <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Purchase, viewing, and booking requests will show here.</p>}</section></div></>}
    {tab === "analysis" && <div className="space-y-5">
      <div><p className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: "var(--primary)" }}>Your performance</p><h2 className="font-display text-2xl md:text-3xl">Role analysis</h2><p className="text-sm mt-2" style={{ color: "var(--muted-foreground)" }}>A snapshot of your listings and incoming marketplace requests.</p></div>
      {roleAnalytics.map((group) => <section key={group.role} className="rounded-2xl border p-5 md:p-6" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5"><div><h3 className="font-display text-xl">{group.title}</h3><p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>Based on current listing and request records.</p></div><div className="text-sm" style={{ color: "var(--muted-foreground)" }}>Rating <b style={{ color: "var(--foreground)" }}>{profile?.rating_avg?.toFixed(1) || "0.0"} / 5</b> · {profile?.review_count || 0} reviews</div></div>
        <div className="grid sm:grid-cols-3 gap-3 mb-5">
          <Metric label="Listings" value={group.roleListings.length} />
          <Metric label={group.role === "landlord" ? "Available properties" : "Active listings"} value={group.roleListings.filter((item) => item.status === "active" && (group.role !== "landlord" || item.availability_status === "available")).length} />
          <Metric label={group.activity} value={group.requests.length} />
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <MiniBarChart title="Incoming request status" items={group.requestStatuses} />
          <MiniBarChart title={group.listingBreakdownTitle} items={group.listingStatuses} />
        </div>
      </section>)}
    </div>}
    {tab === "listings" && <section className="rounded-2xl border overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)" }}>{listings.map((item) => <div key={`${item.type}-${item.id}`} className="p-4 border-b flex flex-wrap items-center justify-between gap-3" style={{ borderColor: "var(--border)" }}><div><b className="text-sm">{item.title}</b><div className="text-xs capitalize mt-1" style={{ color: "var(--muted-foreground)" }}>{item.type.slice(0, -1)} · {item.status}</div></div><div className="flex gap-2 items-center">{item.type === "properties" && <button onClick={() => setPropertyAvailability(item.id, item.status === "taken")} className="px-3 py-1.5 rounded-full border text-xs" style={{ borderColor: "var(--border)" }}>Mark {item.status === "taken" ? "available" : "taken"}</button>}<button onClick={() => removeListing(item)} className="p-2 rounded-lg border text-red-700" style={{ borderColor: "var(--border)" }} title="Delete listing"><IcTrash size={14}/></button></div></div>)}{listings.length === 0 && <Empty>You have not published any listings yet.</Empty>}</section>}
    {tab === "saved" && <section className="rounded-2xl border overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)" }}>{saved.map((row) => <div key={row.id} className="p-4 border-b flex justify-between capitalize" style={{ borderColor: "var(--border)" }}><span>{row.listing?.title || "Listing unavailable"}</span><span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{row.listing_type} · {row.listing?.status || "removed"}</span></div>)}{saved.length === 0 && <Empty>Saved listings will be collected here.</Empty>}</section>}
    {tab === "messages" && <section className="rounded-2xl border overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)" }}>{conversations.map((conversation) => <button key={conversation.id} onClick={() => onOpenConversation({ listingType: conversation.listing_type, listingId: conversation.listing_id, otherPartyId: conversation.peerId, otherPartyName: conversation.peerName, listingTitle: conversation.listingTitle, conversationId: conversation.id })} className="w-full text-left p-4 border-b flex items-center gap-3 hover:bg-[var(--secondary)]" style={{ borderColor: "var(--border)" }}><span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--secondary)", color: "var(--primary)" }}><IcMessage size={16}/></span><span className="min-w-0 flex-1"><b className="block text-sm truncate">{conversation.peerName} · {conversation.listingTitle}</b><span className="block text-xs truncate" style={{ color: "var(--muted-foreground)" }}>{conversation.latestMessage}</span></span><time className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{new Date(conversation.latestAt).toLocaleDateString()}</time></button>)}{conversations.length === 0 && <Empty>Your listing conversations will appear here.</Empty>}</section>}
    {tab === "activity" && <div className="space-y-6"><section className="rounded-2xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}><h2 className="font-display text-xl mb-3">Requests</h2>{orders.map((o) => <div key={o.id} className="py-3 border-t flex flex-wrap justify-between gap-3 text-sm" style={{ borderColor: "var(--border)" }}><span className="capitalize">{o.listing_type} · {o.status.replaceAll("_", " ")}</span>{o.seller_id === profile?.id && o.status === "pending" && <div className="flex gap-2"><button onClick={() => updateOrder(o.id, "accepted")} className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Accept</button><button onClick={() => updateOrder(o.id, "rejected")} className="text-xs font-semibold text-red-700">Decline</button></div>}{o.seller_id === profile?.id && o.status === "accepted" && <button onClick={() => updateOrder(o.id, "completed")} className="text-xs font-semibold" style={{ color: "var(--primary)" }}>Mark complete</button>}{o.buyer_id === profile?.id && ["pending", "accepted"].includes(o.status) && <button onClick={() => updateOrder(o.id, "cancelled")} className="text-xs font-semibold text-red-700">Cancel request</button>}{o.buyer_id === profile?.id && o.status === "completed" && !reviewedOrders.includes(o.id) && <button onClick={() => { setReviewingOrder(reviewingOrder === o.id ? null : o.id); setRating(5); }} className="text-xs font-semibold" style={{ color: "var(--primary)" }}>Leave a review</button>}{reviewingOrder === o.id && <div className="basis-full rounded-xl p-4" style={{ background: "var(--secondary)" }}><label className="block text-xs mb-2">Rating <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="ml-2 border rounded px-2 py-1">{[5,4,3,2,1].map((n) => <option key={n} value={n}>{n} stars</option>)}</select></label><textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={2} placeholder="How did it go?" className="input-base resize-none"/><button onClick={() => submitReview(o)} className="mt-2 px-4 py-2 rounded-full text-xs font-semibold" style={{ background: "var(--primary)", color: "white" }}>Post review</button></div>}</div>)}{orders.length === 0 && <Empty>Your activity and requests will appear here.</Empty>}</section><section className="rounded-2xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}><h2 className="font-display text-xl mb-3">Notifications</h2>{notifications.map((n) => <button key={n.id} onClick={() => markRead(n.id)} className="w-full text-left py-3 border-t" style={{ borderColor: "var(--border)", opacity: n.read_at ? 0.65 : 1 }}><b className="text-sm block">{n.title}</b><span className="text-xs">{n.body}</span></button>)}{notifications.length === 0 && <Empty>You are all caught up.</Empty>}</section></div>}
    {tab === "profile" && <div className="space-y-5"><form onSubmit={saveProfile} className="max-w-xl p-6 rounded-2xl border space-y-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}><h2 className="font-display text-2xl">Profile details</h2><Field label="Full name"><input className="input-base" value={fullName} onChange={(e) => setFullName(e.target.value)} required/></Field><Field label="Email"><input className="input-base opacity-60" value={user?.email || ""} readOnly/></Field><Field label="Phone"><input className="input-base" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254…"/></Field><button disabled={busy} className="px-5 py-2.5 rounded-full text-sm font-semibold" style={{ background: "var(--primary)", color: "white" }}>{busy ? "Saving…" : "Save changes"}</button></form><section className="max-w-xl p-6 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}><h2 className="font-display text-2xl">Listing roles</h2><p className="text-sm my-3" style={{ color: "var(--muted-foreground)" }}>Apply to list products, homes, or services. Each role is reviewed separately.</p><div className="space-y-2">{([["seller", "Seller"], ["landlord", "Landlord"], ["service_provider", "Service Provider"]] as const).map(([role, label]) => { const application = roles.find((item) => item.role === role); return <div key={role} className="flex items-center justify-between gap-3 py-2 border-t" style={{ borderColor: "var(--border)" }}><span className="text-sm">{label}</span>{application?.status === "approved" ? <span className="text-xs" style={{ color: "var(--accent)" }}>Approved</span> : application?.status === "pending" ? <span className="text-xs" style={{ color: "var(--primary)" }}>Under review</span> : <button onClick={() => onApplyRole(role)} className="text-xs font-semibold" style={{ color: "var(--primary)" }}>{application?.status === "rejected" ? "Resubmit application" : "Apply"}</button>}</div>; })}</div></section></div>}
  </div>;
}

function Empty({ children }: { children: React.ReactNode }) { return <p className="py-6 text-sm" style={{ color: "var(--muted-foreground)" }}>{children}</p>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm">{label}<div className="mt-1">{children}</div></label>; }
function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl p-4" style={{ background: "var(--secondary)" }}><div className="text-xs capitalize" style={{ color: "var(--muted-foreground)" }}>{label}</div><div className="font-display text-2xl mt-1">{value.toLocaleString()}</div></div>;
}
function MiniBarChart({ title, items }: { title: string; items: { label: string; value: number }[] }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return <section className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }} aria-label={title}>
    <h4 className="text-sm font-semibold mb-4">{title}</h4>
    <div className="space-y-3">{items.map((item) => <div key={item.label}>
      <div className="flex justify-between text-xs mb-1"><span className="capitalize" style={{ color: "var(--muted-foreground)" }}>{item.label}</span><b>{item.value}</b></div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--secondary)" }} role="img" aria-label={`${item.label}: ${item.value}`}><div className="h-full rounded-full" style={{ width: `${(item.value / max) * 100}%`, background: "var(--primary)" }} /></div>
    </div>)}</div>
  </section>;
}
