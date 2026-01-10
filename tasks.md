# Anchor App Development Tasks

## 🎯 Current Phase: Phase 1 - Authentication & Onboarding
**Status**: 🚧 **IN PROGRESS** - Landing screen complete! Welcome screen with logo implemented ✅

---

## Phase 0: Setup & Configuration ⚙️
**Goal**: Get development environment ready before writing any app code

**Prerequisites**:
- [x] Node.js installed (v18 or later)
- [x] npm or yarn package manager installed
- [x] Expo CLI installed globally (`npm install -g expo-cli`) or use `npx expo`
- [x] Supabase account created (free tier works)

### Tasks

- [x] **Set up Supabase project** ✅
  - [x] Go to https://supabase.com
  - [x] Create account (if needed)
  - [x] Click "New Project"
  - [x] Enter project name: "anchor" (created as "anchor")
  - [x] Enter database password (save this securely!)
  - [x] Select region closest to you
  - [x] Wait for project to be created (2-3 minutes)
  
  **How to work with Cursor**: 
  - Ask: "Guide me through creating a Supabase project for my React Native app"
  - Document: Save your project URL and anon key somewhere safe

- [x] **Get Supabase credentials** ✅
  - [x] In Supabase dashboard, go to Project Settings → API
  - [x] Copy your "Project URL" (looks like: https://xxxxx.supabase.co)
  - [x] Copy your "anon public" key (long string starting with eyJ...)
  - [x] Save these - you'll need them for environment variables
  
  **How to work with Cursor**: 
  - Ask: "Where do I find my Supabase project URL and API keys?"

- [x] **Create environment variables file** ✅
  - [x] Navigate to the `anchor` folder
  - [x] Create a file named `.env`
  - [x] Add these lines (replace with your actual values):
    ```
    EXPO_PUBLIC_SUPABASE_URL=your_project_url_here
    EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
    ```
  - [x] Replace `your_project_url_here` with your actual Supabase URL
  - [x] Replace `your_anon_key_here` with your actual anon key
  - [x] Verify `.env` is in `.gitignore` (it should be already)
  
  **How to work with Cursor**: 
  - Ask: "Create a .env file in the anchor folder with Supabase environment variables"
  - Verify: Check that `.env` is listed in `.gitignore`

- [x] **Set up Supabase database tables** ✅
  - [x] In Supabase dashboard, go to SQL Editor
  - [x] Copy the SQL script below
  - [x] Paste into SQL Editor
  - [x] Run the SQL script to create all necessary tables
  - [x] Verify tables were created in Table Editor
  - [x] Check that all tables appear: profiles, teams, players, game_sessions, recordings
  
  **SQL Script to Run**:
  ```sql
  -- 1. Create profiles table
  CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
  );

  -- Enable Row Level Security
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

  -- RLS Policies for profiles
  CREATE POLICY "Users can read own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

  CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

  CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

  -- 2. Create teams table
  CREATE TABLE IF NOT EXISTS teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    sport TEXT NOT NULL DEFAULT 'Volleyball',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
  );

  ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users can read own teams"
    ON teams FOR SELECT
    USING (auth.uid() = coach_id);

  CREATE POLICY "Users can insert own teams"
    ON teams FOR INSERT
    WITH CHECK (auth.uid() = coach_id);

  CREATE POLICY "Users can update own teams"
    ON teams FOR UPDATE
    USING (auth.uid() = coach_id);

  CREATE POLICY "Users can delete own teams"
    ON teams FOR DELETE
    USING (auth.uid() = coach_id);

  -- 3. Create players table
  CREATE TABLE IF NOT EXISTS players (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    jersey_number INTEGER,
    position TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
  );

  ALTER TABLE players ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users can read players from own teams"
    ON players FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM teams
        WHERE teams.id = players.team_id
        AND teams.coach_id = auth.uid()
      )
    );

  CREATE POLICY "Users can insert players to own teams"
    ON players FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM teams
        WHERE teams.id = players.team_id
        AND teams.coach_id = auth.uid()
      )
    );

  CREATE POLICY "Users can update players from own teams"
    ON players FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM teams
        WHERE teams.id = players.team_id
        AND teams.coach_id = auth.uid()
      )
    );

  CREATE POLICY "Users can delete players from own teams"
    ON players FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM teams
        WHERE teams.id = players.team_id
        AND teams.coach_id = auth.uid()
      )
    );

  -- 4. Create game_sessions table
  CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    opponent_name TEXT,
    date DATE NOT NULL,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
  );

  ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users can read own game sessions"
    ON game_sessions FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM teams
        WHERE teams.id = game_sessions.team_id
        AND teams.coach_id = auth.uid()
      )
    );

  CREATE POLICY "Users can insert own game sessions"
    ON game_sessions FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM teams
        WHERE teams.id = game_sessions.team_id
        AND teams.coach_id = auth.uid()
      )
    );

  CREATE POLICY "Users can update own game sessions"
    ON game_sessions FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM teams
        WHERE teams.id = game_sessions.team_id
        AND teams.coach_id = auth.uid()
      )
    );

  CREATE POLICY "Users can delete own game sessions"
    ON game_sessions FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM teams
        WHERE teams.id = game_sessions.team_id
        AND teams.coach_id = auth.uid()
      )
    );

  -- 5. Create recordings table
  CREATE TABLE IF NOT EXISTS recordings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE NOT NULL,
    audio_url TEXT NOT NULL,
    duration INTEGER NOT NULL, -- duration in seconds
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL, -- when recording was made
    transcription TEXT,
    ai_labels JSONB, -- stores skill_category, feedback_type, players_tagged, urgency, key_phrases
    manual_notes TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'addressed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
  );

  ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users can read own recordings"
    ON recordings FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM game_sessions
        JOIN teams ON teams.id = game_sessions.team_id
        WHERE game_sessions.id = recordings.game_session_id
        AND teams.coach_id = auth.uid()
      )
    );

  CREATE POLICY "Users can insert own recordings"
    ON recordings FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM game_sessions
        JOIN teams ON teams.id = game_sessions.team_id
        WHERE game_sessions.id = recordings.game_session_id
        AND teams.coach_id = auth.uid()
      )
    );

  CREATE POLICY "Users can update own recordings"
    ON recordings FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM game_sessions
        JOIN teams ON teams.id = game_sessions.team_id
        WHERE game_sessions.id = recordings.game_session_id
        AND teams.coach_id = auth.uid()
      )
    );

  CREATE POLICY "Users can delete own recordings"
    ON recordings FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM game_sessions
        JOIN teams ON teams.id = game_sessions.team_id
        WHERE game_sessions.id = recordings.game_session_id
        AND teams.coach_id = auth.uid()
      )
    );

  -- 6. Create function to update updated_at timestamp
  CREATE OR REPLACE FUNCTION public.handle_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  -- 7. Create triggers for updated_at
  CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

  CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

  CREATE TRIGGER update_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

  CREATE TRIGGER update_game_sessions_updated_at
    BEFORE UPDATE ON game_sessions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

  CREATE TRIGGER update_recordings_updated_at
    BEFORE UPDATE ON recordings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  ```
  
  **How to work with Cursor**: 
  - Ask: "Help me understand what each table in this SQL script does"
  - Ask: "Explain Row Level Security (RLS) policies in Supabase"

- [x] **Set up Supabase Storage bucket** ✅
  - [x] In Supabase dashboard, go to Storage
  - [x] Click "New bucket"
  - [x] Name: `recordings`
  - [x] Set to "Private" (not public)
  - [x] Click "Create bucket"
  - [x] Verify bucket was created successfully ✅
  
  **Important**: Files must be stored with path structure: `{user_id}/{recording_id}.m4a`
  - Example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890/recording-123.m4a`
  - This ensures each user's files are isolated in their own folder
  - **Note**: This path structure is handled in your app code when uploading files (Phase 2). The storage policies below enforce that users can only access files in their own folders.
  - When uploading (in Phase 2), use: `supabase.storage.from('recordings').upload(\`${userId}/${recordingId}.m4a\`, audioFile)`
  
  - [x] **Set up Storage Policies** (run in SQL Editor): ✅ **COMPLETE - 4 policies configured**
    - [x] Go to SQL Editor in Supabase dashboard
    - [x] **Important**: You can keep your earlier table creation SQL code - just add the storage policies SQL below it (or run in a new query tab)
    - [x] Copy the storage policies SQL below
    - [x] Paste into SQL Editor (below existing code or in new tab)
    - [x] Run the SQL script
    - [x] Verify policies were created in Storage → Policies ✅ (4 policies confirmed)
  
  **Storage Policies SQL**:
  ```sql
  -- Allow authenticated users to upload recordings to their own folder only
  CREATE POLICY "Authenticated users can upload recordings"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'recordings' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

  -- Allow users to read their own recordings only
  CREATE POLICY "Users can read own recordings"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'recordings' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

  -- Allow users to update their own recordings only
  CREATE POLICY "Users can update own recordings"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'recordings' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

  -- Allow users to delete their own recordings only
  CREATE POLICY "Users can delete own recordings"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'recordings' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
  ```
  
  **Security Note**: These policies ensure that:
  - Users can only access files in folders matching their user ID
  - File paths must follow the structure: `{user_id}/{filename}`
  - Each user's recordings are completely isolated from other users
  
  **How to work with Cursor**: 
  - Ask: "Explain how Supabase Storage works for file uploads"
  - Ask: "How do I upload files to Supabase Storage with a specific path structure?"

- [x] **Configure Supabase Authentication** ✅
  - [x] In Supabase dashboard, go to Authentication → Providers
  - [x] Enable "Email" provider ✅
  - [x] (Optional) Configure email templates for better UX
  - [x] Disable "Confirm email" for development (enable later for production) ✅
  - [x] Verify Email provider is enabled ✅
  - [x] Secure email change: Enabled ✅
  - [x] Minimum password length: Set to 8 characters ✅
  
  **How to work with Cursor**: 
  - Ask: "What authentication settings do I need for development vs production?"

- [x] **Set up Google Sign-In (Optional but Recommended)** ✅ **COMPLETE**
  - [x] **Create Google Cloud Project** ✅
    - [x] Go to https://console.cloud.google.com/
    - [x] Sign in with your Google account
    - [x] Click "Select a project" → "New Project"
    - [x] Name: "Anchor App" (or similar)
    - [x] Click "Create"
  
  - [x] **Enable Google APIs** ✅
    - [x] Go to "APIs & Services" → "Library"
    - [x] Search for "Google+ API" or "Google Identity"
    - [x] Click "Enable"
  
  - [x] **Configure OAuth Consent Screen** ✅
    - [x] Go to "APIs & Services" → "OAuth consent screen"
    - [x] User Type: Select "External" → Click "Create"
    - [x] App name: "Anchor"
    - [x] Support email: Your email
    - [x] Developer contact: Your email
    - [x] Click "Save and Continue" through all steps
  
  - [x] **Create OAuth Credentials - Web Client** ✅
    - [x] Go to "APIs & Services" → "Credentials"
    - [x] Click "+ CREATE CREDENTIALS" → "OAuth client ID"
    - [x] Application type: "Web application"
    - [x] Name: "Anchor Web Client" ✅
    - [x] **Authorized redirect URIs**: Click "+ ADD URI"
    - [x] Paste your Supabase callback URL: `https://bqkpzjuieiasdibbodas.supabase.co/auth/v1/callback` ✅
      - **Important**: Get this exact URL from Supabase → Authentication → Providers → Google → Copy the "Callback URL"
    - [x] Click "Create"
    - [x] **Copy the Client ID and Client Secret** ✅
      - Web Client ID: `779766812470-ssvdckl589td72ef50vv1pvthfni53op.apps.googleusercontent.com`
      - Client Secret: Created and enabled ✅
  
  - [x] **Create OAuth Credentials - iOS Client** ✅
    - [x] Click "+ CREATE CREDENTIALS" → "OAuth client ID"
    - [x] Application type: "iOS"
    - [x] Name: "iOS client 1" ✅
    - [x] Bundle ID: `com.anchor.app` ✅ (from your app.json)
    - [x] Click "Create"
    - [x] **Copy the Client ID** ✅
      - iOS Client ID: `779766812470-bvaq1ssp51s926ih215jad6mpvoue14b.apps.googleusercontent.com`
      - iOS URL scheme: `com.googleusercontent.apps.779766812470-bvaq1ssp51s926ih215jad6mpvoue14b`
  
  - [x] **Configure Google Provider in Supabase** ✅
    - [x] In Supabase dashboard, go to Authentication → Providers
    - [x] Click on "Google" provider
    - [x] Enable "Sign in with Google": Toggle ON ✅
    - [x] **Client IDs**: Paste all your Client IDs (comma-separated) ✅
      - Format: `web-client-id,ios-client-id,android-client-id`
      - Example: `123456789-abc.apps.googleusercontent.com,987654321-def.apps.googleusercontent.com,555666777-ghi.apps.googleusercontent.com`
    - [x] **Client Secret**: Paste your Web Client Secret (only needed for web OAuth) ✅
    - [x] Skip nonce checks: Keep OFF (for security) ✅
    - [x] Allow users without an email: Toggle ON (your preference) ✅
    - [x] Click "Save" ✅
    - [x] Verify Google provider shows as enabled ✅
  
  - [x] **Install Google Sign-In Packages (Phase 1)** ✅
    - [x] Navigate to `anchor` folder
    - [x] Install: `npx expo install expo-auth-session expo-crypto` ✅
    - [x] Verify packages are added to `package.json` ✅
      - `expo-auth-session`: ~7.0.10 ✅
      - `expo-crypto`: ~15.0.8 ✅
  
  **Important Notes**:
  - ✅ The Callback URL has been registered in Google Console: `https://bqkpzjuieiasdibbodas.supabase.co/auth/v1/callback`
  - ✅ Web Client Secret is created and enabled
  - ✅ iOS Client ID is configured with Bundle ID: `com.anchor.app`
  - ✅ All OAuth clients have been saved successfully
  - Keep "Skip nonce checks" disabled for better security (currently OFF ✅)
  
  **How to work with Cursor**: 
  - Ask: "How do I implement Google sign-in in React Native with Expo and Supabase?"
  - Ask: "Create a Google sign-in button component for my auth screens"

- [x] **Install required React Native packages** ✅ **ALL PACKAGES INSTALLED**
  - [x] Navigate to the `anchor` folder in terminal
  - [x] Verify Supabase is already installed: Check `package.json` for `@supabase/supabase-js` ✅
    - Installed: `@supabase/supabase-js`: ^2.90.1 ✅
  - [x] Install expo-secure-store if not already installed: `npx expo install expo-secure-store` ✅
    - Installed: `expo-secure-store`: ^15.0.8 ✅
  - [x] Install expo-av for audio recording: `npx expo install expo-av` ✅
    - Installed: `expo-av`: ~16.0.8 ✅
  - [x] Install @react-native-picker/picker if not installed: `npm install @react-native-picker/picker` ✅
    - Installed: `@react-native-picker/picker`: ^2.11.4 ✅
  - [x] Install Google Sign-In packages: `npx expo install expo-auth-session expo-crypto` ✅
    - Installed: `expo-auth-session`: ~7.0.10 ✅
    - Installed: `expo-crypto`: ~15.0.8 ✅
  - [x] Verify all packages installed: Check `package.json` or run `npm list` ✅
  
  **How to work with Cursor**: 
  - Ask: "Check if all required packages are installed in package.json"
  - Ask: "What does each of these packages do?"

- [x] **Create Supabase client configuration** ✅
  - [x] Navigate to `anchor` folder
  - [x] Create folder `lib` if it doesn't exist: `mkdir lib` (or create via file explorer) ✅
  - [x] Create file: `anchor/lib/supabase.ts` ✅
  - [x] Set up Supabase client with SecureStore adapter ✅
  - [x] Import environment variables from `.env` ✅
  - [x] Export the supabase client ✅
  
  **File Created**: `anchor/lib/supabase.ts`
  - Uses `expo-secure-store` for secure token storage
  - Loads environment variables: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - Includes error handling for missing environment variables
  - Configured with auto-refresh tokens and session persistence
  
  **How to work with Cursor**: 
  - Ask: "Create a Supabase client configuration file for React Native using expo-secure-store. Use environment variables EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY"

- [x] **Test Supabase connection** ✅ **COMPLETE - Connection successful!**
  - [x] Create a simple test file or add test code to verify connection ✅
    - Created: `lib/testSupabase.ts` with test function
    - Added test code to `app/(tabs)/index.tsx` to run on mount
  - [x] Start Expo development server: `npx expo start` ✅
  - [x] Open app in Expo Go or simulator ✅
  - [x] Check console for connection errors ✅ (No errors found)
  - [x] Verify you can read from a table (test query) ✅ (Profiles table queried successfully)
  - [x] Confirm no errors appear in console ✅
  
  **Test Function Created**: `lib/testSupabase.ts`
  - Tests Supabase client initialization
  - Tests database connection (queries profiles table)
  - Tests environment variables loading
  - Logs detailed results to console
  
  **To Run Tests**:
  1. Start Expo: `cd anchor && npx expo start`
  2. Open app in Expo Go or simulator
  3. Check console output for test results
  4. Look for ✅ success messages or ❌ error messages
  5. Verify the test result displays on the home screen

**Testing Checkpoint**:
- [x] Test code created ✅
- [x] Can connect to Supabase (no errors in console) ✅ **VERIFIED**
- [x] Can see all tables in Supabase dashboard (profiles, teams, players, game_sessions, recordings) ✅
- [x] Storage bucket exists and is private ✅
- [x] Storage policies are set up correctly ✅
- [x] Environment variables are loaded correctly ✅ **VERIFIED**
- [x] Supabase client initializes without errors ✅ **VERIFIED**
- [x] Test query to database works ✅ **VERIFIED** (Profiles table queried successfully)

---

## Phase 1: Authentication & Onboarding 🔐
**Goal**: Build login/signup screens - first thing users see

**Prerequisites**:
- [x] Phase 0 complete (Supabase set up, tables created) ✅
- [x] Environment variables configured ✅
- [x] Supabase client created ✅
- [x] All Phase 0 testing checkpoints passed ✅

### Component Breakdown

#### WelcomeScreen.tsx ✅
**Location**: `anchor/app/(auth)/welcome.tsx`

**What it does**: Landing screen that welcomes users and directs them to signup or login

**Components needed**:
- `View` - Container ✅
- `Text` - Title and description ✅
- `TouchableOpacity` - Buttons ✅
- `AnchorLogo` - App logo component ✅

**State needed**: None (static screen) ✅

**Navigation**: 
- "Get Started" button → navigates to signup screen ✅
- "Already have account?" → navigates to login screen ✅

**Implementation Notes**:
- ✅ Created `AnchorLogo.tsx` component using react-native-svg
- ✅ Logo displays prominently with icon and "ANCHOR" text
- ✅ Responsive layout with proper spacing
- ✅ Supports light/dark mode via themed components
- ✅ Platform-specific styling (iOS shadows, Android elevation)
- ✅ Created `app/(auth)/index.tsx` to redirect to welcome screen

**How to work with Cursor**: 
- Ask: "Create a WelcomeScreen component for React Native. It should have a title 'Anchor', a 'Get Started' button that navigates to signup, and a 'Already have an account? Login' link. Use Expo Router for navigation. Style it simply with padding and spacing."

#### SignupScreen.tsx
**Location**: `anchor/app/(auth)/signup.tsx`

**What it does**: Form for new users to create an account

**Components needed**:
- `View` - Container
- `TextInput` - Email, password, confirm password, name fields
- `Picker` from `@react-native-picker/picker` - Sport selection
- `TouchableOpacity` - Submit button
- `Text` - Labels and error messages
- `ActivityIndicator` - Loading state

**State needed**:
- `email` (string)
- `password` (string)
- `confirmPassword` (string)
- `name` (string)
- `sport` (string) - default "Volleyball"
- `loading` (boolean)
- `error` (string | null)

**Validation**:
- Email format check
- Password minimum 6 characters
- Password match check
- Name required (min 2 characters)
- Sport selection required

**Supabase integration**: 
- Call `supabase.auth.signUp()` with email and password
- Create profile in `profiles` table after successful signup
- Handle errors and display to user

**How to work with Cursor**: 
- Ask: "Create a SignupScreen component with email, password, confirm password, name, and sport picker fields. Add form validation for email format, password length (min 6), password match, and required fields. Use TextInput from react-native and Picker from @react-native-picker/picker. Style it simply with padding and spacing."
- Then ask: "Integrate this signup form with Supabase authentication. On successful signup, create a profile record in the profiles table with the user's name. Handle errors and show them to the user."

#### LoginScreen.tsx
**Location**: `anchor/app/(auth)/login.tsx`

**What it does**: Form for existing users to log in

**Components needed**:
- `View` - Container
- `TextInput` - Email and password fields
- `TouchableOpacity` - Submit button
- `Text` - Labels and error messages
- `ActivityIndicator` - Loading state

**State needed**:
- `email` (string)
- `password` (string)
- `loading` (boolean)
- `error` (string | null)

**Validation**:
- Email format check
- Password required

**Supabase integration**: 
- Call `supabase.auth.signInWithPassword()` with email and password
- Handle errors and display to user
- On success, navigate to main app

**How to work with Cursor**: 
- Ask: "Create a LoginScreen component with email and password fields. Add form validation for email format and required fields. Style it simply with padding and spacing."
- Then ask: "Integrate this login form with Supabase authentication. On successful login, navigate to the main app tabs. Handle errors and show them to the user."

#### AuthLayout.tsx ✅
**Location**: `anchor/app/(auth)/_layout.tsx`

**What it does**: Layout wrapper for authentication screens using Expo Router

**Components needed**:
- `Stack` from `expo-router` - Navigation stack ✅

**Implementation Notes**:
- ✅ Created auth layout with Stack navigation
- ✅ Configured welcome, signup, and login screens
- ✅ Set headerShown to false for all screens

**How to work with Cursor**: 
- Ask: "Create an AuthLayout component using Expo Router Stack. It should include screens for welcome, signup, and login. Set headerShown to false for all screens."

#### AuthContext.tsx
**Location**: `anchor/contexts/AuthContext.tsx`

**What it does**: React Context to manage authentication state app-wide

**Features**:
- Track current user session
- Provide signup, signin, signout functions
- Listen to auth state changes
- Load user profile

**How to work with Cursor**: 
- Ask: "Create an AuthContext using React Context API that manages Supabase authentication state. It should provide: user session, loading state, signUp function, signIn function, signOut function, and automatically listen to auth state changes. Use the Supabase client from lib/supabase.ts"

#### Update Root Layout ✅ (Partial)
**Location**: `anchor/app/_layout.tsx`

**What it does**: Conditionally show auth screens or main app based on auth state

**Changes needed**:
- ✅ Added auth routes to Stack navigation
- [ ] Wrap app with AuthProvider (pending AuthContext creation)
- [ ] Check auth state (pending AuthContext creation)
- [ ] Redirect to auth screens if not logged in (pending AuthContext creation)
- [ ] Redirect to main app if authenticated (pending AuthContext creation)

**Implementation Notes**:
- ✅ Updated root layout to include `(auth)` stack
- ✅ Auth routes are now accessible
- ⏳ Full auth state management pending AuthContext implementation

**How to work with Cursor**: 
- Ask: "Update the root layout to use AuthContext. If user is not authenticated, show auth screens. If authenticated, show main app tabs. Handle loading state while checking auth."

### Tasks

- [x] **Install react-native-svg for logo support** ✅
  - [x] Navigate to `anchor` folder ✅
  - [x] Run: `npx expo install react-native-svg` ✅
  - [x] Verify package is added to `package.json` ✅

- [x] **Create Anchor logo components** ✅
  - [x] Create `AnchorLogo.tsx` component (full logo with icon and text) ✅
  - [x] Create `AnchorIcon.tsx` component (app icon version for iOS) ✅
  - [x] Use react-native-svg for SVG rendering ✅
  - [x] Logo includes anchor icon with brand colors (#1B3B5F, #FF6B4A, #E85A3A) ✅

- [x] **Create `(auth)` folder structure** ✅
  - [x] Navigate to `anchor/app/` directory ✅
  - [x] Create folder `(auth)` if it doesn't exist ✅
  - [x] Verify folder structure: `app/(auth)/` ✅

- [x] **Create WelcomeScreen component** ✅
  - [x] Create file: `anchor/app/(auth)/welcome.tsx` ✅
  - [x] Add title "Welcome to Anchor" ✅
  - [x] Add subtitle explaining the app ✅
  - [x] Add Anchor logo component (`AnchorLogo.tsx`) ✅
  - [x] Add "Get Started" button (navigates to signup) ✅
  - [x] Add "Already have an account? Login" link (navigates to login) ✅
  - [x] Style with padding and spacing ✅
  - [x] Create `app/(auth)/index.tsx` redirect ✅
  - [ ] Test navigation buttons work (ready for testing)

- [x] **Create SignupScreen component** ✅ (Placeholder created)
  - [x] Create file: `anchor/app/(auth)/signup.tsx` ✅
  - [ ] Add email TextInput field (pending full implementation)
  - [ ] Add password TextInput field (pending full implementation)
  - [ ] Add confirm password TextInput field (pending full implementation)
  - [ ] Add name TextInput field (pending full implementation)
  - [ ] Add sport Picker (default "Volleyball") (pending full implementation)
  - [ ] Add form validation (email format, password length, password match, name required) (pending full implementation)
  - [ ] Add submit button (pending full implementation)
  - [ ] Add loading state with ActivityIndicator (pending full implementation)
  - [ ] Add error message display (pending full implementation)
  - [x] Style with padding and spacing ✅ (basic structure)
  - [ ] Test form validation works (pending full implementation)

- [ ] **Integrate Supabase signup**
  - [ ] Import supabase client from `@/lib/supabase`
  - [ ] Add signup function that calls `supabase.auth.signUp()`
  - [ ] Create profile in `profiles` table after successful signup
  - [ ] Handle signup errors and display to user
  - [ ] Navigate to main app on successful signup
  - [ ] Test signup flow end-to-end

- [x] **Create LoginScreen component** ✅ (Placeholder created)
  - [x] Create file: `anchor/app/(auth)/login.tsx` ✅
  - [ ] Add email TextInput field (pending full implementation)
  - [ ] Add password TextInput field (pending full implementation)
  - [ ] Add form validation (email format, password required) (pending full implementation)
  - [ ] Add submit button (pending full implementation)
  - [ ] Add loading state with ActivityIndicator (pending full implementation)
  - [ ] Add error message display (pending full implementation)
  - [x] Style with padding and spacing ✅ (basic structure)
  - [ ] Test form validation works (pending full implementation)

- [ ] **Integrate Supabase login**
  - [ ] Import supabase client from `@/lib/supabase`
  - [ ] Add login function that calls `supabase.auth.signInWithPassword()`
  - [ ] Handle login errors and display to user
  - [ ] Navigate to main app on successful login
  - [ ] Test login flow end-to-end

- [x] **Create AuthLayout component** ✅
  - [x] Create file: `anchor/app/(auth)/_layout.tsx` ✅
  - [x] Import Stack from expo-router ✅
  - [x] Add Stack.Screen for welcome ✅
  - [x] Add Stack.Screen for signup ✅
  - [x] Add Stack.Screen for login ✅
  - [x] Set headerShown to false for all screens ✅
  - [ ] Test navigation between auth screens (ready for testing)

- [ ] **Create AuthContext**
  - [ ] Create folder `contexts` if it doesn't exist
  - [ ] Create file: `anchor/contexts/AuthContext.tsx`
  - [ ] Create AuthContext using React Context API
  - [ ] Add state for: session, user, loading
  - [ ] Add signUp function
  - [ ] Add signIn function
  - [ ] Add signOut function
  - [ ] Add useEffect to listen to auth state changes
  - [ ] Export AuthProvider component
  - [ ] Export useAuth hook
  - [ ] Test AuthContext provides correct values

- [x] **Update root layout** ✅ (Partial - routes added, auth state pending)
  - [x] Open `anchor/app/_layout.tsx` ✅
  - [x] Add `(auth)` stack to navigation ✅
  - [ ] Import AuthProvider from contexts (pending AuthContext creation)
  - [ ] Wrap app with AuthProvider (pending AuthContext creation)
  - [ ] Add logic to check auth state (pending AuthContext creation)
  - [ ] Redirect to auth screens if not authenticated (pending AuthContext creation)
  - [ ] Redirect to main app if authenticated (pending AuthContext creation)
  - [ ] Handle loading state (pending AuthContext creation)
  - [ ] Test auth flow (signup → main app, logout → auth screens) (pending full implementation)

- [ ] **Add error handling**
  - [ ] Add error states to all forms
  - [ ] Display user-friendly error messages
  - [ ] Handle network errors gracefully
  - [ ] Test error scenarios

- [ ] **Test signup flow**
  - [ ] Create new account with valid data
  - [ ] Verify profile is created in Supabase
  - [ ] Verify user is redirected to main app
  - [ ] Verify session persists after app restart

- [ ] **Test login flow**
  - [ ] Login with existing account
  - [ ] Verify user is redirected to main app
  - [ ] Verify session persists after app restart
  - [ ] Test login with invalid credentials (should show error)

- [ ] **Test logout functionality**
  - [ ] Add logout button/functionality
  - [ ] Test logout redirects to auth screens
  - [ ] Verify session is cleared

- [ ] **Test navigation between auth screens** (Ready for testing)
  - [ ] Test welcome → signup navigation (navigation implemented, ready to test)
  - [ ] Test welcome → login navigation (navigation implemented, ready to test)
  - [ ] Test signup → login navigation (pending full signup/login implementation)
  - [ ] Test login → signup navigation (pending full signup/login implementation)

**Testing Checkpoint**:
- [x] Welcome screen displays correctly with logo ✅
- [x] Navigation buttons work (Get Started → signup, Login link → login) ✅
- [x] Auth layout structure is set up ✅
- [ ] Can create new account successfully (pending signup implementation)
- [ ] Profile is created in Supabase after signup (pending signup implementation)
- [ ] Can login with created account (pending login implementation)
- [ ] Session persists after app restart (pending AuthContext implementation)
- [ ] Can logout successfully (pending AuthContext implementation)
- [x] Navigation works between auth screens (basic navigation implemented) ✅
- [ ] Form validation works correctly (pending form implementation)
- [ ] Error messages display properly (pending form implementation)

---

## Phase 2: Core Voice Recording 🎙️
**Goal**: Build the core voice recording functionality - the heart of the app

**Prerequisites**:
- [ ] Phase 1 complete (authentication working)
- [ ] User can create/login to account
- [ ] Supabase Storage bucket set up
- [ ] All Phase 1 testing checkpoints passed

### Component Breakdown

#### RecordButton Component
**Location**: `anchor/components/RecordButton.tsx`

**What it does**: Large, easy-to-tap button for starting/stopping recordings

**Components needed**:
- `TouchableOpacity` - Button
- `View` - Container for visual feedback
- `Text` - Timer display
- Custom styling for pulsing animation

**State needed**:
- `isRecording` (boolean)
- `recordingDuration` (number) - seconds

**Features**:
- Large size (easy to tap)
- Visual feedback (color change, pulsing)
- Timer display
- Haptic feedback on press

**How to work with Cursor**: 
- Ask: "Create a RecordButton component that shows a large circular button. When pressed, it should start recording and change color. Show a timer that counts up while recording. Add haptic feedback on press using expo-haptics."

#### RecordingScreen Component
**Location**: `anchor/app/(tabs)/record.tsx` (new tab)

**What it does**: Main screen for recording voice memos during games

**Components needed**:
- RecordButton component
- Player selection list (optional, for Phase 3)
- Current game session display
- Recording list (recent recordings)

**State needed**:
- `isRecording` (boolean)
- `recordingDuration` (number)
- `currentRecording` (Audio.Recording | null)
- `recordings` (array) - list of recent recordings

**Features**:
- Start/stop recording
- Save recording to Supabase Storage
- Associate recording with current game session
- Display recent recordings
- Background recording support

**How to work with Cursor**: 
- Ask: "Create a RecordingScreen component that uses expo-av to record audio. It should have a RecordButton, start/stop recording functionality, and save recordings to Supabase Storage. Upload files with path structure: `{userId}/{recordingId}.m4a` to the 'recordings' bucket. Store the audio file URL in the recordings table."

### Tasks

- [ ] **Install expo-av package**
  - [ ] Navigate to `anchor` folder
  - [ ] Run: `npx expo install expo-av`
  - [ ] Verify package is added to `package.json`

- [ ] **Request audio recording permissions**
  - [ ] Create permissions hook or utility function
  - [ ] Request microphone permission on app start or first recording attempt
  - [ ] Handle permission denied case
  - [ ] Show user-friendly permission request message
  - [ ] Test permission flow

- [ ] **Create RecordButton component**
  - [ ] Create file: `anchor/components/RecordButton.tsx`
  - [ ] Add large circular button
  - [ ] Add color change when recording (e.g., red)
  - [ ] Add pulsing animation when recording
  - [ ] Add timer display that counts up
  - [ ] Add haptic feedback on press (using expo-haptics)
  - [ ] Add onPress handler prop
  - [ ] Style button to be large and easy to tap
  - [ ] Test button appearance and animations

- [ ] **Create RecordingScreen component**
  - [ ] Create file: `anchor/app/(tabs)/record.tsx` (or appropriate location)
  - [ ] Add RecordButton component
  - [ ] Add state for: isRecording, recordingDuration, currentRecording
  - [ ] Add display for current game session (placeholder for Phase 4)
  - [ ] Add list of recent recordings (placeholder)
  - [ ] Style screen with minimal UI
  - [ ] Test screen renders correctly

- [ ] **Implement start recording functionality**
  - [ ] Import Audio from expo-av
  - [ ] Set up Audio recording mode
  - [ ] Create startRecording function
  - [ ] Request permissions before starting
  - [ ] Start recording when RecordButton is pressed
  - [ ] Update isRecording state to true
  - [ ] Start timer/countdown
  - [ ] Handle recording start errors
  - [ ] Test start recording works

- [ ] **Implement stop recording functionality**
  - [ ] Create stopRecording function
  - [ ] Stop the recording
  - [ ] Get recording URI
  - [ ] Update isRecording state to false
  - [ ] Stop timer
  - [ ] Handle recording stop errors
  - [ ] Test stop recording works

- [ ] **Add timer display**
  - [ ] Add timer state that increments every second
  - [ ] Format timer as MM:SS
  - [ ] Display timer on RecordButton or screen
  - [ ] Reset timer when recording stops
  - [ ] Test timer displays correctly

- [ ] **Add visual feedback**
  - [ ] Add pulsing animation to RecordButton when recording
  - [ ] Change button color when recording (e.g., red)
  - [ ] Add visual indicator (e.g., red dot) when recording
  - [ ] Test visual feedback works

- [ ] **Upload audio file to Supabase Storage**
  - [ ] Get current user ID from auth context
  - [ ] Generate unique recording ID (UUID)
  - [ ] Create file path: `{userId}/{recordingId}.m4a`
  - [ ] Convert recording URI to blob/file
  - [ ] Upload to Supabase Storage bucket 'recordings'
  - [ ] Get public URL of uploaded file
  - [ ] Handle upload errors
  - [ ] Test file upload works

- [ ] **Create recording record in database**
  - [ ] Get current game session ID (placeholder for Phase 4)
  - [ ] Create recording record in `recordings` table
  - [ ] Include: game_session_id, audio_url, duration, timestamp
  - [ ] Handle database errors
  - [ ] Test recording record is created

- [ ] **Handle recording errors**
  - [ ] Add error state to RecordingScreen
  - [ ] Display user-friendly error messages
  - [ ] Handle permission errors
  - [ ] Handle upload errors
  - [ ] Handle database errors
  - [ ] Test error handling

- [ ] **Test recording on Expo**
  - [ ] Start Expo development server: `npx expo start`
  - [ ] Open app in Expo Go or simulator
  - [ ] Test recording start/stop
  - [ ] Verify audio is recorded
  - [ ] Verify file uploads to Supabase Storage
  - [ ] Verify recording record appears in database

- [ ] **Test recording on physical device**
  - [ ] Build and install on physical device
  - [ ] Test recording with actual microphone
  - [ ] Verify audio quality is acceptable
  - [ ] Test background recording (screen locked)
  - [ ] Verify recording works in background

- [ ] **Verify audio files upload**
  - [ ] Check Supabase Storage dashboard
  - [ ] Verify files are in correct path structure: `{userId}/{recordingId}.m4a`
  - [ ] Verify files are private
  - [ ] Test downloading a file to verify it's valid

- [ ] **Verify recording records in database**
  - [ ] Check Supabase database dashboard
  - [ ] Verify records appear in `recordings` table
  - [ ] Verify all fields are populated correctly
  - [ ] Verify audio_url points to correct Storage path

**Testing Checkpoint**:
- [ ] Can start recording with one tap
- [ ] Timer displays correctly
- [ ] Can stop recording
- [ ] Audio file uploads to Supabase Storage
- [ ] Recording record created in database
- [ ] Visual feedback works (pulsing, color)
- [ ] Errors are handled gracefully
- [ ] Recording works in Expo Go/simulator
- [ ] Recording works on physical device
- [ ] Background recording works (screen locked)

---

## Phase 3: Player & Team Management 👥
**Goal**: Allow coaches to manage their team roster and tag players in recordings

**Prerequisites**:
- [ ] Phase 1 complete (authentication)
- [ ] Phase 2 complete (recording works)
- [ ] All Phase 2 testing checkpoints passed

### Component Breakdown

#### TeamsScreen Component
**Location**: `anchor/app/(tabs)/teams.tsx` (new tab)

**What it does**: List of teams, create new team, select active team

**Components needed**:
- `FlatList` - Team list
- `TouchableOpacity` - Create team button, team items
- `TextInput` - Team name input
- `Modal` - Create team form

**How to work with Cursor**: 
- Ask: "Create a TeamsScreen component that displays a list of teams for the current user. Include a button to create a new team. Use Supabase to fetch teams where coach_id matches the current user."

#### CreateTeamScreen Component
**Location**: `anchor/app/(tabs)/teams/create.tsx`

**What it does**: Form to create a new team

**Components needed**:
- `TextInput` - Team name
- `Picker` - Sport selection
- `TouchableOpacity` - Submit button

**How to work with Cursor**: 
- Ask: "Create a CreateTeamScreen component with a form to create a new team. Include team name and sport selection. Save to Supabase teams table."

#### PlayersScreen Component
**Location**: `anchor/app/(tabs)/players.tsx` (or nested in teams)

**What it does**: List players for active team, add/edit players

**Components needed**:
- `FlatList` - Player list
- `TextInput` - Player name, jersey number, position
- `TouchableOpacity` - Add/edit buttons
- `Modal` - Add/edit player form

**How to work with Cursor**: 
- Ask: "Create a PlayersScreen component that displays players for the active team. Include functionality to add, edit, and delete players. Use Supabase to manage player data."

#### PlayerSelection Component
**Location**: `anchor/components/PlayerSelection.tsx`

**What it does**: Quick-select component for tagging players during/after recording

**Components needed**:
- `FlatList` or `ScrollView` - Player list
- `TouchableOpacity` - Player items (multi-select)
- Checkbox or visual indicator for selected players

**How to work with Cursor**: 
- Ask: "Create a PlayerSelection component that displays a scrollable list of players with checkboxes. Allow multiple selection. Return selected player IDs."

### Tasks

- [ ] **Create TeamsScreen component**
  - [ ] Create file: `anchor/app/(tabs)/teams.tsx` (or appropriate location)
  - [ ] Add FlatList to display teams
  - [ ] Add "Create Team" button
  - [ ] Fetch teams from Supabase where coach_id matches current user
  - [ ] Display team name and sport for each team
  - [ ] Add navigation to create team screen
  - [ ] Style the list
  - [ ] Test teams display correctly

- [ ] **Create CreateTeamScreen component**
  - [ ] Create file: `anchor/app/(tabs)/teams/create.tsx` (or appropriate location)
  - [ ] Add TextInput for team name
  - [ ] Add Picker for sport selection (default "Volleyball")
  - [ ] Add submit button
  - [ ] Add form validation
  - [ ] Style the form
  - [ ] Test form displays correctly

- [ ] **Implement create team functionality**
  - [ ] Add createTeam function
  - [ ] Call Supabase to insert team into `teams` table
  - [ ] Include coach_id from current user
  - [ ] Handle errors
  - [ ] Navigate back to teams list on success
  - [ ] Test team creation works

- [ ] **Implement fetch teams functionality**
  - [ ] Add fetchTeams function
  - [ ] Query Supabase for teams where coach_id matches current user
  - [ ] Update teams state
  - [ ] Handle loading state
  - [ ] Handle errors
  - [ ] Test teams fetch works

- [ ] **Create PlayersScreen component**
  - [ ] Create file: `anchor/app/(tabs)/players.tsx` (or nested in teams)
  - [ ] Add FlatList to display players
  - [ ] Add "Add Player" button
  - [ ] Fetch players for active team from Supabase
  - [ ] Display player name, jersey number, position
  - [ ] Add edit/delete buttons for each player
  - [ ] Style the list
  - [ ] Test players display correctly

- [ ] **Implement add player functionality**
  - [ ] Create modal/form for adding player
  - [ ] Add TextInput fields: name, jersey_number, position
  - [ ] Add addPlayer function
  - [ ] Call Supabase to insert player into `players` table
  - [ ] Include team_id from active team
  - [ ] Handle errors
  - [ ] Refresh players list on success
  - [ ] Test add player works

- [ ] **Implement edit player functionality**
  - [ ] Create modal/form for editing player
  - [ ] Pre-fill form with existing player data
  - [ ] Add updatePlayer function
  - [ ] Call Supabase to update player in `players` table
  - [ ] Handle errors
  - [ ] Refresh players list on success
  - [ ] Test edit player works

- [ ] **Implement delete player functionality**
  - [ ] Add deletePlayer function
  - [ ] Call Supabase to delete player from `players` table
  - [ ] Add confirmation dialog before deleting
  - [ ] Handle errors
  - [ ] Refresh players list on success
  - [ ] Test delete player works

- [ ] **Create PlayerSelection component**
  - [ ] Create file: `anchor/components/PlayerSelection.tsx`
  - [ ] Add ScrollView or FlatList for player list
  - [ ] Add checkboxes for each player
  - [ ] Allow multiple selection
  - [ ] Track selected player IDs
  - [ ] Return selected player IDs via callback
  - [ ] Style the component
  - [ ] Test selection works

- [ ] **Integrate player selection into RecordingScreen**
  - [ ] Import PlayerSelection component
  - [ ] Add player selection UI (before or after recording)
  - [ ] Store selected player IDs with recording
  - [ ] Update recording record to include player IDs
  - [ ] Test player selection in recording flow

- [ ] **Add active team selection**
  - [ ] Add state for active team
  - [ ] Add team selector UI
  - [ ] Store active team in context or state
  - [ ] Use active team for player fetching
  - [ ] Test active team selection works

- [ ] **Test team creation**
  - [ ] Create a new team
  - [ ] Verify team appears in teams list
  - [ ] Verify team is saved in Supabase
  - [ ] Test with different team names

- [ ] **Test player CRUD operations**
  - [ ] Add a player
  - [ ] Edit player information
  - [ ] Delete a player
  - [ ] Verify all operations work correctly
  - [ ] Verify data persists in Supabase

- [ ] **Test player selection in recording flow**
  - [ ] Start recording
  - [ ] Select players before or after recording
  - [ ] Complete recording
  - [ ] Verify selected players are saved with recording
  - [ ] Verify player IDs appear in recording record

**Testing Checkpoint**:
- [ ] Can create a new team
- [ ] Can see list of teams
- [ ] Can add players to team
- [ ] Can edit player information
- [ ] Can delete players
- [ ] Can select players during recording
- [ ] Selected players are saved with recording

---

## Phase 4: Game Session Management 🎮
**Goal**: Allow coaches to create and manage game sessions

**Prerequisites**:
- [ ] Phase 1 complete (authentication)
- [ ] Phase 2 complete (recording works)
- [ ] All Phase 2 testing checkpoints passed

### Component Breakdown

#### GameSessionsScreen Component
**Location**: `anchor/app/(tabs)/sessions.tsx` (new tab)

**What it does**: List of game sessions, create new session, select active session

**Components needed**:
- `FlatList` - Session list
- `TouchableOpacity` - Create session button, session items
- `Text` - Display session info

**How to work with Cursor**: 
- Ask: "Create a GameSessionsScreen component that displays game sessions for the active team. Include a button to create a new session."

#### CreateGameSessionScreen Component
**Location**: `anchor/app/(tabs)/sessions/create.tsx`

**What it does**: Form to create a new game session

**Components needed**:
- `TextInput` - Opponent name, location
- Date picker (use `@react-native-community/datetimepicker`)
- `TouchableOpacity` - Submit button

**How to work with Cursor**: 
- Ask: "Create a CreateGameSessionScreen component with a form to create a new game session. Include opponent name, date picker, and location. Save to Supabase game_sessions table."

#### ActiveSessionIndicator Component
**Location**: `anchor/components/ActiveSessionIndicator.tsx`

**What it does**: Display current active game session at top of recording screen

**Components needed**:
- `View` - Container
- `Text` - Session info display

**How to work with Cursor**: 
- Ask: "Create an ActiveSessionIndicator component that displays the current active game session (opponent, date). Show 'No active session' if none selected."

### Tasks

- [ ] **Install date picker**
  - [ ] Navigate to `anchor` folder
  - [ ] Run: `npx expo install @react-native-community/datetimepicker`
  - [ ] Verify package is added to `package.json`

- [ ] **Create GameSessionsScreen component**
  - [ ] Create file: `anchor/app/(tabs)/sessions.tsx` (or appropriate location)
  - [ ] Add FlatList to display game sessions
  - [ ] Add "Create Session" button
  - [ ] Fetch game sessions from Supabase for active team
  - [ ] Display sessions with opponent name as title (e.g., "vs. Lincoln High School")
  - [ ] Display date and location for each session
  - [ ] Add navigation to create session screen
  - [ ] Add click handler to view session details
  - [ ] Style the list
  - [ ] Test sessions display correctly

- [ ] **Create CreateGameSessionScreen component**
  - [ ] Create file: `anchor/app/(tabs)/sessions/create.tsx` (or appropriate location)
  - [ ] Add TextInput for opponent name
  - [ ] Add TextInput for location
  - [ ] Add DatePicker for date selection
  - [ ] Add submit button
  - [ ] Add form validation
  - [ ] Style the form
  - [ ] Test form displays correctly

- [ ] **Implement create session functionality**
  - [ ] Add createSession function
  - [ ] Call Supabase to insert session into `game_sessions` table
  - [ ] Include team_id from active team
  - [ ] Handle errors
  - [ ] Navigate back to sessions list on success
  - [ ] Test session creation works

- [ ] **Implement fetch sessions functionality**
  - [ ] Add fetchSessions function
  - [ ] Query Supabase for sessions where team_id matches active team
  - [ ] Order by date (newest first)
  - [ ] Update sessions state
  - [ ] Handle loading state
  - [ ] Handle errors
  - [ ] Test sessions fetch works

- [ ] **Create ActiveSessionIndicator component**
  - [ ] Create file: `anchor/components/ActiveSessionIndicator.tsx`
  - [ ] Display current active session opponent name
  - [ ] Display session date
  - [ ] Show "No active session" if none selected
  - [ ] Style the component
  - [ ] Test indicator displays correctly

- [ ] **Add active session selection**
  - [ ] Add state for active session
  - [ ] Add session selector UI in GameSessionsScreen
  - [ ] Store active session in context or state
  - [ ] Update ActiveSessionIndicator when session changes
  - [ ] Test active session selection works

- [ ] **Integrate active session into RecordingScreen**
  - [ ] Import active session from context/state
  - [ ] Display ActiveSessionIndicator on RecordingScreen
  - [ ] Use active session ID when creating recordings
  - [ ] Test recording uses active session

- [ ] **Auto-associate recordings with active session**
  - [ ] Update recording creation to include game_session_id
  - [ ] Use active session ID when saving recordings
  - [ ] Handle case where no active session is set
  - [ ] Test recordings are associated with correct session

- [ ] **Add set markers functionality (Set 1, Set 2, etc.)**
  - [ ] Add UI for setting set markers (optional for MVP)
  - [ ] Store set markers with session or recording
  - [ ] Display set markers in session view
  - [ ] Test set markers work

- [ ] **Test session creation**
  - [ ] Create a new game session
  - [ ] Verify session appears in sessions list
  - [ ] Verify session is saved in Supabase
  - [ ] Test with different opponent names and dates

- [ ] **Test session selection**
  - [ ] Select a session as active
  - [ ] Verify ActiveSessionIndicator updates
  - [ ] Verify active session persists
  - [ ] Test switching between sessions

- [ ] **Test recording association with session**
  - [ ] Set an active session
  - [ ] Create a recording
  - [ ] Verify recording is associated with active session
  - [ ] Verify recording appears in session details
  - [ ] Test with multiple sessions

**Testing Checkpoint**:
- [ ] Can create a new game session
- [ ] Can see list of game sessions
- [ ] Can select active session
- [ ] Recordings are associated with active session
- [ ] Session info displays correctly

---

## Phase 5: AI Integration 🤖
**Goal**: Add AI-powered transcription and labeling to recordings

**Prerequisites**:
- [ ] Phase 2 complete (recordings working)
- [ ] Phase 4 complete (sessions working)
- [ ] OpenAI API account created (or Claude API)
- [ ] All Phase 4 testing checkpoints passed

### Component Breakdown

#### TranscriptionService
**Location**: `anchor/lib/transcription.ts`

**What it does**: Service to transcribe audio using OpenAI Whisper API

**Functions needed**:
- `transcribeAudio(audioFile: File): Promise<string>`

**How to work with Cursor**: 
- Ask: "Create a transcription service that uses OpenAI Whisper API to transcribe audio files. The function should accept an audio file URL, download it, send it to Whisper API, and return the transcription text."

#### LabelGenerationService
**Location**: `anchor/lib/labelGeneration.ts`

**What it does**: Service to generate AI labels from transcription

**Functions needed**:
- `generateLabels(transcription: string, players: Player[]): Promise<AILabels>`

**AILabels structure**:
```typescript
{
  skill_category: string;
  feedback_type: string;
  players_tagged: string[];
  urgency: string;
  key_phrases: string;
}
```

**How to work with Cursor**: 
- Ask: "Create a label generation service that uses OpenAI GPT-4 API (or Claude) to analyze a transcription and extract: skill category, feedback type, mentioned players, urgency level, and key phrases. Return structured data matching the AILabels type."

#### RecordingProcessing Component
**Location**: `anchor/lib/recordingProcessing.ts`

**What it does**: Orchestrates transcription and label generation after recording

**Functions needed**:
- `processRecording(recordingId: string): Promise<void>`

**How to work with Cursor**: 
- Ask: "Create a recording processing function that: 1) Gets recording from database, 2) Transcribes audio using transcription service, 3) Generates AI labels using label generation service, 4) Updates recording record with transcription and labels."

### Tasks

- [ ] **Set up OpenAI API account**
  - [ ] Go to https://platform.openai.com
  - [ ] Create account (if needed)
  - [ ] Navigate to API Keys section
  - [ ] Create new API key
  - [ ] Copy API key (save securely - won't be shown again)
  - [ ] Note: Keep API key secret, never commit to git

- [ ] **Add OpenAI API key to environment variables**
  - [ ] Open `.env` file in `anchor` folder
  - [ ] Add line: `EXPO_PUBLIC_OPENAI_API_KEY=your_api_key_here`
  - [ ] Replace `your_api_key_here` with actual API key
  - [ ] Verify `.env` is in `.gitignore`
  - [ ] Restart Expo server to load new env variable

- [ ] **Install OpenAI SDK**
  - [ ] Navigate to `anchor` folder
  - [ ] Run: `npm install openai`
  - [ ] Verify package is added to `package.json`

- [ ] **Create TranscriptionService**
  - [ ] Create file: `anchor/lib/transcription.ts`
  - [ ] Import OpenAI SDK
  - [ ] Create transcribeAudio function
  - [ ] Function should accept audio file URL
  - [ ] Download audio file from Supabase Storage
  - [ ] Send audio file to OpenAI Whisper API
  - [ ] Return transcription text
  - [ ] Handle errors
  - [ ] Test transcription function

- [ ] **Create LabelGenerationService**
  - [ ] Create file: `anchor/lib/labelGeneration.ts`
  - [ ] Import OpenAI SDK
  - [ ] Create generateLabels function
  - [ ] Function should accept transcription and players list
  - [ ] Send transcription to OpenAI GPT-4 API with prompt
  - [ ] Request structured output: skill_category, feedback_type, players_tagged, urgency, key_phrases
  - [ ] Parse AI response into AILabels structure
  - [ ] Return structured labels
  - [ ] Handle errors
  - [ ] Test label generation function

- [ ] **Create RecordingProcessing function**
  - [ ] Create file: `anchor/lib/recordingProcessing.ts`
  - [ ] Import transcription and labelGeneration services
  - [ ] Create processRecording function
  - [ ] Function should accept recordingId
  - [ ] Fetch recording from database
  - [ ] Get audio file URL from recording
  - [ ] Call transcribeAudio function
  - [ ] Call generateLabels function with transcription
  - [ ] Update recording record with transcription and labels
  - [ ] Handle errors at each step
  - [ ] Test processing function

- [ ] **Add processing trigger after recording save**
  - [ ] Open RecordingScreen component
  - [ ] After successfully saving recording, call processRecording
  - [ ] Add loading state for processing
  - [ ] Handle processing errors gracefully
  - [ ] Show user feedback when processing completes
  - [ ] Test trigger works

- [ ] **Update recordings table with transcription and labels**
  - [ ] Verify recordings table has transcription column
  - [ ] Verify recordings table has ai_labels column (JSONB)
  - [ ] Update recordingProcessing to save transcription
  - [ ] Update recordingProcessing to save ai_labels as JSON
  - [ ] Test database updates work

- [ ] **Handle processing errors**
  - [ ] Add error handling in transcription service
  - [ ] Add error handling in label generation service
  - [ ] Add error handling in recording processing
  - [ ] Display user-friendly error messages
  - [ ] Log errors for debugging
  - [ ] Test error scenarios

- [ ] **Test transcription accuracy**
  - [ ] Create test recording with known speech
  - [ ] Process recording
  - [ ] Verify transcription matches spoken words
  - [ ] Test with volleyball-specific terminology
  - [ ] Verify transcription is saved correctly

- [ ] **Test label generation accuracy**
  - [ ] Process recordings with known content
  - [ ] Verify skill categories are correct
  - [ ] Verify feedback types are correct
  - [ ] Verify players are extracted correctly
  - [ ] Verify urgency levels are appropriate
  - [ ] Verify key phrases are meaningful

- [ ] **Add loading state during processing**
  - [ ] Add processing state to RecordingScreen
  - [ ] Show loading indicator while processing
  - [ ] Update UI when processing completes
  - [ ] Show success/error messages
  - [ ] Test loading states work correctly

**Testing Checkpoint**:
- [ ] Audio files are transcribed correctly
- [ ] AI labels are generated accurately
- [ ] Transcription saved to database
- [ ] Labels saved to database
- [ ] Processing errors are handled
- [ ] Loading states work correctly

---

## Phase 6: Post-Game Review Interface 📊
**Goal**: Build interface for coaches to review recordings with AI labels

**Prerequisites**:
- Phase 5 complete (AI integration working)
- Recordings have transcriptions and labels

### Component Breakdown

#### ReviewScreen Component
**Location**: `anchor/app/(tabs)/review.tsx` (new tab)

**What it does**: Dashboard showing all recordings from active game session

**Components needed**:
- `FlatList` - Recording list
- `TouchableOpacity` - Recording items
- Filter components (player, skill, feedback type)
- Search bar

**How to work with Cursor**: 
- Ask: "Create a ReviewScreen component that displays recordings from the active game session. Show AI labels (skill, players, feedback type) for each recording. Include filters for player, skill category, and feedback type. Add a search bar to search transcriptions."

#### RecordingDetailScreen Component
**Location**: `anchor/app/(tabs)/review/[id].tsx`

**What it does**: Detailed view of a single recording

**Components needed**:
- Audio player component
- Transcription display (editable)
- AI labels display (editable)
- Manual notes input
- Player tagging
- Status selector (new/reviewed/addressed)

**How to work with Cursor**: 
- Ask: "Create a RecordingDetailScreen component that shows: audio player with play/pause, full transcription (editable), AI labels (editable), manual notes input, player tagging, and status selector. Allow saving changes to Supabase."

#### AudioPlayer Component
**Location**: `anchor/components/AudioPlayer.tsx`

**What it does**: Play/pause audio recordings

**Components needed**:
- `expo-av` Audio component
- Play/pause button
- Progress bar (optional)
- Duration display

**How to work with Cursor**: 
- Ask: "Create an AudioPlayer component using expo-av that can play audio from a URL. Include play/pause button and display duration."

### Tasks

- [ ] **Create ReviewScreen component (Match List View)**
  - [ ] Create file: `anchor/app/(tabs)/review.tsx` (or appropriate location)
  - [ ] Add FlatList to display all matches
  - [ ] Fetch all game sessions from Supabase
  - [ ] Display each match with opponent name as title (e.g., "vs. Lincoln High School - Oct 15, 2024")
  - [ ] Display date for each match
  - [ ] Add click handler to view match details
  - [ ] Style the list
  - [ ] Test match list displays correctly

- [ ] **Create GameSessionDetailScreen component**
  - [ ] Create file: `anchor/app/(tabs)/review/[sessionId].tsx` (or appropriate location)
  - [ ] Accept sessionId as parameter
  - [ ] Fetch all recordings for that session
  - [ ] Display recordings in chronological order
  - [ ] Show AI labels for each recording at a glance
  - [ ] Add post-game summary section
  - [ ] Style the screen
  - [ ] Test session detail view works

- [ ] **Implement fetch recordings for session**
  - [ ] Add fetchRecordings function
  - [ ] Query Supabase for recordings where game_session_id matches
  - [ ] Order by timestamp (chronological)
  - [ ] Include transcription and ai_labels in query
  - [ ] Update recordings state
  - [ ] Handle loading state
  - [ ] Handle errors
  - [ ] Test recordings fetch works

- [ ] **Create RecordingDetailScreen component**
  - [ ] Create file: `anchor/app/(tabs)/review/[sessionId]/[recordingId].tsx` (or appropriate location)
  - [ ] Accept recordingId as parameter
  - [ ] Fetch recording details from database
  - [ ] Display audio player
  - [ ] Display full transcription (editable)
  - [ ] Display AI labels (editable)
  - [ ] Add manual notes input
  - [ ] Add status selector (new/reviewed/addressed)
  - [ ] Style the screen
  - [ ] Test detail view works

- [ ] **Create AudioPlayer component**
  - [ ] Create file: `anchor/components/AudioPlayer.tsx`
  - [ ] Import Audio from expo-av
  - [ ] Add play/pause button
  - [ ] Add audio source from URL
  - [ ] Add duration display
  - [ ] Add progress indicator (optional)
  - [ ] Handle loading state
  - [ ] Handle errors
  - [ ] Style the component
  - [ ] Test audio playback works

- [ ] **Implement filter functionality**
  - [ ] Add filter UI (dropdowns or buttons)
  - [ ] Add filters for: Skill, Feedback Type
  - [ ] Add filter state management
  - [ ] Filter recordings based on selected criteria
  - [ ] Update displayed recordings when filters change
  - [ ] Add "Clear filters" option
  - [ ] Test filters work correctly

- [ ] **Implement search functionality**
  - [ ] Add search bar/TextInput
  - [ ] Add search state
  - [ ] Search transcriptions for keywords
  - [ ] Update displayed recordings based on search
  - [ ] Highlight search terms in results (optional)
  - [ ] Add "Clear search" option
  - [ ] Test search works correctly

- [ ] **Add edit transcription functionality**
  - [ ] Make transcription TextInput editable
  - [ ] Add save button
  - [ ] Update transcription in database on save
  - [ ] Handle save errors
  - [ ] Show success message on save
  - [ ] Test editing transcription works

- [ ] **Add edit labels functionality**
  - [ ] Make AI labels editable (skill_category, feedback_type, etc.)
  - [ ] Add save button
  - [ ] Update ai_labels in database on save
  - [ ] Handle save errors
  - [ ] Show success message on save
  - [ ] Test editing labels works

- [ ] **Add manual notes functionality**
  - [ ] Add TextInput for manual notes
  - [ ] Load existing manual_notes from database
  - [ ] Add save button
  - [ ] Update manual_notes in database on save
  - [ ] Handle save errors
  - [ ] Test manual notes work

- [ ] **Add status update functionality**
  - [ ] Add status selector (dropdown or buttons)
  - [ ] Options: new, reviewed, addressed
  - [ ] Update status in database on change
  - [ ] Handle update errors
  - [ ] Visual indicator for status (colors/icons)
  - [ ] Test status updates work

- [ ] **Add post-game summary**
  - [ ] Create summary component or section
  - [ ] Show most mentioned players
  - [ ] Show most common skill areas
  - [ ] Show positive vs corrective feedback ratio
  - [ ] Show urgent items flagged
  - [ ] Calculate summary from recordings data
  - [ ] Display summary in GameSessionDetailScreen
  - [ ] Test summary displays correctly

- [ ] **Test review flow**
  - [ ] Navigate to review screen
  - [ ] See list of matches
  - [ ] Click on a match
  - [ ] See all recordings for that match
  - [ ] Click on a recording
  - [ ] See recording details
  - [ ] Test navigation flow works

- [ ] **Test audio playback**
  - [ ] Play audio from recording detail screen
  - [ ] Verify audio plays correctly
  - [ ] Test pause/resume
  - [ ] Test multiple recordings
  - [ ] Verify audio URLs are correct

- [ ] **Test editing functionality**
  - [ ] Edit transcription
  - [ ] Edit labels
  - [ ] Add manual notes
  - [ ] Update status
  - [ ] Verify all changes save to database
  - [ ] Verify changes persist after refresh

- [ ] **Test filters and search**
  - [ ] Filter by skill category
  - [ ] Filter by feedback type
  - [ ] Search for keywords in transcriptions
  - [ ] Combine filters and search
  - [ ] Clear filters and search
  - [ ] Verify results update correctly

**Testing Checkpoint**:
- [ ] Can see all recordings from session
- [ ] Can filter by player, skill, feedback type
- [ ] Can search transcriptions
- [ ] Can play audio recordings
- [ ] Can edit transcription
- [ ] Can edit labels
- [ ] Can add manual notes
- [ ] Can tag players
- [ ] Can update status
- [ ] Changes save to database

---

## General Development Tips

### Working with Cursor AI

1. **Be Specific**: Instead of "create a form", say "create a signup form with email, password, and name fields"

2. **Break Down Tasks**: Ask for one component at a time, then integrate them

3. **Ask for Explanations**: If you don't understand something, ask "Explain how [feature] works"

4. **Iterate**: Build basic version first, then add features

5. **Test Frequently**: After each feature, test it before moving on

### Common Cursor Prompts

- "Create a [ComponentName] component that [does X]. Use [specific library/API]. Style it [simply/with Y design]."
- "Integrate [Component] with Supabase to [do X]. Handle errors and show user feedback."
- "Add form validation to [Component] for [specific fields]."
- "Explain how [feature/concept] works in React Native/Expo/Supabase."

### Testing Strategy

- Test on iOS Simulator first (faster iteration)
- Test on physical device before considering feature complete
- Test error cases (no internet, invalid input, etc.)
- Test edge cases (empty lists, long text, etc.)

### Next Steps After MVP

Once MVP is complete, consider:
- Practice planning integration
- Sharing functionality
- Advanced analytics
- Offline mode
- Export functionality
- Multiple sport support
