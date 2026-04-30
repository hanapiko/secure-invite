# SECURE CLIENT DASHBOARD - Technical Specification

## Project Overview
- **Project Name**: Secure Client Dashboard
- **Type**: Full-stack Internal Business Dashboard Web Application
- **Core Functionality**: Private business management platform with secure authentication, customer management, product management, accounts management, user access control, file uploads, and reporting capabilities
- **Target Users**: Internal business staff (Admin, Staff, Viewer roles)

## Technology Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Authentication, Database, Storage)
- React Hook Form
- shadcn/ui
- Lucide React (Icons)
- jsPDF (PDF generation)
- xlsx (Excel export)

---

## UI/UX Specification

### Design System

#### Color Palette
- **Background**: `#FFFFFF` (white)
- **Surface/Cards**: `#FFFFFF`
- **Primary**: `#0F172A` (slate-900)
- **Primary Hover**: `#1E293B` (slate-800)
- **Accent**: `#3B82F6` (blue-500)
- **Accent Hover**: `#2563EB` (blue-600)
- **Success**: `#10B981` (emerald-500)
- **Warning**: `#F59E0B` (amber-500)
- **Error**: `#EF4444` (red-500)
- **Muted**: `#64748B` (slate-500)
- **Border**: `#E2E8F0` (slate-200)
- **Subtle**: `#F8FAFC` (slate-50)

#### Typography
- **Font Family**: `"Inter", sans-serif` (via Google Fonts)
- **Headings**:
  - H1: 32px, font-weight: 700
  - H2: 24px, font-weight: 600
  - H3: 20px, font-weight: 600
  - H4: 16px, font-weight: 600
- **Body**: 14px, font-weight: 400
- **Small**: 12px, font-weight: 400

#### Spacing System
- Base unit: 4px
- Margins/Padding: 4px, 8px, 12px, 16px, 24px, 32px, 48px

#### Visual Effects
- Card shadow: `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)`
- Elevated shadow: `0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)`
- Border radius: 8px (cards), 6px (buttons), 4px (inputs)
- Transitions: 150ms ease-in-out

### Layout Structure

#### Authenticated Layout
- **Sidebar**: Fixed left, 256px width, dark background (#0F172A)
- **Main Content**: Flexible, left margin 256px
- **Top Navbar**: Fixed top, height 64px, white background with bottom border
- **Content Area**: Padding 24px, max-width 1400px centered

#### Responsive Breakpoints
- Mobile: < 768px (sidebar collapsed to hamburger menu)
- Tablet: 768px - 1024px (sidebar overlay)
- Desktop: > 1024px (full sidebar)

### Components

#### Cards
- White background
- 8px border radius
- Subtle shadow
- 24px padding
- Hover: elevated shadow transition

#### Buttons
- **Primary**: Blue background, white text
- **Secondary**: White background, gray border, dark text
- **Danger**: Red background, white text
- **States**: Hover (darken 10%), Active (scale 0.98), Disabled (opacity 0.5)

#### Form Inputs
- Height: 40px
- Border: 1px solid #E2E8F0
- Border radius: 6px
- Focus: Blue ring, blue border
- Error: Red border, red text below

#### Data Tables
- Striped rows (alternate #F8FAFC)
- Hover row highlight
- Sortable column headers
- Pagination controls

#### Status Badges
- Active: Green background (#DCFCE7), green text (#166534)
- Inactive: Gray background (#F1F5F9), gray text (#475569)
- Pending: Yellow background (#FEF3C7), yellow text (#92400E)

---

## Functionality Specification

### Authentication Module

#### Login Page (`/login`)
- Email input field with validation
- Password input field with visibility toggle
- "Remember me" checkbox
- Login button
- Error toast notifications

#### Protected Routes
- Middleware authentication check
- Redirect unauthenticated to `/login`
- Session persistence via Supabase

#### Admin Credentials
- Email: admin@demo.com
- Password: password123

### Dashboard Page (`/dashboard`)

#### Summary Cards (4-column grid)
1. **Total Customers** - Count with trend indicator
2. **Total Products** - Count with trend indicator
3. **Active Accounts** - Count with trend indicator
4. **Total Users** - Count with trend indicator
5. **Uploaded Documents** - Count

#### Recent Activity Table
- Last 10 actions
- Columns: Action, User, Timestamp
- Auto-refresh every 30 seconds

#### Quick Actions
- Add Customer button
- Add Product button
- Generate Report button

### Customers Module (`/customers`)

#### CRUD Operations
- **Create**: Modal form with all fields
- **Read**: Table view with details drawer
- **Update**: Same modal, pre-filled
- **Delete**: Confirmation dialog

#### Fields
| Field | Type | Validation |
|-------|------|------------|
| Full Name | text | Required, 2-100 chars |
| Email | email | Required, valid email |
| Phone | tel | Optional |
| Address | textarea | Optional |
| Notes | textarea | Optional |
| Profile Image | file | JPG/PNG, max 5MB |
| PDF Document | file | PDF, max 5MB |
| Status | select | Active/Inactive |
| Date Created | datetime | Auto-generated |

#### Features
- Search by name/email
- Filter by status
- Pagination (10 per page)
- Export to PDF
- Export to Excel

### Products Module (`/products`)

#### CRUD Operations
- Full CRUD with modal forms

#### Fields
| Field | Type | Validation |
|-------|------|------------|
| Product Name | text | Required, 2-100 chars |
| Category | select | Required |
| Price | number | Required, min 0 |
| Description | textarea | Optional |
| Product Image | file | JPG/PNG, max 5MB |
| Status | select | Active/Inactive |
| Date Created | datetime | Auto-generated |

#### Features
- Search by name
- Filter by category/status
- Pagination
- Export to PDF/Excel

### Accounts Module (`/accounts`)

#### CRUD Operations
- Full CRUD

#### Fields
| Field | Type | Validation |
|-------|------|------------|
| Account Name | text | Required |
| Account Type | select | Checking/Savings/Credit |
| Balance | number | Required |
| Status | select | Active/Inactive |
| Date Created | datetime | Auto-generated |

#### Features
- Search
- Filter by type/status
- Export

### User Management (`/users`)

#### Admin-Only Access
- Route protected by role check

#### User Operations
- **Create**: Add new user with role
- **Edit**: Modify user details
- **Disable**: Soft delete
- **Enable**: Reactivate
- **Delete**: Permanent removal

#### Roles
- **ADMIN**: Full access
- **STAFF**: Create/Edit only
- **VIEWER**: Read-only

### Reports Page (`/reports`)

#### Report Types
- Customers report
- Products report
- Accounts report

#### Export Formats
- PDF (via jsPDF)
- Excel (via xlsx)

### Settings Page (`/settings`)

#### Sections
- Profile settings (display name, email)
- Password change (current, new, confirm)
- Notification preferences (toggles)

---

## Database Schema (Supabase)

### Tables

```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  profile_image_url TEXT,
  pdf_document_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  description TEXT,
  product_image_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Accounts table
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Activity logs table
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Row Level Security
- Enable RLS on all tables
- Policies for role-based access

---

## File Upload System

### Storage Buckets
- `profiles` - Customer profile images
- `documents` - PDF documents
- `products` - Product images

### Validation
- Max file size: 5MB
- Allowed types: PDF, JPG, JPEG, PNG
- Upload progress indicator

---

## Demo Data

### Seed Values

#### Customers (10)
1. John Smith | john.smith@email.com | Active
2. Sarah Johnson | sarah.j@email.com | Active
3. Michael Brown | m.brown@email.com | Active
4. Emily Davis | emily.d@email.com | Inactive
5. David Wilson | d.wilson@email.com | Active
6. Jennifer Martinez | j.martinez@email.com | Active
7. Robert Taylor | r.taylor@email.com | Active
8. Lisa Anderson | l.anderson@email.com | Active
9. James Thomas | j.thomas@email.com | Inactive
10. Mary Jackson | m.jackson@email.com | Active

#### Products (8)
1. Enterprise License | Software | $999.99
2. Basic License | Software | $299.99
3. Consultation Hour | Service | $150.00
4. Training Package | Service | $500.00
5. Support Plan | Service | $199.99
6. API Access | Software | $49.99
7. Custom Integration | Service | $1200.00
8. Documentation | Product | $29.99

#### Accounts (5)
1. Operating Account | Checking | $50,000
2. Savings Account | Savings | $25,000
3. Business Credit | Credit | -$5,000
4. Investment Account | Savings | $100,000
5. Expense Account | Checking | $10,000

#### Users (3)
1. admin@demo.com | ADMIN
2. staff@demo.com | STAFF
3. viewer@demo.com | VIEWER

---

## Acceptance Criteria

### Authentication
- [ ] User can log in with email/password
- [ ] Invalid credentials show error message
- [ ] Unauthenticated users redirected to login
- [ ] Logout clears session and redirects

### Dashboard
- [ ] Summary cards display correct counts
- [ ] Recent activity shows last 10 actions
- [ ] Quick action buttons navigate correctly

### Customers
- [ ] Can create new customer with all fields
- [ ] Can view customer details
- [ ] Can edit existing customer
- [ ] Can delete customer with confirmation
- [ ] Search filters results in real-time
- [ ] Pagination works correctly
- [ ] Export generates valid PDF/Excel

### Products/Accounts
- [ ] Same CRUD capabilities as customers
- [ ] All fields validate correctly
- [ ] Export functions work

### User Management
- [ ] Only admins can access
- [ ] Can add/edit/disable users
- [ ] Role permissions enforced

### Reports
- [ ] PDF downloads with correct data
- [ ] Excel downloads with correct data

### File Upload
- [ ] Files upload successfully to Supabase
- [ ] Validation rejects invalid files
- [ ] Progress indicator shows during upload

### UI/UX
- [ ] Responsive on all breakpoints
- [ ] Loading states display during operations
- [ ] Empty states show when no data
- [ ] Toast notifications appear for actions
- [ ] Smooth transitions between pages
