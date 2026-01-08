# Supabase Database Setup Guide

## Prerequisites

1. Create a Supabase project at https://supabase.com
2. Get your project URL and anon key from Project Settings > API

## Environment Variables

Create a `.env` file in the `anchor` directory with:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Schema

Run the following SQL in your Supabase SQL Editor:

### 1. Create Profiles Table

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT NOT NULL,
  sport TEXT NOT NULL DEFAULT 'Volleyball',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Create policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Note: Profiles are created manually by the app during signup
-- This ensures we have full control over the profile creation process

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on profile update
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

## Authentication Setup

1. Go to Authentication > Providers in your Supabase dashboard
2. Enable Email provider
3. Configure email settings as needed
4. (Optional) Set up email templates for better UX

## Storage Setup (for future use)

1. Go to Storage in your Supabase dashboard
2. Create a new bucket called `recordings`
3. Set it to private
4. Create a policy to allow authenticated users to upload:

```sql
-- Allow authenticated users to upload recordings
CREATE POLICY "Authenticated users can upload recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'recordings');

-- Allow users to read their own recordings
CREATE POLICY "Users can read own recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## Testing

After setup, test the authentication flow:
1. Sign up a new user
2. Check that a profile is created in the `profiles` table
3. Sign out and sign back in
4. Verify session persistence
