# Quick Start Guide

Get the Portal Services app running in 10 minutes!

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account (free at https://supabase.com)
- Expo CLI (will be installed with npm)

## Step 1: Clone & Install (2 min)

```bash
# Navigate to the project
cd portal-app-1

# Install dependencies
npm install
```

## Step 2: Setup Supabase (3 min)

### Get Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project OR use existing
3. Go to **Settings > API**
4. Copy your credentials

### Update .env.local

```bash
# Edit .env.local in project root
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Create Database Tables

1. In Supabase, go to **SQL Editor**
2. Click **New Query**
3. Copy & run this SQL:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
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
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create policies for bookings
CREATE POLICY "Users can read own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = user_id);
```

4. Click **Run**

## Step 3: Start Development Server (2 min)

```bash
# Start Expo dev server
npm start
```

You'll see options:
```
a - Android
i - iOS
w - Web
j - Prebuild
```

### Run on Web (Easiest to Start)
Press `w` - Opens app in browser at http://localhost:19006

### Run on Emulator
- **Android**: Press `a` (requires Android Studio)
- **iOS**: Press `i` (requires Mac)

### Run on Physical Device
1. Download "Expo Go" app from App Store/Play Store
2. Press `w` then scan QR code with Expo Go app

## Step 4: Test Authentication with OTP (3 min)

### Sign Up with OTP Verification
1. Tap **"Get Started"** on welcome screen
2. **Step 1 - Registration**:
   - Name: John Doe
   - Email: test@example.com
   - Phone: +91 XXXXXXXXXX
   - Password: password123
   - Confirm Password: password123
   - Check "I agree to Terms & Conditions"
3. Click **Continue**
4. **Step 2 - OTP Verification**:
   - You'll see a screen asking for verification code
   - Check your email for a 6-digit code (look in spam folder too)
   - Enter the 6-digit code in the input field
5. Click **Verify Email**
6. Success message shown, app auto-redirects to dashboard

### If OTP Expires or You Need to Resend
- Click **Resend Code** button (available after 30 seconds)
- New OTP will be sent to your email
- A 60-second countdown displays to prevent spam

### Sign In
1. If signup was successful, you're already logged in
2. To test login: Sign out, then click **Sign In**
3. Enter email and password from signup
4. Click **Sign In**
5. See dashboard with bookings

### Test Data Access
- Create a booking
- Sign out and sign back in
- Verify your booking is still there
- Try accessing in browser DevTools (data should be filtered)

## Project Structure

```
portal-app-1/
├── app/
│   ├── _layout.tsx          # Root layout with AuthProvider
│   ├── login.tsx            # Login screen
│   ├── signup.tsx           # Sign up screen
│   └── (tabs)/
│       ├── index.tsx        # Welcome/Home screen
│       └── explore.tsx      # App screens
├── contexts/
│   └── AuthContext.tsx      # Auth logic & hooks
├── lib/
│   └── supabase.ts          # Supabase client config
├── docs/
│   ├── SUPABASE_SETUP.md    # Backend setup
│   ├── AUTHENTICATION_SETUP.md  # Auth deep dive
│   ├── API_INTEGRATION.md   # API usage examples
│   └── QUICK_START.md       # This file
├── .env.local               # Your credentials here!
├── package.json
└── tsconfig.json
```

## Common Commands

```bash
# Start dev server
npm start

# Run Android
npm run android

# Run iOS
npm run ios

# Run web
npm run web

# Build app
npm run build

# Lint code
npm run lint

# Reset project
npm run reset-project
```

## Troubleshooting

### "Cannot find module"
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm start
```

### "Supabase API key not found"
- Check `.env.local` file exists
- Verify variables are set correctly
- Restart dev server: press `r` and `Enter`

### "Can't sign up - email already exists"
- That email is already registered
- Use different email or reset the user in Supabase

### "Blank screen on load"
- Check browser console for errors
- Verify Supabase URL is correct in `.env.local`
- Check internet connection

### "Can't create booking after login"
- Verify profile table has RLS policies set
- Check user profile exists in database
- See [Authentication Setup](./AUTHENTICATION_SETUP.md) for detailed RLS fixing

## Check Logs

### Browser DevTools
- Web: Press `F12` → Console tab
- Inspector: Shows all Supabase queries

### Terminal
- Shows Expo build errors
- Shows app crashes

### Supabase Dashboard
- Go to **Settings > Logs**
- See database and Auth errors

## Next Steps

1. **Customize Branding**: Edit colors in `constants/theme.ts`
2. **Add Features**: Create new screens in `app/(tabs)/`
3. **Connect to API**: Follow [API_INTEGRATION.md](./API_INTEGRATION.md)
4. **Deploy**: Build release app for stores
5. **Security**: Review [SECURITY.md](./SECURITY.md)

## Documentation Files

| File | Purpose |
|------|---------|
| [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) | Full backend configuration |
| [AUTHENTICATION_SETUP.md](./AUTHENTICATION_SETUP.md) | Auth & authorization deep dive |
| [API_INTEGRATION.md](./API_INTEGRATION.md) | API query examples |
| [QUICK_START.md](./QUICK_START.md) | This file |

## Getting Help

### Check Realtime Issues
- Go to Supabase dashboard **Real-time** tab
- See if queries are executing

### Debug Auth Issues
- Open browser DevTools
- Go to **Application > Local Storage**
- Should see `supabase.auth.token` key

### Network Problems
- Check WiFi/internet
- Try `npm start` in different terminal
- Restart Expo: Press `r` in terminal

## Test Scenarios

### Complete User Journey

```
1. Open app → Welcome screen
2. Tap "Get Started" → Sign up form
3. Fill form & submit → Verification message
4. Go back → Login screen
5. Enter credentials → Dashboard
6. Create booking → See booking in list
7. Logout → Login screen
8. Close app & reopen → Still logged in (session persisted)
```

### Permission Testing

```
1. Login as User A
2. Create booking
3. Check bookings (see own only)
4. Manual DB check (RLS filters applied)
5. Logout
6. Login as User B
7. Try accessing User A's bookings (should be hidden)
```

## Performance Tips

- **Images**: Use lazy loading for large lists
- **Queries**: Always add `.limit()` to prevent loading huge datasets
- **Real-time**: Unsubscribe when component unmounts
- **Authentication**: Cache session in AsyncStorage (already done)

## Security Reminders

✅ **DO**
- Keep `.env.local` out of git (already in .gitignore)
- Use HTTPS in production
- Enable email verification
- Review all RLS policies

❌ **DON'T**
- Commit credentials to repository
- Expose API keys in public client
- Disable Row Level Security
- Share database password

---

**Ready to get started? Run `npm start` now!**

Questions? Check documentation links above or visit [Supabase Docs](https://supabase.com/docs)
