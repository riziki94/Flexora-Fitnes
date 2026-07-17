# Flexora Fitnes

The world's first two-sided PT marketplace with AI-powered fitness training.

## Architecture

- **Framework:** [TanStack Start](https://tanstack.com/start) (React + Vite + Tailwind)
- **Runtime:** Bun
- **Database:** SQLite (local dev) / PostgreSQL (production via Neon)
- **Auth:** JWT with bcrypt password hashing
- **Language:** TypeScript

## Project Structure

```
src/
  lib/
    db.ts              # SQLite database & migrations
    auth.ts            # JWT auth, password hashing, session management
    auth-actions.ts    # Server functions: login & register
    user-actions.ts    # Server functions: getCurrentUser, getDashboardData
  routes/
    __root.tsx         # Root layout (HTML shell)
    index.tsx          # Landing page ("/")
    login.tsx          # Login page ("/login")
    register.tsx       # Registration page ("/register")
    app/
      dashboard.tsx    # Dashboard ("/app/dashboard")
      profile.tsx      # Profile page ("/app/profile")
      pt/
        verify.tsx     # PT verification ("/app/pt/verify")
  styles/
    app.css            # Tailwind entrypoint
  assets/              # Static assets (logos, favicons)
uploads/               # PT diploma uploads
data/                  # SQLite database files (gitignored)
```

## Database Schema

- **users** — id, email, password_hash, role (client/pt), name, country, profile_picture, birthday, created_at
- **pt_profiles** — user_id, diploma_url, certification_info, years_of_experience, education_location, verification_status, bio
- **subscriptions** — user_id, plan (basis/hybrid/premium/pt), status, started_at, expires_at
- **workout_plans** — id, user_id, name, goal, created_at
- **sessions** — id, user_id, token, expires_at
- **pt_bookings** — id, client_id, pt_id, status, scheduled_at, created_at

## Setup

### Prerequisites
- [Bun](https://bun.sh) >= 1.0

### Install & Run

```bash
# Install dependencies
bun install

# Run dev server (port 3000)
bun run dev

# Build for production
bun run build

# Publish (build + serve on port 3000)
bun run publish
```

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | No | `flexora-dev-secret-change-in-production` | Secret key for JWT signing |
| `DATABASE_URL` | No | (uses SQLite) | PostgreSQL connection string for production |

## User Roles

### Client
- Register with email, name, password
- Subscribe to Basis (149 kr), Hybrid (249 kr), or Premium (399 kr)
- Create workout plans
- Book PT sessions

### Personal Trainer (PT)
- Register with email, name, password, and certification info
- Upload diploma/certificate for verification
- Verification status: pending → approved/rejected
- Get booked by clients globally
- PT subscription: 199 kr/month

## API

Server functions (TypeScript, type-safe, called from client):

- `loginUser({ email, password })` → `{ token, user }`
- `registerUser({ email, password, name, role, ... })` → `{ token, user }`
- `getCurrentUser()` → `{ id, email, role, name, ptProfile? }`
- `getDashboardData()` → `{ user, workouts?, subscription?, profile?, bookings? }`

## License

Private — Flexora Fitnes

