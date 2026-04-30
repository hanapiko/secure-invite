-- Secure Client Dashboard Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  address TEXT,
  notes TEXT,
  profile_image_url TEXT,
  pdf_document_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  description TEXT,
  product_image_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Accounts table
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Activity logs table
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Simplified RLS Policies (no circular references)

-- Profiles: Allow authenticated users to read all profiles
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Profiles: Allow authenticated users to update
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Profiles: Allow insert (service role only)
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Customers: Allow all authenticated users to read
CREATE POLICY "customers_select" ON public.customers
  FOR SELECT USING (auth.role() = 'authenticated');

-- Customers: Allow all authenticated users to insert/update
CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Customers: Allow delete for authenticated users
CREATE POLICY "customers_delete" ON public.customers
  FOR DELETE USING (auth.role() = 'authenticated');

-- Products: Allow all authenticated users to read
CREATE POLICY "products_select" ON public.products
  FOR SELECT USING (auth.role() = 'authenticated');

-- Products: Allow all authenticated users to insert/update
CREATE POLICY "products_insert" ON public.products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "products_update" ON public.products
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Products: Allow delete for authenticated users
CREATE POLICY "products_delete" ON public.products
  FOR DELETE USING (auth.role() = 'authenticated');

-- Accounts: Allow all authenticated users to read
CREATE POLICY "accounts_select" ON public.accounts
  FOR SELECT USING (auth.role() = 'authenticated');

-- Accounts: Allow all authenticated users to insert/update
CREATE POLICY "accounts_insert" ON public.accounts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "accounts_update" ON public.accounts
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Accounts: Allow delete for authenticated users
CREATE POLICY "accounts_delete" ON public.accounts
  FOR DELETE USING (auth.role() = 'authenticated');

-- Activity logs: Allow all authenticated users
CREATE POLICY "activity_logs_select" ON public.activity_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "activity_logs_insert" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX idx_customers_email ON public.customers(email);
CREATE INDEX idx_customers_status ON public.customers(status);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_accounts_type ON public.accounts(account_type);
CREATE INDEX idx_accounts_status ON public.accounts(status);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('profiles', 'profiles', true, 5242880, ARRAY['image/jpeg', 'image/png']),
  ('documents', 'documents', true, 5242880, ARRAY['application/pdf']),
  ('products', 'products', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view profiles bucket" ON storage.objects
  FOR SELECT USING (bucket_id = 'profiles');

CREATE POLICY "Authenticated can upload to profiles bucket" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'profiles' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view documents bucket" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents');

CREATE POLICY "Authenticated can upload to documents bucket" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view products bucket" ON storage.objects
  FOR SELECT USING (bucket_id = 'products');

CREATE POLICY "Authenticated can upload to products bucket" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');
