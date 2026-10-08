import { request } from "./client";

const post = (path: string, body?: unknown) => request(path, { method: "POST", body: JSON.stringify(body || {}) });
const get = (path: string) => request(path);
export const api = {
  schemaStatus: () => get("/health"),
  seed: (_token: string) => post("/admin/seed"),
  adminPendingVerifications: (_token: string) => get("/admin/pending-verifications"),
  adminUsers: (_token: string) => get("/admin/users"),
  adminVerifyRole: (_token: string, role_id: string, status: string) => post("/admin/verify-role", { role_id, status }),
  adminListingStatus: (_token: string, type: string, id: string, status: string) => post("/admin/listing-status", { type, id, status }),
  adminOverview: (_token: string) => get("/admin/overview"),
  adminUserStatus: (_token: string, profile_id: string, status: string) => post("/admin/user-status", { profile_id, status }),
  adminReportStatus: (_token: string, report_id: string, status: string, resolution_note?: string, action?: string) => post("/admin/report-status", { report_id, status, resolution_note, action }),
  adminSendNotification: (_token: string, audience: string, title: string, body: string) => post("/admin/notifications", { audience, title, body }),
  signedUrl: (_token: string, path: string) => post("/uploads/signed-url", { path }),
};
