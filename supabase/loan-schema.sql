-- Loan Management Tables for Secure Invite
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension (already enabled, but safe to keep)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- LOANS table: Main loan tracking
CREATE TABLE IF NOT EXISTS public.loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  loan_type TEXT NOT NULL CHECK (loan_type IN ('one_week', 'two_week', 'four_week')),
  principal_amount NUMERIC(12,2) NOT NULL,
  interest_rate NUMERIC(5,2) NOT NULL,  -- e.g., 10.00 for 10%
  registration_fee NUMERIC(10,2) DEFAULT 300,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'disbursed', 'completed', 'defaulted', 'written_off')),
  application_date TIMESTAMPTZ DEFAULT NOW(),
  approval_date TIMESTAMPTZ,
  disbursement_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LOAN_REPAYMENTS table: Track instalment payments
CREATE TABLE IF NOT EXISTS public.loan_repayments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE,
  instalment_number INTEGER NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  due_amount NUMERIC(12,2) NOT NULL,
  principal_portion NUMERIC(12,2) NOT NULL,
  interest_portion NUMERIC(12,2) NOT NULL,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  paid_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'overdue', 'waived')),
  payment_method TEXT,
  mpesa_receipt TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LOAN_PENALTIES table: Track late payment penalties
CREATE TABLE IF NOT EXISTS public.loan_penalties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE,
  repayment_id UUID REFERENCES public.loan_repayments(id) ON DELETE SET NULL,
  penalty_amount NUMERIC(12,2) NOT NULL,
  penalty_rate NUMERIC(5,2) NOT NULL,  -- e.g., 1.5 for 1.5%
  penalty_date TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'waived')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LOAN_PRODUCTS table: Define loan products
CREATE TABLE IF NOT EXISTS public.loan_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  duration_weeks INTEGER NOT NULL,
  interest_rate NUMERIC(5,2) NOT NULL,
  min_amount NUMERIC(12,2) NOT NULL,
  max_amount NUMERIC(12,2) NOT NULL,
  registration_fee NUMERIC(10,2) DEFAULT 300,
  penalty_rate_daily NUMERIC(5,2) DEFAULT 1.5,
  instalment_count INTEGER NOT NULL,  -- number of instalments
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for loans
CREATE POLICY "loans_select" ON public.loans
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "loans_insert" ON public.loans
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "loans_update" ON public.loans
  FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS Policies for loan_repayments
CREATE POLICY "repayments_select" ON public.loan_repayments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "repayments_insert" ON public.loan_repayments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "repayments_update" ON public.loan_repayments
  FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS Policies for loan_penalties
CREATE POLICY "penalties_select" ON public.loan_penalties
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "penalties_insert" ON public.loan_penalties
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "penalties_update" ON public.loan_penalties
  FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS Policies for loan_products
CREATE POLICY "products_select" ON public.loan_products
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "products_insert" ON public.loan_products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "products_update" ON public.loan_products
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX idx_loans_customer_id ON public.loans(customer_id);
CREATE INDEX idx_loans_status ON public.loans(status);
CREATE INDEX idx_loans_application_date ON public.loans(application_date DESC);
CREATE INDEX idx_repayments_loan_id ON public.loan_repayments(loan_id);
CREATE INDEX idx_repayments_status ON public.loan_repayments(status);
CREATE INDEX idx_repayments_due_date ON public.loan_repayments(due_date);
CREATE INDEX idx_penalties_loan_id ON public.loan_penalties(loan_id);
CREATE INDEX idx_penalties_status ON public.loan_penalties(status);

-- Insert default loan products
INSERT INTO public.loan_products (name, duration_weeks, interest_rate, min_amount, max_amount, registration_fee, penalty_rate_daily, instalment_count, description)
VALUES 
  ('One Week Loan', 1, 10.00, 1000, 50000, 300, 1.5, 3, 'Short-term loan with 10% interest, payable daily or in 3 instalments'),
  ('Two Week Loan', 2, 18.00, 3000, 5000, 300, 1.0, 4, 'Medium-term loan with 18% interest, payable in 4 instalments'),
  ('Four Week Loan', 4, 24.00, 5000, 100000, 300, 1.5, 4, 'Long-term loan with 24% interest withcollateral, payable weekly')
ON CONFLICT (name) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE public.loans IS 'Main loans table - tracks loan applications and disbursements';
COMMENT ON TABLE public.loan_repayments IS 'Tracks instalment payments for each loan';
COMMENT ON TABLE public.loan_penalties IS 'Tracks late payment penalties';
COMMENT ON TABLE public.loan_products IS 'Defines available loan products with their terms';
