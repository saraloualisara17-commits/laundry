# Web App Synchronization Implementation Prompt

## Context & Goal

You are implementing a series of changes to `laundry_front_V2` — a React 19 + Vite + Tailwind + Redux Toolkit web app for a Moroccan laundry business. The mobile app (`laundry_mobile`) is the source of truth. Your job is to bring the web app's pages, permissions, and shared logic to feature parity with the mobile app.

The backend runs at the URL in `VITE_API_URL` (in dev it's proxied to `''`).  
Backend repo: `laundry-app/` (Spring Boot, JWT auth, STOMP WebSocket).

**Working directory:** `c:\Users\pc\Documents\laundry\laundry_front_V2`

---

## Current Web App Stack

```json
{
  "react": "^19.2.0",
  "react-router-dom": "^7.13.0",
  "@reduxjs/toolkit": "^2.11.2",
  "react-redux": "^9.2.0",
  "axios": "^1.13.5",
  "@stomp/stompjs": "^7.3.0",
  "sockjs-client": "^1.6.1",
  "leaflet": "^1.9.4",
  "react-leaflet": "^5.0.0",
  "lucide-react": "^0.564.0",
  "recharts": "^3.8.0",
  "react-toastify": "^11.0.5",
  "i18next": "^26.0.3",
  "react-i18next": "^17.0.2",
  "tailwindcss": "^3.4.19"
}
```

**No `@tanstack/react-query` installed yet.** Continue using Redux Toolkit thunks + `useSelector` for new pages, matching the existing pattern. Do not add React Query.

---

## Current File Structure (pages)

```
src/pages/
  admin/
    AdminCommandeDetail.jsx   ← detail page for admin
    AdminDashboard.jsx
    AllClients.jsx
    AllCommandes.jsx
    CarpetTypes.jsx           ← DELETE THIS (calls deleted backend endpoints)
    CatalogPage.jsx
    ClientCommandes.jsx
    NotificationsPage.jsx
    UserManagement.jsx
  employe/
    CommandeDetail.jsx        ← detail page for employe
    EmployeDashboard.jsx
    ReturnedOrders.jsx
  livreur/
    CanceledDeliveries.jsx
    CreateOrder.jsx
    DeliveryDetails.jsx       ← detail page for livreur
    LivreurDashboard.jsx
    ReadyForDelivery.jsx
    RegisterClient.jsx
  errors/
    Forbidden.jsx
    NotFound.jsx
    SuspendedAccount.jsx
  public/
    OrderLanding.jsx
```

---

## Current Routes in `src/App.jsx`

```jsx
// Admin routes (role: "admin")
/admin/dashboard
/admin/users-management
/admin/commandes
/admin/commandes/:id        → AdminCommandeDetail.jsx
/admin/clients
/admin/clients/:clientId
/admin/catalog

// Livreur routes (role: "livreur")
/livreur
/livreur/clients
/livreur/orders
/livreur/delivery
/livreur/delivery/:id       → DeliveryDetails.jsx
/livreur/canceled

// Employe routes (role: "employe")
/employe/dashboard
/employe/commandes/:id      → CommandeDetail.jsx
/employe/retours
```

---

## Current `src/api/axios.jsx` (Critical Bug to Fix)

```jsx
import axios from "axios"
import { store } from "../store/store"
import { logOut, setCredentials } from "../store/auth/authSlice"
import { toast } from "react-toastify"

const BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '')

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
})

const refreshApi = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = store.getState()?.auth?.token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 403) {
      // ... redirect to /compte-suspendu or /interdit
    }

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/auth/login") &&
      !originalRequest.url.includes("/auth/refresh")
    ) {
      originalRequest._retry = true
      try {
        const res = await refreshApi.post("/auth/refresh")  // BUG: missing X-Refresh-Token header
        const token = res.data.token
        store.dispatch(setCredentials({ token }))
        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      } catch (err) {
        store.dispatch(logOut())
        localStorage.removeItem('user')
        window.location.href = '/'
        return Promise.reject(err)
      }
    }

    return Promise.reject(error)
  }
)
```

**Bug:** The backend's `POST /auth/refresh` requires the refresh token in a header named `X-Refresh-Token`. The refresh token is stored in Redux state at `store.getState().auth.refreshToken`. The current interceptor sends no such header, so all token refreshes fail with 401 → logout loop.

---

## What You Must Implement

### TASK 1 — Fix Token Refresh Bug

In `src/api/axios.jsx`, when calling `refreshApi.post("/auth/refresh")`, add the refresh token header:

```jsx
const refreshToken = store.getState()?.auth?.refreshToken
const res = await refreshApi.post("/auth/refresh", null, {
  headers: { 'X-Refresh-Token': refreshToken }
})
```

Also store the `refreshToken` returned in the response via `setCredentials`. Check `src/store/auth/authSlice.js` to see what `setCredentials` accepts and what the Redux auth state shape is — add `refreshToken` to the state if it's not already there.

Check `src/routes/PersistLogin.jsx` to understand how tokens are loaded from `localStorage` on page refresh, and ensure `refreshToken` is persisted there too.

---

### TASK 2 — Delete CarpetTypes

1. Delete `src/pages/admin/CarpetTypes.jsx`
2. Remove the import and route for `CarpetTypes` from `src/App.jsx`

The backend endpoints this page called (`/api/carpet-types/**`) have been deleted.

---

### TASK 3 — Create Shared Status Constants

Create `src/constants/statusColors.js`:

```js
export const STATUS_COLORS = {
  PENDING_PICKUP: '#C2185B',
  PICKED_UP: '#D32F2F',
  IN_PROCESS: '#8B5CF6',
  READY_FOR_DELIVERY: '#00897B',
  DELIVERED: '#388E3C',
  CANCELLED: '#94A3B8',
  PICKUP_FAILED: '#EF4444',
  DELIVERY_FAILED: '#F43F5E',
  AU_LOCAL: '#7C3AED',
  PAID_DEBTS: '#388E3C',
}

export const STATUS_LABELS = {
  PENDING_PICKUP: 'En attente',
  PICKED_UP: 'Récupérée',
  IN_PROCESS: 'En traitement',
  READY_FOR_DELIVERY: 'Prête',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
  PICKUP_FAILED: 'Échec Collecte',
  DELIVERY_FAILED: 'Échec Livraison',
  AU_LOCAL: 'Au Local',
  PAID_DEBTS: 'Dettes Payées',
}

export const STATUS_BADGE_STYLES = {
  PENDING_PICKUP:      { bg: 'rgba(194,24,91,0.10)',   border: 'rgba(194,24,91,0.25)',   text: '#C2185B' },
  PICKED_UP:           { bg: 'rgba(211,47,47,0.10)',   border: 'rgba(211,47,47,0.25)',   text: '#D32F2F' },
  IN_PROCESS:          { bg: 'rgba(139,92,246,0.10)',  border: 'rgba(139,92,246,0.20)',  text: '#7C3AED' },
  READY_FOR_DELIVERY:  { bg: 'rgba(0,137,123,0.10)',   border: 'rgba(0,137,123,0.25)',   text: '#00897B' },
  DELIVERED:           { bg: 'rgba(56,142,60,0.10)',   border: 'rgba(56,142,60,0.25)',   text: '#388E3C' },
  CANCELLED:           { bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.20)', text: '#475569' },
  PICKUP_FAILED:       { bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.20)',   text: '#B91C1C' },
  DELIVERY_FAILED:     { bg: 'rgba(244,63,94,0.10)',   border: 'rgba(244,63,94,0.20)',   text: '#BE123C' },
  AU_LOCAL:            { bg: 'rgba(124,58,237,0.10)',  border: 'rgba(124,58,237,0.20)',  text: '#6D28D9' },
}
```

Check if an existing `StatusBadge` component already exists in `src/components/StatusBadge.jsx` — it does, but it may be missing the new statuses. Update it to use `STATUS_BADGE_STYLES` from this new constants file, with a fallback for unknown statuses.

---

### TASK 4 — Create Order Workflow Constants

Create `src/constants/orderWorkflow.js`:

```js
// Valid status transitions
export const ORDER_WORKFLOW = {
  PENDING_PICKUP:     { nextStatus: 'PICKED_UP',           label: 'Confirmer Récupération' },
  PICKED_UP:          { nextStatus: 'IN_PROCESS',          label: 'Démarrer Traitement' },
  IN_PROCESS:         { nextStatus: 'READY_FOR_DELIVERY',  label: 'Marquer Prête',          requiresDriverModal: true },
  READY_FOR_DELIVERY: { nextStatus: 'DELIVERED',           label: 'Marquer Livrée',         requiresDeliveryModal: true },
  DELIVERED:          { nextStatus: null,                  label: 'Livrée',                 disabled: true },
  CANCELLED:          { nextStatus: null,                  label: 'Annulée',                disabled: true },
}

export const isPickupPhase = (status) =>
  status === 'PENDING_PICKUP' || status === 'PICKED_UP'

export const isDelivered = (status) => status === 'DELIVERED'

export const isReadyForDelivery = (status) => status === 'READY_FOR_DELIVERY'
```

---

### TASK 5 — Create `useOrderPermissions` Hook

Create `src/hooks/useOrderPermissions.js`:

```js
import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { isPickupPhase, isDelivered, isReadyForDelivery } from '../constants/orderWorkflow'

/**
 * Returns permission flags for the current user acting on a given order.
 * Mirror of laundry_mobile/src/hooks/useOrderPermissions.ts
 */
export function useOrderPermissions(order) {
  const user = useSelector((state) => state.auth.user)

  return useMemo(() => {
    const role = user?.role?.toUpperCase()

    const isAdmin   = role === 'ADMIN'
    const isEmploye = role === 'EMPLOYE'
    const isLivreur = role === 'LIVREUR'

    const status    = order?.status
    const delivered = isDelivered(status)

    const totalAmount = Math.max(0, Number(order?.montantTotal) || 0)
    const paidAmount  = Math.max(0, Number(order?.montantPaye)  || 0)
    const fullyPaid   = totalAmount > 0 && (totalAmount - paidAmount) <= 0.05

    return {
      isAdmin,
      isEmploye,
      isLivreur,
      canEdit:               (isAdmin || isEmploye || (isLivreur && isPickupPhase(status))) && !delivered,
      canDelete:             isAdmin,
      canAddLaboPhoto:       (isAdmin || isEmploye) && !delivered,
      canAddReceptionPhoto:  (isAdmin || isEmploye || isLivreur) && !delivered,
      canAddPayment:         (isAdmin || isEmploye || isLivreur) && delivered && !fullyPaid,
      canAssignDriver:       (isAdmin || isEmploye) && isReadyForDelivery(status),
      canAssignPickupDriver: (isAdmin || isEmploye) && status === 'PENDING_PICKUP',
    }
  }, [user, order?.status, order?.montantTotal, order?.montantPaye])
}
```

---

### TASK 6 — Create a Shared Order Detail Page

**Why:** Currently `AdminCommandeDetail.jsx`, `CommandeDetail.jsx` (employe), and `DeliveryDetails.jsx` (livreur) each show a subset of the same order. The mobile app has a single `app/order/[id].tsx` that adapts its UI via `useOrderPermissions`. Build a similar shared component for the web.

**What to build:** A new page `src/pages/shared/OrderDetail.jsx` that:

1. **Fetches the order** from `GET /api/admin/commandes/:id` (admin/employe) or use a unified endpoint if the user is livreur (the detail content is the same from `GET /api/commandes/:id` or `/api/admin/commandes/:id` — check which one returns full detail including `tapis`, `client`, `paiements`).

2. **Uses `useOrderPermissions(order)`** to show/hide actions.

3. **Displays:**
   - Order header: `numeroCommande`, status badge, `createdAt`, `modeCommande`
   - Client card: name, phones, address
   - Items table: each `CommandeTapis` with `product.nom`, `quantite`, `modeTarification`, `largeur × hauteur` (if dimensions), `prixFinal`, images (BEFORE/AFTER)
   - Payments section: list of payments + total paid vs total
   - Status history timeline: from `GET /api/commandes/:id/history`
   - Action buttons controlled by `useOrderPermissions`:
     - **Advance status button** — only when `!action.disabled` and user has edit rights. For `IN_PROCESS → READY_FOR_DELIVERY`, show a driver assignment modal first. For `READY_FOR_DELIVERY → DELIVERED`, show a payment confirmation modal.
     - **Add payment button** — only when `canAddPayment`
     - **Delete button** — only when `canDelete`
     - **Assign driver button** — only when `canAssignDriver`
     - **PDF receipt links** — for admin/employe always; for livreur only when delivered
     - **WhatsApp button** — opens `https://wa.me/{phone}?text={whatsappMessage}` (fetch from `GET /api/commandes/:id/receipt/order/whatsapp`)

4. **API calls:**
   - `GET /api/admin/commandes/:id` — full order detail
   - `PATCH /api/commandes/:id/status` — advance status (body: `{ status, amount?, notesPaiement?, paymentIdempotencyKey? }`)
   - `POST /api/commandes/:id/payments` — record payment (body: `{ montant, modePaiement, notesPaiement? }`)
   - `DELETE /api/commandes/:id` — delete (admin only)
   - `PATCH /api/admin/commandes/:id/delivery-driver` — assign delivery driver (body: `{ deliveryDriverId, scheduledDeliveryDate? }`)
   - `GET /api/commandes/:id/history` — status timeline
   - `GET /api/commandes/:id/receipt/order/whatsapp` — whatsapp text
   - PDF links (open in new tab): `{BASE_URL}/api/commandes/:id/receipt/order/pdf?lang=fr` and `/receipt/delivery/pdf?lang=fr`

5. **Register the routes in `App.jsx`** (wrap with appropriate `RequireAuth`):
   ```jsx
   // Shared — accessible by admin, employe, livreur
   <Route element={<RequireAuth allowedRoles={["admin", "employe", "livreur"]} />}>
     <Route path='/orders/:id' element={<OrderDetail />} />
   </Route>
   ```
   Also add role-specific aliases that redirect to the shared page:
   - `/admin/commandes/:id` can keep pointing to `AdminCommandeDetail.jsx` for now (it has extra admin bulk-edit features), OR you can migrate it. Ask the codebase — if `AdminCommandeDetail.jsx` has unique features not in the shared page, keep both.
   - `/employe/commandes/:id` → redirect to `/orders/:id`
   - `/livreur/delivery/:id` → redirect to `/orders/:id`

---

### TASK 7 — Add Employe Order Creation Route

**Why:** On mobile, `EMPLOYE` can create orders (same flow as admin). On web, the employe role has no create-order page.

**What to build:**

Check if `src/pages/admin/AllCommandes.jsx` already has a "Create Order" button/modal. If the order creation form is embedded in `AllCommandes` or a separate admin modal, extract or reuse it.

If there's a separate order creation form/wizard, add this route:
```jsx
<Route element={<RequireAuth allowedRoles={["employe"]} />}>
  <Route path='/employe/commandes' element={<EmployeCommandes />} />
  <Route path='/employe/commandes/new' element={<CreateOrderPage />} />
</Route>
```

**EmployeCommandes page** should show the employe's order list using `GET /admin/commandes` (same endpoint as admin) with pagination and filters — it can reuse the `AllCommandes` component if the role-based action buttons are guarded by `useOrderPermissions`.

Add a link to `/employe/commandes` in the employe navigation sidebar/tabs.

---

### TASK 8 — Add Employe Client Access

**Why:** On mobile, `EMPLOYE` can view and create clients. On web, only admin has `/admin/clients`.

**What to build:**

Add routes:
```jsx
<Route element={<RequireAuth allowedRoles={["employe"]} />}>
  <Route path='/employe/clients' element={<ClientsPage />} />
  <Route path='/employe/clients/:clientId' element={<ClientDetail />} />
</Route>
```

The `AllClients.jsx` and `ClientCommandes.jsx` components likely already work for employe since the backend allows `ADMIN, EMPLOYE` on `GET /api/clients`. Check those components — if they don't have hardcoded admin navigation, simply reuse them for the employe routes. If they do, create thin wrappers or add a `basePath` prop.

Add a "Clients" link to the employe navigation.

---

### TASK 9 — Add Livreur Map Page with Google Maps

**Why:** The mobile app has a map view for livreurs showing their deliveries and pickups as markers. The web has no such page. The user wants **Google Maps API** (not Leaflet) for this page.

**How:** Use the `@react-google-maps/api` library.

**Install:**
```bash
npm install @react-google-maps/api
```

**Google Maps API Key:** The user already has a Google Maps API key in the mobile app environment (it's the same key used in `react-native-maps` with `PROVIDER_GOOGLE`). For the web, add the key to `laundry_front_V2/.env`:
```
VITE_GOOGLE_MAPS_API_KEY=YOUR_KEY_HERE
```
Leave a comment in the file: `# Add your Google Maps API key here`. Do not hardcode any key.

**Build `src/pages/livreur/MapPage.jsx`:**

The page logic mirrors `laundry_mobile/app/(livreur)/map-view.tsx`:

1. Fetch `GET /api/livreur/commandes/ready-for-delivery` and `GET /api/livreur/commandes/pending-pickup` via existing Redux thunks (or add new ones in `src/store/livreur/livreurThunk.js` if they don't exist).

2. Show a Google Map centered on Casablanca (`{ lat: 33.5731, lng: -7.5898 }`) using `@react-google-maps/api`:
   ```jsx
   import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'

   const { isLoaded } = useJsApiLoader({
     googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
   })
   ```

3. **Filter pills** at the top: "Tout", "Livraisons", "Collectes"

4. **Coordinate resolution** (same logic as mobile):
   ```js
   const resolveCoords = (order) => {
     if (order.deliveryLatitude != null && order.deliveryLongitude != null) {
       return { lat: parseFloat(order.deliveryLatitude), lng: parseFloat(order.deliveryLongitude) }
     }
     const addr = order.client?.addresses?.[0]
     if (addr?.latitude && addr?.longitude) {
       return { lat: parseFloat(addr.latitude), lng: parseFloat(addr.longitude) }
     }
     return null
   }
   ```

5. **Markers:** One `<Marker>` per order with GPS coords. Color the marker using the `STATUS_COLORS` constant. Delivery markers use `READY_FOR_DELIVERY` color (`#00897B`), pickup markers use `PENDING_PICKUP` color (`#C2185B`).
   Google Maps doesn't support hex pin colors directly — use a colored SVG icon:
   ```js
   icon: {
     path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
     fillColor: STATUS_COLORS[status],
     fillOpacity: 1,
     strokeWeight: 1,
     strokeColor: '#fff',
     scale: 1.5,
     anchor: { x: 12, y: 22 },
   }
   ```

6. **Click on marker:** Show a bottom info card (positioned absolute bottom) with:
   - Client name
   - Address
   - Amount (for deliveries)
   - Two buttons: "Naviguer" (opens Google Maps directions in new tab: `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`) and "Voir détail" (navigate to `/orders/:id`)

7. **Empty state:** If no orders have GPS coordinates, show a centered message.

**Register the route in `App.jsx`:**
```jsx
<Route element={<RequireAuth allowedRoles={["livreur"]} />}>
  <Route path='/livreur/map' element={<MapPage />} />
</Route>
```

Add a "Carte" link to the livreur navigation/sidebar.

---

### TASK 10 — Add Admin Unpaid/Debt Page

**Why:** The mobile app has an "Unpaid" screen showing clients with outstanding debt. The web has no equivalent.

**API endpoints:**
- `GET /api/admin/unpaid/overview` — returns `{ totalUnpaid: number, clientCount: number }`
- `GET /api/admin/unpaid/clients` — returns list of `{ client: {...}, totalDue: number, commandeCount: number }`
- `GET /api/admin/unpaid/clients/:id` — returns `{ client: {...}, commandes: [{id, numeroCommande, montantTotal, montantPaye, remainingAmount, status}] }`

**Build `src/pages/admin/UnpaidPage.jsx`:**

1. Overview banner: total unpaid amount + number of clients with debt
2. Client list: each row shows client name, phone, total due amount, order count, and a "Voir détail" button
3. Clicking a client opens a modal or sub-page showing their individual unpaid orders with "remaining" column
4. From each order row, link to `/orders/:id`

**Register route in `App.jsx`:**
```jsx
<Route element={<RequireAuth allowedRoles={["admin"]} />}>
  <Route path='/admin/unpaid' element={<UnpaidPage />} />
</Route>
```

Add to admin navigation.

---

### TASK 11 — Add Admin Settings Page

**Why:** The mobile app has a settings page where admin sets app name, logo, and business phone. These are stored on the backend at `GET/PUT /api/admin/settings`.

**API endpoints:**
- `GET /api/admin/settings` — returns `{ appName, logoUrl, businessPhone }`
- `PUT /api/admin/settings` — multipart form: `appName`, `businessPhone`, optional `logo` file

**Build `src/pages/admin/SettingsPage.jsx`:**

1. Load current settings on mount
2. Form with:
   - App name text input (required)
   - Business phone text input
   - Logo: show current logo preview (if `logoUrl` set), a file picker button for new logo upload
3. On save:
   - If new logo selected: first `POST /api/upload` with the file (multipart), get back `{ filename }`, then use that filename in the settings PUT
   - PUT to `/api/admin/settings` with `{ appName, businessPhone, logoUrl: filename_or_existing }`
4. Show success/error toast

**Register route:**
```jsx
<Route element={<RequireAuth allowedRoles={["admin"]} />}>
  <Route path='/admin/settings' element={<SettingsPage />} />
</Route>
```

Add to admin navigation.

---

### TASK 12 — Update Navigation for Each Role

After adding new routes, update the navigation sidebar/menu for each role:

**Admin navigation** — add:
- "Impayés" → `/admin/unpaid`
- "Paramètres" → `/admin/settings`

**Employe navigation** — add:
- "Commandes" → `/employe/commandes`
- "Clients" → `/employe/clients`

**Livreur navigation** — add:
- "Carte" → `/livreur/map`

Find the navigation component(s) — likely in `src/components/layout/` — and add these links, each guarded by role (check what role the current user is via `useSelector(state => state.auth.user?.role)`).

---

## Important Constraints

1. **Do not use `@tanstack/react-query`** — the project uses Redux Toolkit thunks. New thunks go in the relevant slice file (`src/store/admin/adminThunk.js`, `src/store/livreur/livreurThunk.js`, etc.)

2. **Use Tailwind CSS** for all styling — no inline styles, no CSS modules unless already used in the file you're editing.

3. **Use `lucide-react`** for icons (already installed). Do not add other icon libraries.

4. **Use existing `api` axios instance** from `src/api/axios.jsx` for all HTTP calls inside thunks.

5. **Do not modify the backend.** All API endpoints already exist.

6. **Token refresh fix (Task 1) is the highest priority** — without it, users get logged out after 1 hour and cannot refresh. Fix this first.

7. **For Google Maps**, leave the API key as `import.meta.env.VITE_GOOGLE_MAPS_API_KEY` — do not hardcode it. Tell the user to add their key to `.env`.

8. **Status badge component** — there is an existing `src/components/StatusBadge.jsx`. After creating the `statusColors.js` constants file (Task 3), update `StatusBadge` to use it so all roles see consistent colors.

9. **For the shared OrderDetail page (Task 6)**, check `src/store/admin/adminThunk.js` for an existing `fetchCommandeById` thunk before creating a new one.

10. **Maintain French UI language** throughout — the app is primarily French (with Arabic i18n support via i18next). All new UI labels should be in French.

---

## Verification Checklist

After implementation, verify:

- [ ] Token refresh sends `X-Refresh-Token` header — test by waiting for token expiry or manually triggering a 401
- [ ] `CarpetTypes.jsx` deleted and its route removed from `App.jsx`
- [ ] `STATUS_BADGE_STYLES` covers all 9 statuses including PICKUP_FAILED, DELIVERY_FAILED, AU_LOCAL
- [ ] `useOrderPermissions` hook returns correct flags for admin/employe/livreur on a delivered vs active order
- [ ] Shared `/orders/:id` route accessible by all 3 roles
- [ ] Employe can reach `/employe/commandes` (order list) and `/employe/clients`
- [ ] Livreur can reach `/livreur/map` and sees Google Maps (not Leaflet)
- [ ] Admin can reach `/admin/unpaid` and `/admin/settings`
- [ ] All new routes are inside `<RequireAuth allowedRoles={[...]} />` with correct roles
- [ ] Navigation links added for all new pages
- [ ] No Leaflet imports on the new map page — it uses `@react-google-maps/api` only
