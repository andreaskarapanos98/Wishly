# Wishly

A private wishlist app for you and your friends. Add what you'd love to receive, browse your friends' wishlists, and tap **"I'll buy it"** to claim a gift. Everyone else sees that it's taken, but the birthday person never does.

**Stack:** React + Vite (static, hosted on GitHub Pages) · [Clerk](https://clerk.com) for Google sign-in · [Supabase](https://supabase.com) Postgres with Row Level Security. There's no custom backend: the browser talks to Supabase directly, and database policies decide who can do what.

## Features

- **Landing page** for people who aren't signed in yet
- **My wishlist**: add, edit and remove wishes (link, price, image, notes, priority) and set your birthday
- **People**: everyone who has signed in, sorted by upcoming birthday
- **Friend's wishlist**: claim a gift with "I'll buy it", see who's buying what, undo your own claim
- **Gifts I'm buying**: your shopping list across all friends
- **Surprise protection**: the database never returns claims on your own items (enforced in RLS, not just hidden in the UI)

## How the security works

| Table | Read | Write |
| --- | --- | --- |
| `profiles` | any signed-in user | only your own row |
| `wishlist_items` | any signed-in user | only your own items |
| `claims` | everyone **except the item's owner** | claim others' items only, delete only your own claims |

Clerk issues a session token, and Supabase verifies it through its Clerk third-party auth integration. The policies use the token's `sub` (the Clerk user id). See [`supabase/schema.sql`](supabase/schema.sql).

## Setup

### 1. Clerk (sign-in)

1. Create an application at [dashboard.clerk.com](https://dashboard.clerk.com). Under sign-in options, enable **Google** only.
2. Open the [Supabase integration setup](https://dashboard.clerk.com/setup/supabase), pick your app and click **Activate Supabase integration**. Copy the **Clerk domain** it shows.
3. Copy your **Publishable key** from **API keys**.

### 2. Supabase (database)

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Go to **Authentication → Sign In / Providers → Third-Party Auth → Add provider → Clerk** and paste the Clerk domain.
3. Open **SQL Editor**, paste all of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
4. From **Project Settings → API** (or the **Connect** button), copy the **Project URL** and the **Publishable key** (the older "anon" key works too).

### 3. Run locally

```bash
cp .env.example .env.local   # then fill in the three values
npm install
npm run dev
```

Open http://localhost:5173.

### 4. Deploy to GitHub Pages

1. Push this folder to a GitHub repository (e.g. `Wishly`).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. **Settings → Secrets and variables → Actions → Variables** tab: add `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. These are public keys, so variables are fine.
4. Push to `main`. The workflow builds and publishes to `https://<your-username>.github.io/<repo>/`.

> **About Clerk on github.io:** a Clerk *development* instance (`pk_test_…`) works on any domain, including github.io. It shows a small "Development mode" badge and has generous limits, which is fine for a group of friends. A *production* instance (`pk_live_…`) requires a domain you own. If you buy one later, add it as a custom domain in GitHub Pages and create the production instance in Clerk.

## Project structure

```
src/
  App.jsx              routes + providers (Clerk, Supabase, toasts)
  lib/
    api.js             every database query
    supabase.jsx       Supabase client signed with the Clerk session token
    profile.jsx        syncs the Clerk user into `profiles`
    format.js          prices, birthdays, names
  components/          Item cards, forms, modal, layout
  pages/               Landing, MyWishlist, People, Person, Gifts
  styles/global.css    design tokens + all styles
supabase/schema.sql    tables, indexes and RLS policies
```
