import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
import { IcCheck, IcEye, IcMessage, IcSearch, IcSettings, IcShield, IcTrash, IcX } from "../lib/icons";

type AdminTab = "verifications" | "users" | "listings" | "moderation" | "analytics" | "notifications";
type NotificationAudience = "all" | "buyers" | "sellers" | "service_providers" | "landlords";

interface Overview {
  counts: { users: number; listings: number; orders: number; reports: number; pending: number };
  reports: any[];
  listings: any[];
}

const emptyOverview: Overview = {
  counts: { users: 0, listings: 0, orders: 0, reports: 0, pending: 0 },
  reports: [],
  listings: [],
};

export default function AdminDashboard() {
  const { session } = useAuth();
  const token = session?.access_token || "";
  const [tab, setTab] = useState<AdminTab>("verifications");
  const [pending, setPending] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [overview, setOverview] = useState<Overview>(emptyOverview);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [notificationAudience, setNotificationAudience] = useState<NotificationAudience>("all");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationBody, setNotificationBody] = useState("");
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationResult, setNotificationResult] = useState("");

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [verificationRows, userRows, summary] = await Promise.all([
        api.adminPendingVerifications(token),
        api.adminUsers(token),
        api.adminOverview(token),
      ]);
      setPending(Array.isArray(verificationRows) ? verificationRows : []);
      setUsers(Array.isArray(userRows) ? userRows : []);
      setOverview(summary);
    } catch (err: any) {
      setError(err.message || "Could not load admin data.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function run(action: () => Promise<unknown>, success?: () => void) {
    setError("");
    try {
      await action();
      success?.();
      await refresh();
    } catch (err: any) {
      setError(err.message || "Action failed.");
    }
  }

  async function openDocument(path: string) {
    try {
      const result = await api.signedUrl(token, path);
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      setError(err.message || "Could not open document.");
    }
  }

  async function seedData() {
    setSeeding(true);
    setSeedMsg("");
    try {
      const result = await api.seed(token);
      setSeedMsg(result.message || "Demo data is ready.");
      await refresh();
    } catch (err: any) {
      setSeedMsg(err.message || "Could not seed demo data.");
    } finally {
      setSeeding(false);
    }
  }

  async function sendNotification(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotificationResult("");
    setSendingNotification(true);
    try {
      const result = await api.adminSendNotification(token, notificationAudience, notificationTitle, notificationBody);
      setNotificationResult(`Notification sent to ${result.recipient_count} ${result.recipient_count === 1 ? "account" : "accounts"}.`);
      setNotificationTitle("");
      setNotificationBody("");
    } catch (err: any) {
      setError(err.message || "Could not send notification.");
    } finally {
      setSendingNotification(false);
    }
  }

  const tabs: { key: AdminTab; label: string; count?: number }[] = [
    { key: "verifications", label: "Verifications", count: pending.length },
    { key: "users", label: "Users" },
    { key: "listings", label: "Listings" },
    { key: "moderation", label: "Moderation", count: overview.counts.reports },
    { key: "analytics", label: "Analytics" },
    { key: "notifications", label: "Notifications" },
  ];
  const q = query.trim().toLowerCase();
  const filteredUsers = users.filter((user) => `${user.full_name} ${user.phone}`.toLowerCase().includes(q));
  const filteredListings = overview.listings.filter((listing) => `${listing.title} ${listing.type} ${listing.profiles?.full_name}`.toLowerCase().includes(q));
  const listingSeries = ["product", "property", "service"].map((type) => ({
    label: type === "product" ? "Products" : type === "property" ? "Properties" : "Services",
    value: overview.listings.filter((listing) => listing.type === type).length,
  }));
  const roleSeries = ["buyer", "seller", "landlord", "service_provider"].map((role) => ({
    label: role.replaceAll("_", " "),
    value: users.reduce((count, user) => count + (user.user_roles || []).filter((item: any) => item.role === role && item.status === "approved").length, 0),
  }));
  const operationsSeries = [
    { label: "Orders & bookings", value: overview.counts.orders },
    { label: "Pending verifications", value: overview.counts.pending },
    { label: "Open reports", value: overview.counts.reports },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <div className="max-w-7xl mx-auto px-5 md:px-10 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--primary)", color: "white" }}><IcShield size={15} /></span>
              <h1 className="font-display text-3xl font-semibold" style={{ color: "var(--foreground)" }}>Admin workspace</h1>
            </div>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Trust, safety, and marketplace operations in one place.</p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            <button onClick={seedData} disabled={seeding} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors disabled:opacity-60" style={{ borderColor: "var(--border)", color: "var(--foreground)" }}>
              <IcSettings size={14} /> {seeding ? "Seeding…" : "Seed demo data"}
            </button>
            {seedMsg && <span className="text-xs" style={{ color: "var(--accent)" }}>{seedMsg}</span>}
          </div>
        </div>

        {error && <div className="mb-5 px-4 py-3 rounded-xl text-sm border" style={{ backgroundColor: "#FEF2F2", borderColor: "#FECACA", color: "#991B1B" }}>{error}</div>}

        <div className="flex gap-1 border-b mb-7 overflow-x-auto" style={{ borderColor: "var(--border)" }}>
          {tabs.map((item) => (
            <button key={item.key} onClick={() => setTab(item.key)} className="px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors" style={{ borderBottomColor: tab === item.key ? "var(--primary)" : "transparent", color: tab === item.key ? "var(--primary)" : "var(--muted-foreground)" }}>
              {item.label}{item.count ? ` (${item.count})` : ""}
            </button>
          ))}
        </div>

        {loading ? <Loading /> : (
          <>
            {tab === "notifications" && (
              <div className="grid lg:grid-cols-[1fr_0.8fr] gap-5 items-start">
                <form onSubmit={sendNotification} className="rounded-2xl border p-5 md:p-7 space-y-5" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
                  <div>
                    <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "var(--primary)" }}>Admin announcement</p>
                    <h2 className="font-display text-2xl">Send a notification</h2>
                    <p className="text-sm mt-2" style={{ color: "var(--muted-foreground)" }}>Deliver an in-app update to all active accounts or a specific approved role.</p>
                  </div>
                  <label className="block text-sm font-medium">Audience
                    <select value={notificationAudience} onChange={(event) => setNotificationAudience(event.target.value as NotificationAudience)} className="input-base mt-2" style={{ backgroundColor: "var(--background)" }}>
                      <option value="all">Everyone</option>
                      <option value="buyers">Buyers</option>
                      <option value="sellers">Sellers</option>
                      <option value="service_providers">Service providers</option>
                      <option value="landlords">Landlords</option>
                    </select>
                  </label>
                  <label className="block text-sm font-medium">Title
                    <input required maxLength={120} value={notificationTitle} onChange={(event) => setNotificationTitle(event.target.value)} className="input-base mt-2" placeholder="A short announcement title" style={{ backgroundColor: "var(--background)" }} />
                  </label>
                  <label className="block text-sm font-medium">Message
                    <textarea required maxLength={2000} rows={5} value={notificationBody} onChange={(event) => setNotificationBody(event.target.value)} className="input-base mt-2 resize-y" placeholder="Write the update for your audience…" style={{ backgroundColor: "var(--background)" }} />
                  </label>
                  {notificationResult && <p role="status" className="text-sm rounded-xl px-4 py-3" style={{ background: "#EAF2F0", color: "var(--accent)" }}>{notificationResult}</p>}
                  <button type="submit" disabled={sendingNotification} className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold disabled:opacity-60" style={{ backgroundColor: "var(--primary)", color: "white" }}><IcMessage size={15} />{sendingNotification ? "Sending…" : "Send notification"}</button>
                </form>
                <aside className="rounded-2xl border p-5" style={{ background: "var(--secondary)", borderColor: "var(--border)" }}>
                  <h3 className="font-display text-xl">Who receives it?</h3>
                  <p className="text-sm leading-relaxed mt-2" style={{ color: "var(--muted-foreground)" }}>Role audiences include active accounts with that role approved. Everyone includes all active accounts. Notifications appear in each recipient’s dashboard activity.</p>
                </aside>
              </div>
            )}

            {tab === "verifications" && (
              pending.length === 0 ? <Empty title="Verification queue is clear" body="New role applications will appear here." /> :
              <div className="space-y-4">
                <div className="px-4 py-3 rounded-xl text-sm border" style={{ backgroundColor: "#EAF2F0", borderColor: "#C9DED7", color: "var(--accent)" }}>
                  Approving an application verifies the applicant and grants the role they applied for. Listing access becomes available after approval.
                </div>
                {pending.map((item) => (
                  <section key={item.id} className="p-5 rounded-2xl border" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={item.profiles?.full_name} />
                        <div>
                          <div className="font-semibold text-sm">{item.profiles?.full_name || "Unnamed user"}</div>
                          <div className="text-xs capitalize" style={{ color: "var(--muted-foreground)" }}>{item.role.replace("_", " ")} application · {item.profiles?.phone || "No phone"}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => run(() => api.adminVerifyRole(token, item.id, "approved"))} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold" style={{ backgroundColor: "var(--accent)", color: "white" }}><IcCheck size={14} /> Approve &amp; grant role</button>
                        <button onClick={() => run(() => api.adminVerifyRole(token, item.id, "rejected"))} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border" style={{ borderColor: "#DC2626", color: "#DC2626" }}><IcX size={14} /> Reject</button>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t flex flex-wrap gap-2" style={{ borderColor: "var(--border)" }}>
                      {(item.verification_docs || []).length === 0 ? <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>No documents attached</span> :
                        item.verification_docs.map((doc: any) => (
                          <button key={doc.storage_path} onClick={() => openDocument(doc.storage_path)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border capitalize" style={{ borderColor: "var(--border)" }}>
                            <IcEye size={12} /> {doc.doc_type.replaceAll("_", " ")}
                          </button>
                        ))}
                    </div>
                    {item.application_data && Object.keys(item.application_data).length > 0 && <dl className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-2 border-t pt-4 text-xs" style={{ borderColor: "var(--border)" }}>
                      {Object.entries(item.application_data).map(([label, value]) => <div key={label}><dt className="capitalize" style={{ color: "var(--muted-foreground)" }}>{label.replaceAll("_", " ")}</dt><dd className="mt-0.5 break-words">{String(value)}</dd></div>)}
                    </dl>}
                  </section>
                ))}
              </div>
            )}

            {tab === "users" && (
              <Panel>
                <Search value={query} onChange={setQuery} placeholder="Search users by name or phone" />
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {filteredUsers.map((user) => {
                    const suspended = user.account_status === "suspended";
                    const admin = user.user_roles?.some((role: any) => role.role === "admin" && role.status === "approved");
                    return (
                      <div key={user.id} className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between p-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={user.full_name} />
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{user.full_name || "Unnamed user"}</div>
                            <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{user.phone || "No phone"} · Joined {new Date(user.created_at).toLocaleDateString()}</div>
                            <div className="flex flex-wrap gap-1 mt-1">{(user.user_roles || []).map((role: any) => <Status key={role.role} text={role.role.replace("_", " ")} tone={role.status === "approved" ? "green" : "amber"} />)}</div>
                          </div>
                        </div>
                        {!admin && <button onClick={() => run(() => api.adminUserStatus(token, user.id, suspended ? "active" : "suspended"))} className="px-3 py-1.5 rounded-full border text-xs font-medium self-start sm:self-auto" style={{ borderColor: suspended ? "var(--accent)" : "#DC2626", color: suspended ? "var(--accent)" : "#DC2626" }}>{suspended ? "Restore account" : "Suspend account"}</button>}
                      </div>
                    );
                  })}
                </div>
              </Panel>
            )}

            {tab === "listings" && (
              <Panel>
                <Search value={query} onChange={setQuery} placeholder="Search listings, owners, or type" />
                <div className="divide-y">
                  {filteredListings.map((listing) => (
                    <div key={`${listing.type}-${listing.id}`} className="flex items-center justify-between gap-4 p-4">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{listing.title}</div>
                        <div className="text-xs capitalize" style={{ color: "var(--muted-foreground)" }}>{listing.type} · {listing.profiles?.full_name || "Unknown owner"} · {new Date(listing.created_at).toLocaleDateString()}</div>
                        <p className="mt-1 text-xs line-clamp-2" style={{ color: "var(--muted-foreground)" }}>{listing.description}</p>
                        <div className="mt-1 text-xs font-medium" style={{ color: "var(--primary)" }}>{listing.type === "service" ? listing.price_range : `KES ${Number(listing.price).toLocaleString()}`}{listing.type === "property" ? " / month" : ""}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Status text={listing.status} tone={["active", "available"].includes(listing.status) ? "green" : "muted"} />
                        {["active", "available"].includes(listing.status) && <button title="Suspend listing" onClick={() => run(() => api.adminListingStatus(token, listing.type, listing.id, "suspended"))} className="p-2 rounded-lg border" style={{ borderColor: "#FECACA", color: "#DC2626" }}><IcTrash size={14} /></button>}
                        {listing.status === "suspended" && <button onClick={() => run(() => api.adminListingStatus(token, listing.type, listing.id, "active"))} className="px-3 py-1.5 rounded-full border text-xs" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>Restore</button>}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {tab === "moderation" && (
              overview.reports.length === 0 ? <Empty title="No reports to review" body="Community reports will appear here." /> :
              <div className="space-y-3">
                {overview.reports.map((report) => (
                  <section key={report.id} className="p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
                    <div>
                      <div className="flex items-center gap-2 mb-1"><Status text={report.status} tone={report.status === "open" ? "amber" : "muted"} /><span className="text-xs capitalize" style={{ color: "var(--muted-foreground)" }}>{report.target_type}</span></div>
                      <p className="text-sm">{report.reason}</p>
                      <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>Reported by {report.profiles?.full_name || "a community member"} · {new Date(report.created_at).toLocaleString()}</p>
                      {report.target ? <div className="mt-3 p-3 rounded-xl border text-sm" style={{ background: "var(--secondary)", borderColor: "var(--border)" }}>
                        {report.target.kind === "listing" && <><b>{report.target.title}</b><p className="mt-1 text-xs whitespace-pre-wrap" style={{ color: "var(--muted-foreground)" }}>{report.target.description}</p><p className="mt-2 text-xs" style={{ color: "var(--muted-foreground)" }}>Owner: {report.target.owner?.full_name || "Unknown"} {report.target.owner?.phone ? `· ${report.target.owner.phone}` : ""}</p></>}
                        {report.target.kind === "message" && <><b>Reported message</b><p className="mt-1 whitespace-pre-wrap">{report.target.content}</p><p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>From {report.target.profiles?.full_name || "Marketplace member"} · {new Date(report.target.created_at).toLocaleString()}</p></>}
                        {report.target.kind === "profile" && <><b>Reported account: {report.target.full_name || "Unnamed user"}</b><p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>{report.target.phone || "No phone"} · Account {report.target.account_status}</p></>}
                      </div> : <p className="mt-2 text-xs" style={{ color: "var(--muted-foreground)" }}>The reported content is no longer available.</p>}
                    </div>
                    {report.status === "open" && <div className="flex gap-2">
                      <button onClick={() => run(() => api.adminReportStatus(token, report.id, "resolved", resolutionNotes[report.id] || "", "take_down"))} className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ backgroundColor: "var(--accent)", color: "white" }}>Take down &amp; resolve</button>
                      <button onClick={() => run(() => api.adminReportStatus(token, report.id, "dismissed"))} className="px-3 py-1.5 rounded-full border text-xs font-medium" style={{ borderColor: "var(--border)" }}>Dismiss</button>
                    </div>}
                    {report.status === "open" && <textarea value={resolutionNotes[report.id] || ""} onChange={(event) => setResolutionNotes((notes) => ({ ...notes, [report.id]: event.target.value }))} maxLength={1000} rows={2} placeholder="Internal resolution note (optional)" className="input-base md:max-w-xs text-xs" style={{ background: "var(--secondary)" }} />}
                    {report.status !== "open" && report.resolution_note && <p className="text-xs mt-2" style={{ color: "var(--muted-foreground)" }}>Review note: {report.resolution_note}</p>}
                  </section>
                ))}
              </div>
            )}

            {tab === "analytics" && (
              <div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    ["Users", overview.counts.users],
                    ["Listings", overview.counts.listings],
                    ["Orders & bookings", overview.counts.orders],
                    ["Pending checks", overview.counts.pending],
                    ["Open reports", overview.counts.reports],
                  ].map(([label, value]) => (
                    <div key={label} className="p-5 rounded-2xl border" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
                      <div className="font-mono-data text-3xl mb-1" style={{ color: "var(--primary)" }}>{value}</div>
                      <div className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>{label}</div>
                    </div>
                  ))}
                </div>
                <div className="grid lg:grid-cols-2 gap-5 mt-5">
                  <BarChart title="Recent listings by type" subtitle="Latest records loaded for each category" items={listingSeries} />
                  <BarChart title="Approved role memberships" subtitle="Accounts can hold more than one role" items={roleSeries} />
                  <BarChart title="Marketplace activity and review queue" subtitle="Current totals" items={operationsSeries} />
                </div>
                <div className="mt-5 p-5 rounded-2xl border" style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)" }}>
                  <div className="font-semibold text-sm">Operations note</div>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--muted-foreground)" }}>Counts are live from Supabase. Verification documents use short-lived signed links, and all admin actions are checked server-side against the approved admin role.</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>{children}</div>;
}

function BarChart({ title, subtitle, items }: { title: string; subtitle: string; items: { label: string; value: number }[] }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <section className="rounded-2xl border p-5 md:p-6" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }} aria-label={title}>
      <h2 className="font-display text-xl">{title}</h2>
      <p className="text-xs mt-1 mb-6" style={{ color: "var(--muted-foreground)" }}>{subtitle}</p>
      <div className="space-y-4">
        {items.map((item) => <div key={item.label}>
          <div className="flex justify-between gap-3 text-xs mb-1.5"><span className="capitalize" style={{ color: "var(--muted-foreground)" }}>{item.label}</span><b>{item.value.toLocaleString()}</b></div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--secondary)" }} role="img" aria-label={`${item.label}: ${item.value}`}>
            <div className="h-full rounded-full transition-all" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: "var(--primary)" }} />
          </div>
        </div>)}
      </div>
    </section>
  );
}

function Search({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div className="p-4 border-b relative" style={{ borderColor: "var(--border)" }}><span className="absolute left-7 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }}><IcSearch size={16} /></span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="input-base pl-10" style={{ backgroundColor: "var(--secondary)" }} /></div>;
}

function Avatar({ name }: { name?: string }) {
  return <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0" style={{ backgroundColor: "var(--primary)", color: "white" }}>{name?.charAt(0).toUpperCase() || "?"}</div>;
}

function Status({ text, tone }: { text: string; tone: "green" | "amber" | "muted" }) {
  const colors = tone === "green" ? { backgroundColor: "#EAF2F0", color: "var(--accent)" } : tone === "amber" ? { backgroundColor: "#FEF3C7", color: "#92400E" } : { backgroundColor: "var(--secondary)", color: "var(--muted-foreground)" };
  return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize" style={colors}>{text}</span>;
}

function Loading() {
  return <div className="text-center py-16 text-sm animate-pulse" style={{ color: "var(--muted-foreground)" }}>Loading marketplace operations…</div>;
}

function Empty({ title, body }: { title: string; body: string }) {
  return <div className="text-center py-16 rounded-2xl border" style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}><div className="font-display text-xl font-semibold">{title}</div><p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>{body}</p></div>;
}
