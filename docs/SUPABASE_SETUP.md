# Supabase Backend Setup Guide

This guide will help you set up the Supabase backend for the Portal Services mobile app.

## Prerequisites

- Supabase account (free: https://supabase.com)
- Access to Supabase dashboard
- Basic understanding of PostgreSQL

## Step 1: Create a Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click **"New Project"**
3. Fill in the project details:
   - **Name**: `portal-services`
   - **Database Password**: Save this securely!
   - **Region**: Choose closest to your users
4. Click **Create new project**

⏳ Wait for the project to initialize (2-3 minutes)

## Step 2: Get Your API Credentials

Once your project is ready:

1. Go to **Settings > API** in the left sidebar
2. Copy these values:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public** (under "Project API keys") → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Step 3: Create Database Tables

Go to the **SQL Editor** in your Supabase dashboard and run this SQL:

```sql
-- Create profiles table (stores user information)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT email_not_empty CHECK (email != '')
);

-- Create bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  pickup_location TEXT NOT NULL,
  dropoff_location TEXT NOT NULL,
  pickup_date DATE NOT NULL,
  pickup_time TIME NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT positive_fields CHECK (
    vehicle_type != '' AND
    pickup_location != '' AND
    dropoff_location != ''
  )
);

-- Create payments table (optional - for future use)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT,
  transaction_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Create indexes for better query performance
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
```

## Step 4: Enable Row Level Security (RLS)

RLS ensures users can only access their own data. Enable it for each table:

### For profiles table:

1. Go to **Authentication > Policies** in Supabase
2. Select **profiles** table
3. Click **New Policy** and set up these policies:

**Policy 1 - Users can read their own profile:**
```sql
-- SECURITY DEFINER: False
-- FOR: SELECT
-- USING:
auth.uid() = id
```

**Policy 2 - Users can update their own profile:**
```sql
-- SECURITY DEFINER: False
-- FOR: UPDATE
-- USING: auth.uid() = id
-- WITH CHECK: auth.uid() = id
```

**Policy 3 - Users can create their profile:**
```sql
-- SECURITY DEFINER: False
-- FOR: INSERT
-- WITH CHECK: auth.uid() = id
```

### For bookings table:

**Policy 1 - Users can read their own bookings:**
```sql
-- FOR: SELECT
-- USING: auth.uid() = user_id
```

**Policy 2 - Users can create bookings:**
```sql
-- FOR: INSERT
-- WITH CHECK: auth.uid() = user_id
```

**Policy 3 - Users can update their own bookings:**
```sql
-- FOR: UPDATE
-- USING: auth.uid() = user_id
-- WITH CHECK: auth.uid() = user_id
```

### For payments table:

**Policy 1 - Users can read their own payments:**
```sql
-- FOR: SELECT
-- USING: auth.uid() = user_id
```

**Policy 2 - Users can insert payments:**
```sql
-- FOR: INSERT
-- WITH CHECK: auth.uid() = user_id
```

## Step 5: Enable Email Authentication with OTP

1. Go to **Authentication > Providers** in Supabase
2. Make sure **Email** is enabled (it usually is by default)
3. Click on **Email** to configure:
   - **Enable Email Signup** ✓
   - **Enable Email Confirmation** ✓ (required for OTP verification)
   - Note: OTP codes are automatically sent to user emails during signup

### OTP Configuration

The app uses **One-Time Password (OTP)** for email verification:

1. User signs up with email and password
2. Supabase generates a 6-digit OTP code
3. OTP is sent to user's email address
4. User enters the 6-digit code in the app
5. After verification, user account is fully activated

Make sure your email provider is configured to deliver OTP codes. Supabase will use its default email template unless you configure a custom one.

## Step 6: Configure SMTP (Optional but Recommended)

To send real confirmation emails instead of test emails:

1. Go to **Authentication > Providers > Email**
2. Scroll to "SMTP Settings"
3. Add your SMTP credentials:
   - **Sender email**: your-email@example.com
   - **SMTP host**: smtp.example.com
   - **SMTP port**: 587
   - **SMTP username**: your-username
   - **SMTP password**: your-password

## Step 7: Update Environment Variables

In your Expo app, update `.env.local`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 8: Enable SSL Redirect (Production)

1. Go to **Settings > General**
2. Under "SSL Configuration", enable **Force SSL redirect**

## Troubleshooting

### Users Can't Sign Up
- Check if Email provider is enabled
- Verify SMTP settings if using custom email
- Check the HTTP logs in dashboard for errors

### Can't Access User Data
- Ensure RLS policies are correctly set
- Verify `auth.uid()` matches data in table
- Check user has proper permissions

### Database Connection Issues
- Verify connection string is correct
- Check project is not paused
- Verify your IP is allowed (if using IP whitelist)

## Database Schema Visualization

```
auth.users (managed by Supabase)
    ↓
    └─ profiles (extends user data)
           ├─ id (FK → auth.users.id)
           ├─ email
           ├─ full_name
           ├─ phone
           └─ avatar_url
               ↓
               └─ bookings (user's bookings)
                      ├─ id (PK)
                      ├─ user_id (FK → profiles.id)
                      ├─ vehicle_type
                      ├─ pickup_location
                      ├─ dropoff_location
                      └─ status
                          ↓
                          └─ payments (booking payments)
                                 ├─ id (PK)
                                 ├─ booking_id (FK)
                                 ├─ user_id (FK)
                                 ├─ amount
                                 └─ status
```

## Next Steps

- Read [Authentication Setup Guide](./AUTHENTICATION_SETUP.md)
- Check [API Integration Guide](./API_INTEGRATION.md)
- Review [Security Best Practices](./SECURITY.md)

---

For more information, visit:
- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs)
