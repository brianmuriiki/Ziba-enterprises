import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth-context";
import { supabase } from "../lib/supabase";
import { IcMenu, IcX, IcPlus, IcUser, IcLogOut, IcMessage, IcSettings, IcHome } from "../lib/icons";

export type View = "landing" | "browse" | "dashboard" | "admin" | "apply" | "messages" | "help" | "contact" | "report" | "privacy" | "terms" | "cookies" | "careers" | "about" | "trust";

interface Props {
  view: View;
  setView: (v: View) => void;
  onSignIn: () => void;
  onSignUp: () => void;
  onCreateListing: () => void;
}

export default function Nav({ view, setView, onSignIn, onSignUp, onCreateListing }: Props) {
  const { user, profile, signOut, hasRole } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const canList = hasRole("seller") || hasRole("landlord") || hasRole("service_provider");
  const isAdmin = hasRole("admin");

  useEffect(() => {
    if (!profile) return;
    // Count unread messages
    async function loadUnread() {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .is("read_at", null)
        .neq("sender_id", profile!.id);
      setUnreadCount(count ?? 0);
    }
    loadUnread();

    const ch = supabase.channel("unread-badge")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => loadUnread())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => loadUnread())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile]);

  function navigate(v: View) {
    setView(v);
    setMenuOpen(false);
    setUserMenuOpen(false);
  }

  return (
    <nav className="sticky top-0 z-40 border-b" style={{ backgroundColor: "var(--background)", borderColor: "var(--border)" }}>
      <div className="max-w-7xl mx-auto px-5 md:px-10 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <button onClick={() => navigate("landing")} className="flex items-center gap-2 shrink-0">
          <span className="font-display text-2xl font-semibold tracking-tight" style={{ color: "var(--primary)" }}>Ziba</span>
          <span className="hidden sm:block text-xs font-mono-data uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>Marketplace</span>
        </button>

        {/* Right side */}
        <div className="hidden lg:flex items-center gap-1 xl:gap-2">
          <button onClick={() => navigate("landing")} aria-label="Go to home page" className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-full transition-colors hover:bg-[var(--secondary)]" style={{ color: view === "landing" ? "var(--primary)" : "var(--foreground)" }}>
            <IcHome /> Home
          </button>
          <button onClick={() => navigate("dashboard")} className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-full transition-colors hover:bg-[var(--secondary)]" style={{ color: view === "dashboard" ? "var(--primary)" : "var(--foreground)" }}>
            <IcSettings /> Dashboard
          </button>
          <button onClick={() => navigate("messages")} aria-label="Open messages" className="relative flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-full transition-colors hover:bg-[var(--secondary)]" style={{ color: view === "messages" ? "var(--primary)" : "var(--foreground)" }}>
            <IcMessage /> Messages
            {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ backgroundColor: "var(--primary)", color: "#fff" }}>{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </button>
          {user ? (
            <>
              {canList && (
                <button onClick={onCreateListing} className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-full border transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]" style={{ borderColor: "var(--border)", color: "var(--foreground)" }}>
                  <IcPlus /> List
                </button>
              )}
              {/* User menu */}
              <div className="relative">
                <button onClick={() => setUserMenuOpen((v) => !v)} className="flex items-center gap-2 px-3 py-2 rounded-full border transition-colors hover:bg-[var(--secondary)]" style={{ borderColor: "var(--border)", color: "var(--foreground)" }}>
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} className="w-6 h-6 rounded-full object-cover" alt="" />
                  ) : (
                    <IcUser />
                  )}
                  <span className="text-sm font-medium max-w-[100px] truncate">{profile?.full_name?.split(" ")[0] || "Account"}</span>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-12 w-52 rounded-xl shadow-lg border overflow-hidden z-50" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
                    <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                      <div className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>{profile?.full_name}</div>
                      <div className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>{user.email}</div>
                    </div>
                    {isAdmin && (
                      <button onClick={() => { navigate("admin"); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--secondary)] flex items-center gap-2" style={{ color: "var(--foreground)" }}>
                        <IcShieldIcon size={14} /> Admin Panel
                      </button>
                    )}
                    <div className="border-t" style={{ borderColor: "var(--border)" }} />
                    <button onClick={() => { signOut(); setUserMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--secondary)] flex items-center gap-2" style={{ color: "var(--muted-foreground)" }}>
                      <IcLogOut /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button onClick={onSignIn} className="text-sm font-medium px-4 py-2 rounded-full transition-colors hover:bg-[var(--secondary)]" style={{ color: "var(--foreground)" }}>Sign In</button>
              <button onClick={onSignUp} className="text-sm font-medium px-5 py-2 rounded-full transition-opacity hover:opacity-90" style={{ backgroundColor: "var(--primary)", color: "#fff" }}>Get Started</button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="lg:hidden min-w-11 min-h-11 flex items-center justify-center" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)} style={{ color: "var(--foreground)" }}>
          {menuOpen ? <IcX size={22} /> : <IcMenu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden border-t px-5 py-4 flex flex-col gap-2" style={{ borderColor: "var(--border)", backgroundColor: "var(--background)" }}>
          <button onClick={() => navigate("landing")} className="text-left py-2 text-sm font-medium flex items-center gap-2" style={{ color: view === "landing" ? "var(--primary)" : "var(--foreground)" }}><IcHome size={16}/> Home</button>
          <button onClick={() => navigate("dashboard")} className="text-left py-2 text-sm font-medium flex items-center gap-2" style={{ color: view === "dashboard" ? "var(--primary)" : "var(--foreground)" }}><IcSettings size={16}/> Dashboard</button>
          <button onClick={() => navigate("messages")} className="text-left py-2 text-sm font-medium flex items-center gap-2" style={{ color: view === "messages" ? "var(--primary)" : "var(--foreground)" }}><IcMessage size={16}/> Messages {unreadCount > 0 && <span className="px-1.5 rounded-full text-[10px]" style={{ background: "var(--primary)", color: "white" }}>{unreadCount > 9 ? "9+" : unreadCount}</span>}</button>
          {user && (
            <>
              {isAdmin && <button onClick={() => navigate("admin")} className="text-left py-2 text-sm font-medium" style={{ color: "var(--foreground)" }}>Admin Panel</button>}
            </>
          )}
          <div className="flex gap-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
            {user ? (
              <button onClick={() => { signOut(); setMenuOpen(false); }} className="flex-1 text-sm py-2 rounded-full border font-medium" style={{ borderColor: "var(--border)", color: "var(--foreground)" }}>Sign Out</button>
            ) : (
              <>
                <button onClick={() => { onSignIn(); setMenuOpen(false); }} className="flex-1 text-sm py-2 rounded-full border font-medium" style={{ borderColor: "var(--border)", color: "var(--foreground)" }}>Sign In</button>
                <button onClick={() => { onSignUp(); setMenuOpen(false); }} className="flex-1 text-sm py-2 rounded-full font-medium" style={{ backgroundColor: "var(--primary)", color: "#fff" }}>Get Started</button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

function IcShieldIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
