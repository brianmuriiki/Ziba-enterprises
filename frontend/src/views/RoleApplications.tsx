import { useAuth } from "../lib/auth-context";

type Role = "seller" | "landlord" | "service_provider" | "all";

const roles: { id: Exclude<Role, "all">; title: string; description: string }[] = [
  { id: "seller", title: "Seller", description: "List and sell products on Ziba." },
  { id: "landlord", title: "Landlord", description: "Post homes for rent or sale." },
  { id: "service_provider", title: "Service Provider", description: "Offer professional services." },
];

export default function RoleApplications({ onApply }: { onApply: (role: Role) => void }) {
  const { roles: userRoles } = useAuth();

  function statusFor(role: string) {
    return userRoles.find((item) => item.role === role)?.status;
  }

  return (
    <main className="page-shell min-h-[60vh] py-12 md:py-16">
      <div className="max-w-4xl mx-auto">
        <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "var(--primary)" }}>Grow with Ziba</p>
        <h1 className="font-display text-3xl md:text-4xl">Role Applications</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>Apply for one role or submit one application for all three. Every role is reviewed separately, and admin access is never included.</p>

        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {roles.map((role) => {
            const status = statusFor(role.id);
            return (
              <article key={role.id} className="rounded-2xl border p-5 flex flex-col" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                <h2 className="font-display text-xl">{role.title}</h2>
                <p className="text-sm mt-2 flex-1" style={{ color: "var(--muted-foreground)" }}>{role.description}</p>
                {status && <p className="text-xs mt-4 capitalize" style={{ color: status === "approved" ? "var(--accent)" : "var(--primary)" }}>Application {status.replaceAll("_", " ")}</p>}
                <button type="button" disabled={status === "approved" || status === "pending"} onClick={() => onApply(role.id)} className="mt-4 px-4 py-2.5 rounded-full text-sm font-semibold disabled:opacity-50" style={{ background: "var(--primary)", color: "white" }}>
                  {status === "approved" ? "Approved" : status === "pending" ? "Under review" : status === "rejected" ? "Apply again" : "Apply for this role"}
                </button>
              </article>
            );
          })}
        </div>

        <section className="mt-6 rounded-2xl border p-6 md:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5" style={{ background: "#EAF2F0", borderColor: "var(--border)" }}>
          <div>
            <h2 className="font-display text-2xl">All roles</h2>
            <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>Apply as a seller, landlord, and service provider together. Admin is excluded.</p>
          </div>
          <button type="button" onClick={() => onApply("all")} className="shrink-0 px-5 py-3 rounded-full text-sm font-semibold" style={{ background: "var(--accent)", color: "white" }}>Apply for all roles</button>
        </section>
      </div>
    </main>
  );
}
