import { useCallback, useEffect, useState } from "react";
import { db } from "../lib/client";
import { type Profile } from "../lib/models";
import { useAuth } from "../lib/auth-context";
import { IcCheck, IcHome, IcMessage, IcShoppingBag, IcTrash, IcWrench } from "../lib/icons";
import type { MsgTarget } from "../App";

type Tab = "overview" | "analysis" | "listings" | "saved" | "alerts" | "messages" | "activity" | "profile";
type WorkspaceRole = "seller" | "landlord" | "service_provider";

export default function UserDashboard({ onCreateListing, onOpenConversation, onApplyRole, onViewListing }: { onCreateListing: (type?: "product" | "property" | "service") => void; onOpenConversation: (target: MsgTarget) => void; onApplyRole: (role: "seller" | "landlord" | "service_provider" | "all") => void; onViewListing: (listing: any) => void }) {
  const { profile, user, roles, refreshProfile } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceRole | null>(() => {
    const saved = localStorage.getItem("ziba.workspace-role");
    return saved === "seller" || saved === "landlord" || saved === "service_provider" ? saved : null;
  });
  const [listings, setListings] = useState<any[]>([]);
  const [saved, setSaved] = useState<any[]>([]);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [reviewedOrders, setReviewedOrders] = useState<string[]>([]);
  const [reviewingOrder, setReviewingOrder] = useState<string | null>(null);
  const [reschedulingOrder, setReschedulingOrder] = useState<string | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState("");
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
    const listingRows = await Promise.all(tables.map((table, i) => db.from(table).select("*").eq(owners[i], profile.id).order("created_at", { ascending: false })));
    setListings(listingRows.flatMap((r, i) => (r.data || []).map((item: any) => ({ ...item, type: tables[i] }))));
    const [savedRows, searchRows, orderRows, noticeRows, conversationRows, reviewRows] = await Promise.all([
      db.from("saved_listings").select("*").eq("profile_id", profile.id).order("created_at", { ascending: false }),
      db.from("saved_searches").select("*").eq("profile_id", profile.id).order("created_at", { ascending: false }),
      db.from("orders").select("*").or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`).order("created_at", { ascending: false }),
      db.from("notifications").select("*").eq("profile_id", profile.id).order("created_at", { ascending: false }).limit(20),
      db.from("conversations").select("*").or(`buyer_id.eq.${profile.id},other_party_id.eq.${profile.id}`).order("created_at", { ascending: false }),
      db.from("reviews").select("order_id").eq("reviewer_id", profile.id),
    ]);
    const savedRowsWithListing = await Promise.all((savedRows.data || []).map(async (row: any) => {
      const table = row.listing_type === "product" ? "products" : row.listing_type === "property" ? "properties" : "services";
      const { data } = await db.from(table).select("id,title,status").eq("id", row.listing_id).maybeSingle();
      return { ...row, listing: data };
    }));
    setSaved(savedRowsWithListing);
    setSavedSearches(searchRows.data || []);
    setOrders(orderRows.data || []);
    setReviewedOrders((reviewRows.data || []).map((row: any) => row.order_id));
    setNotifications(noticeRows.data || []);
    const conversationsWithContext = await Promise.all((conversationRows.data || []).map(async (conversation: any) => {
      const peerId = conversation.buyer_id === profile.id ? conversation.other_party_id : conversation.buyer_id;
      const table = conversation.listing_type === "product" ? "products" : conversation.listing_type === "property" ? "properties" : "services";
      const [peer, listing, latest] = await Promise.all([
        db.from("profiles_public").select("full_name").eq("id", peerId).maybeSingle(),
        db.from(table).select("title").eq("id", conversation.listing_id).maybeSingle(),
        db.from("messages").select("content,created_at").eq("conversation_id", conversation.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      return { ...conversation, peerId, peerName: peer.data?.full_name || "Marketplace member", listingTitle: listing.data?.title || "Listing", latestMessage: latest.data?.content || "Start the conversation", latestAt: latest.data?.created_at || conversation.created_at };
    }));
    setConversations(conversationsWithContext);
  }, [profile]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (!profile) return;
    const timer = window.setInterval(async () => {
      const { data } = await db.from("notifications").select("*").eq("profile_id", profile.id).order("created_at", { ascending: false }).limit(20);
      if (data) setNotifications(data);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [profile]);

  async function removeListing(item: any) {
    const owner = item.type === "products" ? "seller_id" : item.type === "properties" ? "landlord_id" : "provider_id";
    const { error } = await db.from(item.type).delete().eq("id", item.id).eq(owner, profile!.id);
    setMessage(error?.message || "Listing removed.");
    refresh();
  }

  async function removeSavedSearch(id: string) {
    const { error } = await db.from("saved_searches").delete().eq("id", id).eq("profile_id", profile!.id);
    setMessage(error?.message || "Search alert removed.");
    refresh();
  }

  async function setPropertyAvailability(id: string, available: boolean) {
    const { error } = await db.from("properties").update({ availability_status: available ? "available" : "taken" }).eq("id", id).eq("landlord_id", profile!.id);
    setMessage(error?.message || `Property marked ${available ? "available" : "taken"}.`);
    refresh();
  }

  async function updateOrder(id: string, status: string) {
    const { error } = await db.from("orders").update({ status }).eq("id", id);
    setMessage(error?.message || `Request marked ${status.replaceAll("_", " ")}.`);
    refresh();
  }

  async function updateSchedule(id: string) {
    const proposedAt = new Date(scheduleDraft);
    if (!Number.isFinite(proposedAt.getTime()) || proposedAt.getTime() <= Date.now()) { setMessage("Choose a future date and time."); return; }
    const { error } = await db.from("orders").update({ scheduled_at: proposedAt.toISOString() }).eq("id", id);
    setMessage(error?.message || "Requested time updated. The other person has been notified.");
    if (!error) setReschedulingOrder(null);
    refresh();
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    const { error } = await db.from("profiles").update({ full_name: fullName.trim(), phone: phone.trim() || null }).eq("id", profile!.id);
    if (!error) await refreshProfile();
    setMessage(error?.message || "Profile updated."); setBusy(false);
  }

  async function markRead(id: string) {
    await db.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    refresh();
  }

  async function openNotification(notification: any) {
    await markRead(notification.id);
    if (!notification.listing_type || !notification.listing_id) return;
    const table = notification.listing_type === "product" ? "products" : notification.listing_type === "property" ? "properties" : "services";
    const { data } = await db.from(table).select("*").eq("id", notification.listing_id).maybeSingle();
    if (data) onViewListing({ ...data, _type: notification.listing_type });
  }

  async function submitReview(order: any) {
    const { error } = await db.from("reviews").insert({ order_id: order.id, reviewer_id: profile!.id, reviewee_id: order.seller_id, rating, comment: reviewComment.trim() });
    setMessage(error?.message || "Thanks for sharing your experience.");
    if (!error) setReviewingOrder(null);
    refresh();
  }

  const approvedListingRoles = roles.filter((role) => role.status === "approved" && ["seller", "landlord", "service_provider"].includes(role.role));
  const canCreateListing = approvedListingRoles.length > 0;
  const activeRole = approvedListingRoles.some((role) => role.role === workspaceRole)
    ? workspaceRole
    : (approvedListingRoles[0]?.role as WorkspaceRole | undefined) || null;
  const workspaceRoleLabels: Record<WorkspaceRole, string> = { seller: "Seller", landlord: "Landlord", service_provider: "Service provider" };
  useEffect(() => {
    if (activeRole && workspaceRole !== activeRole) setWorkspaceRole(activeRole);
    if (activeRole) localStorage.setItem("ziba.workspace-role", activeRole);
  }, [activeRole, workspaceRole]);
  const primaryRole = activeRole;
  const roleName = primaryRole ? workspaceRoleLabels[primaryRole] : null;
  const listingActionLabel = primaryRole === "landlord"
    ? "Post a vacant home"
    : primaryRole === "service_provider"
      ? "Post Service"
      : primaryRole === "seller" ? "Post a product" : "Create a listing";
  const roleAnalytics = [
    { role: "seller", listingType: "products", orderType: "product", title: "Seller analysis", resource: "products", activity: "Purchase requests", requestStatusTitle: "Purchase request status", listingBreakdownTitle: "Product status", listingStates: ["active", "draft", "sold", "taken", "rejected", "suspended"] },
    { role: "landlord", listingType: "properties", orderType: "property", title: "Landlord analysis", resource: "properties", activity: "Viewing requests", requestStatusTitle: "Viewing request status", listingBreakdownTitle: "Property availability", listingStates: ["available", "taken"] },
    { role: "service_provider", listingType: "services", orderType: "service", title: "Service provider analysis", resource: "services", activity: "Booking requests", requestStatusTitle: "Booking request status", listingBreakdownTitle: "Service status", listingStates: ["active", "draft", "rejected", "suspended"] },
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
  const listingTabLabel = primaryRole === "service_provider" ? "My services" : primaryRole === "landlord" ? "My homes" : primaryRole === "seller" ? "My products" : "My listings";
  const activityTabLabel = primaryRole === "service_provider" ? "Bookings & activity" : primaryRole === "landlord" ? "Viewings & activity" : primaryRole === "seller" ? "Orders & activity" : "Activity";
  const primaryAnalytics = roleAnalytics.find((group) => group.role === primaryRole);
  const workspaceListings = primaryAnalytics?.roleListings ?? listings;
  const workspaceOrders = primaryAnalytics ? orders.filter((order) => order.listing_type === primaryAnalytics.orderType) : orders;
  const workspaceConversations = primaryAnalytics ? conversations.filter((conversation) => conversation.listing_type === primaryAnalytics.orderType) : conversations;
  const workspaceListingType = primaryRole === "landlord" ? "property" : primaryRole === "service_provider" ? "service" : primaryRole === "seller" ? "product" : undefined;
  const dashboardStats = primaryAnalytics ? [
    { label: primaryRole === "service_provider" ? "Services" : primaryRole === "landlord" ? "Properties" : "Products", value: primaryAnalytics.roleListings.length, icon: <IcHome /> },
    { label: primaryRole === "landlord" ? "Available homes" : `Active ${primaryAnalytics.resource}`, value: primaryAnalytics.roleListings.filter((item) => item.status === "active" && (primaryRole !== "landlord" || item.availability_status === "available")).length, icon: <IcCheck /> },
    { label: primaryAnalytics.activity, value: primaryAnalytics.requests.length, icon: <IcMessage /> },
    { label: "Unread updates", value: notifications.filter((item) => !item.read_at).length, icon: <IcShoppingBag /> },
  ] : canCreateListing ? [
    { label: "My listings", value: listings.length, icon: <IcHome /> },
    { label: "Active listings", value: listings.filter((item) => item.status === "active").length, icon: <IcCheck /> },
    { label: "Incoming requests", value: roleAnalytics.reduce((total, group) => total + group.requests.length, 0), icon: <IcMessage /> },
    { label: "Unread updates", value: notifications.filter((item) => !item.read_at).length, icon: <IcShoppingBag /> },
  ] : [
    { label: "Saved listings", value: saved.length, icon: <IcCheck /> },
    { label: "Requests sent", value: orders.filter((order) => order.buyer_id === profile?.id).length, icon: <IcShoppingBag /> },
    { label: "Conversations", value: conversations.length, icon: <IcMessage /> },
    { label: "Unread updates", value: notifications.filter((item) => !item.read_at).length, icon: <IcHome /> },
  ];
  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    ...(approvedListingRoles.length ? [{ id: "analysis" as const, label: roleName ? "Performance" : "Analysis" }] : []),
    ...(canCreateListing ? [{ id: "listings" as const, label: listingTabLabel }] : []),
    { id: "saved", label: "Saved" }, { id: "alerts", label: "Search alerts" }, { id: "messages", label: "Messages" }, { id: "activity", label: activityTabLabel }, { id: "profile", label: "Profile" },
  ];
  return <div className="page-shell py-10 min-h-screen">
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8"><div><p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "var(--primary)" }}>{roleName ? `${roleName} workspace` : "Your space"}</p><h1 className="font-display text-3xl md:text-4xl">Good to see you, {profile?.full_name?.split(" ")[0] || "there"}.</h1><p className="text-sm mt-2" style={{ color: "var(--muted-foreground)" }}>{user?.email}</p></div>{canCreateListing && <button onClick={() => onCreateListing(workspaceListingType)} className="px-5 py-3 rounded-full text-sm font-semibold" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>{listingActionLabel}</button>}</header>
    {approvedListingRoles.length > 1 && <section className="mb-7" aria-label="Choose your workspace"><p className="text-sm font-semibold mb-3">Your workspaces</p><div className="grid sm:grid-cols-3 gap-3">{(["seller", "landlord", "service_provider"] as const).filter((role) => approvedListingRoles.some((approved) => approved.role === role)).map((role) => { const selected = primaryRole === role; const icon = role === "seller" ? <IcShoppingBag size={18}/> : role === "landlord" ? <IcHome size={18}/> : <IcWrench size={18}/>; const description = role === "seller" ? "Products and purchase requests" : role === "landlord" ? "Homes and viewing requests" : "Services and bookings"; return <button key={role} type="button" aria-pressed={selected} onClick={() => { setWorkspaceRole(role); localStorage.setItem("ziba.workspace-role", role); setTab("overview"); setMessage(""); }} className="rounded-2xl border p-4 text-left transition-colors" style={{ background: selected ? "var(--secondary)" : "var(--card)", borderColor: selected ? "var(--primary)" : "var(--border)", color: "var(--foreground)" }}><span className="flex items-center gap-2 font-semibold">{icon}{workspaceRoleLabels[role]}{selected && <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>Open</span>}</span><span className="mt-1 block text-xs" style={{ color: "var(--muted-foreground)" }}>{description}</span></button>; })}</div></section>}
    <nav className="flex gap-1 overflow-x-auto border-b mb-6" style={{ borderColor: "var(--border)" }}>{tabs.map((item) => <button key={item.id} onClick={() => { setTab(item.id); setMessage(""); }} className="px-4 py-3 text-sm border-b-2 whitespace-nowrap" style={{ borderColor: tab === item.id ? "var(--primary)" : "transparent", color: tab === item.id ? "var(--primary)" : "var(--muted-foreground)" }}>{item.label}</button>)}</nav>
    {message && <div className="mb-5 p-3 rounded-xl text-sm" style={{ background: "#EAF2F0", color: "var(--accent)" }}>{message}</div>}
    {tab === "overview" && <><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">{dashboardStats.map(({ label, value, icon }) => <div key={label} className="p-5 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}><div className="flex justify-between text-sm" style={{ color: "var(--muted-foreground)" }}><span>{label}</span>{icon}</div><div className="font-display text-3xl mt-3">{value}</div></div>)}</div><div className="grid lg:grid-cols-2 gap-5"><section className="p-5 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}><h2 className="font-display text-xl mb-4">{roleName ? `${roleName} workspace` : "Your marketplace roles"}</h2>{roleName ? <><p className="text-sm mb-3" style={{ color: "var(--muted-foreground)" }}>{primaryRole === "seller" ? "Manage your products and respond to purchase requests." : primaryRole === "landlord" ? "Manage available homes and coordinate viewings." : "Manage your services and respond to booking requests."}</p><button onClick={() => onCreateListing(workspaceListingType)} className="px-4 py-2 rounded-full text-sm font-semibold" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>{listingActionLabel}</button></> : roles.map((r) => <div key={r.id} className="flex justify-between py-3 border-t text-sm capitalize" style={{ borderColor: "var(--border)" }}><span>{r.role.replaceAll("_", " ")}</span><span style={{ color: r.status === "approved" ? "var(--accent)" : "var(--primary)" }}>{r.status}</span></div>)}{roles.length === 0 && <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Your buyer account is ready. Apply for a listing role to get started.</p>}</section><section className="p-5 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}><h2 className="font-display text-xl mb-4">Recent {roleName ? roleName.toLowerCase() + " activity" : "activity"}</h2>{workspaceOrders.slice(0, 4).map((o) => <div key={o.id} className="py-3 border-t text-sm flex justify-between capitalize" style={{ borderColor: "var(--border)" }}><span>{o.listing_type} request</span><span style={{ color: "var(--muted-foreground)" }}>{o.status.replaceAll("_", " ")}</span></div>)}{workspaceOrders.length === 0 && <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Requests and updates for this workspace will show here.</p>}</section></div></>}
    {tab === "analysis" && <div className="space-y-5">
      <div><p className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: "var(--primary)" }}>{roleName ? `${roleName} performance` : "Your performance"}</p><h2 className="font-display text-2xl md:text-3xl">{roleName ? `${roleName} overview` : "Role analysis"}</h2><p className="text-sm mt-2" style={{ color: "var(--muted-foreground)" }}>{primaryRole === "service_provider" ? "Track your services and incoming booking requests." : primaryRole === "landlord" ? "Track your properties and incoming viewing requests." : primaryRole === "seller" ? "Track your products and incoming purchase requests." : "A snapshot of your listings and incoming marketplace requests."}</p></div>
      {roleAnalytics.filter((group) => group.role === primaryRole).map((group) => <section key={group.role} className="rounded-2xl border p-5 md:p-6" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5"><div><h3 className="font-display text-xl">Your {group.resource}</h3><p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>Based on your current {group.resource} and incoming requests.</p></div><div className="text-sm" style={{ color: "var(--muted-foreground)" }}>Rating <b style={{ color: "var(--foreground)" }}>{profile?.rating_avg?.toFixed(1) || "0.0"} / 5</b> · {profile?.review_count || 0} reviews</div></div>
        <div className="grid sm:grid-cols-3 gap-3 mb-5">
          <Metric label={group.role === "service_provider" ? "Services" : group.role === "landlord" ? "Properties" : "Products"} value={group.roleListings.length} />
          <Metric label={group.role === "landlord" ? "Available properties" : group.role === "service_provider" ? "Active services" : "Active products"} value={group.roleListings.filter((item) => item.status === "active" && (group.role !== "landlord" || item.availability_status === "available")).length} />
          <Metric label={group.activity} value={group.requests.length} />
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <MiniBarChart title={group.requestStatusTitle} items={group.requestStatuses} />
          <MiniBarChart title={group.listingBreakdownTitle} items={group.listingStatuses} />
        </div>
      </section>)}
    </div>}
    {tab === "listings" && <section className="rounded-2xl border overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)" }}>{workspaceListings.map((item) => <div key={`${item.type}-${item.id}`} className="p-4 border-b flex flex-wrap items-center justify-between gap-3" style={{ borderColor: "var(--border)" }}><div><b className="text-sm">{item.title}</b><div className="text-xs capitalize mt-1" style={{ color: item.moderation_status === "review" ? "#92400E" : "var(--muted-foreground)" }}>{item.type.slice(0, -1)}{item.type === "properties" ? ` · for ${item.transaction_type || "rent"}` : ""} · {item.moderation_status === "review" ? "under review" : item.status}</div></div><div className="flex gap-2 items-center">{item.type === "properties" && <button onClick={() => setPropertyAvailability(item.id, item.status === "taken")} className="px-3 py-1.5 rounded-full border text-xs" style={{ borderColor: "var(--border)" }}>{item.status === "taken" ? "Mark available" : item.transaction_type === "sale" ? "Mark sold" : "Mark taken"}</button>}<button onClick={() => removeListing(item)} className="p-2 rounded-lg border text-red-700" style={{ borderColor: "var(--border)" }} title="Delete listing"><IcTrash size={14}/></button></div></div>)}{workspaceListings.length === 0 && <Empty>{primaryRole === "service_provider" ? "You have not posted any services yet." : primaryRole === "landlord" ? "You have not posted any homes yet." : primaryRole === "seller" ? "You have not posted any products yet." : "You have not published any listings yet."}</Empty>}</section>}
    {tab === "saved" && <section className="rounded-2xl border overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)" }}>{saved.map((row) => <div key={row.id} className="p-4 border-b flex justify-between capitalize" style={{ borderColor: "var(--border)" }}><span>{row.listing?.title || "Listing unavailable"}</span><span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{row.listing_type} · {row.listing?.status || "removed"}</span></div>)}{saved.length === 0 && <Empty>Saved listings will be collected here.</Empty>}</section>}
    {tab === "alerts" && <section className="rounded-2xl border overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}><h2 className="font-display text-xl">Saved search alerts</h2><p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>We’ll notify you when a new listing matches these filters.</p></div>
      {savedSearches.map((savedSearch) => <div key={savedSearch.id} className="p-4 border-b flex flex-wrap items-center justify-between gap-3" style={{ borderColor: "var(--border)" }}>
        <div><b className="text-sm capitalize">{savedSearch.listing_type} search</b><p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>{[savedSearch.criteria?.query, savedSearch.criteria?.category, savedSearch.criteria?.location, savedSearch.criteria?.min_price ? `Min KES ${savedSearch.criteria.min_price}` : "", savedSearch.criteria?.max_price ? `Max KES ${savedSearch.criteria.max_price}` : "", savedSearch.criteria?.transaction_type].filter(Boolean).join(" · ")}</p></div>
        <button onClick={() => removeSavedSearch(savedSearch.id)} className="px-3 py-1.5 rounded-full border text-xs font-medium" style={{ borderColor: "var(--border)" }}>Remove alert</button>
      </div>)}
      {savedSearches.length === 0 && <div className="p-5"><Empty>No saved search alerts yet. Save a filtered search while browsing.</Empty></div>}
    </section>}
    {tab === "messages" && <section className="rounded-2xl border overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)" }}>{workspaceConversations.map((conversation) => <button key={conversation.id} onClick={() => onOpenConversation({ listingType: conversation.listing_type, listingId: conversation.listing_id, otherPartyId: conversation.peerId, otherPartyName: conversation.peerName, listingTitle: conversation.listingTitle, conversationId: conversation.id })} className="w-full text-left p-4 border-b flex items-center gap-3 hover:bg-[var(--secondary)]" style={{ borderColor: "var(--border)" }}><span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--secondary)", color: "var(--primary)" }}><IcMessage size={16}/></span><span className="min-w-0 flex-1"><b className="block text-sm truncate">{conversation.peerName} · {conversation.listingTitle}</b><span className="block text-xs truncate" style={{ color: "var(--muted-foreground)" }}>{conversation.latestMessage}</span></span><time className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{new Date(conversation.latestAt).toLocaleDateString()}</time></button>)}{workspaceConversations.length === 0 && <Empty>{roleName ? `Your ${roleName.toLowerCase()} conversations will appear here.` : "Your listing conversations will appear here."}</Empty>}</section>}
    {tab === "activity" && <div className="space-y-6"><section className="rounded-2xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}><h2 className="font-display text-xl mb-3">{primaryRole === "service_provider" ? "Bookings and requests" : primaryRole === "landlord" ? "Viewings and requests" : primaryRole === "seller" ? "Orders and requests" : "Requests"}</h2>{workspaceOrders.map((o) => <div key={o.id} className="py-3 border-t flex flex-wrap justify-between gap-3 text-sm" style={{ borderColor: "var(--border)" }}><span className="capitalize">{o.listing_type} · {o.status.replaceAll("_", " ")}{o.scheduled_at && <span className="block text-xs mt-1 normal-case" style={{ color: "var(--muted-foreground)" }}>Scheduled: {new Date(o.scheduled_at).toLocaleString()}</span>}</span>{o.scheduled_at && ["pending", "accepted"].includes(o.status) && <button onClick={() => { setReschedulingOrder(reschedulingOrder === o.id ? null : o.id); setScheduleDraft(toLocalDateTime(o.scheduled_at)); }} className="text-xs underline" style={{ color: "var(--primary)" }}>Change time</button>}{reschedulingOrder === o.id && <div className="basis-full flex flex-wrap items-end gap-2"><label className="text-xs">Propose a new time<input type="datetime-local" value={scheduleDraft} min={new Date(Date.now() + 60 * 60 * 1000 - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)} onChange={(event) => setScheduleDraft(event.target.value)} className="input-base mt-1" /></label><button onClick={() => updateSchedule(o.id)} className="px-3 py-2 rounded-full text-xs font-semibold" style={{ background: "var(--primary)", color: "white" }}>Send new time</button></div>}{o.seller_id === profile?.id && o.status === "pending" && <div className="flex gap-2"><button onClick={() => updateOrder(o.id, "accepted")} className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Accept</button><button onClick={() => updateOrder(o.id, "rejected")} className="text-xs font-semibold text-red-700">Decline</button></div>}{o.seller_id === profile?.id && o.status === "accepted" && <button onClick={() => updateOrder(o.id, "completed")} className="text-xs font-semibold" style={{ color: "var(--primary)" }}>Mark complete</button>}{o.buyer_id === profile?.id && ["pending", "accepted"].includes(o.status) && <button onClick={() => updateOrder(o.id, "cancelled")} className="text-xs font-semibold text-red-700">Cancel request</button>}{o.buyer_id === profile?.id && o.status === "completed" && !reviewedOrders.includes(o.id) && <button onClick={() => { setReviewingOrder(reviewingOrder === o.id ? null : o.id); setRating(5); }} className="text-xs font-semibold" style={{ color: "var(--primary)" }}>Leave a review</button>}{reviewingOrder === o.id && <div className="basis-full rounded-xl p-4" style={{ background: "var(--secondary)" }}><label className="block text-xs mb-2">Rating <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="ml-2 border rounded px-2 py-1">{[5,4,3,2,1].map((n) => <option key={n} value={n}>{n} stars</option>)}</select></label><textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={2} placeholder="How did it go?" className="input-base resize-none"/><button onClick={() => submitReview(o)} className="mt-2 px-4 py-2 rounded-full text-xs font-semibold" style={{ background: "var(--primary)", color: "white" }}>Post review</button></div>}</div>)}{workspaceOrders.length === 0 && <Empty>{primaryRole === "service_provider" ? "Your booking requests will appear here." : primaryRole === "landlord" ? "Your viewing requests will appear here." : primaryRole === "seller" ? "Your purchase requests will appear here." : "Your activity and requests will appear here."}</Empty>}</section><section className="rounded-2xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}><h2 className="font-display text-xl mb-3">Notifications</h2>{notifications.map((n) => <button key={n.id} onClick={() => openNotification(n)} className="w-full text-left py-3 border-t" style={{ borderColor: "var(--border)", opacity: n.read_at ? 0.65 : 1 }}><b className="text-sm block">{n.title}</b><span className="text-xs">{n.body}</span></button>)}{notifications.length === 0 && <Empty>You are all caught up.</Empty>}</section></div>}
    {tab === "profile" && <div className="space-y-5"><form onSubmit={saveProfile} className="max-w-xl p-6 rounded-2xl border space-y-4" style={{ background: "var(--card)", borderColor: "var(--border)" }}><h2 className="font-display text-2xl">Profile details</h2><Field label="Full name"><input className="input-base" value={fullName} onChange={(e) => setFullName(e.target.value)} required/></Field><Field label="Email"><input className="input-base opacity-60" value={user?.email || ""} readOnly/></Field><Field label="Phone"><input className="input-base" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254…"/></Field><button disabled={busy} className="px-5 py-2.5 rounded-full text-sm font-semibold" style={{ background: "var(--primary)", color: "white" }}>{busy ? "Saving…" : "Save changes"}</button></form><section className="max-w-xl p-6 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}><h2 className="font-display text-2xl">Listing roles</h2><p className="text-sm my-3" style={{ color: "var(--muted-foreground)" }}>Apply to list products, homes, or services. Each role is reviewed separately.</p><div className="space-y-2">{([["seller", "Seller"], ["landlord", "Landlord"], ["service_provider", "Service Provider"]] as const).map(([role, label]) => { const application = roles.find((item) => item.role === role); return <div key={role} className="flex items-center justify-between gap-3 py-2 border-t" style={{ borderColor: "var(--border)" }}><span className="text-sm">{label}</span>{application?.status === "approved" ? <span className="text-xs" style={{ color: "var(--accent)" }}>Approved</span> : application?.status === "pending" ? <span className="text-xs" style={{ color: "var(--primary)" }}>Under review</span> : <button onClick={() => onApplyRole(role)} className="text-xs font-semibold" style={{ color: "var(--primary)" }}>{application?.status === "rejected" ? "Resubmit application" : "Apply"}</button>}</div>; })}</div></section></div>}
  </div>;
}

function Empty({ children }: { children: React.ReactNode }) { return <p className="py-6 text-sm" style={{ color: "var(--muted-foreground)" }}>{children}</p>; }
function toLocalDateTime(value: string) { const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); }
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
