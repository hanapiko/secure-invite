# Secure Client Dashboard

A full-stack internal business management dashboard built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

## Features

- **Secure Authentication** - Email/password login with Supabase Auth
- **Dashboard** - Summary metrics and recent activity tracking
- **Customer Management** - Full CRUD operations with search, filter, pagination
- **Product Management** - Full CRUD with categories and pricing
- **Account Management** - Track business accounts and balances
- **User Management** - Role-based access control (Admin, Staff, Viewer)
- **Reports** - Export to PDF and Excel formats
- **File Uploads** - Supabase Storage for documents and images

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth, Database, Storage)
- React Hook Form
- shadcn/ui components
- Lucide React (Icons)
- jsPDF (PDF generation)
- xlsx (Excel export)

## Prerequisites

- Node.js 18+
- Supabase account
- npm or pnpm

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Install dependencies
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor in your Supabase dashboard
3. Run the SQL from `supabase/schema.sql`
4. (Optional) Run `supabase/seed.sql` for demo data

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Update `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Get your credentials from:
- Supabase Dashboard → Settings → API
- Project URL for URL
- `anon public` key for ANON_KEY

### 4. Create Demo Admin User

In Supabase Dashboard:
1. Go to Authentication → Users
2. Click "Add user"
3. Enter: email: `admin@demo.com`, password: `password123`

Note: You'll need to manually create the profile record after the user is created, or the first login will auto-create it via trigger.

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Login Credentials

- **Email**: admin@demo.com
- **Password**: password123

## Project Structure

```
secure-invite/
├── app/
│   ├── (auth)/login/        # Login page
│   ├── (dashboard)/        # Protected dashboard routes
│   │   ├── customers/      # Customer CRUD
│   │   ├── products/      # Product CRUD
│   │   ├── accounts/      # Account CRUD
│   │   ├── users/         # User management
│   │   ├── reports/       # Report exports
│   │   ├── settings/       # User settings
│   │   ├── dashboard/     # Main dashboard
│   │   └── layout.tsx     # Dashboard layout with sidebar
│   ├── globals.css        # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Root redirect
├── components/
│   ├── layout/           # Layout components
│   │   └── sidebar.tsx   # Navigation sidebar
│   └── ui/               # shadcn/ui components
├── lib/
│   ├── supabase.ts      # Supabase client
│   └── utils.ts         # Utility functions
├── supabase/
│   ├── schema.sql       # Database schema
│   └── seed.sql         # Seed data
└── README.md
```

## Role-Based Access Control

| Role   | Permissions |
|-------|-------------|
| ADMIN | Full access (create, read, update, delete all) |
| STAFF | Create and edit (no delete) |
| VIEWER | Read-only access |

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Configure environment variables in Vercel
4. Deploy

### Environment Variables for Production

Set these in your Vercel project settings:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

## License

MIT
