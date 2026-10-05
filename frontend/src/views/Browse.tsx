import { useState, useEffect } from "react";
import { supabase, type Product, type Property, type Service } from "../lib/supabase";
import { getProductImage, getPropertyImage, getServiceImage } from "../hooks/useListings";
import { IcSearch, IcFilter, IcMapPin, IcCheck, IcMessage, IcX, IcStar, IcChevronDown } from "../lib/icons";
import { useAuth } from "../lib/auth-context";
import type { MsgTarget } from "../App";
import { mockProducts, mockProperties, mockServices } from "../lib/mock-data";
import { PRODUCT_CATEGORIES, PROPERTY_TYPES, SERVICE_CATEGORIES } from "../lib/categories";

interface Props {
  activeTab: string;
  setActiveTab: (t: string) => void;
  onMessage: (t: MsgTarget) => void;
  onSignInRequired: () => void;
  onViewDetail: (l: any) => void;
}

function StarRow({ rating }: { rating: number }) {
  return <span className="flex items-center gap-0.5" style={{ color: "var(--primary)" }}>{[1,2,3,4,5].map((s) => <IcStar key={s} size={11} filled={s <= Math.round(rating)} />)}</span>;
}

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default"|"green"|"amber" }) {
  const s: Record<string,string> = { default: "bg-[var(--secondary)] text-[var(--muted-foreground)]", green: "bg-emerald-50 text-emerald-700 border border-emerald-200", amber: "bg-amber-50 text-amber-700 border border-amber-200" };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${s[variant]}`}>{children}</span>;
}

export default function Browse({ activeTab, setActiveTab, onMessage, onSignInRequired, onViewDetail }: Props) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [location, setLocation] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === "Products" && sortBy === "location_asc") {
      setSortBy("newest");
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => loadListings(), 300);
    return () => clearTimeout(timer);
  }, [activeTab, search, category, priceMin, priceMax, location, sortBy]);

  async function loadListings() {
    setLoading(true);
    if (activeTab === "Products") {
      let q = supabase.from("products").select("*, product_images(storage_path, sort_order), profiles:profiles_public(full_name,rating_avg,review_count,seller_verified)").eq("status", "active");
      if (search) q = q.textSearch("search_vector", search, { type: "websearch", config: "simple" });
      if (category) q = q.eq("category", category);
      if (priceMin) q = q.gte("price", parseFloat(priceMin));
      if (priceMax) q = q.lte("price", parseFloat(priceMax));
      if (sortBy === "price_asc") q = q.order("price", { ascending: true });
      else if (sortBy === "price_desc") q = q.order("price", { ascending: false });
      else q = q.order("created_at", { ascending: false });
      const { data } = await q.limit(24);
      setProducts(data?.length ? data : mockProducts.filter((item) =>
        (!search || `${item.title} ${item.description} ${item.category}`.toLowerCase().includes(search.toLowerCase())) &&
        (!category || item.category === category) &&
        (!priceMin || item.price >= Number(priceMin)) &&
        (!priceMax || item.price <= Number(priceMax))
      ));
    } else if (activeTab === "Properties") {
      let q = supabase.from("properties").select("*, property_images(storage_path, sort_order), profiles:profiles_public(full_name,rating_avg,review_count,landlord_verified)").eq("status", "active").eq("availability_status", "available");
      if (search) q = q.textSearch("search_vector", search, { type: "websearch", config: "simple" });
      if (category) q = q.eq("house_type", category);
      if (priceMin) q = q.gte("price", parseFloat(priceMin));
      if (priceMax) q = q.lte("price", parseFloat(priceMax));
      if (location) q = q.ilike("location", `%${location}%`);
      if (sortBy === "price_asc") q = q.order("price", { ascending: true });
      else if (sortBy === "price_desc") q = q.order("price", { ascending: false });
      else if (sortBy === "location_asc") q = q.order("location", { ascending: true });
      else q = q.order("created_at", { ascending: false });
      const { data } = await q.limit(24);
      const fallbackProperties = mockProperties.filter((item) =>
        (!search || `${item.title} ${item.description} ${item.location}`.toLowerCase().includes(search.toLowerCase())) &&
        (!category || item.house_type === category) &&
        (!priceMin || item.price >= Number(priceMin)) &&
        (!priceMax || item.price <= Number(priceMax)) &&
        (!location || item.location.toLowerCase().includes(location.toLowerCase()))
      );
      if (sortBy === "location_asc") fallbackProperties.sort((a, b) => a.location.localeCompare(b.location));
      else if (sortBy === "price_asc") fallbackProperties.sort((a, b) => a.price - b.price);
      else if (sortBy === "price_desc") fallbackProperties.sort((a, b) => b.price - a.price);
      setProperties(data?.length ? data : fallbackProperties);
    } else {
      let q = supabase.from("services").select("*, profiles:profiles_public(full_name,rating_avg,review_count,service_provider_verified)").eq("status", "active");
      if (search) q = q.textSearch("search_vector", search, { type: "websearch", config: "simple" });
      if (category) q = q.eq("category", category);
      if (sortBy === "location_asc") q = q.order("service_area", { ascending: true, nullsFirst: false });
      else if (sortBy === "newest") q = q.order("created_at", { ascending: false });
      const { data } = await q.limit(24);
      const fallbackServices = mockServices.filter((item) =>
        (!search || `${item.title} ${item.description} ${item.category} ${item.service_area || ""}`.toLowerCase().includes(search.toLowerCase())) &&
        (!category || item.category === category)
      );
      if (sortBy === "location_asc") fallbackServices.sort((a, b) => (a.service_area || "").localeCompare(b.service_area || ""));
      setServices(data?.length ? data : fallbackServices);
    }
    setLoading(false);
  }

  function clearFilters() {
    setSearch(""); setCategory(""); setPriceMin(""); setPriceMax(""); setLocation(""); setSortBy("newest");
  }

  const fixedCategories = activeTab === "Products" ? PRODUCT_CATEGORIES : activeTab === "Properties" ? PROPERTY_TYPES : SERVICE_CATEGORIES;
  const listingCategories = activeTab === "Products" ? products.map((item) => item.category) : activeTab === "Properties" ? properties.map((item) => item.house_type) : services.map((item) => item.category);
  const cats = [...new Set([...fixedCategories, ...listingCategories])];
  const hasFilters = search || category || priceMin || priceMax || location;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      {/* Search bar hero */}
      <div className="border-b py-8" style={{ borderColor: "var(--border)", backgroundColor: "var(--secondary)" }}>
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <h1 className="font-display text-3xl font-semibold mb-5" style={{ color: "var(--foreground)" }}>
            Browse {activeTab}
          </h1>
          {/* Tab selector */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {["Products", "Properties", "Services"].map((t) => (
              <button key={t} onClick={() => { setActiveTab(t); setCategory(""); if (t === "Products" && sortBy === "location_asc") setSortBy("newest"); }}
                className="px-4 py-2 rounded-full text-sm font-medium border transition-all"
                style={activeTab === t ? { backgroundColor: "var(--primary)", color: "#fff", borderColor: "var(--primary)" } : { borderColor: "var(--border)", color: "var(--foreground)" }}>
                {t}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mb-5 overflow-x-auto pb-1" aria-label={`${activeTab} categories`}>
            {["All categories", ...cats].map((item) => {
              const value = item === "All categories" ? "" : item;
              const selected = category === value;
              return <button key={item} onClick={() => setCategory(value)} className="shrink-0 px-3.5 py-2 rounded-full border text-xs font-medium transition-colors" style={selected ? { background: "var(--primary)", borderColor: "var(--primary)", color: "white" } : { background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}>{item === "All categories" ? item : item.charAt(0).toUpperCase() + item.slice(1)}</button>;
            })}
          </div>

          {/* Search input */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
            <div className="relative w-full sm:flex-1 sm:min-w-[220px] sm:max-w-xl">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--muted-foreground)" }}><IcSearch size={16} /></div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${activeTab.toLowerCase()}…`}
                className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-colors focus:border-[var(--primary)]"
                style={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
              />
            </div>
            <button onClick={() => setShowFilters((v) => !v)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors hover:border-[var(--primary)]"
              style={{ borderColor: showFilters ? "var(--primary)" : "var(--border)", color: showFilters ? "var(--primary)" : "var(--foreground)", backgroundColor: "var(--card)" }}>
              <IcFilter /> Filters {hasFilters && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--primary)" }} />}
            </button>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="w-full sm:w-auto px-4 py-3 rounded-xl border text-sm outline-none transition-colors focus:border-[var(--primary)] cursor-pointer"
              style={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
              {activeTab !== "Products" && <option value="location_asc">Location: A–Z</option>}
            </select>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="mt-4 p-4 rounded-xl border flex flex-wrap gap-4" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
              {/* Category */}
              <div className="min-w-[160px]">
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>{activeTab === "Properties" ? "House Type" : "Category"}</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }}>
                  <option value="">All</option>
                  {cats.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {/* Price */}
              {activeTab !== "Services" && (
                <div className="flex gap-2 items-end">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>Min (KES)</label>
                    <input type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="0"
                      className="w-28 px-3 py-2 rounded-lg border text-sm outline-none"
                      style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>Max (KES)</label>
                    <input type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="Any"
                      className="w-28 px-3 py-2 rounded-lg border text-sm outline-none"
                      style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                  </div>
                </div>
              )}
              {/* Location */}
              {activeTab === "Properties" && (
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>Location</label>
                  <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Nairobi"
                    className="w-36 px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                </div>
              )}
              {hasFilters && (
                <div className="flex items-end">
                  <button onClick={clearFilters} className="flex items-center gap-1 text-sm px-3 py-2 rounded-lg hover:bg-[var(--secondary)] transition-colors" style={{ color: "var(--muted-foreground)" }}>
                    <IcX size={14} /> Clear
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-5 md:px-10 py-8">
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
                <div className="h-52 animate-pulse" style={{ backgroundColor: "var(--muted)" }} />
                <div className="p-5 space-y-3">
                  <div className="h-4 rounded-lg animate-pulse w-3/4" style={{ backgroundColor: "var(--muted)" }} />
                  <div className="h-3 rounded-lg animate-pulse w-1/2" style={{ backgroundColor: "var(--muted)" }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="mb-5 text-sm" style={{ color: "var(--muted-foreground)" }}>
              {activeTab === "Products" ? products.length : activeTab === "Properties" ? properties.length : services.length} {activeTab.toLowerCase()} found
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeTab === "Products" && products.map((item, i) => (
                <ProductCard key={item.id} item={item} i={i} onDetail={() => onViewDetail({ ...item, _type: "product" })} onContact={() => {
                  if (!user) { onSignInRequired(); return; }
                  onMessage({ listingType: "product", listingId: item.id, otherPartyId: item.seller_id, otherPartyName: item.profiles?.full_name || "Seller", listingTitle: item.title });
                }} />
              ))}
              {activeTab === "Properties" && properties.map((item, i) => (
                <PropertyCard key={item.id} item={item} i={i} onDetail={() => onViewDetail({ ...item, _type: "property" })} onContact={() => {
                  if (!user) { onSignInRequired(); return; }
                  onMessage({ listingType: "property", listingId: item.id, otherPartyId: item.landlord_id, otherPartyName: item.profiles?.full_name || "Landlord", listingTitle: item.title });
                }} />
              ))}
              {activeTab === "Services" && services.map((item, i) => (
                <ServiceCard key={item.id} item={item} i={i} onDetail={() => onViewDetail({ ...item, _type: "service" })} onContact={() => {
                  if (!user) { onSignInRequired(); return; }
                  onMessage({ listingType: "service", listingId: item.id, otherPartyId: item.provider_id, otherPartyName: item.profiles?.full_name || "Provider", listingTitle: item.title });
                }} />
              ))}
            </div>

            {/* Empty state */}
            {((activeTab === "Products" && products.length === 0) ||
              (activeTab === "Properties" && properties.length === 0) ||
              (activeTab === "Services" && services.length === 0)) && (
              <div className="text-center py-20 rounded-2xl border" style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "var(--secondary)" }}>
                  <IcSearch size={20} />
                </div>
                <div className="font-display text-xl font-semibold mb-2" style={{ color: "var(--foreground)" }}>No results found</div>
                <p className="text-sm mb-5" style={{ color: "var(--muted-foreground)" }}>
                  {hasFilters ? "Try adjusting your filters." : `No ${activeTab.toLowerCase()} are listed yet.`}
                </p>
                {hasFilters && <button onClick={clearFilters} className="px-5 py-2 rounded-full text-sm font-medium border hover:bg-[var(--secondary)]" style={{ borderColor: "var(--border)", color: "var(--foreground)" }}>Clear Filters</button>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ProductCard({ item, i, onDetail, onContact }: { item: Product; i: number; onDetail: () => void; onContact: () => void }) {
  const isDemo = item.id.startsWith("demo-");
  return (
    <div className="group rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
      <div className="relative overflow-hidden h-52 bg-[var(--muted)]" onClick={onDetail}>
        <img src={getProductImage(item, 0)} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        {item.profiles?.seller_verified && <div className="absolute top-3 left-3"><Badge variant="green"><IcCheck size={11} /> Verified</Badge></div>}
        <div className="absolute top-3 right-3"><Badge>{item.category}</Badge></div>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2" onClick={onDetail}>
          <h3 className="font-medium text-sm leading-snug" style={{ color: "var(--foreground)" }}>{item.title}</h3>
          <span className="font-mono-data text-sm font-medium shrink-0" style={{ color: "var(--primary)" }}>KES {Number(item.price).toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{item.profiles?.full_name || "Seller"}{Number(item.profiles?.review_count) > 0 ? ` · ★ ${Number(item.profiles?.rating_avg).toFixed(1)} (${item.profiles?.review_count})` : " · New"}</span>
          <span className="text-xs font-mono-data" style={{ color: "var(--muted-foreground)" }}>Stock: {item.stock}</span>
        </div>
        <button onClick={onContact} disabled={isDemo} title={isDemo ? "Demo listings have no real seller to message" : undefined} className="mt-4 w-full py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 border transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50" style={{ borderColor: "var(--border)", color: "var(--foreground)" }}>
          <IcMessage /> {isDemo ? "Demo listing" : "Contact Seller"}
        </button>
      </div>
    </div>
  );
}

function PropertyCard({ item, i, onDetail, onContact }: { item: Property; i: number; onDetail: () => void; onContact: () => void }) {
  const isDemo = item.id.startsWith("demo-");
  return (
    <div className="group rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
      <div className="relative overflow-hidden h-52 bg-[var(--muted)]" onClick={onDetail}>
        <img src={getPropertyImage(item, 0)} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute top-3 left-3 flex gap-1"><Badge variant="green">Available</Badge>{item.profiles?.landlord_verified && <Badge variant="green"><IcCheck size={11}/> Verified</Badge>}</div>
        <div className="absolute top-3 right-3"><Badge>{item.house_type}</Badge></div>
      </div>
      <div className="p-5">
        <h3 className="font-medium text-sm leading-snug mb-1 cursor-pointer" style={{ color: "var(--foreground)" }} onClick={onDetail}>{item.title}</h3>
        <div className="flex items-center gap-1 text-xs mb-3" style={{ color: "var(--muted-foreground)" }}><IcMapPin size={12} /> {item.location}</div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
            <span>{item.bedrooms} bed</span><span>·</span><span>{item.bathrooms} bath</span>
          </div>
          <span className="font-mono-data text-sm font-medium" style={{ color: "var(--accent)" }}>KES {Number(item.price).toLocaleString()}/mo</span>
        </div>
        <button onClick={onContact} disabled={isDemo} title={isDemo ? "Demo listings have no real landlord to message" : undefined} className="mt-4 w-full py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 border transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50" style={{ borderColor: "var(--border)", color: "var(--foreground)" }}>
          <IcMessage /> {isDemo ? "Demo listing" : "Inquire"}
        </button>
      </div>
    </div>
  );
}

function ServiceCard({ item, i, onDetail, onContact }: { item: Service; i: number; onDetail: () => void; onContact: () => void }) {
  const isDemo = item.id.startsWith("demo-");
  return (
    <div className="group rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
      <div className="relative overflow-hidden h-52 bg-[var(--muted)]" onClick={onDetail}>
        <img src={getServiceImage(item, i)} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        {item.profiles?.service_provider_verified && <div className="absolute top-3 left-3"><Badge variant="green"><IcCheck size={11} /> Verified</Badge></div>}
        <div className="absolute top-3 right-3"><Badge>{item.category}</Badge></div>
      </div>
      <div className="p-5">
        <h3 className="font-medium text-sm leading-snug mb-1" style={{ color: "var(--foreground)" }} onClick={onDetail}>{item.title}</h3>
        <div className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>{item.profiles?.full_name || "Provider"}</div>
        <div className="flex items-center justify-between">
          {Number(item.profiles?.review_count) > 0 ? <span className="flex items-center gap-1"><StarRow rating={Number(item.profiles?.rating_avg)} /><span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{Number(item.profiles?.rating_avg).toFixed(1)} · {item.profiles?.review_count}</span></span> : <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>New provider</span>}
          <span className="font-mono-data text-sm font-medium" style={{ color: "#7C4DBC" }}>{item.price_range}</span>
        </div>
        <button onClick={onContact} disabled={isDemo} title={isDemo ? "Demo listings have no real provider to message" : undefined} className="mt-4 w-full py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 border transition-colors hover:border-purple-400 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-50" style={{ borderColor: "var(--border)", color: "var(--foreground)" }}>
          <IcMessage /> {isDemo ? "Demo listing" : "Request Quote"}
        </button>
      </div>
    </div>
  );
}
