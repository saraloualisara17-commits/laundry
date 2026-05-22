# Laundry App — Project Documentation

## Project Overview

A full-stack laundry management system for a Moroccan laundry business ("Astra Pro"). It manages the complete lifecycle of customer orders: pickup, washing/processing, delivery, and payment tracking. Three distinct user roles drive the UX: **Admin** (full control), **Employé** (order/client management), and **Livreur** (delivery driver view).

The system is bilingual (French/Arabic), supports offline queueing, real-time WebSocket updates, image uploads with compression, and generates PDF receipts and WhatsApp messages.

---

## Technology Stack

### Backend — `laundry-app/`
| Layer | Technology |
|---|---|
| Language | Java 23 |
| Framework | Spring Boot 3.4.1 |
| Build | Maven |
| Database | MySQL (Flyway migrations in prod) |
| ORM | Spring Data JPA / Hibernate |
| Auth | JWT (JJWT 0.12.6) + BCrypt |
| Mapping | MapStruct 1.6.3 |
| Validation | Jakarta Validation + custom `@ValidMoroccanPhone` |
| WebSocket | Spring WebSocket + STOMP |
| PDF | iText html2pdf 4.0.5 |
| QR Code | ZXing 3.5.3 |
| AOP | Spring AOP (performance monitoring) |
| Testing | JUnit 5, ArchUnit |

### Frontend — `laundry_mobile/`
| Layer | Technology |
|---|---|
| Framework | React Native 0.81.5 + Expo ~54.0.33 |
| Language | TypeScript 5.9.2 |
| Navigation | Expo Router ~6.0.23 (file-based) + React Navigation 7 |
| State | Redux Toolkit 2.3.0 + React Query 5.59.16 |
| HTTP | Axios 1.7.7 (with request/response interceptors) |
| Real-time | @stomp/stompjs 7.3.0 |
| Auth storage | expo-secure-store ~15.0.8 |
| Internationalization | i18next 23.15.1 (FR/AR) |
| Maps | react-native-maps 1.20.1 |
| Notifications | expo-notifications ~0.32.17 |
| Camera/Images | expo-camera, expo-image-picker |
| Animations | react-native-reanimated ~4.1.1 |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mobile App (Expo)                         │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                       │
│  │  (admin) │  │(livreur) │  │(employe) │  ← Role-gated routes  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                       │
│       │              │              │                             │
│  ┌────▼──────────────▼──────────────▼──────┐                    │
│  │         Redux Store + React Query         │                    │
│  │  auth | admin | livreur slices            │                    │
│  └────────────────┬─────────────────────────┘                    │
│                   │                                               │
│  ┌────────────────▼─────────────────────────┐                    │
│  │      Axios Client (JWT interceptors)      │                    │
│  │      Offline Queue + Upload Manager       │                    │
│  │      STOMP WebSocket Client               │                    │
│  └────────────────┬─────────────────────────┘                    │
└───────────────────┼─────────────────────────────────────────────┘
                    │ HTTP / WebSocket
┌───────────────────▼─────────────────────────────────────────────┐
│                   Spring Boot API (Port 8080)                     │
│                                                                   │
│  ┌───────────┐  ┌──────────────┐  ┌─────────────────────────┐   │
│  │  Security  │  │  Controllers  │  │    WebSocket Broker      │   │
│  │  JWT Auth  │  │  REST APIs   │  │  /topic /queue /user     │   │
│  └───────────┘  └──────┬───────┘  └─────────────────────────┘   │
│                         │                                         │
│  ┌──────────────────────▼──────────────────────────────────────┐ │
│  │                      Services (Domain)                        │ │
│  │  CommandeCreation | CommandeWorkflow | CommandePayment        │ │
│  │  CommandeQuery | ProductCatalog | ClientService               │ │
│  │  UnpaidService | NotificationService | FileStorageService     │ │
│  └──────────────────────┬──────────────────────────────────────┘ │
│                         │                                         │
│  ┌──────────────────────▼──────────────────────────────────────┐ │
│  │                Spring Data JPA Repositories                   │ │
│  └──────────────────────┬──────────────────────────────────────┘ │
└───────────────────────────┬────────────────────────────────────┘
                            │ JDBC
                 ┌──────────▼──────────┐
                 │   MySQL Database     │
                 │   (Flyway in prod)   │
                 └─────────────────────┘
```

### Order Status Workflow
```
PENDING_PICKUP → PICKED_UP → IN_PROCESS → READY_FOR_DELIVERY → DELIVERED
       └─────────────────────────────────────────────────────→ CANCELLED
```

### Authentication Flow
```
Login → POST /auth/login → { accessToken (1h), refreshToken (7d) }
      → Store tokens in expo-secure-store
      → Decode JWT for user/role
      → Set Redux auth state
      → Connect WebSocket

Request → Axios interceptor adds Authorization: Bearer {token}
401    → Call /auth/refresh with X-Refresh-Token header
       → Update stored tokens + Redux state
403    → Logout (account disabled)
```

---

## Database Schema (Key Tables)

```
users                    clients
├── id                   ├── id
├── name                 ├── name
├── email (UNIQUE)       ├── email
├── password (BCrypt)    ├── created_by_id → users
├── phone                ├── created_at
├── role (ENUM)          └── updated_at
├── is_active
└── expo_push_token      client_phones        client_addresses
                         ├── id               ├── id
                         ├── client_id        ├── client_id
                         └── phone_number     ├── address
                                              ├── latitude
                                              └── longitude

product_categories       products
├── id                   ├── id
├── nom / nom_ar / nom_fr├── category_id
├── icon                 ├── nom
├── is_active            ├── pricing_method (ENUM)
└── sort_order           ├── prix_unitaire
                         ├── requires_dimensions
                         └── is_active

commandes                commande_tapis (order items)
├── id                   ├── id
├── numero_commande      ├── commande_id
├── client_id            ├── product_id
├── status (ENUM)        ├── quantite
├── pickup_driver_id     ├── prix_unitaire / prix_final
├── delivery_driver_id   ├── largeur / hauteur / longueur / poids
├── montant_total        ├── remise_montant / remise_raison
├── montant_paye         ├── mode_tarification (ENUM)
├── mode_commande (ENUM) └── tag_numero
├── delivery_type
├── notes
└── version (@Version)   paiements            commande_images
                         ├── id               ├── id
                         ├── commande_id      ├── commande_id
                         ├── montant          ├── commande_tapis_id
                         ├── mode_paiement    ├── image_url
                         ├── date_paiement    ├── photo_type (ENUM)
                         └── recorded_by_id   └── is_archived

refresh_tokens           historique_statuts   notifications
├── id                   ├── id               ├── id
├── token_hash (UNIQUE)  ├── commande_id      ├── recipient_id
├── user_id              ├── ancien_statut    ├── title / message
├── expires_at           ├── nouveau_statut   ├── type
└── created_at           ├── user_id          ├── is_read
                         └── commentaire      └── reference_id
```

---

## API Documentation

### Public Endpoints
| Method | Path | Description |
|---|---|---|
| POST | `/auth/login` | Authenticate user, returns JWT pair |
| POST | `/auth/refresh` | Refresh access token via X-Refresh-Token header |
| POST | `/auth/logout` | Invalidate refresh token |
| GET | `/uploads/**` | Serve uploaded files (public) |
| GET | `/actuator/health` | Health check |

### Client Management (`/api/clients`) — ADMIN, EMPLOYE
| Method | Path | Description |
|---|---|---|
| GET | `/api/clients` | List clients (optional `?search=`) |
| GET | `/api/clients/{id}` | Get client by ID |
| POST | `/api/clients` | Create client |
| PUT | `/api/clients/{id}` | Update client |
| GET | `/api/clients/search` | Search by `?phone=` |

### Order Management
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/admin/commandes` | ADMIN, EMPLOYE | Paginated, filtered orders |
| GET | `/api/commandes/{id}` | ALL | Order detail + items + images |
| POST | `/admin/commandes` | ADMIN, EMPLOYE | Create order |
| PUT | `/admin/commandes/{id}` | ADMIN, EMPLOYE | Update order |
| PATCH | `/api/commandes/{id}/status` | ALL | Update order status |
| DELETE | `/api/commandes/{id}` | ADMIN | Delete order |
| GET | `/api/commandes/{id}/payments` | ALL | Get payment list |
| POST | `/api/commandes/{id}/payments` | ADMIN, EMPLOYE, LIVREUR | Record payment |
| GET | `/api/commandes/{id}/history` | ALL | Status change history |
| POST | `/api/commandes/{id}/images` | ADMIN, EMPLOYE | Add images |
| PATCH | `/api/admin/commandes/{id}/delivery-driver` | ADMIN, EMPLOYE | Assign driver |
| GET | `/api/admin/commandes/map` | ADMIN, EMPLOYE | Orders with GPS |

### Livreur (Driver) Routes
| Method | Path | Description |
|---|---|---|
| GET | `/api/livreur/commandes/ready-for-delivery` | Deliveries assigned to current driver |
| GET | `/api/livreur/commandes/pending-pickup` | Pending pickups for current driver |
| PUT | `/api/livreur/commandes/{id}/cancel` | Cancel delivery |
| PATCH | `/api/livreur/commandes/{id}/return` | Return to workplace |
| GET | `/api/livreur/dashboard/stats` | Driver dashboard stats |

### Catalog Management (`/api/admin/catalog`) — ADMIN, EMPLOYE
| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/admin/catalog/categories` | List / create categories |
| GET/PUT | `/api/admin/catalog/categories/{id}` | Get / update category |
| PATCH | `/api/admin/catalog/categories/{id}/toggle` | Toggle active state |
| DELETE | `/api/admin/catalog/categories/{id}` | Delete category |
| POST | `/api/admin/catalog/categories/{id}/products` | Add product to category |
| PUT/PATCH/DELETE | `/api/admin/catalog/products/{id}` | Manage products |

### User Management (`/admin/**`) — ADMIN only
| Method | Path | Description |
|---|---|---|
| GET | `/admin/active-users` | List active users |
| POST | `/admin/create-user` | Create user |
| PUT | `/admin/update-user/{id}` | Update user |
| PATCH | `/admin/active-user/{id}` | Activate account |
| PATCH | `/admin/inactive-user/{id}` | Deactivate account |
| PUT | `/admin/change-user-password/{id}` | Change password |

### Payments & Unpaid
| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/unpaid/overview` | Total unpaid overview |
| GET | `/api/admin/unpaid/clients` | Clients with outstanding debt |
| GET | `/api/admin/unpaid/clients/{id}` | Debt detail for client |

### File Upload
| Method | Path | Description |
|---|---|---|
| POST | `/api/upload` | Upload single file, returns `{ filename }` |
| POST | `/api/upload/multiple` | Upload multiple files, returns `string[]` |

### Receipts
| Method | Path | Description |
|---|---|---|
| GET | `/api/commandes/{id}/receipt/order/pdf` | Download order PDF |
| GET | `/api/commandes/{id}/receipt/delivery/pdf` | Download delivery PDF |
| GET | `/api/commandes/{id}/receipt/order/whatsapp` | WhatsApp receipt message |

### Notifications
| Method | Path | Description |
|---|---|---|
| GET | `/api/notifications` | User's notifications |
| GET | `/api/notifications/unread-count` | Unread count |
| PUT | `/api/notifications/{id}/read` | Mark as read |
| PUT | `/api/notifications/mark-all-read` | Mark all as read |

---

## Setup & Installation

### Prerequisites
- Java 23
- Maven 3.9+
- MySQL 8.0+
- Node.js 20+ / npm
- Expo CLI (`npm install -g expo-cli`)
- Android Studio or physical device (for mobile)

### Backend Setup
```bash
# 1. Create database
mysql -u root -e "CREATE DATABASE \`laundry-app\`;"

# 2. Configure environment (create .env in laundry-app/)
JWT_SECRET=<256-bit-secret>
# Optional: DATASOURCE_URL, DATASOURCE_USERNAME, DATASOURCE_PASSWORD

# 3. Run
cd laundry-app
mvn spring-boot:run
# Server starts on http://localhost:8080
# Default admin: jalal@gmail.com / jalal123 (DataInitializer)
```

### Frontend Setup
```bash
# 1. Configure environment
cd laundry_mobile
echo "EXPO_PUBLIC_API_URL=http://192.168.1.105:8080" > .env

# 2. Install dependencies
npm install

# 3. Run
npx expo start
# Scan QR with Expo Go, or press 'a' for Android emulator
```

### Production Deployment
Backend environment variables required:
```
MYSQLHOST, MYSQLPORT, MYSQLDATABASE, MYSQLUSER, MYSQLPASSWORD
JWT_SECRET
CORS_ALLOWED_ORIGINS
UPLOAD_DIR
PORT (default 8080)
SPRING_PROFILES_ACTIVE=prod
```

---

## Development Workflow

### Making API Changes
1. Add/modify entity in the relevant package (e.g., `command/`)
2. Add repository methods if needed
3. Update DTO and mapper
4. Update or create service method
5. Expose via controller with `@PreAuthorize`
6. Update frontend API service file in `src/services/api/`
7. Add/update React Query hook in `src/hooks/query/`

### Adding a New Screen (Mobile)
1. Create file in appropriate route group: `app/(admin)/`, `app/(livreur)/`, etc.
2. Add to navigation if needed (bottom tabs or stack)
3. Guard with role check in `app/_layout.tsx` if required

### Order Status Transitions
Edit `constants/orderWorkflow.ts` (mobile) and `CommandeWorkflowValidator.java` (backend) together — both must agree on valid transitions.

### Database Migrations (Production)
- Add `.sql` files to `laundry-app/src/main/resources/db/migration/`
- Naming: `V{number}__{description}.sql`
- Flyway runs automatically on startup in prod profile

---

## Key Technical Decisions

### Dual HTTP Clients on Frontend
There are two Axios instances: `src/api/axios.ts` (legacy) and `src/services/api/client.ts` (new). The new client is the correct one to use for all new API calls. The legacy one should be migrated away from.

### Dual State Management (Redux + React Query)
- **Redux** manages auth state, and some admin/livreur lists that need to persist across screens
- **React Query** handles server data fetching with caching, invalidation, and optimistic updates
- New features should prefer React Query for server data; Redux for auth and UI-only state

### CommandeService Facade
`CommandeService.java` is a temporary facade delegating to five domain services (`CommandeCreationService`, `CommandeWorkflowService`, `CommandePaymentService`, `CommandeQueryService`, `CommandeImageService`). Controllers should eventually inject domain services directly to remove the facade.

### Refresh Token Security
Refresh tokens are stored as SHA-256 hashes in the database — never raw. This means a compromised DB cannot be used to forge tokens. Logout explicitly deletes the hash.

### Optimistic Locking on Commande
`@Version` on the `Commande` entity prevents concurrent updates from silently overwriting each other (e.g., two employees editing the same order simultaneously). The app will receive a `409 Conflict` and must reload.

### Image Upload Pipeline
Mobile: camera/picker → `imageCompression.ts` → `UploadManager` → `POST /api/upload` → URL stored → `POST /api/commandes/{id}/images`. Images are soft-deleted (`is_archived`) to preserve audit trail.

### Offline Queue
Failed API requests are persisted to disk (`DocumentDirectory/offline_queue.json`) and retried when connectivity is restored. Upload tasks have a max of 5 retry attempts.

### Moroccan Phone Validation
Custom `@ValidMoroccanPhone` annotation validates three formats: local `0[567]XXXXXXXXX`, international `+212[567]XXXXXXXX`, and `212[567]XXXXXXXX`.

---

## Findings & Recommendations

### Strengths
- Clean domain-driven service decomposition (5 command services)
- Comprehensive RBAC at both URL and method level
- Refresh token rotation with hash-only storage
- Optimistic locking prevents data corruption
- Offline queue and retry logic for mobile reliability
- Real-time updates via STOMP WebSocket
- Multi-language support (FR/AR) with RTL handling
- File upload security (MIME + magic byte validation)
- Performance AOP monitoring and request-scoped user caching
- React Query with proper query key factory for cache invalidation

### Critical Issues

**1. DataInitializer — Default Admin Credentials in Code**
`DataInitializer.java` seeds `jalal@gmail.com / jalal123` on startup if no admin exists. This hardcoded credential must be removed before any production deployment. Use a one-time setup script or environment variable instead.

**2. WebSocket CORS allows `*` (all origins)**
`WebSocketConfig.java` sets `setAllowedOrigins("*")`. This should match the application's CORS whitelist. In production this means anyone can connect to the WebSocket endpoint.

**3. Hardcoded IP in Frontend .env**
`EXPO_PUBLIC_API_URL=http://192.168.1.105:8080` is a local LAN IP. This will fail for any user not on the same network. Production builds need a real public URL.

**4. No HTTPS enforcement**
The backend has `app.use-secure-cookies=true` in dev but no redirect or HSTS enforcement. Production deployments behind a reverse proxy need to enforce HTTPS.

**5. Unused Legacy Axios Client**
`src/api/axios.ts` is the old client; `src/services/api/client.ts` is the new one. Both exist and may be used inconsistently across screens, causing different error handling behavior.

### High Priority Issues

**6. `DDL = update` in development**
`spring.jpa.hibernate.ddl-auto=update` auto-mutates the schema. Risky if run against a shared dev DB. Use `validate` + Flyway migrations everywhere.

**7. No test coverage visible**
ArchUnit is included as a dependency but no service/repository/integration tests were found. The application has complex workflow logic (`CommandeWorkflowValidator`) that should be unit-tested.

**8. CommandeService Facade is incomplete migration**
Comments in the code acknowledge this is a "Phase 2" item. Until controllers inject domain services directly, the facade adds an unnecessary indirection layer.

**9. Admin dashboard stats use multiple separate queries**
The admin tab fetches today's stats, recent orders, all orders, etc. in separate Redux thunks. Under load this could cause N+1-style DB pressure. Consider a single stats endpoint.

**10. `findFiltered` query complexity**
`CommandeRepository.findFiltered()` is a `@Query` with multiple nullable parameters. This can generate suboptimal query plans. Consider Spring Data JPA Specifications or QueryDSL for dynamic queries.

### Medium Priority Issues

**11. Notification system partially implemented**
`NotificationService`, `NotificationRepository`, and `NotificationController` exist but the push notification delivery (Expo Push API) may not be fully wired. `expo_push_token` is stored on User but no service was found sending to Expo's API.

**12. `StatistiqueJournaliere` not visibly populated**
The daily statistics table exists but no scheduled job or event listener was found populating it. Stats queries go directly to `commandes` table.

**13. Mixed pagination approaches**
Some endpoints return `Page<>` (paginated), others return `List<>`. The frontend handles this inconsistency in `AdminOrdersResponseDTO` but it creates confusion.

**14. Language switching reloads the app**
Arabic/French switching calls `Updates.reloadAsync()` to handle RTL changes. This is disruptive UX. React Native's `I18nManager.forceRTL` requires a reload but the UX could be smoother with a confirmation dialog.

**15. Receipt endpoint paths inconsistent**
Mobile `ordersApi.ts` references `/api/commandes/{id}/receipt/{type}/{format}` but the backend receipt endpoints weren't fully documented in controllers. Verify alignment.

### Low Priority Issues

**16. `UsersListDto.java` appears unused** (file has commented indication)
**17. `LegacyEndpointInterceptor` logs legacy routes** — once migration is complete this should be removed
**18. Password validation allows only 6–15 chars** — weak minimum; consider 8+ with complexity requirements
**19. Client search returns list, not paginated** — will degrade at scale
**20. `expo_push_token` not validated** — any string can be stored; validate format before storage

---

## Future Roadmap Suggestions

### Short-term (1-2 months)
- [ ] Remove `DataInitializer` and replace with a secure first-run setup flow
- [ ] Restrict WebSocket CORS to known origins
- [ ] Add unit tests for `CommandeWorkflowValidator` and payment logic
- [ ] Migrate remaining screens from legacy Axios to new client
- [ ] Wire up Expo push notifications to backend token storage
- [ ] Add production `.env` validation (fail-fast if required vars missing)

### Medium-term (3-4 months)
- [ ] Remove `CommandeService` facade; inject domain services directly in controllers
- [ ] Replace `ddl-auto=update` with Flyway migrations in dev
- [ ] Add integration tests with Testcontainers (MySQL)
- [ ] Implement `StatistiqueJournaliere` population via `@Scheduled` or domain events
- [ ] Add client-list pagination (server-side)
- [ ] Add `@Transactional(readOnly = true)` to all query-only service methods

### Long-term (6+ months)
- [ ] Extract PDF/receipt generation into a separate microservice or async job
- [ ] Add an event sourcing layer for order status changes (replace `HistoriqueStatut` manual logging)
- [ ] Implement a proper admin web dashboard (the backend is already structured for it)
- [ ] Add rate limiting on auth endpoints (`/auth/login`, `/auth/refresh`)
- [ ] Evaluate moving file storage to S3/Cloudinary instead of local disk (`./uploads/`)
- [ ] Add E2E tests for the critical order creation and payment flows

---

## Testing Strategy

### Backend
```
Unit:        Service layer (CommandeWorkflowValidator, pricing logic)
Integration: @SpringBootTest + Testcontainers MySQL
Security:    @WithMockUser tests for each role on each endpoint
Contract:    Spring REST Docs or OpenAPI generation
```

### Frontend
```
Unit:        Utility functions (orderFinancials, imageCompression)
Component:   React Testing Library for form components
E2E:         Detox for critical flows (login → create order → payment)
```

---

## Project Structure Reference

```
laundry/
├── laundry-app/                     ← Spring Boot backend
│   ├── src/main/java/com/wash/laundry_app/
│   │   ├── auth/                    JWT, Security, CORS config
│   │   ├── users/                   User entity, admin/livreur sub-modules
│   │   ├── clients/                 Client + phone + address management
│   │   ├── catalog/                 Products & categories
│   │   ├── command/                 Orders (core domain)
│   │   │   ├── services/            Creation, Workflow, Payment, Query, Image
│   │   │   └── workflow/            Status transition validation
│   │   ├── unpaid/                  Debt tracking module
│   │   ├── notifications/           In-app notifications
│   │   ├── statistiques/            Daily statistics
│   │   ├── validation/              @ValidMoroccanPhone
│   │   └── config/                  WebSocket, FileStorage, AOP, Interceptors
│   └── src/main/resources/
│       ├── application.properties   Dev config
│       ├── application-prod.properties  Prod config
│       └── db/migration/            Flyway migrations
│
└── laundry_mobile/                  ← Expo React Native frontend
    ├── app/
    │   ├── _layout.tsx              Root navigator + auth guard
    │   ├── (auth)/login.tsx         Login screen
    │   ├── (admin)/(tabs)/          Admin bottom tabs
    │   ├── (livreur)/               Driver screens
    │   ├── (employe)/               Employee screens
    │   ├── order/[id].tsx           Order detail (shared)
    │   └── client/[id].tsx          Client detail (shared)
    ├── src/
    │   ├── store/                   Redux store + slices
    │   ├── services/
    │   │   ├── api/                 Axios client + per-domain API files
    │   │   ├── offline/             Offline queue + connectivity
    │   │   ├── uploads/             Upload manager with retry
    │   │   └── realtime/            STOMP WebSocket client
    │   ├── hooks/query/             React Query hooks per domain
    │   ├── context/                 OrderCreationContext (multi-step form)
    │   ├── i18n/                    FR/AR translations
    │   └── utils/                   Financial calc, image compression, error utils
    └── constants/
        ├── theme.ts                 Color palette, typography, shadows
        ├── StatusColors.ts          Per-status color mapping
        └── orderWorkflow.ts         Valid status transitions + UI actions
```
