# LastMile Delivery Tracker

A full-stack logistics management platform where customers place delivery orders with auto-calculated charges, admins configure zones/pricing and manage operations, and delivery agents update order status in real time. Built with role-based access control (Customer / Agent / Admin), a zone-based rate calculation engine, immutable order tracking, and automated email notifications.

**Live App:** https://lastmile-delivery-tracker-4eh7662vq-ras12.vercel.app
**Live API Docs (Swagger):** https://lastmile-delivery-tracker.onrender.com/docs

![Admin Setup Screen](./screenshots/admin-setup.png)
> Note: Backend is hosted on Render's free tier, which spins down after ~15 minutes of inactivity. The first request after idle time may take 30–60 seconds to respond while the server wakes up.

---

## Tech Stack

- **Backend:** FastAPI (Python), SQLAlchemy ORM, JWT authentication (python-jose), bcrypt password hashing
- **Database:** PostgreSQL (hosted on Railway)
- **Frontend:** React (Vite), React Router, Tailwind CSS v4, Axios
- **Email:** Resend API
- **Deployment:** Render (backend), Vercel (frontend), Railway (database)

---

## Project Structure

```
lastmile-tracker/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI entry point, router registration
│   │   ├── config.py                # Environment variable loading (pydantic-settings)
│   │   ├── database.py              # SQLAlchemy engine, session, Base
│   │   ├── models/models.py         # DB table definitions
│   │   ├── schemas/schemas.py       # Pydantic request/response validation
│   │   ├── api/
│   │   │   ├── auth.py              # Register, login, /me
│   │   │   ├── admin.py             # Zones, pincodes, rate cards, order management
│   │   │   ├── orders.py            # Order preview, placement, tracking, reschedule
│   │   │   └── agent.py             # Agent order view + status updates
│   │   └── services/
│   │       ├── auth_service.py      # Password hashing, JWT, role guards
│   │       ├── rate_engine.py       # Core rate calculation logic
│   │       └── email_service.py     # Resend email notifications
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    └── src/
        ├── api/client.js             # Axios instance with auth interceptor
        ├── context/AuthContext.jsx   # Global auth state
        ├── components/               # Navbar, ProtectedRoute
        └── pages/
            ├── auth/                 # Login, Register
            ├── customer/             # Place order, order list, order detail
            ├── agent/                 # Assigned orders + status updates
            └── admin/                 # Setup (zones/pincodes/rates), order management
```

---

## Setup Guide (Local Development)

### Prerequisites
- Python 3.10+
- Node.js 18+
- A PostgreSQL database (Railway free tier works well)
- A free [Resend](https://resend.com) account for email sending

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/Scripts/activate      # Windows Git Bash
# or: source venv/bin/activate    # Mac/Linux

pip install -r requirements.txt
```

Create `backend/.env` (see `.env.example` below):

```
DATABASE_URL=postgresql://user:password@host:port/dbname
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
RESEND_API_KEY=your-resend-api-key-here
```

Run the server:

```bash
python -m uvicorn app.main:app --reload
```

API available at `http://127.0.0.1:8000`, Swagger docs at `http://127.0.0.1:8000/docs`. Tables are auto-created on startup via `Base.metadata.create_all()`.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

App available at `http://localhost:5173`. Update `frontend/src/api/client.js` to point `baseURL` at your backend (local or deployed).

### First-Time Data Setup

1. Create an admin account: `POST /admin/create-admin` (open route, one-time use)
2. Log in as admin, create zones: `POST /admin/zones`
3. Map pincodes to zones: `POST /admin/pincodes`
4. Create rate cards for each zone × order type × intra/inter combination: `POST /admin/rate-cards`
5. Create delivery agents: `POST /admin/create-agent`

Without this setup data, order placement will fail since the rate engine has nothing to look up.

---

## .env.example

```
# PostgreSQL connection string
DATABASE_URL=postgresql://user:password@host:port/dbname

# JWT signing secret — generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"
SECRET_KEY=your-secret-key-here

# JWT algorithm
ALGORITHM=HS256

# Token expiry in minutes
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Resend API key for email notifications — https://resend.com
RESEND_API_KEY=your-resend-api-key-here
```

---

## Database Schema

**users**
| Column | Type | Notes |
|---|---|---|
| id | int, PK | |
| name | string | |
| email | string, unique | |
| hashed_password | string | bcrypt hash, never plain text |
| role | enum | customer / agent / admin |
| phone | string, nullable | |
| is_active | bool | default true |
| created_at | datetime | |

**zones**
| Column | Type | Notes |
|---|---|---|
| id | int, PK | |
| name | string, unique | e.g. "Zone A" |
| description | string, nullable | |

**pincodes**
| Column | Type | Notes |
|---|---|---|
| id | int, PK | |
| pincode | string, unique | |
| area_name | string, nullable | |
| zone_id | FK → zones.id | |

**rate_cards**
| Column | Type | Notes |
|---|---|---|
| id | int, PK | |
| zone_id | FK → zones.id | |
| order_type | enum | B2B / B2C |
| is_intra_zone | bool | true = same-zone rate, false = cross-zone rate |
| rate_per_kg | float | |
| cod_surcharge | float | flat amount added if payment_type = cod |

One row per unique (zone, order_type, is_intra_zone) combination — this is the full pricing configuration, entirely admin-managed with zero hardcoded values in code.

**orders**
| Column | Type | Notes |
|---|---|---|
| id | int, PK | |
| customer_id | FK → users.id | |
| agent_id | FK → users.id, nullable | |
| pickup_address, pickup_pincode | string | |
| drop_address, drop_pincode | string | |
| length, breadth, height | float | cm |
| actual_weight | float | kg |
| volumetric_weight | float | calculated: (L×B×H)/5000 |
| billed_weight | float | max(actual_weight, volumetric_weight) |
| charge | float | final calculated total |
| order_type | enum | B2B / B2C |
| payment_type | enum | prepaid / cod |
| status | enum | pending / assigned / picked_up / in_transit / out_for_delivery / delivered / failed / rescheduled |
| pickup_zone_id, drop_zone_id | FK → zones.id | stored at order time |
| reschedule_date | datetime, nullable | |
| created_at, updated_at | datetime | |

**order_tracking**
| Column | Type | Notes |
|---|---|---|
| id | int, PK | |
| order_id | FK → orders.id | |
| status | enum | the status at this point in history |
| actor_id | FK → users.id, nullable | who made this change |
| actor_role | enum | role of the actor |
| note | text, nullable | |
| timestamp | datetime | |

This table is **append-only** — every status change (order placement, agent update, admin override, reschedule) inserts a new row. Rows are never updated or deleted, producing a full, tamper-proof audit trail per order.

---

## API Documentation

Full interactive documentation is available via Swagger UI at `/docs` on any running instance (local or deployed). Summary of route groups:

**Auth** (`/auth`)
- `POST /auth/register` — customer self-registration
- `POST /auth/login` — returns JWT access token
- `GET /auth/me` — current authenticated user

**Admin** (`/admin`, admin-only unless noted)
- `POST /admin/create-admin` — open, one-time bootstrap route
- `POST /admin/create-agent` — onboard a delivery agent
- `POST/GET /admin/zones` — manage zones
- `POST/GET /admin/pincodes` — map pincodes to zones
- `POST/GET /admin/rate-cards` — configure pricing
- `GET /admin/orders` — list/filter all orders (by status, zone, agent)
- `PATCH /admin/orders/{id}/assign` — manually assign an agent
- `PATCH /admin/orders/{id}/auto-assign` — auto-assign nearest available agent
- `PATCH /admin/orders/{id}/status` — override order status (no transition restriction)

**Orders** (`/orders`, authenticated users)
- `POST /orders/preview` — calculate charge without saving
- `POST /orders/` — place an order (recalculates charge server-side)
- `GET /orders/` — list own orders (customers) or all orders (admin/agent)
- `GET /orders/{id}` — single order detail
- `GET /orders/{id}/tracking` — full immutable status history
- `PATCH /orders/{id}/reschedule` — customer reschedules a failed delivery

**Agent** (`/agent`, agent-only)
- `GET /agent/orders` — orders assigned to the logged-in agent
- `PATCH /agent/orders/{id}/status` — update status (enforced state machine)

---

## Rate Calculation Logic

Every order's charge is computed in `services/rate_engine.py` through 8 deterministic steps:

1. **Zone detection** — pickup and drop pincodes are each looked up in the `pincodes` table to find their assigned zone. If a pincode isn't mapped, the order is rejected with a clear error rather than defaulting to a guess.
2. **Intra vs inter-zone** — if pickup zone and drop zone are the same, it's intra-zone (cheaper); otherwise inter-zone.
3. **Volumetric weight** — `(length × breadth × height) / 5000`, the standard courier-industry formula that charges for space, not just mass.
4. **Billed weight** — `max(actual_weight, volumetric_weight)`. Whichever is higher determines what the customer pays, so bulky-but-light packages aren't underpriced.
5. **Rate card lookup** — the system queries `rate_cards` for the exact match on `(pickup_zone, order_type, is_intra_zone)`. If admin hasn't configured that specific combination, the order is rejected rather than silently using a wrong rate.
6. **Base charge** — `billed_weight × rate_per_kg`.
7. **COD surcharge** — added only if `payment_type == cod`, using the flat surcharge configured on that same rate card.
8. **Total** — base charge + COD surcharge, returned to the customer as a full breakdown *before* they confirm the order.

Nothing in this logic is hardcoded — every zone, pincode mapping, and price point is admin-configured data, so operators can reconfigure the entire pricing model without a code change or redeploy.

The same calculation runs twice: once for the customer-facing preview (`POST /orders/preview`, no DB write), and again inside `POST /orders/` at confirmation time. This prevents price tampering — even if a client manipulated the previewed numbers, the backend recomputes independently before saving.

## System Design
  See [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) for the write-up covering the rate engine, zone detection, auto-assignment, and failed delivery handling.