import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();
const prefix = "/server/make-server-1dae2b61";
app.use("*", logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization", "apikey", "x-client-info"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

function adminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function authenticatedProfile(c: any) {
  const token = c.req.header("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const db = adminClient();
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await db.from("profiles").select("id,account_status").eq("auth_user_id", user.id).maybeSingle();
  if (!profile || profile.account_status === "suspended") return null;
  return { ...profile, auth_user_id: user.id };
}

async function requireAdmin(c: any) {
  const profile = await authenticatedProfile(c);
  if (!profile) return null;
  const { data: role } = await adminClient().from("user_roles").select("id").eq("profile_id", profile.id).eq("role", "admin").eq("status", "approved").maybeSingle();
  return role ? profile : null;
}

app.get(`${prefix}/health`, (c) => c.json({ status: "ok" }));

app.get(`${prefix}/schema-status`, async (c) => {
  const { error } = await adminClient().from("profiles").select("id").limit(1);
  return c.json({ initialized: !error, error: error?.message });
});

app.post(`${prefix}/bootstrap`, (c) => c.json({
  ok: true,
  message: "Run the checked-in migration in the Supabase SQL Editor.",
  sql_file: "supabase/migrations/20260901000000_ziba_schema.sql",
}));

app.get(`${prefix}/admin/pending-verifications`, async (c) => {
  if (!await requireAdmin(c)) return c.json({ error: "Admin access required." }, 403);
  const db = adminClient();
  const { data: roles, error } = await db.from("user_roles")
    .select("*, profiles(full_name,phone,avatar_url)")
    .eq("status", "pending").order("created_at");
  if (error) return c.json({ error: error.message }, 400);
  const pendingRoles = roles || [];
  if (pendingRoles.length === 0) return c.json([]);

  const profileIds = [...new Set(pendingRoles.map((role) => role.profile_id))];
  const { data: documents, error: documentsError } = await db.from("verification_docs")
    .select("profile_id,role,doc_type,storage_path,created_at")
    .in("profile_id", profileIds);
  if (documentsError) return c.json({ error: documentsError.message }, 400);

  return c.json(pendingRoles.map((role) => ({
    ...role,
    verification_docs: (documents || []).filter((doc) => doc.profile_id === role.profile_id && doc.role === role.role),
  })));
});

app.get(`${prefix}/admin/users`, async (c) => {
  if (!await requireAdmin(c)) return c.json({ error: "Admin access required." }, 403);
  const { data, error } = await adminClient().from("profiles").select("*, user_roles(role,status)").order("created_at", { ascending: false }).limit(500);
  if (error) return c.json({ error: error.message }, 400);
  return c.json(data || []);
});

app.post(`${prefix}/admin/notifications`, async (c) => {
  if (!await requireAdmin(c)) return c.json({ error: "Admin access required." }, 403);
  const { audience, title, body } = await c.req.json();
  const roleByAudience: Record<string, string> = {
    buyers: "buyer",
    sellers: "seller",
    landlords: "landlord",
    service_providers: "service_provider",
  };
  if (typeof audience !== "string" || (audience !== "all" && !roleByAudience[audience])) {
    return c.json({ error: "Choose a valid notification audience." }, 400);
  }
  if (typeof title !== "string" || !title.trim() || title.trim().length > 120) {
    return c.json({ error: "Title is required and must be 120 characters or fewer." }, 400);
  }
  if (typeof body !== "string" || !body.trim() || body.trim().length > 2000) {
    return c.json({ error: "Message is required and must be 2,000 characters or fewer." }, 400);
  }

  const db = adminClient();
  const profileIds: string[] = [];
  if (audience === "all") {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from("profiles").select("id")
        .eq("account_status", "active").order("id").range(from, from + 999);
      if (error) return c.json({ error: error.message }, 400);
      profileIds.push(...(data || []).map((profile) => profile.id));
      if (!data || data.length < 1000) break;
    }
  } else {
    const role = roleByAudience[audience];
    const roleProfileIds: string[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from("user_roles").select("profile_id")
        .eq("role", role).eq("status", "approved").order("profile_id").range(from, from + 999);
      if (error) return c.json({ error: error.message }, 400);
      roleProfileIds.push(...(data || []).map((row) => row.profile_id));
      if (!data || data.length < 1000) break;
    }
    const uniqueRoleProfileIds = [...new Set(roleProfileIds)];
    for (let offset = 0; offset < uniqueRoleProfileIds.length; offset += 500) {
      const batch = uniqueRoleProfileIds.slice(offset, offset + 500);
      const { data, error } = await db.from("profiles").select("id")
        .in("id", batch).eq("account_status", "active");
      if (error) return c.json({ error: error.message }, 400);
      profileIds.push(...(data || []).map((profile) => profile.id));
    }
  }

  const uniqueRecipients = [...new Set(profileIds)];
  for (let offset = 0; offset < uniqueRecipients.length; offset += 500) {
    const rows = uniqueRecipients.slice(offset, offset + 500).map((profile_id) => ({
      profile_id,
      title: title.trim(),
      body: body.trim(),
      kind: "announcement",
    }));
    const { error } = await db.from("notifications").insert(rows);
    if (error) return c.json({ error: error.message }, 400);
  }
  return c.json({ ok: true, recipient_count: uniqueRecipients.length });
});

app.post(`${prefix}/admin/verify-role`, async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) return c.json({ error: "Admin access required." }, 403);
  const { role_id, status } = await c.req.json();
  if (typeof role_id !== "string" || !["approved", "rejected"].includes(status)) return c.json({ error: "Invalid verification decision." }, 400);
  const db = adminClient();
  const { data: target, error: targetError } = await db.from("user_roles").select("profile_id,role").eq("id", role_id).single();
  if (targetError || !target || target.role === "admin") return c.json({ error: "Application not found." }, 404);
  const now = new Date().toISOString();
  const { error } = await db.from("user_roles").update({ status, verified_at: status === "approved" ? now : null }).eq("id", role_id);
  if (error) return c.json({ error: error.message }, 400);
  await db.from("verification_docs").update({ reviewed_by: admin.id, reviewed_at: now }).eq("profile_id", target.profile_id).eq("role", target.role);
  await db.from("notifications").insert({
    profile_id: target.profile_id,
    title: `Your ${target.role.replaceAll("_", " ")} application was ${status}`,
    body: status === "approved" ? "You can now publish listings for this role." : "You can update your application and submit it again.",
    kind: "verification",
  });
  return c.json({ ok: true });
});

app.post(`${prefix}/admin/listing-status`, async (c) => {
  if (!await requireAdmin(c)) return c.json({ error: "Admin access required." }, 403);
  const { type, id, status } = await c.req.json();
  if (!(["product", "property", "service"].includes(type)) || typeof id !== "string") return c.json({ error: "Invalid listing." }, 400);
  const table = type === "product" ? "products" : type === "property" ? "properties" : "services";
  if (!["active", "suspended"].includes(status)) return c.json({ error: "Invalid listing status." }, 400);
  const { error } = await (adminClient().from(table) as any).update({ status }).eq("id", id);
  return error ? c.json({ error: error.message }, 400) : c.json({ ok: true });
});

app.get(`${prefix}/admin/overview`, async (c) => {
  if (!await requireAdmin(c)) return c.json({ error: "Admin access required." }, 403);
  const db = adminClient();
  const [profiles, products, properties, services, orders, reports, pending, productRows, propertyRows, serviceRows, reportRows] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("products").select("id", { count: "exact", head: true }),
    db.from("properties").select("id", { count: "exact", head: true }),
    db.from("services").select("id", { count: "exact", head: true }),
    db.from("orders").select("id", { count: "exact", head: true }),
    db.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    db.from("user_roles").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("products").select("id,title,description,category,price,status,created_at,seller_id,profiles(full_name)").order("created_at", { ascending: false }).limit(100),
    db.from("properties").select("id,title,description,location,house_type,price,status,availability_status,created_at,landlord_id,profiles(full_name)").order("created_at", { ascending: false }).limit(100),
    db.from("services").select("id,title,description,category,price_range,status,created_at,provider_id,profiles(full_name)").order("created_at", { ascending: false }).limit(100),
    db.from("reports").select("*, profiles(full_name)").order("created_at", { ascending: false }).limit(100),
  ]);
  const listings = [
    ...(productRows.data || []).map((row: any) => ({ ...row, type: "product" })),
    ...(propertyRows.data || []).map((row: any) => ({ ...row, status: row.status === "suspended" ? "suspended" : row.availability_status, type: "property" })),
    ...(serviceRows.data || []).map((row: any) => ({ ...row, type: "service" })),
  ].sort((a: any, b: any) => b.created_at.localeCompare(a.created_at));
  const reportsWithTargets = await Promise.all((reportRows.data || []).map(async (report: any) => {
    const table = ({ product: "products", property: "properties", service: "services" } as Record<string, string>)[report.target_type];
    if (table) {
      const ownerColumn = report.target_type === "product" ? "seller_id" : report.target_type === "property" ? "landlord_id" : "provider_id";
      const { data } = await db.from(table).select(`id,title,description,${ownerColumn},profiles(full_name,phone)`).eq("id", report.target_id).maybeSingle();
      return { ...report, target: data ? { kind: "listing", ...data, owner: data.profiles } : null };
    }
    if (report.target_type === "message") {
      const { data } = await db.from("messages").select("id,content,created_at,sender_id,conversation_id,profiles(full_name)").eq("id", report.target_id).maybeSingle();
      return { ...report, target: data ? { kind: "message", ...data } : null };
    }
    if (report.target_type === "profile") {
      const { data } = await db.from("profiles").select("id,full_name,phone,account_status,created_at").eq("id", report.target_id).maybeSingle();
      return { ...report, target: data ? { kind: "profile", ...data } : null };
    }
    return { ...report, target: null };
  }));
  return c.json({
    counts: { users: profiles.count || 0, listings: (products.count || 0) + (properties.count || 0) + (services.count || 0), orders: orders.count || 0, reports: reports.count || 0, pending: pending.count || 0 },
    listings,
    reports: reportsWithTargets,
  });
});

app.post(`${prefix}/admin/user-status`, async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) return c.json({ error: "Admin access required." }, 403);
  const { profile_id, status } = await c.req.json();
  if (typeof profile_id !== "string" || !["active", "suspended"].includes(status) || profile_id === admin.id) return c.json({ error: "Invalid account status." }, 400);
  const db = adminClient();
  const { data: target, error: targetError } = await db.from("profiles").select("auth_user_id").eq("id", profile_id).single();
  if (targetError || !target) return c.json({ error: "User not found." }, 404);
  const { data: adminTarget } = await db.from("user_roles").select("id").eq("profile_id", profile_id).eq("role", "admin").eq("status", "approved").maybeSingle();
  if (adminTarget) return c.json({ error: "Admin accounts cannot be suspended from this workspace." }, 400);
  const { error } = await db.from("profiles").update({ account_status: status }).eq("id", profile_id);
  if (error) return c.json({ error: error.message }, 400);
  const { error: banError } = await db.auth.admin.updateUserById(target.auth_user_id, { ban_duration: status === "suspended" ? "876000h" : "none" });
  return banError ? c.json({ error: banError.message }, 400) : c.json({ ok: true });
});

app.post(`${prefix}/admin/report-status`, async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) return c.json({ error: "Admin access required." }, 403);
  const { report_id, status, resolution_note = "", action = "none" } = await c.req.json();
  if (typeof report_id !== "string" || !["resolved", "dismissed"].includes(status) || typeof resolution_note !== "string" || resolution_note.length > 1000 || !["take_down", "none"].includes(action) || (status === "dismissed" && action !== "none")) return c.json({ error: "Invalid moderation decision." }, 400);
  const db = adminClient();
  const { data: report, error: reportError } = await db.from("reports").select("target_type,target_id").eq("id", report_id).single();
  if (reportError || !report) return c.json({ error: "Report not found." }, 404);
  if (status === "resolved" && action === "take_down") {
    const table = ({ product: "products", property: "properties", service: "services" } as Record<string, string>)[report.target_type];
    if (table) {
      const { error } = await db.from(table).update({ status: "suspended" }).eq("id", report.target_id);
      if (error) return c.json({ error: error.message }, 400);
    } else if (report.target_type === "message") {
      const { error } = await db.from("messages").delete().eq("id", report.target_id);
      if (error) return c.json({ error: error.message }, 400);
    } else if (report.target_type === "profile") {
      const { data: target } = await db.from("profiles").select("auth_user_id").eq("id", report.target_id).maybeSingle();
      if (target?.auth_user_id === admin.auth_user_id) return c.json({ error: "You cannot suspend your own account." }, 400);
      if (target) {
        const { error } = await db.from("profiles").update({ account_status: "suspended" }).eq("id", report.target_id);
        if (error) return c.json({ error: error.message }, 400);
        await db.auth.admin.updateUserById(target.auth_user_id, { ban_duration: "876000h" });
      }
    }
  }
  const { error } = await db.from("reports").update({ status, resolution_note: resolution_note.trim() || null, reviewed_by: admin.id, reviewed_at: new Date().toISOString() }).eq("id", report_id);
  return error ? c.json({ error: error.message }, 400) : c.json({ ok: true });
});

app.post(`${prefix}/signed-url`, async (c) => {
  const profile = await authenticatedProfile(c);
  if (!profile) return c.json({ error: "Authentication required." }, 401);
  const { path } = await c.req.json();
  if (typeof path !== "string") return c.json({ error: "Invalid document path." }, 400);
  const db = adminClient();
  const { data: doc } = await db.from("verification_docs").select("profile_id").eq("storage_path", path).maybeSingle();
  if (!doc) return c.json({ error: "Document record not found." }, 404);
  const { data: adminRole } = await db.from("user_roles").select("id").eq("profile_id", profile.id).eq("role", "admin").eq("status", "approved").maybeSingle();
  if (doc.profile_id !== profile.id && !adminRole) return c.json({ error: "You cannot view this document." }, 403);
  const { data, error } = await db.storage.from("private-verification-docs").createSignedUrl(path, 300);
  return error ? c.json({ error: error.message }, 400) : c.json({ url: data.signedUrl });
});

app.post(`${prefix}/seed`, async (c) => {
  const admin = await requireAdmin(c);
  if (!admin) return c.json({ error: "Admin access required." }, 403);
  const db = adminClient();
  const { count } = await db.from("products").select("id", { count: "exact", head: true });
  if ((count || 0) > 0) return c.json({ ok: true, message: "Demo listings already exist." });
  const productPhotos = [
    "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1608571423539-e951a5fd5e5c?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1582691737290-9a84f8e47908?w=800&auto=format&fit=crop",
  ];
  const productData = [
    { title: "Handwoven Kikoy Beach Wrap", description: "Soft hand-woven cotton from the Kenyan coast, made for easy days in the sun.", price: 2400, stock: 24, category: "Fashion" },
    { title: "Cold-Pressed Moringa Oil", description: "Pure cold-pressed moringa oil sourced from small farms in Meru.", price: 850, stock: 60, category: "Beauty" },
    { title: "Carved Soapstone Sculpture", description: "A hand-carved Kisii soapstone keepsake. Each piece is unique.", price: 4200, stock: 5, category: "Art" },
  ];
  for (const productDataItem of productData) {
    const { data: product, error } = await db.from("products").insert({ ...productDataItem, seller_id: admin.id, status: "draft" }).select("id").single();
    if (error) return c.json({ error: error.message }, 400);
    const { error: photosError } = await db.from("product_images").insert(productPhotos.map((storage_path, sort_order) => ({ product_id: product.id, storage_path, sort_order })));
    if (photosError) return c.json({ error: photosError.message }, 400);
    const { error: publishError } = await db.from("products").update({ status: "active" }).eq("id", product.id);
    if (publishError) return c.json({ error: publishError.message }, 400);
  }
  const { data: properties, error: propertyError } = await db.from("properties").insert([
    { landlord_id: admin.id, title: "Bright 2BR Apartment, Kilimani", description: "A light-filled apartment in a secure, well-kept estate.", price: 55000, location: "Kilimani, Nairobi", bedrooms: 2, bathrooms: 1, house_type: "apartment", availability_status: "available", status: "draft" },
    { landlord_id: admin.id, title: "Modern Studio, Westlands", description: "A comfortable studio close to shops, cafés, and transport.", price: 28000, location: "Westlands, Nairobi", bedrooms: 1, bathrooms: 1, house_type: "studio", availability_status: "available", status: "draft" },
  ]).select("id");
  if (propertyError) return c.json({ error: propertyError.message }, 400);
  const propertyPhotos = ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop", "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop"];
  for (const property of properties || []) {
    const { error } = await db.from("property_images").insert(propertyPhotos.map((storage_path, sort_order) => ({ property_id: property.id, storage_path, sort_order })));
    if (error) return c.json({ error: error.message }, 400);
    const { error: publishError } = await db.from("properties").update({ status: "active" }).eq("id", property.id);
    if (publishError) return c.json({ error: publishError.message }, 400);
  }
  const { error: serviceError } = await db.from("services").insert([
    { provider_id: admin.id, title: "Professional Photography", description: "Portrait, product, event, and property photography with careful editing.", price_range: "From KES 8,000", category: "Photography" },
    { provider_id: admin.id, title: "Home Repair & Electrical Work", description: "Reliable residential repair and maintenance services around Nairobi.", price_range: "From KES 1,500", category: "Home Repair" },
  ]);
  if (serviceError) return c.json({ error: serviceError.message }, 400);
  return c.json({ ok: true, message: "Demo listings have been added under the admin account." });
});

Deno.serve(app.fetch);
