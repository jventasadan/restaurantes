-- =====================================================================
-- ESQUEMA DE BASE DE DATOS: CAMARERO VIRTUAL
-- =====================================================================

-- Habilitar extensión UUID
create extension if not exists "uuid-ossp";

-- 1. Tabla de Restaurantes
create table public.restaurants (
    restaurant_id text primary key,
    name text not null,
    assistant_name text not null default 'Camarero Virtual',
    assistant_personality text not null default 'Amable y profesional, experto en la carta.',
    welcome_message text not null default '¡Hola! Te damos la bienvenida. ¿Qué te apetece tomar hoy?',
    location text not null,
    specialties text,
    restrictions text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabla de Branding del Restaurante
create table public.restaurant_branding (
    restaurant_id text primary key references public.restaurants(restaurant_id) on delete cascade,
    logo_url text,
    hero_image_url text,
    primary_color text not null default '#C8A96E',
    secondary_color text not null default '#0D0D0D',
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabla de Mesas
create table public.tables (
    table_id text primary key,
    restaurant_id text not null references public.restaurants(restaurant_id) on delete cascade,
    name text not null,
    zone text not null check (zone in ('interior', 'terraza')),
    status text not null check (status in ('active', 'inactive')) default 'active',
    seasonal boolean not null default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Tabla de Sesiones de Mesa
create table public.sessions (
    session_id text primary key,
    table_id text not null references public.tables(table_id) on delete cascade,
    restaurant_id text not null references public.restaurants(restaurant_id) on delete cascade,
    status text not null check (status in ('active', 'cuenta_solicitada', 'closed')) default 'active',
    waiter_requested boolean not null default false,
    orders jsonb not null default '[]'::jsonb, -- Estructura: [{ id, name, price, quantity, notes, status }]
    last_interaction timestamp with time zone default timezone('utc'::text, now()) not null,
    session_start timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Tabla de Platos (Carta)
create table public.menu_items (
    id uuid primary key default gen_random_uuid(),
    restaurant_id text not null references public.restaurants(restaurant_id) on delete cascade,
    category text not null,
    name text not null,
    description text,
    price numeric(10, 2) not null,
    price_type text not null default 'por ración', -- por unidad / por persona / por ración / mínimo X personas
    allergens text[] not null default '{}'::text[],
    available boolean not null default true,
    notes text,
    image_url text,
    source text not null check (source in ('pdf_import', 'manual')) default 'manual',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =====================================================================
-- HABILITAR REALTIME
-- =====================================================================

alter publication supabase_realtime add table public.sessions;

-- =====================================================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- =====================================================================

-- Habilitar RLS en todas las tablas
alter table public.restaurants enable row level security;
alter table public.restaurant_branding enable row level security;
alter table public.tables enable row level security;
alter table public.sessions enable row level security;
alter table public.menu_items enable row level security;

-- 1. Políticas para RESTAURANTS
create policy "Permitir lectura pública de restaurantes" 
on public.restaurants for select 
using (true);

create policy "Permitir modificación a administradores de restaurantes" 
on public.restaurants for all 
using (
    auth.role() = 'authenticated' AND 
    (auth.jwt() -> 'user_metadata'::text ->> 'restaurant_id') = restaurant_id
);

-- 2. Políticas para BRANDING
create policy "Permitir lectura pública de branding" 
on public.restaurant_branding for select 
using (true);

create policy "Permitir modificación a administradores de branding" 
on public.restaurant_branding for all 
using (
    auth.role() = 'authenticated' AND 
    (auth.jwt() -> 'user_metadata'::text ->> 'restaurant_id') = restaurant_id
);

-- 3. Políticas para TABLES
create policy "Permitir lectura pública de mesas" 
on public.tables for select 
using (true);

create policy "Permitir modificación a administradores de mesas" 
on public.tables for all 
using (
    auth.role() = 'authenticated' AND 
    (auth.jwt() -> 'user_metadata'::text ->> 'restaurant_id') = restaurant_id
);

-- 4. Políticas para SESSIONS
create policy "Permitir lectura pública de sesiones" 
on public.sessions for select 
using (true);

create policy "Permitir creación pública de sesiones" 
on public.sessions for insert 
with check (true);

create policy "Permitir actualización pública de sesiones" 
on public.sessions for update 
using (true);

-- 5. Políticas para MENU_ITEMS
create policy "Permitir lectura pública de platos" 
on public.menu_items for select 
using (true);

create policy "Permitir modificación a administradores de platos" 
on public.menu_items for all 
using (
    auth.role() = 'authenticated' AND 
    (auth.jwt() -> 'user_metadata'::text ->> 'restaurant_id') = restaurant_id
);

-- =====================================================================
-- PERMISOS DE ACCESO A TABLAS (GRANTS)
-- =====================================================================

-- Otorgar permisos de lectura global a anon, authenticated y service_role
grant select on public.restaurants to anon, authenticated, service_role;
grant select on public.restaurant_branding to anon, authenticated, service_role;
grant select on public.tables to anon, authenticated, service_role;
grant select on public.sessions to anon, authenticated, service_role;
grant select on public.menu_items to anon, authenticated, service_role;

-- Otorgar control total a los roles service_role y authenticated (para CRUD de administración)
grant all privileges on public.restaurants to service_role, authenticated;
grant all privileges on public.restaurant_branding to service_role, authenticated;
grant all privileges on public.tables to service_role, authenticated;
grant all privileges on public.sessions to service_role, authenticated;
grant all privileges on public.menu_items to service_role, authenticated;

-- Permitir a los clientes anónimos (sin cuenta) crear y modificar sesiones de mesa
grant insert, update on public.sessions to anon;

