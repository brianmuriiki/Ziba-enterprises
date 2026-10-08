import { useEffect, useState } from "react";
import { db } from "../lib/client";
import type { Product } from "../lib/models";
import { getProductImage } from "../hooks/useListings";
import { IcArrowRight, IcMessage } from "../lib/icons";
import { useAuth } from "../lib/auth-context";
import type { MsgTarget } from "../App";

interface Props {
  onMessage: (target: MsgTarget) => void;
  onSignInRequired: () => void;
  onViewDetail: (listing: any) => void;
  onBrowse: () => void;
}

export default function HotDeals({ onMessage, onSignInRequired, onViewDetail, onBrowse }: Props) {
  const { user } = useAuth();
  const [deals, setDeals] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadDeals() {
      const { data, error: loadError } = await db.from("products")
        .select("*, product_images(storage_path, sort_order), profiles:profiles_public(full_name,rating_avg,review_count,seller_verified)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(500);
      if (cancelled) return;
      if (loadError) {
        setError(loadError.message || "Deals could not be loaded.");
        setDeals([]);
      } else {
        setError("");
        setDeals((data || []).filter((product: Product) => Number(product.compare_at_price) > Number(product.price)));
      }
      setLoading(false);
    }
    void loadDeals();
    return () => { cancelled = true; };
  }, []);

  const sortedDeals = [...deals].sort((a, b) => {
    const discountA = 1 - Number(a.price) / Number(a.compare_at_price);
    const discountB = 1 - Number(b.price) / Number(b.compare_at_price);
    return discountB - discountA;
  });

  function contactSeller(item: Product) {
    if (!user) { onSignInRequired(); return; }
    onMessage({ listingType: "product", listingId: item.id, otherPartyId: item.seller_id, otherPartyName: item.profiles?.full_name || "Seller", listingTitle: item.title });
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <section className="page-shell py-12 md:py-16">
        <div className="rounded-[2rem] p-7 sm:p-10 md:p-14" style={{ background: "#1A2925", color: "white" }}>
          <p className="text-xs uppercase tracking-[.2em] font-semibold mb-3" style={{ color: "#E8A267" }}>Worth a look</p>
          <h1 className="font-display text-4xl md:text-6xl leading-tight">Hot Deals</h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-white/75">Products with a real price drop, shared by local sellers. Compare the current price with the original and reach out directly to claim your find.</p>
        </div>
      </section>

      <section className="page-shell pb-16 md:pb-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "var(--primary)" }}>Marked-down products</p>
            <h2 className="font-display text-3xl md:text-4xl">Good finds, better prices</h2>
          </div>
          {!loading && !error && <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>{sortedDeals.length} deals</span>}
        </div>

        {error ? (
          <div className="rounded-2xl border p-6 text-sm" role="alert" style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}>{error}</div>
        ) : loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-80 rounded-2xl animate-pulse" style={{ backgroundColor: "var(--muted)" }} />)}
          </div>
        ) : sortedDeals.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {sortedDeals.map((item) => {
              const discount = Math.round((1 - Number(item.price) / Number(item.compare_at_price)) * 100);
              return (
                <article key={item.id} className="group rounded-2xl overflow-hidden border" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
                  <button type="button" onClick={() => onViewDetail({ ...item, _type: "product" })} className="relative block w-full h-56 overflow-hidden text-left" aria-label={`View ${item.title}`}>
                    <img src={getProductImage(item)} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <span className="absolute top-3 left-3 rounded-full px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: "var(--primary)", color: "white" }}>Save {discount}%</span>
                  </button>
                  <div className="p-5">
                    <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)" }}>{item.category} · {item.profiles?.full_name || "Local seller"}</p>
                    <button type="button" onClick={() => onViewDetail({ ...item, _type: "product" })} className="text-left font-medium leading-snug">{item.title}</button>
                    <div className="flex items-baseline gap-2 mt-3">
                      <span className="font-mono-data font-semibold" style={{ color: "var(--primary)" }}>KES {Number(item.price).toLocaleString()}</span>
                      <span className="font-mono-data text-sm line-through" style={{ color: "var(--muted-foreground)" }}>KES {Number(item.compare_at_price).toLocaleString()}</span>
                    </div>
                    <button type="button" onClick={() => contactSeller(item)} className="mt-4 w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 border" style={{ borderColor: "var(--border)" }}><IcMessage size={16} /> Contact seller</button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border p-8 md:p-12 text-center" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
            <h3 className="font-display text-2xl">No marked-down products yet</h3>
            <p className="max-w-xl mx-auto mt-2 text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>When sellers add an original price above their current price, their products will show up here as Hot Deals.</p>
            <button type="button" onClick={onBrowse} className="inline-flex items-center gap-2 mt-5 px-5 py-3 rounded-full text-sm font-semibold" style={{ backgroundColor: "var(--primary)", color: "white" }}>Browse all products <IcArrowRight size={16} /></button>
          </div>
        )}
      </section>
    </div>
  );
}
