import { useEffect, useState } from "react";
import { supabase, type Product, type Property, type Service } from "../lib/supabase";
import { mockProducts, mockProperties, mockServices } from "../lib/mock-data";

const FALLBACK_PRODUCT_IMAGES = [
  "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&h=320&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1608571423539-e951a5fd5e5c?w=400&h=320&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1582691737290-9a84f8e47908?w=400&h=320&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=400&h=320&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400&h=320&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=320&fit=crop&auto=format",
];

const FALLBACK_PROPERTY_IMAGES = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=320&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=320&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=320&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=320&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&h=320&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400&h=320&fit=crop&auto=format",
];

const FALLBACK_SERVICE_IMAGES = [
  "https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=400&h=320&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=320&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400&h=320&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1542744094-24638eff58bb?w=400&h=320&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1527689368864-3a821dbccc34?w=400&h=320&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&h=320&fit=crop&auto=format",
];

export function getProductImage(product: Product, idx = 0): string {
  const img = product.product_images?.[idx]?.storage_path;
  if (img && img.startsWith("http")) return img;
  return FALLBACK_PRODUCT_IMAGES[idx % FALLBACK_PRODUCT_IMAGES.length];
}

export function getPropertyImage(property: Property, idx = 0): string {
  const img = property.property_images?.[idx]?.storage_path;
  if (img && img.startsWith("http")) return img;
  return FALLBACK_PROPERTY_IMAGES[idx % FALLBACK_PROPERTY_IMAGES.length];
}

export function getServiceImage(_service: Service, idx = 0): string {
  return FALLBACK_SERVICE_IMAGES[idx % FALLBACK_SERVICE_IMAGES.length];
}

export function useProducts(limit = 6) {
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("products")
      .select("*, product_images(storage_path, sort_order), profiles:profiles_public(full_name,rating_avg,review_count,seller_verified)")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        setData(data?.length ? data : mockProducts.slice(0, limit));
        setLoading(false);
      });
  }, [limit]);

  return { data, loading };
}

export function useProperties(limit = 6) {
  const [data, setData] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("properties")
      .select("*, property_images(storage_path, sort_order), profiles:profiles_public(full_name,rating_avg,review_count,landlord_verified)")
      .eq("status", "active")
      .eq("availability_status", "available")
      .order("created_at", { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        setData(data?.length ? data : mockProperties.slice(0, limit));
        setLoading(false);
      });
  }, [limit]);

  return { data, loading };
}

export function useServices(limit = 6) {
  const [data, setData] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("services")
      .select("*, profiles:profiles_public(full_name,rating_avg,review_count,service_provider_verified)")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        setData(data?.length ? data : mockServices.slice(0, limit));
        setLoading(false);
      });
  }, [limit]);

  return { data, loading };
}
