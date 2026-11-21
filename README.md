# Puddle

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000. Press `R` outside an input to replay the splash.

## Environment Variables

All secrets should be placed in `.env.local`:

- `AUTH_SECRET`: Secret key used by Auth.js to hash tokens and sign cookies (generate with `npx auth secret` or `openssl rand -base64 33`).
- `AUTH_GOOGLE_ID` (or `GOOGLE_CLIENT_ID`): Google OAuth 2.0 Client ID obtained from the Google Cloud Console.
- `AUTH_GOOGLE_SECRET` (or `GOOGLE_CLIENT_SECRET`): Google OAuth 2.0 Client Secret obtained from the Google Cloud Console.
- `GEMINI_API_KEY`: API key for Google Gemini model completions.

Example `.env.local`:

```env
AUTH_SECRET=your-auth-secret-min-32-chars
AUTH_GOOGLE_ID=your-google-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-google-client-secret
GEMINI_API_KEY=your-gemini-api-key
```

## Project structure

- `app/` — Next.js App Router layout, page, and global styles
- `components/` — splash, home shell, mascot, chat, composer, and day-sheet UI
- `lib/` — shared application configuration
