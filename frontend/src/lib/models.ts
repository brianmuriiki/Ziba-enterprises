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
  compare_at_price?: number | null;
  stock: number;
  category: string;
  condition?: "new" | "like_new" | "good" | "fair";
  delivery_option?: "pickup" | "delivery" | "both";
  location?: string | null;
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
  transaction_type?: "rent" | "sale";
  location: string;
  bedrooms: number;
  bathrooms: number;
  house_type: string;
  amenities?: string[];
  deposit?: number;
  lease_term?: string;
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
  availability?: string;
  packages?: string[];
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
