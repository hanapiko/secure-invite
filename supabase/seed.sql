-- Seed Data for Secure Client Dashboard
-- Run this SQL after the schema to populate demo data

-- First, create demo users in auth.users (manual step required)
-- Then insert their profiles

-- Sample Customers (10)
INSERT INTO public.customers (full_name, email, phone, address, status) VALUES
('Brian Otieno', 'brian.otieno@email.com', '+254712345678', 'Milimani, Kisumu', 'active'),
('Faith Wanjiku', 'faith.wanjiku@email.com', '+254723456789', 'Section 58, Nakuru', 'active'),
('Kevin Kiptoo', 'kevin.kiptoo@email.com', '+254734567890', 'Langas, Eldoret', 'active'),
('Mercy Atieno', 'mercy.atieno@email.com', '+254745678901', 'Nyali, Mombasa', 'inactive'),
('Samuel Mwangi', 'samuel.mwangi@email.com', '+254756789012', 'Kilimani, Nairobi', 'active'),
('Purity Chebet', 'purity.chebet@email.com', '+254767890123', 'Kapsoya, Eldoret', 'active'),
('Dennis Maina', 'dennis.maina@email.com', '+254778901234', 'Pipeline, Nakuru', 'active'),
('Sharon Akinyi', 'sharon.akinyi@email.com', '+254789012345', 'Tom Mboya, Kisumu', 'active'),
('Victor Mutua', 'victor.mutua@email.com', '+254790123456', 'Syokimau, Machakos', 'inactive'),
('Lilian Njeri', 'lilian.njeri@email.com', '+254701234567', 'Rongai, Nairobi', 'active')
ON CONFLICT (email) DO NOTHING;

-- Sample Products (8)
INSERT INTO public.products (product_name, category, price, description, status) VALUES
('Enterprise Business Package', 'Software', 125000.00, 'Full enterprise software access with all premium features', 'active'),
('SME Starter Package', 'Software', 35000.00, 'Affordable software package for small businesses', 'active'),
('Business Consultation Session', 'Service', 15000.00, 'Professional business consulting per session', 'active'),
('Corporate Training Package', 'Service', 65000.00, 'Complete digital systems training for teams', 'active'),
('Annual Support Plan', 'Service', 25000.00, 'Priority support and maintenance for one year', 'active'),
('API Integration Access', 'Software', 8500.00, 'Monthly API access subscription', 'active'),
('Custom System Integration', 'Service', 180000.00, 'Tailored system integration for business operations', 'active'),
('Digital Documentation Suite', 'Product', 5000.00, 'Comprehensive business process documentation', 'active')
ON CONFLICT DO NOTHING;

-- Sample Accounts (5)
INSERT INTO public.accounts (account_name, account_type, balance, status) VALUES
('Main Operations Account', 'Checking', 6500000.00, 'active'),
('Business Savings Account', 'Savings', 3200000.00, 'active'),
('Working Capital Credit', 'Credit', -450000.00, 'active'),
('Investment Reserve Account', 'Savings', 9500000.00, 'active'),
('Expense Management Account', 'Checking', 1250000.00, 'active')
ON CONFLICT DO NOTHING;

-- Sample Activity Logs
INSERT INTO public.activity_logs (action, entity_type) VALUES
('User logged in', 'auth'),
('Customer created', 'customer'),
('Product updated', 'product'),
('Account balance updated', 'account'),
('Report generated', 'report'),
('File uploaded', 'document'),
('User profile updated', 'profile'),
('Settings changed', 'settings'),
('New user registered', 'auth'),
('Customer status changed', 'customer')
ON CONFLICT DO NOTHING;
