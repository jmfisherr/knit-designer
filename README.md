# Knit Designer

Local Next.js scaffold for designing knitwear patterns on a grid.

Deployed testing URL: https://knit-designer.vercel.app/

Example exported PDF:<br>
<img src="/public/export-thumbnail.png" alt="Example of pdf chart export from application" width="350"/>

Example knit from exported chart:<br>
<img src="/public/example-knit.jpeg" alt="Example of actual knit project using a chart exported from the application" width="350"/>

Getting started:

```bash
cd knit-designer
npm install
npm run dev
```

The app exposes a simple API at `/api/projects` that saves JSON files to `data/projects`.

Authentication
--------------
This project supports signing in with Google or email (magic link) using NextAuth.

Required environment variables (local development):

- `NEXTAUTH_URL` — e.g. `http://localhost:3000`
- `NEXTAUTH_SECRET` — a random secret (e.g. `openssl rand -base64 32`)
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` — for Google OAuth (optional)
- `EMAIL_SERVER` and `EMAIL_FROM` — SMTP server info for email magic link (optional)

For Vercel deployment, set these environment variables in your Vercel project settings:

- `NEXTAUTH_URL` — your deployed URL (e.g. `https://knit-designer.vercel.app`)
- `NEXTAUTH_SECRET` — same as local
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` — same as local
- `DATABASE_URL` — if using database features

Google OAuth Setup
------------------
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - For local: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://knit-designer.vercel.app/api/auth/callback/google`
6. Copy Client ID and Client Secret to environment variables

Vercel Deployment Setup
-----------------------
1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. In Vercel project settings, add these environment variables:
   - `NEXTAUTH_URL`: `https://knit-designer.vercel.app`
   - `NEXTAUTH_SECRET`: (same as local)
   - `GOOGLE_CLIENT_ID`: (from Google Cloud Console)
   - `GOOGLE_CLIENT_SECRET`: (from Google Cloud Console)
   - `DATABASE_URL`: (optional - remove if you don't want database-backed sessions)

Debug Steps for Production Issues
---------------------------------
1. Check environment variables: Visit `https://knit-designer.vercel.app/api/debug/env`
2. Check auth providers: Visit `https://knit-designer.vercel.app/api/auth/providers`
3. Check Vercel function logs in the Vercel dashboard
4. If you see database errors, try removing `DATABASE_URL` from Vercel environment variables (the app uses file storage for projects)

Email (magic link) setup
------------------------
If you want email sign-in (magic links), NextAuth requires a database adapter (we recommend Prisma + SQLite for local dev). Steps:

1. Install dependencies: `npm install prisma @prisma/client next-auth @next-auth/prisma-adapter nodemailer`
2. Add `DATABASE_URL="file:./dev.db"` to `.env.local` and run `npx prisma init` and `npx prisma db push` after adding a minimal schema.
3. Update `pages/api/auth/[...nextauth].js` to import and use `PrismaAdapter` and add the EmailProvider with your `EMAIL_SERVER` and `EMAIL_FROM` variables.

If you don't want to add a DB, you can use Google sign-in only (no extra setup required).

Example `.env.local`:

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=change_this_to_a_secure_value
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
EMAIL_SERVER=smtp://user:pass@smtp.example.com:587
EMAIL_FROM=Your App <no-reply@example.com>
```

Notes:
- When signed in, projects are saved under `data/projects/<sanitized_user_email>/` and only visible to that account.
- For a simple email sign-in without passwords we use NextAuth's Email provider (magic links). If you want traditional email/password authentication, I can add a credentials provider and a minimal user database (recommended: SQLite + Prisma).

