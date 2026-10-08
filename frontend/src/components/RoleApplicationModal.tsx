import { useState } from "react";
import { db } from "../lib/client";
import { useAuth } from "../lib/auth-context";

type Role = "seller" | "landlord" | "service_provider";
type ApplicationRole = Role | "all";

interface Props {
  role: ApplicationRole;
  onClose: () => void;
  page?: boolean;
}

const ROLE_LABELS: Record<Role, string> = {
  seller: "Seller",
  landlord: "Landlord",
  service_provider: "Service Provider",
};
const APPLICATION_LABELS: Record<ApplicationRole, string> = { ...ROLE_LABELS, all: "All Roles" };

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  seller: "List and sell physical products on Ziba. Requires identity verification.",
  landlord: "List homes for rent or sale. Requires identity verification to prevent fraud.",
  service_provider: "Offer professional services. Lighter verification — certificates only if your service is regulated.",
};
const APPLICATION_DESCRIPTIONS: Record<ApplicationRole, string> = {
  ...ROLE_DESCRIPTIONS,
  all: "Apply as a seller, landlord, and service provider together. Admin access is excluded.",
};

export default function RoleApplicationModal({ role, onClose, page = false }: Props) {
  const { profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Seller / Landlord fields
  const [legalName, setLegalName] = useState(profile?.full_name || "");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  // Service provider specific
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [certFile, setCertFile] = useState<File | null>(null);

  async function uploadDoc(file: File, docType: string): Promise<string> {
    if (!profile) throw new Error("Your profile is not ready. Please sign in again.");
    const ext = file.name.split(".").pop();
    const path = `verification/${profile.id}/${docType}-${Date.now()}.${ext}`;
    const { error } = await db.storage.from("private-verification-docs").upload(path, file, { upsert: true });
    if (error) throw new Error(error.message);
    return path;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setLoading(true);

    try {
      if (needsIdentity && (!legalName.trim() || !phone.trim() || !idFile || !idBackFile)) {
        throw new Error("Legal name, phone, and both sides of your government ID are required.");
      }
      const requestedRoles: Role[] = role === "all" ? ["seller", "landlord", "service_provider"] : [role];
      const eligibleRoles: Role[] = [];
      for (const requestedRole of requestedRoles) {
        const { data: existingRole, error: lookupError } = await db.from("user_roles").select("id,status").eq("profile_id", profile.id).eq("role", requestedRole).maybeSingle();
        if (lookupError) throw new Error(lookupError.message);
        if (existingRole?.status === "pending" || existingRole?.status === "approved") continue;
        const applicationData = requestedRole === "service_provider"
          ? { linkedin_url: linkedinUrl.trim() }
          : { legal_name: legalName.trim(), business_name: businessName.trim(), phone: phone.trim() };
        const roleWrite = existingRole
          ? await db.from("user_roles").update({ status: "pending", application_data: applicationData }).eq("id", existingRole.id)
          : await db.from("user_roles").insert({ profile_id: profile.id, role: requestedRole, status: "pending", application_data: applicationData });
        if (roleWrite.error) throw new Error(roleWrite.error.message);
        eligibleRoles.push(requestedRole);
      }
      if (!eligibleRoles.length) throw new Error("All selected roles are already approved or under review.");

      const documentRows: { doc_type: string; file: File | null; path?: string; roles: Role[] }[] = [
        { doc_type: "government_id", file: idFile, roles: eligibleRoles.filter((item) => item !== "service_provider") },
        { doc_type: "government_id_back", file: idBackFile, roles: eligibleRoles.filter((item) => item !== "service_provider") },
        { doc_type: "selfie", file: selfieFile, roles: eligibleRoles.filter((item) => item !== "service_provider") },
        { doc_type: "professional_certificate", file: certFile, roles: eligibleRoles.filter((item) => item === "service_provider") },
      ];
      for (const doc of documentRows) {
        if (!doc.file || !doc.roles.length) continue;
        doc.path = await uploadDoc(doc.file, doc.doc_type);
        const { error } = await db.from("verification_docs").insert(doc.roles.map((requestedRole) => ({ profile_id: profile.id, role: requestedRole, doc_type: doc.doc_type, storage_path: doc.path })));
        if (error) throw new Error(error.message);
      }

      // Update profile phone if provided
      if (phone && phone !== profile.phone) {
        await db.from("profiles").update({ phone, full_name: legalName }).eq("id", profile.id);
      }

      await refreshProfile();
      setDone(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    }

    setLoading(false);
  }

  const includesServiceRole = role === "service_provider" || role === "all";
  const needsIdentity = role !== "service_provider";

  return (
    <div className={page ? "px-4 py-8 md:py-12" : "fixed inset-0 z-50 flex items-center justify-center p-4"} onClick={page ? undefined : onClose}>
      {!page && <div className="absolute inset-0" style={{ backgroundColor: "rgba(26,20,16,0.5)", backdropFilter: "blur(4px)" }} />}
      <div
        className={`relative w-full ${page ? "max-w-2xl" : "max-w-lg max-h-[90dvh]"} mx-auto rounded-2xl shadow-2xl overflow-y-auto`}
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-7">
          <button onClick={onClose} className="absolute top-5 right-5 p-1 rounded-lg hover:bg-[var(--secondary)]" style={{ color: "var(--muted-foreground)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          <div className="mb-6">
            <div className="font-display text-2xl font-semibold mb-1" style={{ color: "var(--foreground)" }}>
              Apply as {APPLICATION_LABELS[role]}
            </div>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{APPLICATION_DESCRIPTIONS[role]}</p>
          </div>

          {done ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#EAF2F0" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div className="font-display text-xl font-semibold mb-2" style={{ color: "var(--foreground)" }}>Application submitted</div>
              <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
                {role === "all" ? "Your applications for all eligible roles are under review." : `Your application to become a ${APPLICATION_LABELS[role]} is under review.`} We’ll notify you when there’s an update.
              </p>
              <button onClick={onClose} className="px-6 py-2.5 rounded-full text-sm font-semibold" style={{ backgroundColor: "var(--primary)", color: "#fff" }}>
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
                  Legal Full Name *
                </label>
                <input
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl text-sm border outline-none focus:border-[var(--primary)]"
                  style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }}
                />
              </div>

              {needsIdentity && (
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
                    Business Name <span style={{ color: "var(--muted-foreground)" }}>(optional)</span>
                  </label>
                  <input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Makena Crafts"
                    className="w-full px-4 py-2.5 rounded-xl text-sm border outline-none focus:border-[var(--primary)]"
                    style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--foreground)" }}>Phone Number *</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="+254 7XX XXX XXX"
                  className="w-full px-4 py-2.5 rounded-xl text-sm border outline-none focus:border-[var(--primary)]"
                  style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }}
                />
              </div>

              {needsIdentity && (
                <>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
                      Government ID <span style={{ color: "var(--muted-foreground)" }}>(National ID / Passport / Driver's License) *</span>
                    </label>
                    <label className="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer hover:border-[var(--primary)] transition-colors" style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      <span className="text-sm" style={{ color: idFile ? "var(--foreground)" : "var(--muted-foreground)" }}>
                        {idFile ? idFile.name : "Upload ID document"}
                      </span>
                      <input type="file" accept="image/*,.pdf" onChange={(e) => setIdFile(e.target.files?.[0] || null)} className="hidden" />
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
                      Government ID back <span style={{ color: "var(--muted-foreground)" }}>*</span>
                    </label>
                    <label className="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer hover:border-[var(--primary)] transition-colors" style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      <span className="text-sm" style={{ color: idBackFile ? "var(--foreground)" : "var(--muted-foreground)" }}>
                        {idBackFile ? idBackFile.name : "Upload back of ID"}
                      </span>
                      <input type="file" accept="image/*,.pdf" onChange={(e) => setIdBackFile(e.target.files?.[0] || null)} className="hidden" />
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--foreground)" }}>Selfie holding ID <span style={{ color: "var(--muted-foreground)" }}>(recommended)</span></label>
                    <label className="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer" style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)" }}>
                      <span className="text-sm">{selfieFile ? selfieFile.name : "Upload selfie photo"}</span>
                      <input type="file" accept="image/*" onChange={(e) => setSelfieFile(e.target.files?.[0] || null)} className="hidden" />
                    </label>
                  </div>
                </>
              )}

              {includesServiceRole && (
                <>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
                      LinkedIn Profile <span style={{ color: "var(--muted-foreground)" }}>(optional)</span>
                    </label>
                    <input
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/your-profile"
                      className="w-full px-4 py-2.5 rounded-xl text-sm border outline-none focus:border-[var(--primary)]"
                      style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
                      Professional Certificate <span style={{ color: "var(--muted-foreground)" }}>(required if regulated service)</span>
                    </label>
                    <label className="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer hover:border-[var(--primary)] transition-colors" style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      <span className="text-sm" style={{ color: certFile ? "var(--foreground)" : "var(--muted-foreground)" }}>
                        {certFile ? certFile.name : "Upload certificate / license"}
                      </span>
                      <input type="file" accept="image/*,.pdf" onChange={(e) => setCertFile(e.target.files?.[0] || null)} className="hidden" />
                    </label>
                  </div>
                </>
              )}

              <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-xs" style={{ backgroundColor: "#EAF2F0", color: "var(--accent)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Documents are stored securely in a private bucket and never made public. Only platform admins can review them.
              </div>

              {error && (
                <div className="text-sm px-4 py-2.5 rounded-xl" style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: "var(--primary)", color: "#fff" }}
              >
                {loading ? "Submitting…" : "Submit Application"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
