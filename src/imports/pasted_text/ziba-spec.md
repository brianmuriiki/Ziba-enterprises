# Ziba — Multi-Role Marketplace Platform
### Product & Technical Specification (React + Supabase)

---

## 1. Overview

Ziba is a multi-sided marketplace where a single platform hosts three distinct kinds of transactions:

1. **Product commerce** — buyers purchase physical goods from verified sellers.
2. **Property rental** — tenants browse and inquire about houses/rooms listed by landlords.
3. **Service booking** — clients discover and contact verified service providers (e.g. plumbers, tutors, photographers).

Every account starts as a **buyer/tenant/client by default** (a normal browsing user). To sell products, list property, or offer services, a user must apply to become a **Seller**, **Landlord**, or **Service Provider**, each requiring a verification step before they can publish listings. This keeps the marketplace trustworthy — anyone can look, but only vetted people can list.

---

## 2. User Roles & Account Types

### 2.1 Buyer / Tenant / Client (default role)
- Can register with just email/phone + password (or OAuth).
- Can browse products, houses, and services without restriction.
- Can save/wishlist listings, message sellers/landlords/providers, and make purchases or rental inquiries.
- Can leave reviews and ratings after a completed transaction.
- Can request an "upgrade" to Seller, Landlord, or Service Provider from their profile settings.

### 2.2 Seller (Product Vendor)
- Applies via a **Seller Verification Form**:
  - Full legal name, business name (optional), phone number.
  - Government ID upload — national ID, passport, or driver's license (front + back).
  - A live selfie or "selfie holding ID" (recommended, strongly reduces identity fraud).
  - Status starts as `pending`, admin reviews and sets to `approved` or `rejected`.
- Once approved, can create product listings, each requiring:
  - Title, category, price, stock quantity, detailed description.
  - **Minimum 3 product images** (enforced at the form/DB level).
  - Optional: proof of authenticity/legitimacy documents for high-value or brand-name items (receipts, certificates of authenticity) — flagged for extra trust badge.
- Has a **Seller Dashboard**: manage listings (draft/active/sold out), view orders, respond to buyer messages, see sales stats.
- Can be suspended by admin if reported/fraudulent.

### 2.3 Landlord (House/Property Rental)
- Applies via the same identity-verification flow as Sellers (ID/passport/driver's license) since real estate fraud is high-risk.
- Property listing requires:
  - Location (address or map pin), price (rent/month or per-night), bedrooms/bathrooms, amenities, house type (apartment, bungalow, bedsitter, etc.).
  - **Clear, real photos of the house** — minimum count enforced, ideally per-room.
  - Availability status field: `available` / `taken`.
- **Critical business rule:** once a house is rented out, the landlord (or admin, as a fallback) must be able to instantly flip status to `taken`, which immediately hides it from public search/browse results — not just marks it, but removes it from active listing queries. This prevents buyers from wasting time on unavailable units and protects platform credibility.
- Optional auto-reminder: if a listing has been `available` for X days with no landlord activity, prompt them to confirm it's still available (keeps data fresh).

### 2.4 Service Provider
- Lighter-weight verification than Seller/Landlord since services vary widely in risk:
  - LinkedIn profile URL — **optional**.
  - Professional certificate/license upload — **required only if the service is regulated/skill-certified** (e.g. electrician, medical, legal); optional otherwise.
  - Portfolio images/work samples — optional but boosts trust score.
- Can list one or more "service packages" with description, price range (fixed or "quote on request"), category, and location/service area.
- Buyers can message directly to request quotes or book.

### 2.5 Admin
- **No public registration** — admin accounts are seeded/inserted directly into the database (via Supabase dashboard, SQL, or a protected internal script), not through the sign-up UI. This avoids privilege-escalation attack surface.
- Admin capabilities:
  - Review and approve/reject Seller, Landlord, and Service Provider verification submissions (view uploaded ID/certificate documents securely).
  - Suspend/ban users or listings.
  - Moderate reported content and messages.
  - View platform-wide analytics (users, listings, transactions, flagged content).
  - Manually override listing status (e.g. force a house to `taken` if landlord is unresponsive after a report).

---

## 3. Core Features

### 3.1 Authentication & Onboarding
- Supabase Auth: email/password + optional Google/social OAuth.
- Role stored in a `profiles` table (`role: buyer | seller | landlord | service_provider | admin`), separate from `auth.users`.
- A user can hold **multiple roles simultaneously** (e.g. a buyer who is also an approved seller) — recommend a `user_roles` join table rather than a single enum column, so upgrades don't overwrite the base buyer identity.
- Verification documents stored in a **private Supabase Storage bucket** (never public), accessible only via signed URLs to the user themself and to admins (enforced by Row Level Security).

### 3.2 Listings
- Three listing types, likely modeled as separate tables (`products`, `properties`, `services`) or a shared `listings` table with a `type` discriminator + type-specific detail tables — either works; separate tables are simpler to reason about and query, a shared table is more flexible for unified search/filtering.
- Each listing: owner (FK to profile), status (`draft`, `pending_review`, `active`, `taken/sold`, `rejected`), images (stored in Supabase Storage, public bucket, array of URLs), category, price, description, timestamps.
- Image requirement enforcement: client-side validation (block submit under minimum count) **and** a server-side check (DB constraint or edge function) so the rule can't be bypassed by a direct API call.

### 3.3 Search & Discovery
- Filters: category, price range, location, listing type.
- Full-text search (Postgres `tsvector` via Supabase) on title/description.
- Sort by price, newest, popularity.
- Map view for property listings (optional, e.g. via Mapbox/Leaflet).

### 3.4 Messaging
- Real-time chat between buyer and seller/landlord/service provider, scoped to a specific listing (so context isn't lost).
- Built on **Supabase Realtime** (Postgres changes + broadcast) — a `conversations` table + `messages` table, with RLS so only the two participants can read/write.
- Features: text messages, image attachments, read receipts/unread badges, conversation list per user.
- Optional: block/report user directly from a chat thread.

### 3.5 Transactions
- **Products:** in-app checkout (cart, order, payment integration — e.g. M-Pesa/Stripe depending on market) or a "contact to arrange payment" model for MVP simplicity.
- **Rentals:** typically inquiry/booking-based rather than instant checkout — buyer messages landlord, they arrange viewing/payment offline or via a booking request flow.
- **Services:** quote request → negotiation via chat → booking confirmation.
- Order/booking history stored per user for both buyer and seller side.

### 3.6 Reviews & Trust
- Post-transaction rating (1–5 stars) + comment, tied to a completed order/booking so reviews can't be faked pre-purchase.
- Seller/landlord/provider profile shows aggregate rating, verification badge, and response time.
- Report/flag button on listings, messages, and profiles → feeds into admin moderation queue.

### 3.7 Notifications
- In-app notifications (new message, listing approved/rejected, listing taken/expired, new review).
- Optional email notifications via Supabase Edge Functions + a transactional email provider (Resend, SendGrid).

---

## 4. Suggested Database Schema (Supabase/Postgres)

```
profiles          id, auth_user_id, full_name, phone, avatar_url, created_at
user_roles        id, profile_id, role, status (pending/approved/rejected), verified_at
verification_docs id, profile_id, role, doc_type, storage_path, reviewed_by, reviewed_at

products          id, seller_id, title, description, price, stock, category, status, created_at
product_images    id, product_id, storage_path, sort_order   -- enforce min 3 via app logic

properties        id, landlord_id, title, description, price, location, bedrooms, bathrooms,
                   availability_status, created_at
property_images   id, property_id, storage_path, sort_order

services          id, provider_id, title, description, price_range, category, linkedin_url,
                   certificate_path, created_at

conversations      id, listing_type, listing_id, buyer_id, other_party_id, created_at
messages           id, conversation_id, sender_id, content, attachment_url, read_at, created_at

orders / bookings   id, listing_type, listing_id, buyer_id, seller_id, status, created_at
reviews             id, order_id, reviewer_id, reviewee_id, rating, comment, created_at

reports             id, target_type, target_id, reported_by, reason, status, created_at
```

**Row Level Security is essential here** — e.g. only an approved seller can insert into `products`; only conversation participants can read `messages`; only the doc owner and admins can read `verification_docs`.

---

## 5. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React (Vite recommended for speed) |
| Styling | Tailwind CSS |
| Backend/DB | Supabase (Postgres + Auth + Storage + Realtime + Edge Functions) |
| File storage | Supabase Storage — separate buckets: `public-listing-images`, `private-verification-docs` |
| State/data fetching | TanStack Query (React Query) + Supabase JS client |
| Realtime chat | Supabase Realtime channels |
| Hosting | Vercel/Netlify (frontend), Supabase (backend) |
| Payments (future) | M-Pesa Daraja API and/or Stripe |

---

## 6. Suggested MVP Build Order

1. Auth + `profiles` table + role system (buyer default).
2. Seller/Landlord/Service Provider application flow + doc upload + admin approval queue.
3. Product listing CRUD (with 3-image minimum) → public browse/search.
4. Property listing CRUD (with availability toggle) → public browse/search.
5. Service listing CRUD → public browse/search.
6. Messaging system (Realtime).
7. Reviews + reporting.
8. Admin dashboard (approvals, moderation, analytics).
9. Payments/checkout (can be post-MVP — many local marketplaces launch with "contact to pay").

---

## 7. Key Risk Areas to Design Around

- **Document security:** ID/passport images are highly sensitive — must never sit in a public bucket, must have strict RLS, and ideally should be encrypted at rest and auto-deleted after a retention period once verification is decided.
- **Stale rental listings:** the "remove immediately when taken" rule needs both a manual toggle for landlords *and* a safety net (admin override, inactivity nudges) so listings don't linger and erode trust.
- **Fake reviews:** tie reviews strictly to completed orders/bookings.
- **Role escalation abuse:** RLS policies must check the *approved* role, not just presence of an application — a `pending` seller must not be able to post products.