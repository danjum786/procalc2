# ProjectScoutIQ - GHL Marketplace Wrapper (Supabase backend)

Install → access request form → owner approval (email) → calculator gate, on Express + Supabase.

This version replaces the earlier MySQL setup entirely. Supabase is accessed over HTTPS with an
API key, not a raw database connection - this avoids all of the host/network/grant issues that
came up trying to reach Hostinger's MySQL from this Node hosting environment.

## 1. Create the Supabase project

1. Go to https://supabase.com → sign up / log in → **New project**
2. Pick any name (e.g. `projectscoutiq`), set a database password (you won't need to type this
   anywhere in this app - Supabase handles the connection internally), choose a region close to
   your users, click **Create new project** (takes ~2 minutes to provision).

## 2. Create the table

1. In the Supabase dashboard, left sidebar → **SQL Editor** → **New query**
2. Paste the entire contents of `db/schema.sql` → **Run**
3. Confirm: left sidebar → **Table Editor** → you should see the `installs` table

## 3. Get your API credentials

1. Left sidebar → **Settings** (gear icon) → **API**
2. Copy:
   - **Project URL** → this is `SUPABASE_URL`
   - **service_role** key (NOT the `anon`/`public` key - this app needs the service role key
     because it's a trusted backend, not a browser app) → this is `SUPABASE_SERVICE_KEY`

**Keep the service role key secret.** It bypasses all Row Level Security. Never put it in
frontend code or commit it to git - only in environment variables on the server.

## 4. Initialize git and push to GitHub

```bash
cd demoapp
git init
git add .
git commit -m "Rebuild on Supabase backend"
```

Create a **private** GitHub repo, then:

```bash
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git branch -M main
git push -u origin main
```

`.env` is gitignored - only `.env.example` (no real secrets) gets committed.

## 5. Deploy to Hostinger

1. Import the repo into your Hostinger Node.js app (same flow as before: Framework preset
   **Express**, branch `main`, Node version 22.x)
2. In the app's **Environment variables** panel, add every value from `.env.example`, filled in
   with your real values:

| Key | Where to get it |
|---|---|
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API (service_role key) |
| `GHL_CLIENT_ID` | GHL Marketplace → your app → Advanced Settings → Auth |
| `GHL_CLIENT_SECRET` | Same screen |
| `GHL_REDIRECT_URI` | `https://<your-domain>/oauth/callback` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Hostinger hPanel → Emails |
| `OWNER_EMAIL` | Wherever access-request emails should be sent |
| `APP_BASE_URL` | Your Hostinger app's domain |
| `CALCULATOR_URL` | `https://<your-domain>/dummy-calculator.html` for now |
| `APPROVE_TOKEN_SECRET` | Any long random string |
| `PORT` | `3000` |

**Note on special characters in passwords:** if entering values as individual panel fields, do
NOT wrap them in quotes - enter the raw value exactly. Quotes are only needed if importing a raw
`.env` file, where `#` starts a comment and would otherwise truncate the value.

3. Deploy, then restart the app if it doesn't restart automatically after saving env vars.

## 6. Register the app in the GHL Marketplace developer portal

(Skip if already done in a previous attempt - same values apply.)

1. **Redirect URI**: `https://<your-domain>/oauth/callback`
2. **Custom Menu Link**: `https://<your-domain>/` (iframe mode)
3. **Scopes**: `contacts.readonly`, `contacts.write` (add `locations.readonly` if you want it,
   not strictly required since `locationId` already comes through the OAuth response)

## 7. Test end to end

1. Visit `https://<your-domain>/?locationId=test123` directly - should show the access request
   form (not a spinner or error)
2. Submit it → check **Supabase → Table Editor → installs** for a new `pending` row
3. Check that the owner notification email arrived with Approve/Reject buttons
4. Click **Approve** → row flips to `approved`, builder gets confirmation email, reloading the
   URL shows the calculator placeholder
5. Repeat with a different fake `locationId` and click **Reject** to confirm that path too
6. Once the above all works, install the app for real on a GHL test sub-account to confirm the
   full OAuth → real `locationId` → menu link flow

## 8. Swapping in the real calculator

Once Web Systems hands off the real calculator URL, update `CALCULATOR_URL` in your environment
variables and restart. Nothing else changes.

## Notes

- The polling interval on the pending screen is 15 seconds (`public/app.js`, `startPolling`).
- Approve/reject links in the owner email are single-use (token cleared after a decision).
- All Supabase calls are wrapped with error handling that logs and returns a clean HTTP error
  instead of crashing the process - check Hostinger's Runtime Logs for `Supabase error in ...`
  messages if something isn't working, rather than guessing.
