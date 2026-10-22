# Employee Management System (EMS)

A full-stack web application for managing employees, shifts, payroll, and holiday requests across multiple businesses.

> **Final year project** — developed as my BSc Computer Science final project at Birkbeck, University of London (2025–26).

## Features

- **Role-based access** — Admin, Manager, Employee with granular per-position permission flags
- **User management** — create, promote, and delete employees and managers with rank hierarchy enforcement
- **Business & org structure** — businesses, sections, and positions
- **Shift scheduling** — managers assign shifts; employees see their own schedule
- **Payroll** — pay configs, tax configs, and payslip generation based on actual shift hours
- **Holiday requests** — submit, approve, and reject with email notifications
- **Audit logging** — every mutating action is recorded with actor, target, and details
- **Forgot password** — self-service reset via temporary password sent by email

## Structure

```
EMS_BBK/
├── backend/    # FastAPI REST API
└── frontend/   # React SPA
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, SQLAlchemy, SQLite, JWT (Argon2 passwords) |
| Frontend | React 18, TanStack Query, Zustand, React Router v6, Tailwind CSS |
| Email | aiosmtplib (SMTP background tasks) |
| Testing | pytest |

## Start

### 1 — Backend

```bash
cd backend

uv sync

# Create .env
# copy the example file to .env
cp .env.example .env

# Seed the first admin account
uv run python scripts/seed_admin.py

# Start the API
uv run uvicorn app.main:app --reload
```

API → `http://localhost:8000`  
Swagger docs → `http://localhost:8000/docs`

### 2 — Frontend

```bash
cd frontend

npm install
npm run dev
```

App → `http://localhost:5173`

---

> Both must be running at the same time. The frontend expects the API on `http://localhost:8000`.

## Default Admin

After running `seed_admin.py`, log in with:

```
Email: admin@ems.com
Password: check terminal after running the script for admin
```

Change the password immediately after first login.

## Further Documentation

- [`backend/README.md`](backend/README.md) — API endpoints, database schema, environment variables, tests
- [`frontend/README.md`](frontend/README.md) — route map, permissions, project structure
