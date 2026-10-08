import type { Product, Property, Service } from "./models";

const mockProfile = (name: string, rating: number, reviews: number) => ({
  full_name: name,
  rating_avg: rating,
  review_count: reviews,
  seller_verified: true,
  landlord_verified: true,
  service_provider_verified: true,
});

const recent = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

export const mockProducts: Product[] = [
  { id: "demo-product-1", seller_id: "demo-seller-1", title: "Handwoven Kikoy Beach Wrap", description: "Soft cotton handwoven on the Kenyan coast. A lightweight wrap for beach days and warm evenings.", price: 2400, stock: 24, category: "Fashion", status: "active", created_at: recent(1), product_images: [], profiles: mockProfile("Amina N.", 4.9, 18) },
  { id: "demo-product-2", seller_id: "demo-seller-2", title: "Cold-Pressed Moringa Oil", description: "Pure moringa oil sourced from small farms in Meru and bottled in small batches.", price: 850, stock: 60, category: "Beauty", status: "active", created_at: recent(2), product_images: [], profiles: mockProfile("Green Roots KE", 4.8, 32) },
  { id: "demo-product-3", seller_id: "demo-seller-3", title: "Kisii Soapstone Catchall Bowl", description: "A hand-carved soapstone bowl made by artisans in Kisii. Each piece has its own natural pattern.", price: 3200, stock: 8, category: "Art", status: "active", created_at: recent(3), product_images: [], profiles: mockProfile("Moraa Crafts", 4.7, 11) },
  { id: "demo-product-4", seller_id: "demo-seller-4", title: "Beaded Brass Hoop Earrings", description: "Lightweight brass hoops finished by hand with glass beads in warm, earthy tones.", price: 1600, stock: 15, category: "Jewelry", status: "active", created_at: recent(5), product_images: [], profiles: mockProfile("Pendo Studio", 5, 7) },
  { id: "demo-product-5", seller_id: "demo-seller-5", title: "Woven Sisal Market Tote", description: "A sturdy everyday tote handwoven from sisal by a small maker collective.", price: 2800, stock: 12, category: "Home", status: "active", created_at: recent(7), product_images: [], profiles: mockProfile("Coast & Country", 4.6, 23) },
  { id: "demo-product-6", seller_id: "demo-seller-6", title: "Small-Batch Arabica Coffee", description: "A medium roast with notes of citrus and caramel, grown and roasted in Kenya.", price: 1200, stock: 40, category: "Food", status: "active", created_at: recent(9), product_images: [], profiles: mockProfile("Highland Roasters", 4.9, 41) },
];

export const mockProperties: Property[] = [
  { id: "demo-property-1", landlord_id: "demo-landlord-1", title: "Sunlit 2 Bedroom in Kilimani", description: "A bright, well-kept apartment close to cafés, shops, and public transport.", price: 55000, location: "Kilimani, Nairobi", bedrooms: 2, bathrooms: 2, house_type: "apartment", amenities: ["Balcony", "Parking", "Security"], availability_status: "available", created_at: recent(1), property_images: [], profiles: mockProfile("Brian O.", 4.8, 9) },
  { id: "demo-property-2", landlord_id: "demo-landlord-2", title: "Quiet Studio near Westlands", description: "A comfortable furnished studio in a secure building, a short walk from Sarit Centre.", price: 32000, location: "Westlands, Nairobi", bedrooms: 1, bathrooms: 1, house_type: "studio", amenities: ["Furnished", "Lift", "Water"], availability_status: "available", created_at: recent(2), property_images: [], profiles: mockProfile("Wanjiku M.", 4.9, 14) },
  { id: "demo-property-3", landlord_id: "demo-landlord-3", title: "Family Bungalow with Garden", description: "A relaxed three-bedroom home with a leafy garden and space for family gatherings.", price: 68000, location: "Rongai, Kajiado", bedrooms: 3, bathrooms: 2, house_type: "bungalow", amenities: ["Garden", "Parking", "Pet friendly"], availability_status: "available", created_at: recent(4), property_images: [], profiles: mockProfile("Peter K.", 4.7, 6) },
  { id: "demo-property-4", landlord_id: "demo-landlord-4", title: "Affordable Bedsitter, South B", description: "Clean, secure bedsitter near shops and matatu routes. Ready for move-in.", price: 14000, location: "South B, Nairobi", bedrooms: 0, bathrooms: 1, house_type: "bedsitter", amenities: ["Security", "Water"], availability_status: "available", created_at: recent(6), property_images: [], profiles: mockProfile("Njeri Homes", 4.6, 12) },
  { id: "demo-property-5", landlord_id: "demo-landlord-5", title: "Modern 1 Bedroom in Nyali", description: "A breezy apartment near the beach with a shared pool and reliable water supply.", price: 42000, location: "Nyali, Mombasa", bedrooms: 1, bathrooms: 1, house_type: "apartment", amenities: ["Pool", "Balcony", "Security"], availability_status: "available", created_at: recent(8), property_images: [], profiles: mockProfile("Salim A.", 4.8, 17) },
  { id: "demo-property-6", landlord_id: "demo-landlord-6", title: "Spacious Maisonette in Milimani", description: "A sunny four-bedroom maisonette in a calm neighbourhood close to schools.", price: 90000, location: "Milimani, Kisumu", bedrooms: 4, bathrooms: 3, house_type: "maisonette", amenities: ["Garden", "Parking", "Staff room"], availability_status: "available", created_at: recent(10), property_images: [], profiles: mockProfile("Otieno Properties", 5, 5) },
];

export const mockServices: Service[] = [
  { id: "demo-service-1", provider_id: "demo-provider-1", title: "Portrait & Event Photography", description: "Natural-light portraits, family sessions, and event coverage with thoughtful editing.", price_range: "From KES 8,000", category: "Photography", linkedin_url: null, certificate_path: null, service_area: "Nairobi", status: "active", created_at: recent(1), profiles: mockProfile("Kevin Mwangi", 4.9, 21) },
  { id: "demo-service-2", provider_id: "demo-provider-2", title: "Home Electrical Repairs", description: "Careful electrical installation, troubleshooting, and safety checks for your home.", price_range: "From KES 1,500", category: "Home Repair", linkedin_url: null, certificate_path: null, service_area: "Nairobi & Kiambu", status: "active", created_at: recent(2), profiles: mockProfile("Jirani Electricals", 4.8, 16) },
  { id: "demo-service-3", provider_id: "demo-provider-3", title: "Mathematics Tutoring", description: "Patient one-to-one support for high school maths, exam revision, and study plans.", price_range: "KES 1,000 per hour", category: "Education", linkedin_url: null, certificate_path: null, service_area: "Kisumu · Online", status: "active", created_at: recent(3), profiles: mockProfile("Faith A.", 5, 13) },
  { id: "demo-service-4", provider_id: "demo-provider-4", title: "Small Business Brand Design", description: "Clear, friendly visual identities and social templates for growing local businesses.", price_range: "Packages from KES 12,000", category: "Design", linkedin_url: null, certificate_path: null, service_area: "Kenya · Online", status: "active", created_at: recent(4), profiles: mockProfile("Maji Creative", 4.7, 8) },
  { id: "demo-service-5", provider_id: "demo-provider-5", title: "Move-In Home Cleaning", description: "Detailed move-in and move-out cleaning with supplies included.", price_range: "From KES 3,500", category: "Cleaning", linkedin_url: null, certificate_path: null, service_area: "Mombasa", status: "active", created_at: recent(6), profiles: mockProfile("Safisha Team", 4.8, 19) },
  { id: "demo-service-6", provider_id: "demo-provider-6", title: "Celebration Cakes to Order", description: "Custom cakes for birthdays and family celebrations, baked with local ingredients.", price_range: "From KES 2,000", category: "Catering", linkedin_url: null, certificate_path: null, service_area: "Nakuru", status: "active", created_at: recent(8), profiles: mockProfile("Lulu Bakes", 4.9, 27) },
];
