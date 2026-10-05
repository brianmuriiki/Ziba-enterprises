import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { PRODUCT_CATEGORIES, SERVICE_CATEGORIES } from "../lib/categories";

type ListingType = "product" | "property" | "service";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateListingModal({ onClose, onSuccess }: Props) {
  const { profile, hasRole } = useAuth();
  const [type, setType] = useState<ListingType>("product");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Common
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [images, setImages] = useState<File[]>([]);

  // Product
  const [stock, setStock] = useState("1");

  // Property
  const [location, setLocation] = useState("");
  const [bedrooms, setBedrooms] = useState("1");
  const [bathrooms, setBathrooms] = useState("1");
  const [houseType, setHouseType] = useState("apartment");
  const [amenities, setAmenities] = useState("");

  // Service
  const [priceRange, setPriceRange] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [serviceArea, setServiceArea] = useState("");

  const canSell = hasRole("seller");
  const canLandlord = hasRole("landlord");
  const canService = hasRole("service_provider");

  const allowedTypes: ListingType[] = [
    ...(canSell ? (["product"] as ListingType[]) : []),
    ...(canLandlord ? (["property"] as ListingType[]) : []),
    ...(canService ? (["service"] as ListingType[]) : []),
  ];

  async function uploadImages(listingId: string, bucket: string) {
    const paths: string[] = [];
    for (const file of images) {
      const ext = file.name.split(".").pop();
      const path = `${profile!.id}/${listingId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file);
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      paths.push(data.publicUrl);
    }
    return paths;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setError(null);

    if (type === "product" && images.length < 3) {
      setError("At least 3 product images are required.");
      return;
    }
    if (type === "property" && images.length < 2) {
      setError("At least 2 property photos are required.");
      return;
    }
    if (type !== "property" && (!category || (category === "Other" && !customCategory.trim()))) {
      setError("Choose a category for this listing.");
      return;
    }

    setLoading(true);

    try {
      if (type === "product") {
        const { data: prod, error: e } = await supabase
          .from("products")
          .insert({ seller_id: profile.id, title, description, price: parseFloat(price), stock: parseInt(stock), category: category === "Other" ? customCategory.trim() : category, status: "draft" })
          .select("id")
          .single();
        if (e) throw new Error(e.message);
        const urls = await uploadImages(prod.id, "public-listing-images");
        const { error: imagesError } = await supabase.from("product_images").insert(urls.map((u, i) => ({ product_id: prod.id, storage_path: u, sort_order: i })));
        if (imagesError) throw new Error(imagesError.message);
        const { error: publishError } = await supabase.from("products").update({ status: "active" }).eq("id", prod.id);
        if (publishError) throw new Error(publishError.message);
      } else if (type === "property") {
        const { data: prop, error: e } = await supabase
          .from("properties")
          .insert({ landlord_id: profile.id, title, description, price: parseFloat(price), location, bedrooms: parseInt(bedrooms), bathrooms: parseInt(bathrooms), house_type: houseType, amenities: amenities.split(",").map((item) => item.trim()).filter(Boolean), availability_status: "available", status: "draft" })
          .select("id")
          .single();
        if (e) throw new Error(e.message);
        const urls = await uploadImages(prop.id, "public-listing-images");
        const { error: imagesError } = await supabase.from("property_images").insert(urls.map((u, i) => ({ property_id: prop.id, storage_path: u, sort_order: i })));
        if (imagesError) throw new Error(imagesError.message);
        const { error: publishError } = await supabase.from("properties").update({ status: "active" }).eq("id", prop.id);
        if (publishError) throw new Error(publishError.message);
      } else {
        const { error: e } = await supabase
          .from("services")
          .insert({ provider_id: profile.id, title, description, price_range: priceRange, category: category === "Other" ? customCategory.trim() : category, linkedin_url: linkedinUrl || null, service_area: serviceArea || null });
        if (e) throw new Error(e.message);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    }

    setLoading(false);
  }

  if (allowedTypes.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0" style={{ backgroundColor: "rgba(26,20,16,0.5)", backdropFilter: "blur(4px)" }} />
        <div className="relative w-full max-w-md rounded-2xl p-6 sm:p-8 shadow-2xl text-center" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
          <div className="font-display text-xl font-semibold mb-2" style={{ color: "var(--foreground)" }}>Not yet approved</div>
          <p className="text-sm mb-5" style={{ color: "var(--muted-foreground)" }}>Apply to become a Seller, Landlord, or Service Provider to start listing.</p>
          <button onClick={onClose} className="px-6 py-2.5 rounded-full text-sm font-semibold" style={{ backgroundColor: "var(--primary)", color: "#fff" }}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(26,20,16,0.5)", backdropFilter: "blur(4px)" }} />
      <div
        className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-y-auto max-h-[90dvh]"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 sm:p-7">
          <button onClick={onClose} className="absolute top-5 right-5 p-1 rounded-lg hover:bg-[var(--secondary)]" style={{ color: "var(--muted-foreground)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          <div className="font-display text-2xl font-semibold mb-5" style={{ color: "var(--foreground)" }}>Create Listing</div>

          {/* Type switcher */}
          {allowedTypes.length > 1 && (
            <div className="flex gap-2 mb-5 p-1 rounded-xl" style={{ backgroundColor: "var(--secondary)" }}>
              {allowedTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setType(t); setCategory(""); setCustomCategory(""); }}
                  className="flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all"
                  style={type === t ? { backgroundColor: "var(--primary)", color: "#fff" } : { color: "var(--muted-foreground)" }}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Title *">
              <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder={type === "product" ? "e.g. Handwoven Kikoy Wrap" : type === "property" ? "e.g. 2BR Apartment, Kilimani" : "e.g. Professional Photography"} className="input-base" style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }} />
            </Field>

            <Field label="Description *">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={3} className="input-base resize-none" style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }} />
            </Field>

            {type === "product" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Price (KES) *">
                  <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required min="1" className="input-base" style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                </Field>
                <Field label="Stock *">
                  <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} required min="1" className="input-base" style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                </Field>
              </div>
            )}

            {type === "property" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Price/month (KES) *">
                    <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required min="1" className="input-base" style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                  </Field>
                  <Field label="House Type *">
                    <select value={houseType} onChange={(e) => setHouseType(e.target.value)} className="input-base" style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }}>
                      {["apartment","studio","bungalow","bedsitter","maisonette","villa"].map((t) => (
                        <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Location *">
                  <input value={location} onChange={(e) => setLocation(e.target.value)} required placeholder="e.g. Kilimani, Nairobi" className="input-base" style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                </Field>
                <Field label="Amenities (optional, comma separated)">
                  <input value={amenities} onChange={(e) => setAmenities(e.target.value)} placeholder="Parking, security, water backup" className="input-base" style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Bedrooms">
                    <input type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} min="1" className="input-base" style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                  </Field>
                  <Field label="Bathrooms">
                    <input type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} min="1" className="input-base" style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                  </Field>
                </div>
              </>
            )}

            {type === "service" && (
              <>
                <Field label="Price Range *">
                  <input value={priceRange} onChange={(e) => setPriceRange(e.target.value)} required placeholder="e.g. From KES 3,000 or KES 500/hr" className="input-base" style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                </Field>
                <Field label="LinkedIn URL (optional)">
                  <input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." className="input-base" style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                </Field>
                <Field label="Service area (optional)">
                  <input value={serviceArea} onChange={(e) => setServiceArea(e.target.value)} placeholder="e.g. Nairobi and Kiambu" className="input-base" style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }} />
                </Field>
              </>
            )}

            {type !== "property" && <>
              <Field label="Category *">
                <select value={category} onChange={(e) => { setCategory(e.target.value); setCustomCategory(""); }} required className="input-base" style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }}>
                  <option value="" disabled>Select a category</option>
                  {(type === "product" ? PRODUCT_CATEGORIES : SERVICE_CATEGORIES).map((item) => <option key={item} value={item}>{item}</option>)}
                  <option value="Other">Other</option>
                </select>
              </Field>
              {category === "Other" && <Field label="Custom category *">
                <input value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} required maxLength={60} placeholder="Enter a category" className="input-base" style={{ backgroundColor: "var(--secondary)", borderColor: "var(--border)", color: "var(--foreground)" }} />
              </Field>}
            </>}

            {type !== "service" && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
                  Photos {type === "product" ? "(min. 3 required) *" : "(min. 2 recommended)"}
                </label>
                <label className="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer hover:border-[var(--primary)] transition-colors" style={{ backgroundColor: "var(--secondary)", borderColor: images.length > 0 ? "var(--primary)" : "var(--border)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  <span className="text-sm" style={{ color: images.length > 0 ? "var(--foreground)" : "var(--muted-foreground)" }}>
                    {images.length > 0 ? `${images.length} photo${images.length > 1 ? "s" : ""} selected` : "Select photos"}
                  </span>
                  <input type="file" accept="image/*" multiple onChange={(e) => setImages(Array.from(e.target.files || []))} className="hidden" />
                </label>
              </div>
            )}

            {error && (
              <div className="text-sm px-4 py-2.5 rounded-xl" style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: "var(--primary)", color: "#fff" }}
            >
              {loading ? "Publishing…" : "Publish Listing"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--foreground)" }}>{label}</label>
      {children}
    </div>
  );
}
