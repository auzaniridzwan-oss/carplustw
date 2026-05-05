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

- Custom event: `page_view` for high-level screen transitions.
- Custom event: `car_search` when users submit rental search criteria (non-PII fields only).
- Custom event: `booking_step_completed` as users progress through car select, add-ons, payment, and confirmation.
- Custom event: `Registration - Completed` for identity capture in the gated flow.
- Custom event: `App_Error` with short message from `AppLogger.error`.
- User attributes: standard profile fields (email, first name, last name, phone if provided), plus demo custom attributes where applicable.

REST profile enrichment for debugging uses **`/api/braze/user-data?id=<external_id>`** (server-side export proxy)—see [Braze REST](https://www.braze.com/docs/api/home/).

## Product chrome

This app currently uses the **full marketing shell** with hero-led entry and a guided booking funnel (not a mobile-only bottom-nav layout). **`?debug=true`** enables a debug drawer for event logs and REST profile checks.

## Why storage instead of URL parameters?

Keeping booking parameters in **`StorageManager`** avoids leaking renter intent into analytics URLs, keeps hashes reserved for routing concerns, and matches the workspace requirement that booking/search state is storage-backed rather than query-param driven.
