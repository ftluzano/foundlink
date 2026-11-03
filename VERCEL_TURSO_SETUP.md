# Turso on Vercel

Add these server-side environment variables in the Vercel project settings:

- `TURSO_DATABASE_URL`: the database URL from Turso, usually `libsql://...`.
- `TURSO_AUTH_TOKEN`: the database auth token from Turso. Do not prefix it with `VITE_`.
- `FIREBASE_PROJECT_ID`: the Firebase project ID used by Firebase Auth (`foundlink-e6a36` for this project).

The Vercel function at `/api/data` creates its `app_records` table automatically. Firebase Auth remains responsible for sign-in; the function verifies Firebase ID tokens before allowing protected reads and writes. The Turso URL and token are only read by the server function and are never included in the browser bundle.

The app polls the API for updates every 10 seconds. Existing Firestore records are not copied automatically; import any records you need into Turso before switching production traffic.