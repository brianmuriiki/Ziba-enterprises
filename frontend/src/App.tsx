import { useEffect, useState } from "react";
import { useAuth } from "./lib/auth-context";
import Nav, { type View } from "./components/Nav";
import SiteFooter from "./components/SiteFooter";
import AuthModal from "./components/AuthModal";
import RoleApplicationModal from "./components/RoleApplicationModal";
import MessageModal from "./components/MessageModal";
import CreateListingModal from "./components/CreateListingModal";
import LoadingAnimation from "./components/LoadingAnimation";
import ListingDetailModal from "./components/ListingDetailModal";
import Landing from "./views/Landing";
import Browse from "./views/Browse";
import HotDeals from "./views/HotDeals";
import UserDashboard from "./views/UserDashboard";
import AdminDashboard from "./views/AdminDashboard";
import Messages from "./views/Messages";
import SupportPages from "./views/SupportPages";
import LegalPages from "./views/LegalPages";
import Careers from "./views/Careers";
import InfoPages from "./views/InfoPages";
import RoleApplications from "./views/RoleApplications";
import AIAssistant from "./components/AIAssistant";

type ApplicationRole = "seller" | "landlord" | "service_provider" | "all";
type ListingType = "product" | "property" | "service";

export interface MsgTarget {
  listingType: "product" | "property" | "service";
  listingId: string;
  otherPartyId: string;
  otherPartyName: string;
  listingTitle: string;
  conversationId?: string;
}

export default function App() {
  const { user, loading, hasRole } = useAuth();
  const [view, setView] = useState<View>("landing");
  const [activeTab, setActiveTab] = useState("Products");
  const [authModal, setAuthModal] = useState<null | "signin" | "signup">(null);
  const [applicationRole, setApplicationRole] = useState<ApplicationRole | null>(() => {
    const savedRole = localStorage.getItem("ziba.pending-application");
    return savedRole === "seller" || savedRole === "landlord" || savedRole === "service_provider" || savedRole === "all" ? savedRole : null;
  });
  const [msgTarget, setMsgTarget] = useState<MsgTarget | null>(null);
  const [createListing, setCreateListing] = useState(false);
  const [createListingType, setCreateListingType] = useState<ListingType | undefined>();
  const [detailListing, setDetailListing] = useState<any | null>(null);
  const [listingsKey, setListingsKey] = useState(0);
  const [cookieChoice, setCookieChoice] = useState<"accepted" | "declined" | null>(() => {
    const saved = localStorage.getItem("ziba.cookie-consent");
    return saved === "accepted" || saved === "declined" ? saved : null;
  });

  useEffect(() => {
    if (!user) return;
    const savedRole = localStorage.getItem("ziba.pending-application");
    if (savedRole === "seller" || savedRole === "landlord" || savedRole === "service_provider" || savedRole === "all") {
      setApplicationRole(savedRole);
      setAuthModal(null);
      setView("apply");
      localStorage.removeItem("ziba.pending-auth-destination");
      return;
    }
    const destination = localStorage.getItem("ziba.pending-auth-destination");
    if (destination === "browse" || authModal) {
      setActiveTab("Products");
      setView("browse");
      setAuthModal(null);
      localStorage.removeItem("ziba.pending-auth-destination");
    }
  }, [user, authModal, view]);

  function openAuth(mode: "signin" | "signup") {
    localStorage.setItem("ziba.pending-auth-destination", "browse");
    setAuthModal(mode);
  }

  function handleApply(role: ApplicationRole) {
    localStorage.setItem("ziba.pending-application", role);
    localStorage.removeItem("ziba.pending-auth-destination");
    setApplicationRole(role);
    if (!user) { setAuthModal("signup"); return; }
    setView("apply");
  }

  function handleSignInRequired() {
    openAuth("signin");
  }

  function handleMessage(target: MsgTarget) {
    if (!user) { openAuth("signin"); return; }
    setMsgTarget(target);
  }

  function handleViewDetail(listing: any) {
    setDetailListing(listing);
  }

  if (loading) {
    return (
      <LoadingAnimation fullScreen label="Getting things ready" />
    );
  }

  const isAdmin = hasRole("admin");
  const canCreateListing = hasRole("seller") || hasRole("landlord") || hasRole("service_provider");

  function openCreateListing(type?: ListingType) {
    if (user && canCreateListing) { setCreateListingType(type); setCreateListing(true); }
  }

  return (
    <div className="min-h-full" style={{ backgroundColor: "var(--background)" }}>
      <Nav
        view={view}
        setView={(v) => {
          // Guard dashboard/admin routes
          if ((v === "dashboard" || v === "apply" || v === "messages") && !user) { openAuth("signin"); return; }
          if (v === "admin" && !isAdmin) return;
          if (view === "apply" && v !== "apply") {
            localStorage.removeItem("ziba.pending-application");
            setApplicationRole(null);
          }
          setView(v);
        }}
        onSignIn={() => openAuth("signin")}
        onSignUp={() => openAuth("signup")}
        onCreateListing={openCreateListing}
      />

      <main>
        {view === "landing" && (
          <Landing
            setView={(v) => setView(v as View)}
            setActiveTab={setActiveTab}
            onSignUp={() => openAuth("signup")}
          />
        )}

        {view === "browse" && (
          <Browse
            key={listingsKey}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onMessage={handleMessage}
            onSignInRequired={handleSignInRequired}
            onViewDetail={handleViewDetail}
          />
        )}

        {view === "hot-deals" && (
          <HotDeals
            onMessage={handleMessage}
            onSignInRequired={handleSignInRequired}
            onViewDetail={handleViewDetail}
            onBrowse={() => { setActiveTab("Products"); setView("browse"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          />
        )}

        {view === "role-applications" && <RoleApplications onApply={handleApply} />}

        {view === "dashboard" && user && (
          <UserDashboard
            onCreateListing={(type) => openCreateListing(type)}
            onOpenConversation={(target) => setMsgTarget(target)}
            onApplyRole={handleApply}
            onViewListing={handleViewDetail}
          />
        )}

        {view === "apply" && user && applicationRole && (
          <RoleApplicationModal
            page
            role={applicationRole}
            onClose={() => {
              localStorage.removeItem("ziba.pending-application");
              setApplicationRole(null);
              setView("landing");
            }}
          />
        )}

        {view === "admin" && isAdmin && (
          <AdminDashboard />
        )}

        {view === "messages" && user && <Messages />}

        {(view === "help" || view === "contact" || view === "report") && (
          <SupportPages page={view} onNavigate={(next) => { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
        )}

        {(view === "privacy" || view === "terms" || view === "cookies") && (
          <LegalPages page={view} onNavigate={(next) => { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
        )}

        {view === "careers" && (
          <Careers onNavigate={(next) => { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
        )}

        {(view === "about" || view === "trust") && <InfoPages page={view} onNavigate={(next) => { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}
      </main>

      <SiteFooter
        onNavigate={(next) => { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        onBrowse={(tab) => { setActiveTab(tab); setView("browse"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        onApply={() => { setView("role-applications"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        onTrustSafety={() => { setView("trust"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
      />

      {cookieChoice === null && (
        <aside
          role="dialog"
          aria-label="Cookie preferences"
          aria-describedby="cookie-consent-description"
          className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-3xl rounded-2xl border p-5 shadow-2xl sm:inset-x-6 sm:bottom-6 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-6"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="mb-4 sm:mb-0">
            <h2 className="font-display text-xl" style={{ color: "var(--foreground)" }}>Your cookie choice</h2>
            <p id="cookie-consent-description" className="mt-1 text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
              Essential cookies keep Ziba working. Would you like to accept optional cookies too? You can read our{" "}
              <button className="underline underline-offset-2" onClick={() => { setView("cookies"); window.scrollTo({ top: 0 }); }} style={{ color: "var(--primary)" }}>Cookie Policy</button>.
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <button
              className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              onClick={() => { localStorage.setItem("ziba.cookie-consent", "declined"); setCookieChoice("declined"); }}
            >Decline</button>
            <button
              className="rounded-xl px-4 py-2.5 text-sm font-semibold"
              style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
              onClick={() => { localStorage.setItem("ziba.cookie-consent", "accepted"); setCookieChoice("accepted"); }}
            >Accept</button>
          </div>
        </aside>
      )}

      {/* Modals */}
      {authModal && (
        <AuthModal
          defaultMode={authModal}
          onClose={() => setAuthModal(null)}
        />
      )}

      {msgTarget && (
        <MessageModal
          {...msgTarget}
          onClose={() => setMsgTarget(null)}
        />
      )}

      {createListing && (
        <CreateListingModal
          initialType={createListingType}
          onClose={() => setCreateListing(false)}
          onSuccess={(type) => {
            setCreateListing(false);
            setActiveTab(type === "product" ? "Products" : type === "property" ? "Properties" : "Services");
            setView("browse");
            setListingsKey((k) => k + 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}

      {detailListing && (
        <ListingDetailModal
          listing={detailListing}
          onClose={() => setDetailListing(null)}
          onContact={() => {
            const l = detailListing;
            setDetailListing(null);
            handleMessage({
              listingType: l._type,
              listingId: l.id,
              otherPartyId: l.seller_id || l.landlord_id || l.provider_id,
              otherPartyName: l.profiles?.full_name || "Seller",
              listingTitle: l.title,
            });
          }}
          onSignInRequired={handleSignInRequired}
        />
      )}

      <AIAssistant onViewListing={setDetailListing} />
    </div>
  );
}
