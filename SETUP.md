# Application Setup Guide

This guide will help you set up and run the Blitz Commerce application.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (Neon, Supabase, or any PostgreSQL provider)
- Cloudinary account (for image uploads)
- npm or yarn package manager

## Step 1: Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Database Configuration (Required)
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

# NextAuth Configuration (Required)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_nextauth_secret_key_minimum_32_characters_long"

# Cloudinary Configuration (Required for image uploads)
CLOUDINARY_CLOUD_NAME="your_cloudinary_cloud_name"
CLOUDINARY_API_KEY="your_cloudinary_api_key"
CLOUDINARY_API_SECRET="your_cloudinary_api_secret"

# Node Environment (Optional)
NODE_ENV="development"
```

### Generating NEXTAUTH_SECRET

You can generate a secure secret using one of these methods:

1. **Using OpenSSL:**
   ```bash
   openssl rand -base64 32
   ```

2. **Using Node.js:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

3. **Online Generator:**
   Visit https://generate-secret.vercel.app/32

### Getting Cloudinary Credentials

1. Sign up at https://cloudinary.com
2. Go to your dashboard
3. Copy the Cloud Name, API Key, and API Secret

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Database Setup

### Generate Prisma Client

```bash
npx prisma generate
```

### Run Database Migrations

```bash
npx prisma migrate dev
```

This will:
- Create all necessary tables in your database
- Set up the database schema

### (Optional) Open Prisma Studio

To view and manage your database:

```bash
npx prisma studio
```

## Step 4: Run the Application

### Development Mode

```bash
npm run dev
```

The application will be available at http://localhost:3000

### Production Build

```bash
npm run build
npm start
```

## Step 5: Verify Setup

1. Open http://localhost:3000 in your browser
2. Try registering a new user at `/auth`
3. Verify you can create products (if logged in as vendor/admin)
4. Test image uploads (requires Cloudinary setup)

## Common Issues

### Database Connection Errors

- Verify your `DATABASE_URL` is correct
- Ensure your database is accessible
- Check if SSL mode is required (add `?sslmode=require` to URL)

### NextAuth Errors

- Ensure `NEXTAUTH_SECRET` is at least 32 characters
- Verify `NEXTAUTH_URL` matches your application URL
- Check that cookies are enabled in your browser

### Image Upload Errors

- Verify Cloudinary credentials are correct
- Check Cloudinary account is active
- Ensure API keys have upload permissions

### TypeScript Errors

- Run `npm install` to ensure all dependencies are installed
- Run `npx prisma generate` to regenerate Prisma client
- Clear `.next` folder and rebuild: `rm -rf .next && npm run build`

## API Routes

All API routes are located in `app/api/` and follow RESTful conventions:

- `/api/products` - Product CRUD operations
- `/api/cart` - Shopping cart operations
- `/api/orders` - Order management
- `/api/posts` - Social feed posts
- `/api/groups` - Group orders
- `/api/wishlist` - Wishlist operations
- `/api/profiles` - User profiles
- `/api/addresses` - User addresses
- `/api/auth/register` - User registration
- `/api/auth/[...nextauth]` - NextAuth authentication

All API routes return standardized responses using `ApiResponseHandler`.

## Authentication

The application uses NextAuth with credentials provider:

- Register at `/api/auth/register`
- Login at `/auth` page
- Session is managed via JWT tokens
- Protected routes require authentication

## Database Schema

The application uses Prisma ORM with PostgreSQL. Key models include:

- `Profile` - Users, vendors, admins
- `Product` - Product catalog
- `Order` - Customer orders
- `CartItem` - Shopping cart items
- `Post` - Social feed posts
- `Group` - Group orders
- `WishlistItem` - User wishlists
- `UserAddress` - Shipping addresses
- `VendorKyc` - Vendor KYC information

See `prisma/schema.prisma` for complete schema.

## Support

If you encounter any issues:

1. Check the console for error messages
2. Verify all environment variables are set correctly
3. Ensure database migrations have run successfully
4. Check that all dependencies are installed

## Next Steps

After setup:

1. Create your first user account
2. Set up vendor accounts for product creation
3. Configure product categories
4. Test the complete flow: product creation → cart → checkout → order

Happy coding! 🚀

