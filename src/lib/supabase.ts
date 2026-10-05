import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_PROJECT_URL) as string | undefined;
export const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLIC_KEY) as string | undefined;

const missingConfig = "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.";
const configuredUrl = supabaseUrl || "http://127.0.0.1:54321";
const configuredKey = supabaseAnonKey || "missing-supabase-anon-key";

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = createClient(configuredUrl, configuredKey);
export { missingConfig };

export type UserRole = "buyer" | "seller" | "landlord" | "service_provider" | "admin";
export type VerificationStatus = "pending" | "approved" | "rejected";
export type ListingStatus = "draft" | "active" | "taken" | "sold" | "rejected";

export interface Profile {
  id: string;
  auth_user_id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  rating_avg: number;
  review_count: number;
  seller_verified: boolean;
  landlord_verified: boolean;
  service_provider_verified: boolean;
  account_status: "active" | "suspended";
  created_at: string;
}

export interface UserRoleRow {
  id: string;
  profile_id: string;
  role: UserRole;
  status: VerificationStatus;
  application_data?: Record<string, string>;
  verified_at: string | null;
}

export interface Product {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  status: ListingStatus;
  created_at: string;
  product_images: { storage_path: string; sort_order: number }[];
  profiles?: { full_name: string; rating_avg?: number; review_count?: number; seller_verified?: boolean; landlord_verified?: boolean; service_provider_verified?: boolean };
  avg_rating?: number;
  review_count?: number;
}

export interface Property {
  id: string;
  landlord_id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  bedrooms: number;
  bathrooms: number;
  house_type: string;
  amenities?: string[];
  availability_status: "available" | "taken";
  created_at: string;
  property_images: { storage_path: string; sort_order: number }[];
  profiles?: { full_name: string; rating_avg?: number; review_count?: number; seller_verified?: boolean; landlord_verified?: boolean; service_provider_verified?: boolean };
}

export interface Service {
  id: string;
  provider_id: string;
  title: string;
  description: string;
  price_range: string;
  category: string;
  linkedin_url: string | null;
  certificate_path: string | null;
  service_area?: string | null;
  status: "draft" | "active" | "rejected";
  created_at: string;
  profiles?: { full_name: string; rating_avg?: number; review_count?: number; seller_verified?: boolean; landlord_verified?: boolean; service_provider_verified?: boolean };
  avg_rating?: number;
  review_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  attachment_url: string | null;
  read_at: string | null;
  created_at: string;
  profiles?: { full_name: string; avatar_url: string | null };
}

export interface Conversation {
  id: string;
  listing_type: "product" | "property" | "service";
  listing_id: string;
  buyer_id: string;
  other_party_id: string;
  created_at: string;
  messages?: Message[];
}
