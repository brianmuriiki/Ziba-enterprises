import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { db } from "./client";
import type { Profile, UserRoleRow } from "./models";

interface AuthContextValue {
  user: any; session: any; profile: Profile | null; roles: UserRoleRow[]; loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: (credential: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>; refreshProfile: () => Promise<void>; hasRole: (role: string, status?: string) => boolean;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null); const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null); const [roles, setRoles] = useState<UserRoleRow[]>([]); const [loading, setLoading] = useState(true);

  async function loadProfile(userId?: string) {
    const { data: { session: nextSession } } = await db.auth.getSession();
    setSession(nextSession); setUser(nextSession?.user ?? null);
    if (!nextSession?.user) { setProfile(null); setRoles([]); return; }
    const p = nextSession.user;
    setProfile({ ...p, auth_user_id: p.id, rating_avg: 0, review_count: 0, seller_verified: false, landlord_verified: false, service_provider_verified: false });
    const { data } = await db.from("user_roles").select("*").eq("profile_id", p.id);
    const approvedRoles = (p.roles || ["buyer"]).map((role: string) => ({ id: role, profile_id: p.id, role, status: "approved", verified_at: null }));
    setRoles([...approvedRoles, ...(data || [])]);
  }

  useEffect(() => {
    void loadProfile().finally(() => setLoading(false));
    const { data: { subscription } } = db.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession); setUser(nextSession?.user ?? null);
      void loadProfile(nextSession?.user?.id).finally(() => setLoading(false));
    });
    return () => subscription.unsubscribe();
  }, []);

  async function signUp(email: string, password: string, fullName: string) {
    const { error } = await db.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    return { error: error?.message ?? null };
  }
  async function signIn(email: string, password: string) {
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (!error && data?.user) await loadProfile(data.user.id);
    return { error: error?.message ?? null };
  }
  async function signInWithGoogle(credential: string) { const { data, error } = await db.auth.signInWithOAuth({ credential }); if (!error && data?.user) await loadProfile(data.user.id); return { error: error?.message ?? null }; }
  async function signOut() { await db.auth.signOut(); }
  async function refreshProfile() { await loadProfile(user?.id); }
  function hasRole(role: string, status = "approved") { return roles.some((r) => r.role === role && r.status === status); }

  return <AuthContext.Provider value={{ user, session, profile, roles, loading, signUp, signIn, signInWithGoogle, signOut, refreshProfile, hasRole }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error("useAuth must be used inside AuthProvider"); return ctx; }
