# Anchor - Coaching Assistant App

Anchor is a mobile coaching assistant designed to reduce cognitive overload for volleyball coaches during games. The app allows coaches to quickly capture voice memos during matches without breaking their focus, then review and organize these observations after the game with AI-generated labels and insights.

## Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Supabase account (free tier works)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy your Project URL and anon (public) key
4. Create a `.env` file in the `anchor` directory:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Set Up Database

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Run the SQL script from `database-setup.md` to create the necessary tables and policies

See `database-setup.md` for detailed database setup instructions.

### 4. Configure Authentication

1. In Supabase dashboard, go to Authentication > Providers
2. Enable Email provider
3. Configure email settings as needed

### 5. Start the App

```bash
npx expo start
```

In the output, you'll find options to open the app in:

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go) (limited functionality)

## Project Structure

```
anchor/
├── app/                    # Expo Router app directory
│   ├── (auth)/             # Authentication screens
│   │   ├── welcome.tsx     # Welcome/landing screen
│   │   ├── signup.tsx      # Signup screen
│   │   └── login.tsx       # Login screen
│   └── (tabs)/             # Main app screens (protected)
├── components/             # Reusable UI components
├── contexts/               # React contexts (AuthContext, etc.)
├── lib/                    # Utility functions and services
│   ├── supabase.ts         # Supabase client configuration
│   └── auth.ts             # Authentication utilities
└── constants/              # App constants (themes, etc.)
```

## Development

This project uses:
- **Expo Router** for file-based routing
- **Supabase** for backend (auth, database, storage)
- **TypeScript** for type safety
- **React Native** for cross-platform mobile development

You can start developing by editing the files inside the **app** directory.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
