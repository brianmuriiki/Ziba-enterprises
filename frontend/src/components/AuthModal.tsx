import { useState } from "react";
import { useAuth } from "../lib/auth-context";
import { IcX } from "../lib/icons";

interface Props {
  onClose: () => void;
  defaultMode?: "signin" | "signup";
}

export default function AuthModal({ onClose, defaultMode = "signin" }: Props) {
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (mode === "signin") {
      const { error } = await signIn(email, password);
      if (error) setError(error);
      else onClose();
    } else {
      if (!fullName.trim()) { setError("Full name is required."); setLoading(false); return; }
      const { error } = await signUp(email, password, fullName);
      if (error) setError(error);
      else setSuccess(true);
    }
    setLoading(false);
  }

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(26,20,16,0.5)", backdropFilter: "blur(4px)" }} />
      <div className="relative w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl p-6 sm:p-8 shadow-2xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-5 right-5 p-1.5 rounded-lg transition-colors hover:bg-[var(--secondary)]" style={{ color: "var(--muted-foreground)" }}>
          <IcX size={16} />
        </button>

        <div className="mb-6">
          <div className="font-display text-2xl font-semibold mb-1" style={{ color: "var(--foreground)" }}>
            {mode === "signin" ? "Welcome back" : "Join Ziba"}
          </div>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {mode === "signin" ? "Sign in to your account to continue." : "Create your free account in seconds."}
          </p>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#EAF2F0" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div className="font-semibold mb-2" style={{ color: "var(--foreground)" }}>Check your email</div>
            <p className="text-sm mb-5" style={{ color: "var(--muted-foreground)" }}>
              We sent a confirmation link to <strong>{email}</strong>.
            </p>
            <button onClick={onClose} className="px-6 py-2.5 rounded-full text-sm font-medium" style={{ backgroundColor: "var(--primary)", color: "#fff" }}>Done</button>
          </div>
        ) : (
          <>
          <button type="button" onClick={handleGoogleSignIn} disabled={loading} className="w-full py-3 rounded-xl text-sm font-semibold border flex items-center justify-center gap-3 transition-colors hover:bg-[var(--secondary)] disabled:opacity-60" style={{ borderColor: "var(--border)", color: "var(--foreground)" }}>
            <GoogleMark /> Continue with Google
          </button>
          <div className="flex items-center gap-3 my-5" style={{ color: "var(--muted-foreground)" }}>
            <span className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />
            <span className="text-xs">or use your email</span>
            <span className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--foreground)" }}>Full Name</label>
                <input type="text" autoComplete="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Grace Akinyi"
                  className="w-full px-4 py-2.5 rounded-xl text-sm border outline-none focus:border-[var(--primary)]"
                  style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }} />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--foreground)" }}>Email</label>
              <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-xl text-sm border outline-none focus:border-[var(--primary)]"
                style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--foreground)" }}>Password</label>
              <input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl text-sm border outline-none focus:border-[var(--primary)]"
                style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }} />
            </div>
            {error && <div className="text-sm px-4 py-2.5 rounded-xl" style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}>{error}</div>}
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60" style={{ backgroundColor: "var(--primary)", color: "#fff" }}>
            {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
          </form>
          </>
        )}

        {!success && (
          <p className="text-center text-sm mt-5" style={{ color: "var(--muted-foreground)" }}>
            {mode === "signin" ? "No account? " : "Already have one? "}
            <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }} className="font-medium underline" style={{ color: "var(--primary)" }}>
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

function GoogleMark() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.73 7.18l7.66 5.94c4.47-4.13 7.11-10.2 7.11-17.59Z" />
    <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.12.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.88.93 7.55 2.56 10.78l7.97-6.19Z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.81l-7.66-5.94c-2.13 1.44-4.86 2.3-8.24 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
  </svg>;
}
