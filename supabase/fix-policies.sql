-- Fix RLS Policies - Run this to fix the circular reference error

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;

DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Staff and admins can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Staff and admins can update customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;
DROP POLICY IF EXISTS "customers_select" ON public.customers;
DROP POLICY IF EXISTS "customers_insert" ON public.customers;
DROP POLICY IF EXISTS "customers_update" ON public.customers;
DROP POLICY IF EXISTS "customers_delete" ON public.customers;

DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Staff and admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Staff and admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
DROP POLICY IF EXISTS "products_select" ON public.products;
DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;

DROP POLICY IF EXISTS "Authenticated users can view accounts" ON public.accounts;
DROP POLICY IF EXISTS "Staff and admins can insert accounts" ON public.accounts;
DROP POLICY IF EXISTS "Staff and admins can update accounts" ON public.accounts;
DROP POLICY IF EXISTS "Admins can delete accounts" ON public.accounts;
DROP POLICY IF EXISTS "accounts_select" ON public.accounts;
DROP POLICY IF EXISTS "accounts_insert" ON public.accounts;
DROP POLICY IF EXISTS "accounts_update" ON public.accounts;
DROP POLICY IF EXISTS "accounts_delete" ON public.accounts;

DROP POLICY IF EXISTS "Authenticated users can view activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Users can insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_select" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert" ON public.activity_logs;

-- Create simplified policies (no circular references)

-- Profiles: Allow authenticated users to read all profiles
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Profiles: Allow authenticated users to update
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Profiles: Allow insert
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Customers: Allow all authenticated users to read
CREATE POLICY "customers_select" ON public.customers
  FOR SELECT USING (auth.role() = 'authenticated');

-- Customers: Allow all authenticated users to insert/update/delete
CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "customers_delete" ON public.customers
  FOR DELETE USING (auth.role() = 'authenticated');

-- Products: Allow all authenticated users to read
CREATE POLICY "products_select" ON public.products
  FOR SELECT USING (auth.role() = 'authenticated');

-- Products: Allow all authenticated users to insert/update/delete
CREATE POLICY "products_insert" ON public.products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "products_update" ON public.products
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "products_delete" ON public.products
  FOR DELETE USING (auth.role() = 'authenticated');

-- Accounts: Allow all authenticated users to read
CREATE POLICY "accounts_select" ON public.accounts
  FOR SELECT USING (auth.role() = 'authenticated');

-- Accounts: Allow all authenticated users to insert/update/delete
CREATE POLICY "accounts_insert" ON public.accounts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "accounts_update" ON public.accounts
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "accounts_delete" ON public.accounts
  FOR DELETE USING (auth.role() = 'authenticated');

-- Activity logs: Allow all authenticated users
CREATE POLICY "activity_logs_select" ON public.activity_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "activity_logs_insert" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
