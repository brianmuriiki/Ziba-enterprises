import { useEffect, useState } from "react";
import { useAuth } from "./lib/auth-context";
import Nav, { type View } from "./components/Nav";
import SiteFooter from "./components/SiteFooter";
import AuthModal from "./components/AuthModal";
import RoleApplicationModal from "./components/RoleApplicationModal";
import MessageModal from "./components/MessageModal";
import CreateListingModal from "./components/CreateListingModal";
import ListingDetailModal from "./components/ListingDetailModal";
import Landing from "./views/Landing";
import Browse from "./views/Browse";
import UserDashboard from "./views/UserDashboard";
import AdminDashboard from "./views/AdminDashboard";
import Messages from "./views/Messages";
import SupportPages from "./views/SupportPages";
import LegalPages from "./views/LegalPages";
import Careers from "./views/Careers";
import InfoPages from "./views/InfoPages";

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
  const [applicationRole, setApplicationRole] = useState<null | "seller" | "landlord" | "service_provider">(() => {
    const savedRole = localStorage.getItem("ziba.pending-application");
    return savedRole === "seller" || savedRole === "landlord" || savedRole === "service_provider" ? savedRole : null;
  });
  const [msgTarget, setMsgTarget] = useState<MsgTarget | null>(null);
  const [createListing, setCreateListing] = useState(false);
  const [detailListing, setDetailListing] = useState<any | null>(null);
  const [listingsKey, setListingsKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    const savedRole = localStorage.getItem("ziba.pending-application");
    if (savedRole === "seller" || savedRole === "landlord" || savedRole === "service_provider") {
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

  function handleApply(role: "seller" | "landlord" | "service_provider") {
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--background)" }}>
        <div className="font-display text-2xl animate-pulse" style={{ color: "var(--primary)" }}>Ziba</div>
      </div>
    );
  }

  const isAdmin = hasRole("admin");

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
        onCreateListing={() => {
          if (!user) { openAuth("signup"); return; }
          setCreateListing(true);
        }}
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

        {view === "dashboard" && user && (
          <UserDashboard
            onCreateListing={() => setCreateListing(true)}
            onOpenConversation={(target) => setMsgTarget(target)}
            onApplyRole={handleApply}
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
        onApply={handleApply}
        onTrustSafety={() => { setView("trust"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
      />

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
          onClose={() => setCreateListing(false)}
          onSuccess={() => {
            setCreateListing(false);
            setListingsKey((k) => k + 1);
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
    </div>
  );
}
