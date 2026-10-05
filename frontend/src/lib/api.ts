import { supabase, supabaseAnonKey, supabaseConfigured } from "./supabase";

const BASE = `${import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_PROJECT_URL}/functions/v1/server`;
const ROUTE_PREFIX = "/make-server-1dae2b61";

async function call(path: string, opts?: RequestInit) {
  if (!supabaseConfigured) throw new Error("Connect Supabase by setting VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", apikey: supabaseAnonKey || "", Authorization: `Bearer ${session?.access_token || ""}`, ...(opts?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Request failed");
  return body;
}

export const api = {
  schemaStatus: () => call(`${ROUTE_PREFIX}/schema-status`),
  seed: (token: string) => call(`${ROUTE_PREFIX}/seed`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }),
  adminPendingVerifications: (token: string) => call(`${ROUTE_PREFIX}/admin/pending-verifications`, { headers: { Authorization: `Bearer ${token}` } }),
  adminUsers: (token: string) => call(`${ROUTE_PREFIX}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
  adminVerifyRole: (token: string, role_id: string, status: string) => call(`${ROUTE_PREFIX}/admin/verify-role`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ role_id, status }) }),
  adminListingStatus: (token: string, type: string, id: string, status: "active" | "suspended") => call(`${ROUTE_PREFIX}/admin/listing-status`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ type, id, status }) }),
  adminOverview: (token: string) => call(`${ROUTE_PREFIX}/admin/overview`, { headers: { Authorization: `Bearer ${token}` } }),
  adminUserStatus: (token: string, profile_id: string, status: string) => call(`${ROUTE_PREFIX}/admin/user-status`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ profile_id, status }) }),
  adminReportStatus: (token: string, report_id: string, status: string, resolution_note?: string, action?: "take_down" | "none") => call(`${ROUTE_PREFIX}/admin/report-status`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ report_id, status, resolution_note, action }) }),
  adminSendNotification: (token: string, audience: string, title: string, body: string) => call(`${ROUTE_PREFIX}/admin/notifications`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ audience, title, body }) }),
  signedUrl: (token: string, path: string) => call(`${ROUTE_PREFIX}/signed-url`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ path }) }),
};
