import { useEffect, useState } from "react";
import { supabase, type Product, type Property, type Service } from "../lib/supabase";
import { getProductImage, getPropertyImage, getServiceImage } from "../hooks/useListings";
import { IcX, IcMessage, IcMapPin, IcCheck, IcStar, IcShield } from "../lib/icons";
import { useAuth } from "../lib/auth-context";

type AnyListing = (Product & { _type: "product" }) | (Property & { _type: "property" }) | (Service & { _type: "service" });

interface Props {
  listing: AnyListing;
  onClose: () => void;
  onContact: () => void;
  onSignInRequired: () => void;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" style={{ color: "var(--primary)" }}>
      {[1,2,3,4,5].map((s) => <IcStar key={s} size={14} filled={s <= Math.round(rating)} />)}
    </span>
  );
}

export default function ListingDetailModal({ listing, onClose, onContact, onSignInRequired }: Props) {
  const isDemoListing = String(listing.id).startsWith("demo-");
  const { user, profile } = useAuth();
  const [imgIdx, setImgIdx] = useState(0);
  const [saved, setSaved] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!profile) return;
    supabase.from("saved_listings").select("id").eq("profile_id", profile.id).eq("listing_type", listing._type).eq("listing_id", listing.id).maybeSingle()
      .then(({ data }) => setSaved(Boolean(data)));
  }, [listing.id, listing._type, profile]);

  function getImages(): string[] {
    if (listing._type === "product") {
      return listing.product_images?.map((i: any) => i.storage_path).filter(Boolean) || [getProductImage(listing as Product, 0), getProductImage(listing as Product, 1), getProductImage(listing as Product, 2)];
    }
    if (listing._type === "property") {
      return listing.property_images?.map((i: any) => i.storage_path).filter(Boolean) || [getPropertyImage(listing as Property, 0), getPropertyImage(listing as Property, 1)];
    }
    return [getServiceImage(listing as Service, 0)];
  }

  const images = getImages().filter((u) => u?.startsWith("http"));
  const displayImages = images.length > 0 ? images : [
    listing._type === "product" ? getProductImage(listing as Product, 0) :
    listing._type === "property" ? getPropertyImage(listing as Property, 0) :
    getServiceImage(listing as Service, 0),
  ];

  function handleContact() {
    if (!user) { onSignInRequired(); return; }
    onContact();
  }

  async function toggleSaved() {
    if (!profile) { onSignInRequired(); return; }
    setFeedback("");
    if (saved) {
      const { error } = await supabase.from("saved_listings").delete().eq("profile_id", profile.id).eq("listing_type", listing._type).eq("listing_id", listing.id);
      if (!error) setSaved(false);
      else setFeedback(error.message);
    } else {
      const { error } = await supabase.from("saved_listings").insert({ profile_id: profile.id, listing_type: listing._type, listing_id: listing.id });
      if (!error) setSaved(true);
      else setFeedback(error.message);
    }
  }

  async function createRequest() {
    if (!profile) { onSignInRequired(); return; }
    const ownerId = (listing as Product).seller_id || (listing as Property).landlord_id || (listing as Service).provider_id;
    if (ownerId === profile.id) { setFeedback("This is your listing."); return; }
    setRequesting(true);
    const { error } = await supabase.from("orders").insert({
      listing_type: listing._type,
      listing_id: listing.id,
      buyer_id: profile.id,
      seller_id: ownerId,
      status: "pending",
    });
    setRequesting(false);
    if (error) setFeedback(error.message);
    else setFeedback(listing._type === "product" ? "Purchase request sent. Message the seller to arrange payment." : listing._type === "property" ? "Viewing request created. Message the landlord to choose a time." : "Booking request created. Message the provider to confirm details.");
  }

  async function submitReport() {
    if (!profile) { onSignInRequired(); return; }
    if (reportReason.trim().length < 10) { setFeedback("Please add at least 10 characters so our team can investigate."); return; }
    const { error } = await supabase.from("reports").insert({
      target_type: listing._type,
      target_id: listing.id,
      reported_by: profile.id,
      reason: reportReason.trim(),
    });
    if (error) setFeedback(error.message);
    else {
      setFeedback("Report submitted. Our safety team will review it.");
      setShowReport(false);
      setReportReason("");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(26,20,16,0.6)", backdropFilter: "blur(4px)" }} />
      <div
        className="relative w-full md:max-w-2xl rounded-t-2xl md:rounded-2xl shadow-2xl overflow-y-auto max-h-[90dvh] md:max-h-[85dvh]"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image gallery */}
        <div className="relative h-64 md:h-72 bg-[var(--muted)]">
          <img src={displayImages[imgIdx]} alt={listing.title} className="w-full h-full object-cover" />
          {displayImages.length > 1 && (
            <>
              <button onClick={() => setImgIdx((i) => (i - 1 + displayImages.length) % displayImages.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(0,0,0,0.4)", color: "#fff" }}>
                ‹
              </button>
              <button onClick={() => setImgIdx((i) => (i + 1) % displayImages.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(0,0,0,0.4)", color: "#fff" }}>
                ›
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {displayImages.map((_, i) => (
                  <button key={i} onClick={() => setImgIdx(i)} className="w-1.5 h-1.5 rounded-full transition-opacity" style={{ backgroundColor: "#fff", opacity: i === imgIdx ? 1 : 0.5 }} />
                ))}
              </div>
            </>
          )}
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.4)", color: "#fff" }}>
            <IcX size={16} />
          </button>
          {listing._type === "property" && (
            <div className="absolute top-3 left-3">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: (listing as Property).availability_status === "available" ? "#DCFCE7" : "#FEF9C3", color: (listing as Property).availability_status === "available" ? "#166534" : "#854D0E" }}>
                {(listing as Property).availability_status === "available" ? "Available" : "Taken"}
              </span>
            </div>
          )}
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <span className="inline-block text-xs font-mono-data uppercase tracking-wider mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                {listing._type === "product" ? (listing as Product).category : listing._type === "property" ? (listing as Property).house_type : (listing as Service).category}
              </span>
              <h2 className="font-display text-2xl font-semibold leading-snug" style={{ color: "var(--foreground)" }}>{listing.title}</h2>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono-data text-xl font-semibold" style={{ color: listing._type === "product" ? "var(--primary)" : listing._type === "property" ? "var(--accent)" : "#7C4DBC" }}>
                {listing._type === "product" ? `KES ${Number((listing as Product).price).toLocaleString()}` :
                 listing._type === "property" ? `KES ${Number((listing as Property).price).toLocaleString()}/mo` :
                 (listing as Service).price_range}
              </div>
            </div>
          </div>

          {/* Meta */}
          {listing._type === "property" && (
            <div className="flex flex-wrap gap-4 mb-4 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
                <IcMapPin size={14} /> {(listing as Property).location}
              </div>
              <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>{(listing as Property).bedrooms} bed · {(listing as Property).bathrooms} bath</div>
            </div>
          )}

          {listing._type === "product" && (
            <div className="flex flex-wrap gap-4 mb-4 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>Stock: <span style={{ color: "var(--foreground)" }}>{(listing as Product).stock} available</span></div>
            </div>
          )}

          {listing._type === "property" && (listing as Property).amenities?.length ? <div className="flex flex-wrap gap-2 mb-4">{(listing as Property).amenities!.map((amenity) => <span key={amenity} className="px-3 py-1 rounded-full text-xs" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>{amenity}</span>)}</div> : null}
          {listing._type === "service" && (listing as Service).service_area ? <div className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>Service area: {(listing as Service).service_area}</div> : null}

          {/* Description */}
          <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--muted-foreground)" }}>{listing.description}</p>

          {/* Seller info */}
          <div className="flex items-center justify-between p-4 rounded-xl mb-5" style={{ backgroundColor: "var(--secondary)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold" style={{ backgroundColor: "var(--primary)", color: "#fff" }}>
                {(listing as any).profiles?.full_name?.charAt(0) || "S"}
              </div>
              <div>
                <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{(listing as any).profiles?.full_name || "Verified Seller"}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <StarRating rating={4.8} />
                  {Number((listing as any).profiles?.review_count) > 0 ? <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{Number((listing as any).profiles?.rating_avg).toFixed(1)} rating · {(listing as any).profiles?.review_count} reviews</span> : <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>No reviews yet</span>}
                </div>
              </div>
            </div>
            {((listing._type === "product" && (listing as any).profiles?.seller_verified) || (listing._type === "property" && (listing as any).profiles?.landlord_verified) || (listing._type === "service" && (listing as any).profiles?.service_provider_verified)) && <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ backgroundColor: "#EAF2F0", color: "var(--accent)" }}><IcCheck size={12} /> Verified</div>}
          </div>

          {showReport && (
            <div className="p-4 rounded-xl border mb-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--secondary)" }}>
              <label className="block text-xs font-medium mb-2">Why are you reporting this listing?</label>
              <textarea value={reportReason} onChange={(event) => setReportReason(event.target.value)} rows={3} className="input-base resize-none" placeholder="Describe misleading, unsafe, or prohibited content" style={{ backgroundColor: "var(--card)" }} />
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={() => setShowReport(false)} className="px-3 py-1.5 text-xs font-medium">Cancel</button>
                <button onClick={submitReport} className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ backgroundColor: "var(--foreground)", color: "var(--card)" }}>Submit report</button>
              </div>
            </div>
          )}
          {feedback && <div className="text-xs px-3 py-2 rounded-lg mb-3" style={{ backgroundColor: "var(--secondary)", color: "var(--foreground)" }}>{feedback}</div>}

          {/* Actions */}
          <button onClick={handleContact} disabled={isDemoListing} title={isDemoListing ? "This sample listing has no real lister to message" : undefined} className="w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: listing._type === "product" ? "var(--primary)" : listing._type === "property" ? "var(--accent)" : "#7C4DBC", color: "#fff" }}>
            <IcMessage />
            {isDemoListing ? "Sample listing — messaging unavailable" : listing._type === "product" ? "Message Seller" : listing._type === "property" ? "Inquire About Property" : "Request Quote"}
          </button>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <button onClick={createRequest} disabled={requesting} className="py-2.5 rounded-xl border text-xs font-semibold disabled:opacity-60" style={{ borderColor: "var(--border)" }}>
              {requesting ? "Sending…" : listing._type === "product" ? "Request to buy" : listing._type === "property" ? "Request viewing" : "Book service"}
            </button>
            <button onClick={toggleSaved} className="py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1" style={{ borderColor: saved ? "var(--primary)" : "var(--border)", color: saved ? "var(--primary)" : "var(--foreground)" }}>
              {saved && <IcCheck size={12} />}{saved ? "Saved" : "Save"}
            </button>
            <button onClick={() => user ? setShowReport(true) : onSignInRequired()} className="py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
              <IcShield size={12} /> Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
