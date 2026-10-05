-- Ziba marketplace foundation. Safe to run once in the Supabase SQL editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null default '', phone text, avatar_url text,
  rating_avg numeric(3,2) not null default 0, review_count integer not null default 0,
  seller_verified boolean not null default false, landlord_verified boolean not null default false, service_provider_verified boolean not null default false,
  account_status text not null default 'active' check (account_status in ('active','suspended')),
  created_at timestamptz not null default now()
);
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('buyer','seller','landlord','service_provider','admin')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  application_data jsonb not null default '{}'::jsonb, verified_at timestamptz,
  created_at timestamptz not null default now(), unique(profile_id, role)
);
create table if not exists public.verification_docs (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('seller','landlord','service_provider')),
  doc_type text not null, storage_path text not null, reviewed_by uuid references public.profiles(id), reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(), seller_id uuid not null references public.profiles(id),
  title text not null, description text not null, price numeric(12,2) not null check (price > 0), stock integer not null default 1 check (stock >= 0),
  category text not null, status text not null default 'draft' check (status in ('draft','active','taken','sold','rejected','suspended')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null, sort_order integer not null default 0, unique(product_id, sort_order)
);
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(), landlord_id uuid not null references public.profiles(id),
  title text not null, description text not null, price numeric(12,2) not null check (price > 0), location text not null,
  bedrooms integer not null default 1 check (bedrooms >= 0), bathrooms integer not null default 1 check (bathrooms >= 0),
  house_type text not null default 'apartment', amenities text[] not null default '{}',
  availability_status text not null default 'available' check (availability_status in ('available','taken')),
  status text not null default 'active' check (status in ('active','rejected','suspended')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.property_images (
  id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties(id) on delete cascade,
  storage_path text not null, sort_order integer not null default 0, unique(property_id, sort_order)
);
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(), provider_id uuid not null references public.profiles(id),
  title text not null, description text not null, price_range text not null, category text not null,
  linkedin_url text, certificate_path text, service_area text, status text not null default 'active' check (status in ('draft','active','rejected','suspended')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(), listing_type text not null check (listing_type in ('product','property','service')),
  listing_id uuid not null, buyer_id uuid not null references public.profiles(id), other_party_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(), unique(listing_type, listing_id, buyer_id, other_party_id), check (buyer_id <> other_party_id)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id), content text not null check (length(trim(content)) between 1 and 5000),
  attachment_url text, read_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(), listing_type text not null check (listing_type in ('product','property','service')),
  listing_id uuid not null, buyer_id uuid not null references public.profiles(id), seller_id uuid not null references public.profiles(id),
  status text not null default 'pending' check (status in ('pending','accepted','rejected','cancelled','completed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check (buyer_id <> seller_id)
);
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.orders(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id), reviewee_id uuid not null references public.profiles(id),
  rating integer not null check (rating between 1 and 5), comment text not null default '', created_at timestamptz not null default now()
);
create table if not exists public.saved_listings (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade,
  listing_type text not null check (listing_type in ('product','property','service')), listing_id uuid not null, created_at timestamptz not null default now(),
  unique(profile_id, listing_type, listing_id)
);
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(), target_type text not null check (target_type in ('product','property','service','message','profile')),
  target_id uuid not null, reported_by uuid not null references public.profiles(id), reason text not null check (length(trim(reason)) >= 10),
  status text not null default 'open' check (status in ('open','resolved','dismissed')), resolution_note text,
  created_at timestamptz not null default now(), reviewed_by uuid references public.profiles(id), reviewed_at timestamptz
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null, body text not null default '', kind text not null default 'general', link text, read_at timestamptz, created_at timestamptz not null default now()
);

-- Upgrade the earlier Ziba draft schema as well as installing on a fresh project.
alter table public.profiles add column if not exists rating_avg numeric(3,2) not null default 0;
alter table public.profiles add column if not exists review_count integer not null default 0;
alter table public.profiles add column if not exists seller_verified boolean not null default false;
alter table public.profiles add column if not exists landlord_verified boolean not null default false;
alter table public.profiles add column if not exists service_provider_verified boolean not null default false;
alter table public.products add column if not exists updated_at timestamptz not null default now();
alter table public.products add column if not exists search_vector tsvector generated always as (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,''))) stored;
alter table public.properties add column if not exists amenities text[] not null default '{}';
alter table public.properties add column if not exists status text not null default 'active';
alter table public.properties add column if not exists updated_at timestamptz not null default now();
alter table public.properties add column if not exists search_vector tsvector generated always as (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,''))) stored;
alter table public.services add column if not exists service_area text;
alter table public.services add column if not exists updated_at timestamptz not null default now();
alter table public.services add column if not exists search_vector tsvector generated always as (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,''))) stored;
alter table public.orders add column if not exists updated_at timestamptz not null default now();
alter table public.reports add column if not exists resolution_note text;
alter table public.reports add column if not exists reviewed_by uuid references public.profiles(id);
alter table public.reports add column if not exists reviewed_at timestamptz;
alter table public.products drop constraint if exists products_status_check;
alter table public.products add constraint products_status_check check (status in ('draft','active','taken','sold','rejected','suspended'));
alter table public.properties drop constraint if exists properties_status_check;
alter table public.properties add constraint properties_status_check check (status in ('draft','active','rejected','suspended'));
alter table public.services drop constraint if exists services_status_check;
alter table public.services add constraint services_status_check check (status in ('draft','active','rejected','suspended'));
alter table public.orders drop constraint if exists orders_status_check;
update public.orders set status='accepted' where status='confirmed';
alter table public.orders add constraint orders_status_check check (status in ('pending','accepted','rejected','cancelled','completed'));

create index if not exists products_active_recent on public.products(status, created_at desc);
create index if not exists properties_available_recent on public.properties(status, availability_status, created_at desc);
create index if not exists services_active_recent on public.services(status, created_at desc);
create index if not exists messages_conversation_recent on public.messages(conversation_id, created_at desc);
create index if not exists notifications_profile_recent on public.notifications(profile_id, created_at desc);

create or replace function public.current_profile_id() returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where auth_user_id = auth.uid() limit 1;
$$;
create or replace function public.has_approved_role(role_name text) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where profile_id = public.current_profile_id() and role = role_name and status = 'approved');
$$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where profile_id = public.current_profile_id() and role = 'admin' and status = 'approved');
$$;
revoke all on function public.current_profile_id() from public;
revoke all on function public.has_approved_role(text) from public;
revoke all on function public.is_admin() from public;
grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.has_approved_role(text) to authenticated;
grant execute on function public.is_admin() to authenticated;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare new_profile_id uuid;
begin
  insert into public.profiles(auth_user_id, full_name) values(new.id, coalesce(new.raw_user_meta_data->>'full_name','')) returning id into new_profile_id;
  insert into public.user_roles(profile_id, role, status) values(new_profile_id, 'buyer', 'approved');
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_ziba on auth.users;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created_ziba after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.enforce_product_images() returns trigger language plpgsql as $$
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    if (select count(*) from public.product_images where product_id = new.id) < 3 then
      raise exception 'Products require at least three images before publishing.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists product_image_minimum on public.products;
create constraint trigger product_image_minimum after insert or update of status on public.products deferrable initially deferred for each row execute function public.enforce_product_images();

create or replace function public.enforce_property_images() returns trigger language plpgsql as $$
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    if (select count(*) from public.property_images where property_id = new.id) < 2 then raise exception 'Properties require at least two photos before publishing.'; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists property_image_minimum on public.properties;
create constraint trigger property_image_minimum after insert or update of status on public.properties deferrable initially deferred for each row execute function public.enforce_property_images();

create or replace function public.enforce_product_image_count() returns trigger language plpgsql as $$
declare target_id uuid; actual_count integer;
begin
  target_id := case when tg_op='DELETE' then old.product_id else new.product_id end;
  select count(*) into actual_count from public.product_images where product_id=target_id;
  if exists(select 1 from public.products where id=target_id and status='active') and actual_count < 3 then raise exception 'Published products require at least three images.'; end if;
  return null;
end;
$$;
drop trigger if exists product_image_count_guard on public.product_images;
create constraint trigger product_image_count_guard after insert or update or delete on public.product_images deferrable initially deferred for each row execute function public.enforce_product_image_count();
create or replace function public.enforce_property_image_count() returns trigger language plpgsql as $$
declare target_id uuid; actual_count integer;
begin
  target_id := case when tg_op='DELETE' then old.property_id else new.property_id end;
  select count(*) into actual_count from public.property_images where property_id=target_id;
  if exists(select 1 from public.properties where id=target_id and status='active') and actual_count < 2 then raise exception 'Published properties require at least two photos.'; end if;
  return null;
end;
$$;
drop trigger if exists property_image_count_guard on public.property_images;
create constraint trigger property_image_count_guard after insert or update or delete on public.property_images deferrable initially deferred for each row execute function public.enforce_property_image_count();

create or replace function public.enforce_order_flow() returns trigger language plpgsql security definer set search_path = public as $$
declare expected_owner uuid;
begin
  if auth.role() = 'service_role' then return new; end if;
  if tg_op = 'INSERT' then
    if new.buyer_id <> public.current_profile_id() or new.status <> 'pending' then raise exception 'Only buyers can create pending requests.'; end if;
    if new.listing_type = 'product' then select seller_id into expected_owner from public.products where id=new.listing_id and status='active' and stock > 0;
    elsif new.listing_type = 'property' then select landlord_id into expected_owner from public.properties where id=new.listing_id and status='active' and availability_status='available';
    else select provider_id into expected_owner from public.services where id=new.listing_id and status='active'; end if;
    if expected_owner is null or expected_owner <> new.seller_id or expected_owner = new.buyer_id then raise exception 'Request does not match an available listing.'; end if;
    return new;
  end if;
  if new.buyer_id <> old.buyer_id or new.seller_id <> old.seller_id or new.listing_type <> old.listing_type or new.listing_id <> old.listing_id then raise exception 'Request details cannot be changed.'; end if;
  if public.current_profile_id() = old.seller_id and old.status='pending' and new.status in ('accepted','rejected') then return new; end if;
  if public.current_profile_id() = old.seller_id and old.status='accepted' and new.status='completed' then return new; end if;
  if public.current_profile_id() = old.buyer_id and old.status in ('pending','accepted') and new.status='cancelled' then return new; end if;
  raise exception 'Invalid request status transition.';
end;
$$;
drop trigger if exists order_flow_guard on public.orders;
create trigger order_flow_guard before insert or update on public.orders for each row execute function public.enforce_order_flow();

create or replace function public.validate_conversation() returns trigger language plpgsql security definer set search_path = public as $$
declare expected_owner uuid;
begin
  if auth.role() = 'service_role' then return new; end if;
  if new.buyer_id <> public.current_profile_id() then raise exception 'The conversation must be started by its buyer.'; end if;
  if new.listing_type='product' then select seller_id into expected_owner from public.products where id=new.listing_id and status='active';
  elsif new.listing_type='property' then select landlord_id into expected_owner from public.properties where id=new.listing_id and status='active' and availability_status='available';
  else select provider_id into expected_owner from public.services where id=new.listing_id and status='active'; end if;
  if expected_owner is null or new.other_party_id <> expected_owner or expected_owner = new.buyer_id then raise exception 'Conversation does not match an available listing.'; end if;
  return new;
end;
$$;
drop trigger if exists conversation_listing_guard on public.conversations;
create trigger conversation_listing_guard before insert on public.conversations for each row execute function public.validate_conversation();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.verification_docs enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.properties enable row level security;
alter table public.property_images enable row level security;
alter table public.services enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.orders enable row level security;
alter table public.reviews enable row level security;
alter table public.saved_listings enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;

-- Replace permissive policies from the first marketplace draft before installing the hardened policy set.
do $$
declare policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename = any(array[
      'profiles','user_roles','verification_docs','products','product_images','properties','property_images',
      'services','conversations','messages','orders','reviews','saved_listings','reports','notifications'
    ])
  loop
    execute format('drop policy if exists %I on %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  end loop;
end;
$$;
drop policy if exists "listing_images_public_read" on storage.objects;
drop policy if exists "listing_images_owner_insert" on storage.objects;
drop policy if exists "listing_images_owner_update" on storage.objects;
drop policy if exists "listing_images_owner_delete" on storage.objects;
drop policy if exists "verification_docs_owner_insert" on storage.objects;
drop policy if exists "verification_docs_owner_update" on storage.objects;
drop policy if exists "verification_docs_owner_read" on storage.objects;

drop policy if exists "profiles private read" on public.profiles;
create policy "profiles private read" on public.profiles for select using (auth.uid() = auth_user_id or public.is_admin());
revoke all on public.profiles from anon;
grant select, update on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
grant update (full_name, phone, avatar_url) on public.profiles to authenticated;
create policy "profiles update self" on public.profiles for update using (id = public.current_profile_id()) with check (id = public.current_profile_id());
create or replace view public.profiles_public with (security_invoker = false) as
  select id, full_name, avatar_url, rating_avg, review_count, seller_verified, landlord_verified, service_provider_verified from public.profiles;
grant select on public.profiles_public to anon, authenticated;
drop policy if exists "roles read self admin" on public.user_roles;
create policy "roles read self admin" on public.user_roles for select using (profile_id = public.current_profile_id() or public.is_admin());
create policy "apply for nonadmin roles" on public.user_roles for insert to authenticated with check (profile_id = public.current_profile_id() and role in ('seller','landlord','service_provider') and status = 'pending');
create policy "resubmit rejected applications" on public.user_roles for update to authenticated using (profile_id = public.current_profile_id() and role <> 'admin' and status = 'rejected') with check (profile_id = public.current_profile_id() and role <> 'admin' and status = 'pending');
create policy "admin manages roles" on public.user_roles for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "verification docs owner admin" on public.verification_docs;
create policy "verification docs owner admin" on public.verification_docs for select using (profile_id = public.current_profile_id() or public.is_admin());
create policy "verification docs owner insert" on public.verification_docs for insert to authenticated with check (profile_id = public.current_profile_id());
create policy "verification docs admin update" on public.verification_docs for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public active products" on public.products for select using (status = 'active' or seller_id = public.current_profile_id() or public.is_admin());
create policy "approved sellers insert products" on public.products for insert to authenticated with check (seller_id = public.current_profile_id() and public.has_approved_role('seller'));
create policy "owner edits products" on public.products for update to authenticated using (seller_id = public.current_profile_id() or public.is_admin()) with check (seller_id = public.current_profile_id() or public.is_admin());
create policy "owner deletes products" on public.products for delete to authenticated using (seller_id = public.current_profile_id() or public.is_admin());
create policy "visible product images" on public.product_images for select using (exists(select 1 from public.products p where p.id=product_id and (p.status='active' or p.seller_id=public.current_profile_id() or public.is_admin())));
create policy "owner manages product images" on public.product_images for all to authenticated using (exists(select 1 from public.products p where p.id=product_id and (p.seller_id=public.current_profile_id() or public.is_admin()))) with check (exists(select 1 from public.products p where p.id=product_id and (p.seller_id=public.current_profile_id() or public.is_admin())));

create policy "public available properties" on public.properties for select using ((status='active' and availability_status='available') or landlord_id=public.current_profile_id() or public.is_admin());
create policy "approved landlords insert properties" on public.properties for insert to authenticated with check (landlord_id=public.current_profile_id() and public.has_approved_role('landlord'));
create policy "owner edits properties" on public.properties for update to authenticated using (landlord_id=public.current_profile_id() or public.is_admin()) with check (landlord_id=public.current_profile_id() or public.is_admin());
create policy "owner deletes properties" on public.properties for delete to authenticated using (landlord_id=public.current_profile_id() or public.is_admin());
create policy "visible property images" on public.property_images for select using (exists(select 1 from public.properties p where p.id=property_id and ((p.status='active' and p.availability_status='available') or p.landlord_id=public.current_profile_id() or public.is_admin())));
create policy "owner manages property images" on public.property_images for all to authenticated using (exists(select 1 from public.properties p where p.id=property_id and (p.landlord_id=public.current_profile_id() or public.is_admin()))) with check (exists(select 1 from public.properties p where p.id=property_id and (p.landlord_id=public.current_profile_id() or public.is_admin())));

create policy "public active services" on public.services for select using (status='active' or provider_id=public.current_profile_id() or public.is_admin());
create policy "approved providers insert services" on public.services for insert to authenticated with check (provider_id=public.current_profile_id() and public.has_approved_role('service_provider'));
create policy "owner edits services" on public.services for update to authenticated using (provider_id=public.current_profile_id() or public.is_admin()) with check (provider_id=public.current_profile_id() or public.is_admin());
create policy "owner deletes services" on public.services for delete to authenticated using (provider_id=public.current_profile_id() or public.is_admin());

create policy "conversation participants read" on public.conversations for select to authenticated using (buyer_id=public.current_profile_id() or other_party_id=public.current_profile_id() or public.is_admin());
create policy "buyer creates conversation" on public.conversations for insert to authenticated with check (buyer_id=public.current_profile_id());
create policy "participants read messages" on public.messages for select to authenticated using (exists(select 1 from public.conversations c where c.id=conversation_id and (c.buyer_id=public.current_profile_id() or c.other_party_id=public.current_profile_id() or public.is_admin())));
create policy "participants send messages" on public.messages for insert to authenticated with check (sender_id=public.current_profile_id() and exists(select 1 from public.conversations c where c.id=conversation_id and (c.buyer_id=public.current_profile_id() or c.other_party_id=public.current_profile_id())));
create policy "participants mark messages read" on public.messages for update to authenticated using (exists(select 1 from public.conversations c where c.id=conversation_id and (c.buyer_id=public.current_profile_id() or c.other_party_id=public.current_profile_id()))) with check (exists(select 1 from public.conversations c where c.id=conversation_id and (c.buyer_id=public.current_profile_id() or c.other_party_id=public.current_profile_id())));
revoke update on public.messages from anon, authenticated;
grant update (read_at) on public.messages to authenticated;

create policy "orders participants read" on public.orders for select to authenticated using (buyer_id=public.current_profile_id() or seller_id=public.current_profile_id() or public.is_admin());
create policy "buyers create requests" on public.orders for insert to authenticated with check (buyer_id=public.current_profile_id() and status='pending');
create policy "participants update requests" on public.orders for update to authenticated using (buyer_id=public.current_profile_id() or seller_id=public.current_profile_id() or public.is_admin()) with check (buyer_id=public.current_profile_id() or seller_id=public.current_profile_id() or public.is_admin());
create policy "completed transaction reviews" on public.reviews for select using (true);
create policy "buyer reviews completed order" on public.reviews for insert to authenticated with check (reviewer_id=public.current_profile_id() and exists(select 1 from public.orders o where o.id=order_id and o.status='completed' and o.buyer_id=reviewer_id and o.seller_id=reviewee_id));
create policy "saved rows self" on public.saved_listings for all to authenticated using (profile_id=public.current_profile_id()) with check (profile_id=public.current_profile_id());
create policy "reports submit self" on public.reports for insert to authenticated with check (reported_by=public.current_profile_id());
create policy "reports own admin read" on public.reports for select to authenticated using (reported_by=public.current_profile_id() or public.is_admin());
create policy "admin resolves reports" on public.reports for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "notifications self read" on public.notifications for select to authenticated using (profile_id=public.current_profile_id());
create policy "notifications self update" on public.notifications for update to authenticated using (profile_id=public.current_profile_id()) with check (profile_id=public.current_profile_id());

update public.profiles p set
  seller_verified = exists(select 1 from public.user_roles r where r.profile_id=p.id and r.role='seller' and r.status='approved'),
  landlord_verified = exists(select 1 from public.user_roles r where r.profile_id=p.id and r.role='landlord' and r.status='approved'),
  service_provider_verified = exists(select 1 from public.user_roles r where r.profile_id=p.id and r.role='service_provider' and r.status='approved');

create or replace function public.refresh_profile_rating() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles p set
    rating_avg = coalesce((select round(avg(r.rating)::numeric, 2) from public.reviews r where r.reviewee_id = new.reviewee_id), 0),
    review_count = (select count(*)::integer from public.reviews r where r.reviewee_id = new.reviewee_id)
  where p.id = new.reviewee_id;
  return new;
end;
$$;
drop trigger if exists refresh_rating_after_review on public.reviews;
create trigger refresh_rating_after_review after insert on public.reviews for each row execute function public.refresh_profile_rating();

create or replace function public.sync_public_verification() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set
    seller_verified = exists(select 1 from public.user_roles where profile_id=new.profile_id and role='seller' and status='approved'),
    landlord_verified = exists(select 1 from public.user_roles where profile_id=new.profile_id and role='landlord' and status='approved'),
    service_provider_verified = exists(select 1 from public.user_roles where profile_id=new.profile_id and role='service_provider' and status='approved')
  where id=new.profile_id;
  return new;
end;
$$;
drop trigger if exists sync_public_verification_after_role on public.user_roles;
create trigger sync_public_verification_after_role after insert or update of status on public.user_roles for each row execute function public.sync_public_verification();

insert into storage.buckets(id,name,public) values ('public-listing-images','public-listing-images',true) on conflict(id) do nothing;
insert into storage.buckets(id,name,public) values ('private-verification-docs','private-verification-docs',false) on conflict(id) do update set public=false;
insert into storage.buckets(id,name,public) values ('private-chat-attachments','private-chat-attachments',false) on conflict(id) do update set public=false;
drop policy if exists "public listing image read" on storage.objects;
drop policy if exists "owners upload listing images" on storage.objects;
drop policy if exists "owners update listing images" on storage.objects;
drop policy if exists "owners delete listing images" on storage.objects;
drop policy if exists "owner uploads private verification files" on storage.objects;
drop policy if exists "owner admin reads private verification files" on storage.objects;
drop policy if exists "participants upload chat attachments" on storage.objects;
drop policy if exists "participants read chat attachments" on storage.objects;
create policy "public listing image read" on storage.objects for select using (bucket_id='public-listing-images');
create policy "owners upload listing images" on storage.objects for insert to authenticated with check (bucket_id='public-listing-images' and (storage.foldername(name))[1] in (select id::text from public.profiles where auth_user_id=auth.uid()));
create policy "owners update listing images" on storage.objects for update to authenticated using (bucket_id='public-listing-images' and (storage.foldername(name))[1] in (select id::text from public.profiles where auth_user_id=auth.uid())) with check (bucket_id='public-listing-images' and (storage.foldername(name))[1] in (select id::text from public.profiles where auth_user_id=auth.uid()));
create policy "owners delete listing images" on storage.objects for delete to authenticated using (bucket_id='public-listing-images' and (storage.foldername(name))[1] in (select id::text from public.profiles where auth_user_id=auth.uid()));
create policy "owner uploads private verification files" on storage.objects for insert to authenticated with check (bucket_id='private-verification-docs' and (storage.foldername(name))[1]='verification' and (storage.foldername(name))[2] in (select id::text from public.profiles where auth_user_id=auth.uid()));
create policy "owner admin reads private verification files" on storage.objects for select to authenticated using (bucket_id='private-verification-docs' and ((storage.foldername(name))[2] in (select id::text from public.profiles where auth_user_id=auth.uid()) or public.is_admin()));
create policy "participants upload chat attachments" on storage.objects for insert to authenticated with check (bucket_id='private-chat-attachments' and (storage.foldername(name))[2] in (select id::text from public.profiles where auth_user_id=auth.uid()) and exists(select 1 from public.conversations c where c.id::text=(storage.foldername(name))[1] and (c.buyer_id=public.current_profile_id() or c.other_party_id=public.current_profile_id())));
create policy "participants read chat attachments" on storage.objects for select to authenticated using (bucket_id='private-chat-attachments' and exists(select 1 from public.conversations c where c.id::text=(storage.foldername(name))[1] and (c.buyer_id=public.current_profile_id() or c.other_party_id=public.current_profile_id())));

create or replace function public.notify_new_message() returns trigger language plpgsql security definer set search_path = public as $$
declare recipient uuid;
begin
  select case when c.buyer_id = new.sender_id then c.other_party_id else c.buyer_id end into recipient from public.conversations c where c.id = new.conversation_id;
  insert into public.notifications(profile_id, title, body, kind) values(recipient, 'New message', left(new.content, 120), 'message');
  return new;
end;
$$;
drop trigger if exists on_message_notification on public.messages;
create trigger on_message_notification after insert on public.messages for each row execute function public.notify_new_message();

create or replace function public.notify_new_order() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications(profile_id, title, body, kind) values(new.seller_id, 'New marketplace request', 'A ' || new.listing_type || ' request is waiting for your response.', 'order');
  return new;
end;
$$;
drop trigger if exists on_order_notification on public.orders;
create trigger on_order_notification after insert on public.orders for each row execute function public.notify_new_order();
create or replace function public.notify_order_status_change() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications(profile_id, title, body, kind) values(new.buyer_id, 'Request ' || new.status, 'Your ' || new.listing_type || ' request has been updated.', 'order');
  return new;
end;
$$;
drop trigger if exists on_order_status_notification on public.orders;
create trigger on_order_status_notification after update of status on public.orders for each row when (old.status is distinct from new.status) execute function public.notify_order_status_change();

do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then alter publication supabase_realtime add table public.messages; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then alter publication supabase_realtime add table public.notifications; end if;
end;
$$;
