# Carplus Taiwan Rental Demo

## Overview

Carplus Taiwan Rental Demo is a single-page web app that showcases an end-to-end **car rental journey**: search by pickup location and dates, browse available cars, select add-ons, complete payment details, and confirm the booking. The app keeps journey state in browser storage (not URL query params) so users can move between steps without leaking booking data into route strings.

The UI currently runs as a hash-routed SPA and emphasizes a conversion-oriented flow from search to confirmation with demo-safe data only.

## Tech Stack

- **UI:** HTML5, Tailwind CSS, [Flowbite](https://flowbite.com/) (modal, inputs, utility components)
- **Icons:** [Font Awesome kit `a21f98a3f6`](https://kit.fontawesome.com/a21f98a3f6.js)
- **Marketing:** [Braze Web SDK](https://www.braze.com/docs/developer_guide/sdk_integration/?sdktab=web) (`@braze/web-sdk`)
- **Hosting:** [Vercel](https://vercel.com/auzani-ridzwans-projects) (static Vite build + `/api` serverless)

## Setup

1. **Clone** the repository from [GitHub — carplustw](https://github.com/auzaniridzwan-oss/carplustw.git).
2. **Install:** `npm ci` (or `npm install`).
3. **Environment:** Copy [`.env.example`](.env.example) to `.env` and set:
   - `VITE_BRAZE_SDK_KEY` — Web SDK key (safe for bundling into client).
   - `VITE_BRAZE_SDK_URL` — SDK endpoint host (e.g. `sdk.iad-03.braze.com`).
   - **Never** put the REST API key in `VITE_*` variables.
4. **Dev server:** `npm run dev` → Vite (default [http://localhost:5173](http://localhost:5173)).
5. **Full-stack local API:** For `/api/braze/user-data`, run [`vercel dev`](https://vercel.com/docs/cli/dev) (often on port 3000) so the proxy exists; Vite is configured to forward `/api` to `http://127.0.0.1:3000`. Without it, the debug REST panel returns network errors locally—that is expected.
6. **Lint / build:** `npm run lint`, `npm run lint:css`, `npm run build`.

### Vercel

Import the GitHub repo into the [auzani-ridzwans-projects](https://vercel.com/auzani-ridzwans-projects) team. Set:

- **Framework:** Vite; **output:** `dist`.
- **Environment variables:** same `VITE_*` as local; plus **server-only** `BRAZE_REST_API_KEY` and `BRAZE_REST_API_URL` (REST base URL, e.g. `https://rest.iad-01.braze.com`).

## Architecture

- **`StorageManager`** — All persisted keys use the `ar_app_` prefix; the API takes the **suffix only** (e.g. `booking_search`, `user_id`).
- **`AppLogger`** — Ring buffer, console output, `getLogs()` for the last 50 entries; **no PII** in log lines. **ERROR** also fires Braze **`App_Error`** (message truncated).
- **`BrazeManager`** — Singleton-style wrapper: `initialize`, `login` / `completeRegistration`, `logCustomEvent`, `subscribe` / `notify` (e.g. **`EVENT_LOGGED`** for the debug overlay).
- **Hash SPA** — Main flow is rendered through app-level steps from rental search to thank-you confirmation.
- **Booking state** — Validated payload and step context are stored through `StorageManager` so refreshes and step transitions are resilient in demo mode.

## Braze: events and attributes (demo)

These names match what the app sends today (search the dashboard for exact strings):

- Custom event: `ecommerce.cart_updated` — rental search / cart context updates in the funnel.
- Custom event: `ecommerce.product_viewed` — car detail views.
- Custom event: `ecommerce.checkout_started` — moving into checkout-style steps.
- Custom event: `ecommerce.order_placed` — completed booking confirmation.
- Custom event: `Registration - Completed` — successful registration (from `BrazeManager.completeRegistration`).
- Custom event: `App_Error` — short message from `AppLogger.error` (via `main.js` hook).
- User attributes: standard profile fields on registration (email, first name, last name, phone if provided), plus demo custom attributes from registration.

REST profile enrichment for debugging uses **`/api/braze/user-data?id=<external_id>`** (server-side export proxy)—see [Braze REST](https://www.braze.com/docs/api/home/).

### Troubleshooting (missing events / empty User Event Tracing)

1. **`VITE_*` at build time:** Vite inlines `VITE_BRAZE_SDK_KEY` and `VITE_BRAZE_SDK_URL` when you run `npm run build`. Set them in Vercel for **Production** (and **Preview** if you test previews), then **redeploy**. Empty values skip initialization and log a `[SDK]` warning in the console.
2. **Cluster match:** `VITE_BRAZE_SDK_URL` must be the SDK endpoint host for the same Braze app as your Web SDK key (e.g. `sdk.iad-03.braze.com` from **Manage Settings**).
3. **Network:** In DevTools → Network, confirm requests to `sdk.*.braze.com`. Ad blockers or proxies can block them.
4. **SDK logs (local):** With `npm run dev`, Braze SDK verbose logging is enabled (`enableLogging` in `BrazeManager`). Watch the browser console for init/session messages.
5. **Fire events:** Custom events above fire when users move through the booking funnel or complete registration—not on every page load alone.

## Product chrome

This app currently uses the **full marketing shell** with hero-led entry and a guided booking funnel (not a mobile-only bottom-nav layout). **`?debug=true`** enables a debug drawer for event logs and REST profile checks.

## Why storage instead of URL parameters?

Keeping booking parameters in **`StorageManager`** avoids leaking renter intent into analytics URLs, keeps hashes reserved for routing concerns, and matches the workspace requirement that booking/search state is storage-backed rather than query-param driven.
