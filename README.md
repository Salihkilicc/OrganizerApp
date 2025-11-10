# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

```bash
npx expo start
```

### Configure Supabase

1. Copy `.env.example` to `.env` (or your preferred env file that Expo loads) and paste the Supabase project credentials from [your dashboard](https://mcp.supabase.com/mcp?project_ref=omspbmogkplnklfzgotk).
2. Restart Expo so `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are available at runtime.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

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

## Supabase Auth (Dev vs Prod)

1. **Google Cloud Console → OAuth Client (Web)**
   - Create a Web client and add the following Authorized redirect URI: `https://<PROJECT-REF>.supabase.co/auth/v1/callback`.
2. **Supabase Dashboard → Authentication → URL Configuration**
   - **DEV**: Paste the exact string logged by `getDevRedirect()` (looks like `https://auth.expo.io/@<your-user>/<your-slug>`). The root layout logs `DEV redirect: ...` in development for easy copy/paste.
   - **PROD**: Paste the exact string logged by `getProdRedirect()` (for this app it resolves to `organizer://redirect` by default, or a path you set if you change the helper).

### Troubleshooting

- **`redirect_to is not allowed`** → Add the exact redirect string (copy it from the dev logs) under Supabase Redirect URLs.
- **`Google redirect_uri_mismatch`** → Ensure the Google OAuth client uses the Supabase callback URL (`https://<PROJECT-REF>.supabase.co/auth/v1/callback`).
- **Session not persisting** → Confirm both `supabase.auth.getSession()` and the `onAuthStateChange` subscription run on app start (already wired in `store/useAuth.ts`).
