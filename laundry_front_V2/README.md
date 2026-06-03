# Astra Propre — Public Customer Site

Static landing page + 4-step anonymous order wizard for the Astra Propre
laundry service. This is the customer-facing surface only — staff use
the separate mobile app for order management.

## What it does

- **Landing page (`/`)** — marketing, category cards, "Start an order" CTA
- **Order wizard (`/order/wizard`)** — 4 steps:
  1. Select items from the product catalog
  2. Enter contact info + delivery location (with Leaflet map picker)
  3. Review the order
  4. Confirm → success screen with order reference number

No login. No accounts. No client-side state survives a page refresh
beyond what's needed inside a single wizard session.

## Backend dependency

Talks to the Spring Boot backend via two endpoints:

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/api/public/catalog/categories` | List active categories + their products |
| `POST` | `/api/public/orders`             | Submit a new anonymous order |

Images served at `/uploads/...` are also proxied to the backend.

## Tech stack

- **React 19** + **Vite 7** + **Tailwind CSS 3**
- **react-router-dom 7** (just `/` and `/order/wizard`)
- **react-i18next** with FR + AR locales (RTL handled at `<html dir>` level)
- **Leaflet** for the location picker (OpenStreetMap, no API key needed)
- **Axios** for the two API calls

No Redux, no React Query, no WebSocket — keeps the bundle and the
attack surface small.

## Development

```bash
# Install (one-time)
npm install

# Run dev server (proxies /api and /uploads to backend)
npm run dev

# Build for production
npm run build
# Output goes to dist/ — upload contents to /var/www/laundry/ on the VPS
```

Set `VITE_API_URL` to point dev/build at a non-localhost backend:

```bash
VITE_API_URL=https://api.astrapropre.ma npm run build
```

## Deployment

The `dist/` folder is a fully static bundle. Drop it in Nginx's
document root (e.g. `/var/www/laundry/`). The `deploy/nginx.conf` at
the repository root is already configured to serve it and proxy
`/api` + `/uploads` to the Spring Boot backend.

## Project structure

```
src/
├── api/publicApi.js         Two-function API client
├── lib/imageUrl.js          /uploads/* URL helper
├── pages/public/            All 7 page components
├── i18n/                    FR + AR translation files
├── App.jsx                  3 routes total
├── main.jsx                 React + i18n bootstrap
└── index.css                Tailwind directives + leaflet css
```
