import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { IcEye, IcX } from "../lib/icons";

interface Props {
  onClose: () => void;
  defaultMode?: "signin" | "signup";
}

export default function AuthModal({ onClose, defaultMode = "signin" }: Props) {
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !googleButtonRef.current) return;

    const renderGoogleButton = () => {
      const google = (window as any).google;
      if (!google?.accounts?.id || !googleButtonRef.current) return;
      google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential?: string }) => {
          if (!response.credential) { setError("Google sign-in did not return a credential. Please try again."); return; }
          setError(null);
          setLoading(true);
          const result = await signInWithGoogle(response.credential);
          setLoading(false);
          if (result.error) setError(result.error);
          else onClose();
        },
      });
      google.accounts.id.renderButton(googleButtonRef.current, { theme: "outline", size: "large", shape: "pill", text: "continue_with", width: Math.min(400, googleButtonRef.current.clientWidth) });
    };

    let script = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (!script) {
      script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    if ((window as any).google?.accounts?.id) renderGoogleButton();
    else script.addEventListener("load", renderGoogleButton, { once: true });
    return () => script?.removeEventListener("load", renderGoogleButton);
  }, []);

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
            <div className="font-semibold mb-2" style={{ color: "var(--foreground)" }}>Your account is ready</div>
            <p className="text-sm mb-5" style={{ color: "var(--muted-foreground)" }}>
              You can now use <strong>{email}</strong> to sign in.
            </p>
            <button onClick={onClose} className="px-6 py-2.5 rounded-full text-sm font-medium" style={{ backgroundColor: "var(--primary)", color: "#fff" }}>Done</button>
          </div>
        ) : (
          <>
          <div className="mb-5">
            {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
              <div ref={googleButtonRef} className="flex min-h-10 justify-center" />
            ) : (
              <p className="rounded-xl px-3 py-2 text-center text-xs" style={{ backgroundColor: "var(--secondary)", color: "var(--muted-foreground)" }}>
                Google sign-in needs a Google OAuth web client ID. Set <code>VITE_GOOGLE_CLIENT_ID</code> to enable it.
              </p>
            )}
            <div className="mt-4 flex items-center gap-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
              <span className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />
              or use your email
              <span className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />
            </div>
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
              <div className="relative">
                <input type={showPassword ? "text" : "password"} autoComplete={mode === "signin" ? "current-password" : "new-password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full px-4 pr-12 py-2.5 rounded-xl text-sm border outline-none focus:border-[var(--primary)]"
                  style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex items-center px-3 rounded-r-xl transition-colors hover:bg-[var(--border)]"
                  style={{ color: "var(--muted-foreground)" }}>
                  {showPassword ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 002.8 2.8"/><path d="M9.9 5.2A11.4 11.4 0 0112 5c7 0 11 7 11 7a14.7 14.7 0 01-3.1 3.9"/><path d="M6.6 6.6C3.6 8.3 1 12 1 12s4 7 11 7a11.2 11.2 0 004.1-.8"/></svg> : <IcEye size={16} />}
                </button>
              </div>
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
