# Portal Services - Complete Setup Checklist

This document is your setup guide for getting the Portal Services app fully functional.

## ✅ What's Already Done

The development team has completed:

- ✅ **Front-end Setup**
  - Created complete authentication flow (Login/Signup screens)
  - Built welcome screen with CTA buttons
  - Integrated React Context for state management
  - Setup dark/light theme support
  - All components built with TypeScript

- ✅ **Backend Configuration**
  - Supabase client integration 
  - API communication layer
  - AsyncStorage for session persistence
  - Error handling and validation

- ✅ **Documentation**
  - Complete guide for backend setup
  - Authentication and authorization documentation
  - API integration guide with examples
  - Quick start reference

- ✅ **Code Quality**
  - Full TypeScript support
  - ESLint configuration
  - All linting errors resolved

## 📋 What YOU Need To Do

### Phase 1: Backend Setup (30-45 minutes)

1. **Create Supabase Project**
   - [ ] Go to https://supabase.com
   - [ ] Sign up/login
   - [ ] Create new project (name: `portal-services`)
   - [ ] Save database password securely
   - [ ] Wait 2-3 minutes for project initialization

2. **Get API Credentials**
   - [ ] In Supabase dashboard: Click **Settings > API**
   - [ ] Copy **Project URL** (looks like: `https://xxxx.supabase.co`)
   - [ ] Copy **anon public** key (looks like: `eyJh...`)

3. **Update Environment File**
   - [ ] Open `.env.local` in project root
   - [ ] Add your Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **Create Database Tables & Policies**
   - [ ] In Supabase: Go to **SQL Editor** 
   - [ ] Create new query
   - [ ] Scroll down to "📚 See Full Setup SQL" section below
   - [ ] Copy the complete SQL script
   - [ ] Run it in SQL Editor

### Phase 2: App Testing (15-20 minutes)

1. **Start Development Server**
   ```bash
   npm start
   ```

2. **Run on Web** (Easiest for initial testing)
   - [ ] Press `w` to open in browser
   - [ ] App should load at http://localhost:19006

3. **Test Sign Up Flow - Step 1: Registration**
   - [ ] Tap **"Get Started"** button
   - [ ] Fill in form:
     - Full Name: Test User
     - Email: testuser@example.com
     - Phone: +91 9999999999
     - Password: Test@1234
     - Confirm Password: Test@1234
   - [ ] Check "I agree to Terms & Conditions"
   - [ ] Click **Continue**
   - [ ] You should see OTP verification screen

4. **Test OTP Verification - Step 2: Email Verification**
   - [ ] Check your email (check spam folder) for 6-digit code
   - [ ] Enter 6-digit code in app input field
   - [ ] Click **Verify Email**
   - [ ] Success message shown
   - [ ] App auto-redirects to dashboard

5. **If OTP Doesn't Arrive**
   - [ ] Look in spam/promotions folder
   - [ ] Check app for "Resend Code" option (after 30 seconds)
   - [ ] Click **Resend Code** to get new OTP
   - [ ] Wait for email with new code

6. **Verify User in Supabase**
   - [ ] Go to Supabase dashboard
   - [ ] **Authentication > Users** section
   - [ ] Verify user was created with correct email
   - [ ] Check **profiles** table for user record (name, phone)

7. **Test Sign In Flow**
   - [ ] Go back to app
   - [ ] Tap **"Sign In"** link
   - [ ] Enter email and password from signup
   - [ ] Click **Sign In**
   - [ ] Should show dashboard/explore screen

8. **Verify Data is Protected**
   - [ ] Go to Supabase dashboard
   - [ ] **Table Editor > profiles** table
   - [ ] Should see your user record
   - [ ] Check **bookings** table (empty for now)

### Phase 3: Android/iOS Testing (Optional)

**For Android:**
```bash
npm run android
# Requires Android Studio and emulator
```

**For iOS (macOS only):**
```bash
npm run ios
# Requires Xcode
```

**For Physical Device:**
- Download "Expo Go" app from App Store/Play Store
- From terminal: Press `w`, then `s`
- Scan QR code with Expo Go app

## 🔧 Troubleshooting

### Problem: "Cannot find Supabase configuration"
**Solution**: 
- Verify `.env.local` exists in project root (same level as package.json)
- Check variable names match exactly (case-sensitive)
- Restart dev server after updating (press `r` in terminal)

### Problem: "Sign up/login not working"
**Solution**:
- Check Supabase URL and key are correct
- Go to Supabase dashboard > Authentication > Providers
- Ensure "Email" is enabled
- Check browser console for detailed errors (F12)

### Problem: "Blank screen on app load"
**Solution**:
- Open browser DevTools (F12)
- Check Console tab for errors
- Common cause: Invalid/missing Supabase credentials
- Try refreshing page (Cmd/Ctrl + R)

### Problem: "User created but profile not found"
**Solution**:
- Make sure SQL setup completed successfully
- Check `profiles` table exists in Supabase
- Verify RLS policies are created
- See "Database Setup Issues" section below

## 📚 Complete Database Setup SQL

Copy and run this entire SQL in Supabase SQL Editor:

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
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
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Profiles table policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Bookings table policies
CREATE POLICY "Users can read own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookings"
  ON bookings FOR DELETE
  USING (auth.uid() = user_id);
```

## 🔐 Security Checklist

- [ ] `.env.local` file is in `.gitignore` (don't commit credentials!)
- [ ] Email verification is enabled in Supabase
- [ ] RLS policies are set on all tables
- [ ] Using HTTPS/SSL in production
- [ ] Strong password requirements enforced

## 📞 Getting Help

### Documentation Files

Read these in order:
1. **[QUICK_START.md](./docs/QUICK_START.md)** - 10-minute overview
2. **[SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md)** - Detailed backend setup
3. **[AUTHENTICATION_SETUP.md](./docs/AUTHENTICATION_SETUP.md)** - Deep dive into auth
4. **[API_INTEGRATION.md](./docs/API_INTEGRATION.md)** - How to add features

### Browser Developer Tools

Press `F12` in web browser and check:
- **Console** tab: Error messages
- **Network** tab: API requests
- **Application > Local Storage**: Stored tokens

### Supabase Dashboard

Check these sections for issues:
- **Authentication > Users** - See created users
- **Authentication > Providers** - Verify Email is enabled
- **Settings > Logs** - See database errors
- **Table Editor** - View database records

## 🚀 Next Steps After Setup

1. **Test Create Booking**
   - After signing in, create a booking
   - Verify it appears in database

2. **Customize Branding**
   - Edit `constants/theme.ts` for colors
   - Update app name in `app.json`

3. **Add More Features**
   - User profile edit screen
   - Booking search/filter
   - Payment integration

4. **Deploy to Production**
   - Build APK: `npx eas build --platform android`
   - Build iOS: `npx eas build --platform ios`
   - Setup environment for production credentials

## 📊 Useful Commands Reference

```bash
# Development
npm start                 # Start Expo server
npm run lint             # Check code quality
npm run android          # Run on Android emulator
npm run ios              # Run on iOS simulator

# Production
npm run build            # Build for production
npm run reset-project    # Reset to defaults

# Database queries (in Supabase SQL Editor)
SELECT * FROM profiles;        -- View all users
SELECT * FROM bookings;        -- View all bookings
SELECT COUNT(*) FROM auth.users;  -- Count users
```

## ✨ Production Readiness

After everything is working:

- [ ] Set up production Supabase project
- [ ] Update `.env.production` with prod credentials
- [ ] Enable email verification
- [ ] Set up SMTP for real emails
- [ ] Test on physical device
- [ ] Deploy to App Store/Play Store
- [ ] Monitor error logs

## 📅 Timeline Estimate

- **Backend Setup**: 30-45 mins
- **Initial Testing**: 15-20 mins
- **First Booking**: 5 mins
- **Total**: ~1 hour to full working app

---

**Questions?** Check the documentation files listed above or visit [Supabase Docs](https://supabase.com/docs)

**Ready?** Start with Phase 1 above! 🎉
