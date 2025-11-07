# Next.js E-Commerce Application

This is a complete Next.js port of the Vite+React e-commerce application, migrated from Supabase to Prisma + Neon (PostgreSQL) with NextAuth (credentials) authentication and Cloudinary for media storage.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Neon PostgreSQL with Prisma ORM
- **Authentication**: NextAuth (credentials)
- **Media Storage**: Cloudinary
- **UI**: React, Tailwind CSS, ShadCN UI components
- **State Management**: TanStack Query (React Query)
- **Styling**: Tailwind CSS with custom pink theme

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key_here_min_32_characters

# Database (Neon Postgres)
DATABASE_URL=your_neon_database_url
SHADOW_DATABASE_URL=your_neon_shadow_database_url

# Cloudinary Media
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
next-ecommerce/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── products/      # Product CRUD operations
│   │   ├── cart/          # Cart operations
│   │   ├── orders/        # Order management
│   │   ├── posts/         # Social feed posts
│   │   ├── groups/        # Group orders
│   │   ├── wishlist/      # Wishlist operations
│   │   ├── profiles/      # User profiles
│   │   └── addresses/     # User addresses
│   ├── feed/              # Social feed page
│   ├── products/          # Products listing & detail
│   ├── cart/              # Shopping cart
│   ├── checkout/          # Checkout page
│   ├── orders/            # Order history
│   ├── wishlist/          # Wishlist page
│   ├── auth/              # Authentication page
│   └── layout.tsx         # Root layout
├── components/            # React components
├── contexts/              # React contexts (Auth, Theme)
├── lib/                   # Utilities
│   ├── prisma.ts         # Prisma client instance
│   ├── cloudinary.ts     # Cloudinary utilities
│   └── utils.ts          # General utilities
├── prisma/
│   └── schema.prisma     # Database schema
└── public/               # Static assets
```

## Key Features

- ✅ User Authentication (NextAuth credentials)
- ✅ Product Catalog with Categories
- ✅ Shopping Cart
- ✅ Order Management
- ✅ Social Feed (Posts, Likes, Comments)
- ✅ Group Orders
- ✅ Wishlist
- ✅ User Profiles
- ✅ Vendor Dashboard
- ✅ Admin Dashboard
- ✅ Product Reviews & Ratings
- ✅ Address Management
- ✅ Image Upload (Cloudinary)

## Migration Status

### Completed ✅
- Database schema (Prisma)
- Authentication (NextAuth integration)
- API routes for:
  - Products
  - Cart
  - Orders
  - Posts/Feed
  - Groups
  - Wishlist
  - Profiles
  - Addresses
- Core pages:
  - Home/Feed
  - Products
  - Product Detail
  - Cart
  - Auth
- Component updates:
  - Header (Next.js navigation)
  - ProtectedRoute wrapper

### In Progress 🔄
- Component migration (react-router-dom → Next.js)
- Remaining pages (Checkout, Orders, Settings, etc.)
- Cloudinary upload integration in components
- TypeScript type fixes

### To Do 📋
- Update all components using `react-router-dom` to use Next.js navigation
- Complete remaining pages
- Test all features end-to-end
- Add error boundaries
- Optimize images with Next.js Image component
- Add loading states
- Update dashboard components

## Component Migration Guide

Components using `react-router-dom` need to be updated:

**Before:**
```tsx
import { useNavigate } from 'react-router-dom';
const router.push = useNavigate();
router.push('/products');
```

**After:**
```tsx
import { useRouter } from 'next/navigation';
const router = useRouter();
router.push('/products');
```

**Before:**
```tsx
import { Link } from 'react-router-dom';
<Link to="/products">Products</Link>
```

**After:**
```tsx
import Link from 'next/link';
<Link href="/products">Products</Link>
```

## API Routes

All API routes are located in `app/api/` and use:
- NextAuth for authentication
- Prisma for database operations
- NextResponse for responses

Example API usage:
```typescript
const response = await fetch('/api/products');
const data = await response.json();
```

## Database Schema

The Prisma schema includes:
- Profiles (users, vendors, admins)
- Products & Product Images
- Cart Items
- Orders & Order Items
- Posts & Post Images
- Groups & Group Members
- Wishlist
- User Addresses
- Vendor KYC
- Follows
- Product Categories
- Post Tags

## Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## License

Private - All rights reserved
