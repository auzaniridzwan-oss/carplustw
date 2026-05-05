# Existing Application Understanding Baseline

## Application purpose
This project is a Vite-powered SPA that simulates a Singapore Airlines-style booking journey. It supports hash-based navigation, authenticated search gating, persisted booking state, Braze engagement/attributes, and live-or-fallback flight result loading.

## 1) Entrypoints and bootstrap sequence
- `index.html` hosts the app root and loads `/src/main.js`.
- `src/main.js` imports styles and app dependencies, wires AppLogger error forwarding to Braze (`App_Error` custom event), then calls `bootstrapApp()`.
- `src/app.js` owns application orchestration through `bootstrapApp()`, `render()`, route handlers, and event binding.

Startup order:
1. Browser loads `index.html`.
2. Module execution starts in `src/main.js`.
3. `bootstrapApp()` runs in `src/app.js`.
4. Braze initializes and session is synchronized from persisted storage.
5. Hash route guards normalize route state, then initial view rendering occurs.

## 2) Runtime flow (routing, auth gate, search, results)
Hash routes:
- `/#/home`
- `/#/search-results`

Primary flow:
1. App boots to Home (or normalizes invalid hash to Home).
2. Home view renders booking controls, shell, highlights, and modals.
3. User clicks Search.
4. Booking payload is built and validated (`src/logic/bookingPayload.js`).
5. If user identity is missing, app blocks search and opens registration flow.
6. After login/registration (or if already authenticated), `runSearchAfterAuth` executes:
   - persists current `booking_search`
   - sends Braze attributes + event telemetry
   - fetches flights from `/api/serpapi/flights` via frontend service
   - falls back to local demo flights when live fetch fails
   - persists `booking_last_results`
7. App navigates to Search Results and renders persisted result rows.
8. Results route is guarded; missing or invalid `booking_search` redirects to Home.

## 3) State, storage, logging, and integrations
### Storage model
All persisted client state is centralized in `src/managers/StorageManager.js` using `ar_app_` key prefix.

Observed keys:
- `user_id`
- `user_session`
- `booking_search`
- `booking_last_results`
- `debug_launcher_hidden`
- `debug_mode`

### Logging model
`src/managers/AppLogger.js` is the centralized logger:
- supports `INFO`, `DEBUG`, `WARN`, `ERROR`
- stores rolling log history and exposes `getLogs()`
- forwards critical errors through a hook in `src/main.js` to Braze event `App_Error`

### Braze integration
`src/managers/BrazeManager.js` handles SDK lifecycle:
- initialize SDK, user sync (`changeUser`), session control
- custom events such as `page_view`, `sia_searched_flight`, `Registration - Completed`, `App_Error`
- custom attributes for registration profile and last search values
- in-app message subscription and event broadcast for UI personalization

`src/managers/BrazeRestManager.js` calls the backend proxy for profile inspection via `/api/braze/user-data`.

### Flight data integration
Frontend service: `src/services/serpapiFlightsClient.js`  
Backend proxy: `api/serpapi/flights.js` (plus related fares/trend endpoints)

Behavior:
- tries live SerpAPI-backed data first
- gracefully degrades to local demo datasets when unavailable

## 4) Functional boundaries and constraints
- Implemented views: Home and Search Results.
- Booking stepper UI exists in results (`Flights`, `Passengers`, `Review`, `Payment`) but downstream booking workflow is not fully implemented.
- Search constraints currently enforced:
  - origin fixed to `SIN`
  - destination whitelist: `NRT`, `LHR`, `SYD`
- Search context is storage-driven, not URL query-driven for core SPA behavior.

## 5) Reuse baseline for new index.html-based application
Carry forward first:
1. `StorageManager` conventions (prefixed keys + centralized persistence access).
2. `AppLogger` centralized logging and error forwarding pattern.
3. Booking payload validation strategy and guardrails.
4. Braze event/attribute naming where continuity across analytics/engagement is desired.
5. API proxy contracts for Braze and SerpAPI unless intentionally simplified.

Implementation decisions to make in the next phase:
- Keep SPA hash routing versus move to a new static/multi-page page model.
- Reuse current component modules versus rebuild markup-first templates.
- Preserve or narrow current endpoint surface (`/api/serpapi/*`, `/api/braze/user-data`).
